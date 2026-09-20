<script setup lang="ts">
import { ref } from 'vue';
import { Page } from '@vben/common-ui';
import { useAgentStartClient } from 'vue-agent-start';
import { ChannelHubApp } from 'vue-agent-start/channel-hub';
const tenantId = ref(localStorage.getItem('spring-agent:tenant-id') || 'default');
const client = useAgentStartClient();
</script>

<template>
  <Page title="渠道账户" description="配置 QQBot、微信、飞书等消息网关账户；渠道运行时与业务连接器分开管理。">
    <ChannelHubApp :client="client" :tenant-id="tenantId" />
  </Page>
</template>
