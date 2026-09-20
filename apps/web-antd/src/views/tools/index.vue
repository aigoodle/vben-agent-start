<script setup lang="ts">
import { Page } from '@vben/common-ui';
import { ToolManager } from 'vue-agent-start/tool-hub';
// Subpath entries use extracted CSS; import it at the host page just like plugin-hub/MCP.
import 'vue-agent-start/style.css';
</script>

<template>
  <Page title="工具管理" description="自动发现 Spring AI @Tool，并管理系统与自定义 API 工具。" content-class="p-0">
    <ToolManager />
  </Page>
</template>
