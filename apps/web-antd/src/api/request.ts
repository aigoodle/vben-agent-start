/**
 * spring-agent-start 免登录，不需要 access token / refresh token 的整条链路。
 * 只保留业务码判定 + 错误提示两层拦截，其他删掉。
 */
import type { RequestClientOptions } from '@vben/request';

import { useAppConfig } from '@vben/hooks';
import { preferences } from '@vben/preferences';
import {
  defaultResponseInterceptor,
  errorMessageResponseInterceptor,
  RequestClient,
} from '@vben/request';

import { message } from 'ant-design-vue';

const { apiURL } = useAppConfig(import.meta.env, import.meta.env.PROD);

function createRequestClient(baseURL: string, options?: RequestClientOptions) {
  const client = new RequestClient({
    ...options,
    baseURL,
  });

  // Spring 后端不需要 Authorization，仅带一个 locale 头。
  client.addRequestInterceptor({
    fulfilled: async (config) => {
      config.headers['Accept-Language'] = preferences.app.locale;
      return config;
    },
  });

  // 后端 ApiResponse: { code, message, data }，code === 'ok' 视为成功。
  client.addResponseInterceptor(
    defaultResponseInterceptor({
      codeField: 'code',
      dataField: 'data',
      successCode: 'ok',
    }),
  );

  client.addResponseInterceptor(
    errorMessageResponseInterceptor((msg: string, error) => {
      const responseData = error?.response?.data ?? {};
      const backendMessage: string =
        responseData?.message ?? responseData?.error ?? '';
      const status: number | undefined = error?.response?.status;

      // Categorize errors so users see something more actionable than the raw
      // backend text — especially when the failure is on the transport layer
      // (backend down) and there's no HTTP status at all.
      if (error?.code === 'ERR_NETWORK' || !error?.response) {
        message.error({
          content:
            '🔌 网络不可达 — 后端未响应，请确认 spring-agent-start 已在 :18090 端口启动',
          key: 'network',
        });
        return;
      }
      if (status === 401 || status === 403) {
        message.error(backendMessage || '未授权 / 无权访问');
        return;
      }
      if (status === 404) {
        message.error(backendMessage || '资源不存在');
        return;
      }
      if (status && status >= 500) {
        message.error(
          backendMessage
            ? `服务端错误 (${status}) · ${backendMessage}`
            : `服务端错误 (${status}) · 请查看后端日志`,
        );
        return;
      }
      // 4xx client error — show backend's own detailed message
      message.error(backendMessage || msg);
    }),
  );

  return client;
}

export const requestClient = createRequestClient(apiURL, {
  responseReturn: 'data',
});

export const baseRequestClient = new RequestClient({ baseURL: apiURL });
