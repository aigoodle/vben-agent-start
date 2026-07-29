import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    meta: {
      icon: 'lucide:zap',
      order: 70,
      title: '触发器',
    },
    name: 'Trigger',
    path: '/trigger',
    children: [
      {
        name: 'TriggerList',
        path: '/trigger/list',
        component: () => import('#/views/trigger/index.vue'),
        meta: {
          icon: 'lucide:webhook',
          title: '触发器列表',
        },
      },
    ],
  },
];

export default routes;
