/**
 * 统一构造 vue-agent-start 的 `ChatIframeConfig`，供 AppDesignDrawer.chatConfig
 * 与 FlowDesigner.debugConfig 复用。
 *
 * 数据来源：
 *   • iframe 基础 URL：`VITE_CHAT_IFRAME_BASE`（默认 `/chat/`，配合 vite
 *     dev 代理指向 antd-react-chat dev server，生产直接挂静态资源即可）；
 *   • Dify API Key：优先取 `agent.difyApiKey`（后端加了字段就自动生效），
 *     否则回退 `VITE_DIFY_APP_KEY` 环境变量；两者都缺则透传 undefined ——
 *     antd-react-chat 会再回退到它自己的构建期 `VITE_DIFY_API_KEY`。
 *   • context：登录 token、当前用户名，方便 iframe 内的 host-session 使用。
 */
import { preferences } from '@vben/preferences';
import { useUserStore } from '@vben/stores';

import type { AgentEntity } from '#/api/agent';

export interface AgentLike {
  id?: string;
  name?: string;
  mode?: string;
  /** 若后端已经加了 difyApiKey 字段（Agent/App 表）则命中此路径 */
  difyApiKey?: string;
  /** apps.workflow_id —— 已发布快照或草稿 id；用于调试模式回填 */
  workflowId?: string;
}

interface BuildOptions {
  /** 附加到 URL 查询里的额外键值对（例如工作流 id / 会话上下文标记） */
  extraParams?: Record<string, boolean | number | string | null | undefined>;
  /** 附加到 postMessage 的上下文字段 */
  extraContext?: Record<string, unknown>;
  /** localStorage 命名空间，默认由 mode + app.id 拼；playground 可自定义 */
  sessionKey?: string;
  /**
   * 调试模式：抽屉 / FlowDesigner 里的预览面板都应传 true，让后端一律路
   * 由到草稿 workflow（{@code workflow.id == app.id}），不管 apps.workflow_id
   * 指向哪个发布快照。生产 chat 页 / 嵌入气泡不传，走默认（发布快照）。
   */
  debug?: boolean;
}

function resolveIframeBase(): string {
  const raw = (import.meta.env.VITE_CHAT_IFRAME_BASE as string | undefined)?.trim();
  const base = raw && raw.length > 0 ? raw : '/chat/';
  return base.endsWith('/') ? base : `${base}/`;
}

/**
 * Bearer token 解析优先级：
 *   1) agent.difyApiKey —— 后端如果有单独的 app API key 表就走它
 *   2) VITE_DIFY_APP_KEY —— 全站兜底（一般不推荐生产用，明文写在 bundle 里）
 *   3) agent.id —— spring-agent-start ChatController#chatMessages 目前把
 *      Bearer token 当作 appId 直接查库，所以传 id 就够跑通调试
 * 三者都空返回 undefined，iframe 侧 provider 会兜底到构建期
 * {@code VITE_DIFY_API_KEY} 或直接抛"缺少 API Key"。
 */
function resolveApiKey(agent?: AgentLike | null): string | undefined {
  const fromAgent = agent?.difyApiKey?.trim();
  if (fromAgent) return fromAgent;
  const fromEnv = (
    import.meta.env.VITE_DIFY_APP_KEY as string | undefined
  )?.trim();
  if (fromEnv) return fromEnv;
  return agent?.id?.trim() || undefined;
}

/**
 * 组装 chat iframe 配置。传 null 时说明当前不用挂调试（例如列表页初始态）。
 * 返回值直接绑给 `<AppDesignDrawer :chat-config>` 或
 * `<FlowDesigner :debug-config>`。
 */
export function buildChatIframeConfig(
  agent?: AgentEntity | AgentLike | null,
  options: BuildOptions = {},
) {
  const src = resolveIframeBase();
  const difyApiKey = resolveApiKey(agent as AgentLike | null | undefined);
  const userStore = useUserStore();
  const label = agent?.name || (agent as AgentLike)?.id || 'spring-agent';

  const workflowId = (agent as AgentLike)?.workflowId;
  return {
    src,
    title: agent?.name ? `调试：${agent.name}` : '调试与预览',
    sessionKey:
      options.sessionKey ||
      `${(agent as AgentLike)?.mode ?? 'agent'}-${(agent as AgentLike)?.id ?? 'draft'}`,
    params: {
      // 调试面板一律走 Copilot 助手视图（?mode=Copilot），供调用方 override 时也
      // 允许再覆盖成 App / Bot 全屏视图。
      mode: 'Copilot',
      difyApiKey,
      label,
      // appId / workflowId 显式暴露到 iframe URL —— provider.ts 读出来后作为
      // X-App-Id / X-Workflow-Id 头发给后端。这样后端日志 / devtools network
      // 都能"眼见为实"知道这条请求打的是哪个应用/工作流，不用去解 Bearer。
      appId: (agent as AgentLike)?.id,
      workflowId,
      // 调试模式：抽屉里的调用一律 debug=true，让后端强制路由到草稿
      // （id == appId），不管 apps.workflow_id 指向哪个发布快照 —— 与
      // Dify workspace 的调试语义一致。
      debug: options.debug ? 'true' : undefined,
      ...options.extraParams,
    },
    context: {
      appId: (agent as AgentLike)?.id,
      appMode: (agent as AgentLike)?.mode,
      appName: agent?.name,
      // 复用 vben 的登录态：user info + preferences.theme 让 iframe 跟深浅色
      user: userStore.userInfo
        ? {
            userId: (userStore.userInfo as any).userId,
            username: (userStore.userInfo as any).username,
            realName: (userStore.userInfo as any).realName,
          }
        : null,
      theme: preferences.theme.mode === 'dark' ? 'dark' : 'light',
      ...options.extraContext,
    },
  };
}
