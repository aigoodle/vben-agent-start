<script setup lang="ts">
import { ref, watch } from 'vue';

import { Page } from '@vben/common-ui';

import { ConnectorHubApp } from 'vue-agent-start/connector-hub';
import { Button, Input, Modal, Tag, message } from 'ant-design-vue';

const TENANT_STORAGE_KEY = 'spring-agent:tenant-id';
const tenantId = ref(localStorage.getItem(TENANT_STORAGE_KEY) || 'default');
const tenantDraft = ref(tenantId.value);
const tenantModalOpen = ref(false);
const hubKey = ref(0);

watch(tenantModalOpen, (open) => {
  if (open) tenantDraft.value = tenantId.value;
});

function saveTenant() {
  const value = tenantDraft.value.trim();
  if (!value) {
    message.warning('租户 ID 不能为空');
    return;
  }
  tenantId.value = value;
  localStorage.setItem(TENANT_STORAGE_KEY, value);
  tenantModalOpen.value = false;
  hubKey.value += 1;
  message.success(`已切换到租户 ${value}`);
}
</script>

<template>
  <Page
    title="消息连接器"
    description="管理供 Agent 与工作流调用的业务连接器、授权凭据和执行能力；QQBot、微信等账户请前往消息渠道。"
  >
    <template #extra>
      <div class="flex items-center gap-2">
        <span class="text-sm text-gray-500">当前租户</span>
        <Tag color="blue">{{ tenantId }}</Tag>
        <Button size="small" @click="tenantModalOpen = true">切换</Button>
      </div>
    </template>

    <ConnectorHubApp :key="hubKey" :tenant-id="tenantId" />

    <Modal
      v-model:open="tenantModalOpen"
      title="切换 Connector 租户"
      ok-text="保存并重新加载"
      @ok="saveTenant"
    >
      <p class="mb-3 text-sm text-gray-500">
        安装状态、连接凭证与执行审计均按租户隔离。
      </p>
      <Input v-model:value="tenantDraft" placeholder="例如 default 或 tenant-a" @press-enter="saveTenant" />
    </Modal>
  </Page>
</template>
