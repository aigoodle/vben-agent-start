import { fileURLToPath, URL } from 'node:url';

import { defineConfig } from '@vben/vite-config';

// vue-agent-start's workflow source retains its internal `@/` imports. This
// alias is deliberately scoped to that package and does not replace the
// package dependency declared in package.json.
const vueAgentStartFlowSource = fileURLToPath(
  new URL('../../../vue-agent-start/src/agent-flow/', import.meta.url),
);
const vueAgentStartSource = fileURLToPath(
  new URL('../../../vue-agent-start/src/index.ts', import.meta.url),
);
const vueAgentStartClientSource = fileURLToPath(
  new URL('../../../vue-agent-start/src/client/index.ts', import.meta.url),
);
const vueAgentStartProviderSource = fileURLToPath(
  new URL('../../../vue-agent-start/src/provider-hub/index.ts', import.meta.url),
);
const vueAgentStartKnowledgeSource = fileURLToPath(
  new URL('../../../vue-agent-start/src/knowledge-hub/index.ts', import.meta.url),
);
const vueAgentStartStudioSource = fileURLToPath(
  new URL('../../../vue-agent-start/src/agent-studio/index.ts', import.meta.url),
);
const vueAgentStartAgentFlowSource = fileURLToPath(
  new URL('../../../vue-agent-start/src/agent-flow/index.ts', import.meta.url),
);
const vueAgentStartConnectorSource = fileURLToPath(
  new URL('../../../vue-agent-start/src/connector-hub/index.ts', import.meta.url),
);
const vueAgentStartStyleSource = fileURLToPath(
  new URL(
    '../../../vue-agent-start/src/knowledge-hub/styles/index.css',
    import.meta.url,
  ),
);

export default defineConfig(async () => ({
  application: {},
  vite: {
    resolve: {
      alias: [
        // Development uses the component-library source directly. This gives
        // linked Vue SFCs normal Vite HMR instead of requiring a dist rebuild.
        {
          find: /^vue-agent-start$/,
          replacement: vueAgentStartSource,
        },
        {
          find: /^vue-agent-start\/client$/,
          replacement: vueAgentStartClientSource,
        },
        {
          find: /^vue-agent-start\/provider-hub$/,
          replacement: vueAgentStartProviderSource,
        },
        {
          find: /^vue-agent-start\/knowledge-hub$/,
          replacement: vueAgentStartKnowledgeSource,
        },
        {
          find: /^vue-agent-start\/agent-studio$/,
          replacement: vueAgentStartStudioSource,
        },
        {
          find: /^vue-agent-start\/agent-flow$/,
          replacement: vueAgentStartAgentFlowSource,
        },
        {
          find: /^vue-agent-start\/connector-hub$/,
          replacement: vueAgentStartConnectorSource,
        },
        // SFC styles are collected by Vite from source. Keep the package's
        // explicit style import pointed at its source-level global tokens.
        {
          find: /^vue-agent-start\/style\.css$/,
          replacement: vueAgentStartStyleSource,
        },
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
    optimizeDeps: {
      // Never cache the linked UI kit as a dependency: its source files must
      // remain in Vite's transform graph so edits trigger HMR immediately.
      exclude: ['vue-agent-start'],
    },
    server: {
      // The local file dependency lives alongside this demonstration project.
      fs: {
        allow: [fileURLToPath(new URL('../../../../', import.meta.url))],
      },
      proxy: {
        '/api': {
          changeOrigin: true,
          target: process.env.VITE_AGENT_API_TARGET ?? 'http://localhost:18090',
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
          target: process.env.VITE_AGENT_API_TARGET ?? 'http://localhost:18090',
          rewrite: (path) => path.replace(/^\/chatapi/, ''),
          ws: true,
        },
      },
    },
  },
}));
