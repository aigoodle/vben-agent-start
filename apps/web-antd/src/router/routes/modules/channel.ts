import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    meta: {
      icon: 'lucide:messages-square',
      order: 44,
      title: '消息渠道',
    },
    name: 'Channel',
    path: '/channels',
    redirect: '/channels/accounts',
    children: [
      {
        name: 'ChannelAccounts',
        path: '/channels/accounts',
        alias: '/connectors/accounts',
        component: () => import('#/views/channel/accounts.vue'),
        meta: {
          icon: 'lucide:message-square-cog',
          title: '渠道账户',
        },
      },
      {
        name: 'MyRobots',
        path: '/channels/my-robots',
        alias: '/connectors/my-robots',
        component: () => import('#/views/channel/my-robots.vue'),
        meta: {
          icon: 'lucide:bot',
          title: '我的机器人',
        },
      },
    ],
  },
];

export default routes;
