import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    meta: {
      icon: 'lucide:plug-zap',
      order: 45,
      title: '连接器生态',
    },
    name: 'Connector',
    path: '/connectors',
    children: [
      {
        name: 'ConnectorHub',
        path: '/connectors/hub',
        component: () => import('#/views/connector/index.vue'),
        meta: {
          icon: 'lucide:blocks',
          title: 'Connector 中心',
        },
      },
    ],
  },
];

export default routes;
