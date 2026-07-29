<script setup lang="ts">
/**
 * /apps/list — zero-config drop-in.
 *
 * 全部业务在 <AgentAppsPage> 内部。视图不再关心 CRUD / 抽屉 / 导航等细节。
 * api-base 默认 /api（宿主代理前缀），/agent-start 命名空间由组件内部拼上，
 * 宿主直接省略这条 prop 即可。
 *
 * 注意：<template> 根层不能放 HTML 注释 —— dev 模式注释节点会被保留，
 * 路由组件就变成多根 fragment，外层 <Transition mode="out-in"> 的 leave
 * 钩子挂不上，afterLeave 永远不触发，表现为“切走后所有路由永久白屏”。
 */
import { AgentAppsPage } from 'vue-agent-start';
</script>

<template>
  <AgentAppsPage />
</template>
