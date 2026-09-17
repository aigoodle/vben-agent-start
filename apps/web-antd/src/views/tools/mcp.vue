<script setup lang="ts">
import { Page } from '@vben/common-ui';
import { McpServerManager } from 'vue-agent-start/mcp-hub';
// Linked component packages do not inject their extracted CSS from subpath JS.
// Keep this page-level import so the MCP page is also styled when it is opened
// directly during development (without relying only on bootstrap import order).
import 'vue-agent-start/style.css';
</script>

<template>
  <Page title="MCP 配置" description="维护 MCP Server，并将服务提供的工具接入 Agent 与工作流。" content-class="p-0">
    <McpServerManager />
  </Page>
</template>
