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
    ],
  },
];

export default routes;
