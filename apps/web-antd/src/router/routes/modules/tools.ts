import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    meta: {
      icon: 'lucide:wrench',
      order: 50,
      title: '工具',
    },
    name: 'Tools',
    path: '/tools',
    children: [
      {
        name: 'ToolsList',
        path: '/tools/list',
        component: () => import('#/views/tools/index.vue'),
        meta: {
          icon: 'lucide:wrench',
          title: '工具列表',
        },
      },
      {
        name: 'PluginManager',
        path: '/tools/plugins',
        component: () => import('#/views/tools/plugins.vue'),
        meta: {
          icon: 'lucide:blocks',
          title: '插件管理',
        },
      },
      {
        name: 'McpServers',
        path: '/tools/mcp',
        component: () => import('#/views/tools/mcp.vue'),
        meta: {
          icon: 'lucide:server-cog',
          title: 'MCP 配置',
        },
      },
    ],
  },
];

export default routes;
