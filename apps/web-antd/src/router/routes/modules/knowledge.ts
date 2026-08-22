import type { RouteRecordRaw } from 'vue-router';

/**
 * Knowledge routes.
 *
 * The whole feature — card grid + create wizard drawer + detail drawer with
 * inline chunks browser — lives on the single `/knowledge/list` page via
 * `<KnowledgeHubApp>`. No sub-routes for create / detail / documents because
 * everything happens inside drawers on the list page (no page navigation).
 *
 * `/knowledge/cross-search` stays as a standalone tool page.
 */
const routes: RouteRecordRaw[] = [
  {
    meta: {
      icon: 'lucide:library',
      order: 10,
      title: '知识库',
    },
    name: 'Knowledge',
    path: '/knowledge',
    children: [
      {
        name: 'KnowledgeList',
        path: '/knowledge/list',
        component: () => import('#/views/knowledge/list.vue'),
        meta: {
          icon: 'lucide:database',
          title: '数据集',
          affixTab: false,
        },
      },
    ],
  },
];

export default routes;
