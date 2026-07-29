import { fileURLToPath, URL } from 'node:url';

import { defineConfig } from '@vben/vite-config';

// vue-agent-start's workflow source retains its internal `@/` imports. This
// alias is deliberately scoped to that package and does not replace the
// package dependency declared in package.json.
const vueAgentStartFlowSource = fileURLToPath(
  new URL('../../../vue-agent-start/src/agent-flow/', import.meta.url),
);

export default defineConfig(async () => ({
  application: {},
  vite: {
    resolve: {
      alias: [
        {
          find: /^@\/(.*)$/,
          replacement: `${vueAgentStartFlowSource}$1`,
        },
      ],
      dedupe: [
        'vue',
        'pinia',
        'ant-design-vue',
        '@ant-design/icons-vue',
        '@vueuse/core',
        '@vue-flow/core',
      ],
    },
    server: {
      // The local file dependency lives alongside this demonstration project.
      fs: {
        allow: [fileURLToPath(new URL('../../../../', import.meta.url))],
      },
      proxy: {
        '/api': {
          changeOrigin: true,
          target: process.env.VITE_AGENT_API_TARGET ?? 'http://localhost:18091',
          rewrite: (path) => path.replace(/^\/api/, ''),
          ws: true,
        },
        '/chat/': {
          changeOrigin: true,
          target: process.env.VITE_CHAT_IFRAME_DEV_TARGET ?? 'http://localhost:5073',
          ws: true,
        },
        '/chatapi': {
          changeOrigin: true,
          target: process.env.VITE_AGENT_API_TARGET ?? 'http://localhost:18091',
          rewrite: (path) => path.replace(/^\/chatapi/, ''),
          ws: true,
        },
      },
    },
  },
}));
