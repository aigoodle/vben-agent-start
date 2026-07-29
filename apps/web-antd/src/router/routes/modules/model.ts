import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    meta: {
      icon: 'lucide:cpu',
      order: 20,
      title: '模型供应商',
    },
    name: 'Model',
    path: '/model',
    children: [
      {
        name: 'ModelList',
        path: '/model/list',
        component: () => import('#/views/model/index.vue'),
        meta: {
          icon: 'lucide:server',
          title: '供应商 & 模型',
        },
      },
    ],
  },
];

export default routes;
