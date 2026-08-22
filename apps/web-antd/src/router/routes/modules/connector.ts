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
      {
        name: 'MyRobots',
        path: '/connectors/my-robots',
        component: () => import('#/views/connector/my-robots.vue'),
        meta: {
          icon: 'lucide:bot',
          title: '我的机器人',
        },
      },
    ],
  },
];

export default routes;
