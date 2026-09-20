<script setup lang="ts">
import { Page } from '@vben/common-ui';
import { SkillManagerApp } from 'vue-agent-start/skill-hub';
import 'vue-agent-start/style.css';
</script>

<template>
  <Page title="Skill 管理" description="创建、发布和维护可复用业务指令，并关联 Agent 可调用的工具。" content-class="p-0">
    <SkillManagerApp />
  </Page>
</template>
