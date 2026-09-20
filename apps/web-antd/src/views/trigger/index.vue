<script setup lang="ts">
import { Page } from '@vben/common-ui';
import { TriggerManagerApp } from 'vue-agent-start/trigger-hub';
import 'vue-agent-start/style.css';
</script>

<template>
  <Page title="触发器" description="管理 Webhook、Cron 与 Event 触发器，查看执行历史并重放。" content-class="p-0">
    <TriggerManagerApp />
  </Page>
</template>
