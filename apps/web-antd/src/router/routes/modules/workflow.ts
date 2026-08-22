// import type { RouteRecordRaw } from 'vue-router';
//
// // Workflows have been folded into the unified /apps/list — a workflow is just
// // an app with mode='workflow', edited via the same card-click drawer. Keep the
// // designer + JSON playground reachable as debug tools but hide them from the
// // nav by default; the list-page route is a redirect to /apps/list.
// const routes: RouteRecordRaw[] = [
//   {
//     meta: {
//       icon: 'lucide:workflow',
//       order: 41,
//       title: '工作流调试',
//     },
//     name: 'Workflow',
//     path: '/workflow',
//     children: [
//       {
//         name: 'WorkflowList',
//         path: '/workflow/list',
//         redirect: '/apps/list',
//         meta: {
//           hideInMenu: true,
//           title: '流程列表',
//         },
//       },
//       {
//         name: 'AgentFlowDesigner',
//         path: '/workflow/designer',
//         component: () => import('#/views/agent-flow/index.vue'),
//         meta: {
//           icon: 'lucide:git-fork',
//           title: '独立设计器',
//         },
//       },
//       {
//         name: 'WorkflowPlayground',
//         path: '/workflow/playground',
//         component: () => import('#/views/workflow/playground.vue'),
//         meta: {
//           icon: 'lucide:terminal',
//           title: 'JSON 调试台',
//         },
//       },
//     ],
//   },
// ];
//
// export default routes;
