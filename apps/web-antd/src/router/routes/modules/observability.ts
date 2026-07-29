import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    meta: {
      icon: 'lucide:activity',
      order: 60,
      title: '观测',
    },
    name: 'Observability',
    path: '/observability',
    children: [
      {
        name: 'LlmOps',
        path: '/observability/llmops',
        component: () => import('#/views/observability/index.vue'),
        meta: {
          icon: 'lucide:area-chart',
          title: 'LLMOps',
        },
      },
    ],
  },
];

export default routes;
