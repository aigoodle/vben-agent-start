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
    redirect: '/connectors/hub',
    children: [
      {
        name: 'ConnectorHub',
        path: '/connectors/hub',
        component: () => import('#/views/connector/index.vue'),
        meta: {
          icon: 'lucide:blocks',
          title: '消息连接器',
        },
      },
      {
        name: 'ConnectorAccounts',
        path: '/connectors/accounts',
        component: () => import('#/views/connector/accounts.vue'),
        meta: { icon: 'lucide:message-square-cog', title: '通道账号配置' },
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
