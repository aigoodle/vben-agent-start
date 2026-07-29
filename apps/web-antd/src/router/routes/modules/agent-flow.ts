import type { RouteRecordRaw } from 'vue-router';

/**
 * Agent-flow 组件的调试入口
 *
 * 生产用的可视化设计器已经挂在 workflow.ts 的 `/workflow/designer` 上，
 * 这里保留一个独立的 `/agent-flow/designer` 作为组件本身的调试页面：
 *   - 不接后端 API
 *   - 顶部有"重置/切换模式/打印图/校验"四个调试按钮
 *   - 方便迭代 @agent-start/agent-flow 组件本身的视觉与交互
 */
const routes: RouteRecordRaw[] = [
  {
    meta: {
      icon: 'lucide:bug',
      order: 200,
      title: 'Agent Flow',
    },
    name: 'AgentFlow',
    path: '/agent-flow',
    children: [
      {
        name: 'AgentFlowDesignerDebug',
        path: '/agent-flow/designer',
        component: () => import('#/views/agent-flow/debug.vue'),
        meta: {
          icon: 'lucide:git-fork',
          title: '设计器调试',
        },
      },
    ],
  },
];

export default routes;
