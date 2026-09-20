<script setup lang="ts">
/**
 * /channels/my-robots — 「我的机器人」。
 *
 * 页面本体由组件模块 vue-agent-start/channel-hub 的 <MyRobotsPanel> 实现;
 * 宿主只负责把业务系统的人员数据(useUserStore)与租户 id 注入组件。
 * userId / 租户 id 对用户不可见:它们只作为 prop 传入,表单中不出现,
 * 由组件在创建机器人时自动合并进请求。
 *
 * 注意:<template> 根层不能放 HTML 注释 —— dev 模式注释节点会被保留,
 * 路由组件变成多根 fragment,路由切换动画会失效(见 views/agent/list.vue)。
 */
import { MyRobotsPanel } from 'vue-agent-start/channel-hub';

import { Page } from '@vben/common-ui';
import { useUserStore } from '@vben/stores';

const userStore = useUserStore();

// 租户 id 与 connector/index.vue、bootstrap.ts 的 getTenant 保持同一来源
const tenantId = localStorage.getItem('spring-agent:tenant-id') || 'default';

// 人员数据来自业务系统:登录后由宿主填充的 userStore.userInfo
const user = {
  avatar: userStore.userInfo?.avatar,
  realName: userStore.userInfo?.realName,
  userId: userStore.userInfo?.userId ?? '',
  username: userStore.userInfo?.username,
};
</script>

<template>
  <Page
    title="我的机器人"
    description="定义专属机器人,绑定 Agent 应用;人员与租户信息由系统自动携带。"
  >
    <MyRobotsPanel :user="user" :tenant-id="tenantId" />
  </Page>
</template>
