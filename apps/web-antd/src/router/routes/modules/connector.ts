import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    meta: {
      icon: 'lucide:plug-zap',
      order: 45,
      title: '业务连接器',
    },
    name: 'Connector',
    path: '/connectors',
    redirect: '/connectors/hub',
    children: [
      {
        name: 'ConnectorHub',
        path: '/connectors/hub',
        component: () => import('#/views/connector/index.vue'),
        meta: {
          icon: 'lucide:blocks',
          title: '连接器管理',
        },
      },
    ],
  },
];

export default routes;
