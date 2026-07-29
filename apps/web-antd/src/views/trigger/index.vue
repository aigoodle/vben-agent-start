<script setup lang="ts">
/**
 * 触发器管理页：列出 webhook / cron / event 触发器 + 每个触发器的调用历史 + 手动 fire。
 */
import { onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';

import {
  Button,
  Card,
  Drawer,
  Empty,
  message,
  Popconfirm,
  Switch,
  Table,
  Tag,
} from 'ant-design-vue';

import {
  deleteTrigger,
  fireTrigger,
  listInvocations,
  listTriggers,
  replayInvocation,
  setTriggerEnabled,
  type TriggerEntity,
  type TriggerInvocationEntity,
} from '#/api/trigger';

const triggers = ref<TriggerEntity[]>([]);
const loading = ref(false);

const drawerOpen = ref(false);
const currentTrigger = ref<TriggerEntity | null>(null);
const invocations = ref<TriggerInvocationEntity[]>([]);
const invocationsLoading = ref(false);

async function refresh() {
  loading.value = true;
  try {
    triggers.value = await listTriggers();
  } finally {
    loading.value = false;
  }
}

async function toggle(row: any, val: boolean) {
  const t = row as TriggerEntity;
  await setTriggerEnabled(t.id, val);
  t.enabled = val;
  message.success(val ? '已启用' : '已停用');
}

async function remove(row: any) {
  await deleteTrigger((row as TriggerEntity).id);
  message.success('已删除');
  await refresh();
}

async function fire(row: any) {
  const r = await fireTrigger((row as TriggerEntity).id, {});
  message.success(r.success ? '已成功触发' : `触发失败: ${r.error ?? ''}`);
}

async function openHistory(row: any) {
  currentTrigger.value = row as TriggerEntity;
  drawerOpen.value = true;
  await loadInvocations();
}

async function loadInvocations() {
  if (!currentTrigger.value) return;
  invocationsLoading.value = true;
  try {
    invocations.value = await listInvocations(currentTrigger.value.id);
  } finally {
    invocationsLoading.value = false;
  }
}

async function replay(inv: any) {
  await replayInvocation((inv as TriggerInvocationEntity).id);
  message.success('已重放');
  await loadInvocations();
}

onMounted(refresh);

const columns = [
  { title: '名称', dataIndex: 'name', key: 'name' },
  { title: '类型', dataIndex: 'type', key: 'type', width: 110 },
  { title: '目标', key: 'target', width: 200 },
  { title: '启用', dataIndex: 'enabled', key: 'enabled', width: 90 },
  { title: '操作', key: 'action', width: 260 },
];

const invColumns = [
  { title: '时间', dataIndex: 'createdAt', key: 'createdAt', width: 180 },
  { title: '来源', dataIndex: 'source', key: 'source', width: 110 },
  { title: '状态', dataIndex: 'status', key: 'status', width: 110 },
  { title: '错误', dataIndex: 'error', key: 'error' },
  { title: '操作', key: 'op', width: 100 },
];
</script>

<template>
  <Page
    title="触发器"
    description="Webhook · Cron · Event 触发器；每次触发都有历史 + 可重放。"
  >
    <Card>
      <div class="mb-3 text-sm text-gray-500">
        共 {{ triggers.length }} 个触发器。webhook 触发器的路径可通过 <code>POST /triggers/webhook/{`{path}`}</code> 外部访问。
      </div>
      <Table
        row-key="id"
        :columns="columns"
        :data-source="triggers"
        :loading="loading"
        :pagination="{ pageSize: 10 }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'type'">
            <Tag color="processing">{{ record.type }}</Tag>
          </template>
          <template v-else-if="column.key === 'target'">
            <span class="text-xs text-gray-500">{{ record.targetType }}:</span>
            <span class="ml-1">{{ record.targetId }}</span>
          </template>
          <template v-else-if="column.key === 'enabled'">
            <Switch :checked="record.enabled" @change="(v) => toggle(record, v as boolean)" />
          </template>
          <template v-else-if="column.key === 'action'">
            <Button type="link" size="small" @click="openHistory(record)">历史</Button>
            <Button type="link" size="small" @click="fire(record)">手动触发</Button>
            <Popconfirm title="删除该触发器？" @confirm="remove(record)">
              <Button type="link" size="small" danger>删除</Button>
            </Popconfirm>
          </template>
        </template>
      </Table>
    </Card>

    <Drawer
      v-model:open="drawerOpen"
      width="720"
      :title="currentTrigger ? `${currentTrigger.name} · 调用历史` : '调用历史'"
    >
      <div class="mb-3 flex justify-end">
        <Button size="small" :loading="invocationsLoading" @click="loadInvocations">刷新</Button>
      </div>
      <Empty v-if="invocations.length === 0" description="尚无调用" />
      <Table
        v-else
        row-key="id"
        :columns="invColumns"
        :data-source="invocations"
        :loading="invocationsLoading"
        :pagination="{ pageSize: 10 }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'status'">
            <Tag :color="record.status === 'COMPLETED' ? 'green' : record.status === 'FAILED' ? 'red' : 'blue'">
              {{ record.status }}
            </Tag>
          </template>
          <template v-else-if="column.key === 'op'">
            <Button type="link" size="small" @click="replay(record)">重放</Button>
          </template>
        </template>
      </Table>
    </Drawer>
  </Page>
</template>
