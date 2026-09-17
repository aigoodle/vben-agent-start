<script setup lang="ts">
import { ref } from 'vue';
import { Page } from '@vben/common-ui';
import { useAgentStartClient } from 'vue-agent-start';
import { ChannelConnectionPanel } from 'vue-agent-start/connector-hub';
const tenantId = ref(localStorage.getItem('spring-agent:tenant-id') || 'default');
const client = useAgentStartClient();
</script>

<template>
  <Page title="通道账号配置" description="员工分别配置自己的 QQBot、飞书、钉钉、企业微信、Email 与 Webhook 账号；应用工作流只选择通道，不绑定员工凭证。">
    <ChannelConnectionPanel :client="client" :tenant-id="tenantId" />
  </Page>
</template>
