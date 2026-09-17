<script setup lang="ts">
import { Page } from '@vben/common-ui';
import { PluginManagerApp } from 'vue-agent-start/plugin-hub';
import 'vue-agent-start/style.css';
</script>

<template>
  <Page title="插件管理" description="查看、启停和配置后端动态加载的 Java / 远程业务插件。" content-class="p-0">
    <PluginManagerApp />
  </Page>
</template>
