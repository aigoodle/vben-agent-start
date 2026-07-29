import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    meta: {
      icon: 'lucide:layout-grid',
      order: 30,
      title: '应用',
    },
    name: 'Apps',
    path: '/apps',
    children: [
      {
        name: 'AgentList',
        path: '/apps/list',
        // Dify-parity unified apps list — chat / agent / workflow / completion
        // all live in the `apps` table and are edited via a card-click drawer.
        component: () => import('#/views/agent/list.vue'),
        meta: {
          icon: 'lucide:list',
          title: '应用列表',
        },
      },
      {
        name: 'AgentChat',
        path: '/apps/:id/chat',
        component: () => import('#/views/agent/chat.vue'),
        meta: {
          icon: 'lucide:message-circle',
          title: '对话',
          hideInMenu: true,
          activePath: '/apps/list',
        },
      },
      // Legacy path — some links in the app still target /agent/list. Keep it
      // as a redirect so bookmarks don't 404.
      {
        name: 'AgentListLegacy',
        path: '/agent/list',
        redirect: '/apps/list',
        meta: { hideInMenu: true, title: '应用列表' },
      },
      {
        name: 'AgentChatLegacy',
        path: '/agent/:id/chat',
        redirect: (to) => `/apps/${to.params.id}/chat`,
        meta: { hideInMenu: true, title: '对话' },
      },
    ],
  },
];

export default routes;
