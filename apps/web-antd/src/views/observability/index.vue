<script setup lang="ts">
/**
 * LLMOps 观测页：每模型 token / 成本 / 平均延时；最近调用列表。
 * 数据来自 /llmops/stats + /llmops/total + /llmops/recent。
 */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';

import { Button, Card, Empty, Statistic, Switch, Table, Tag } from 'ant-design-vue';

import {
  fetchRecent,
  fetchStats,
  fetchTotal,
  type LlmCallRecord,
  type LlmUsageStats,
} from '#/api/observability';

const stats = ref<LlmUsageStats[]>([]);
const total = ref<LlmUsageStats | null>(null);
const recent = ref<LlmCallRecord[]>([]);
const loading = ref(false);
const autoRefresh = ref(false);
let autoTimer: number | null = null;

function toggleAutoRefresh(v: boolean) {
  autoRefresh.value = v;
  clearAuto();
  if (v) {
    autoTimer = window.setInterval(refresh, 5000);
  }
}

function clearAuto() {
  if (autoTimer !== null) {
    clearInterval(autoTimer);
    autoTimer = null;
  }
}

onBeforeUnmount(clearAuto);

const costUnit = 'USD';
const costOf = computed(() =>
  total.value ? (total.value.costMicros / 1_000_000).toFixed(4) : '0.0000',
);

async function refresh() {
  loading.value = true;
  try {
    const [s, t, r] = await Promise.all([
      fetchStats(),
      fetchTotal(),
      fetchRecent(30),
    ]);
    stats.value = s;
    total.value = t;
    recent.value = r;
  } finally {
    loading.value = false;
  }
}

onMounted(refresh);

const modelColumns = [
  { title: '模型', dataIndex: 'model', key: 'model' },
  { title: '调用', dataIndex: 'calls', key: 'calls', width: 90 },
  { title: '失败', dataIndex: 'errors', key: 'errors', width: 90 },
  { title: 'Prompt', dataIndex: 'promptTokens', key: 'p', width: 100 },
  { title: 'Completion', dataIndex: 'completionTokens', key: 'c', width: 120 },
  { title: 'Total', dataIndex: 'totalTokens', key: 't', width: 100 },
  { title: '成本(µ)', dataIndex: 'costMicros', key: 'cost', width: 110 },
  { title: '平均延时(ms)', dataIndex: 'avgLatencyMs', key: 'lat', width: 130 },
];

const recentColumns = [
  { title: '时间', dataIndex: 'createdAt', key: 'createdAt', width: 180 },
  { title: '供应商', dataIndex: 'provider', key: 'provider', width: 110 },
  { title: '模型', dataIndex: 'model', key: 'model' },
  { title: 'Tokens', dataIndex: 'totalTokens', key: 't', width: 90 },
  { title: '延时(ms)', dataIndex: 'latencyMs', key: 'lat', width: 110 },
  { title: '结果', dataIndex: 'success', key: 'success', width: 90 },
];
</script>

<template>
  <Page title="LLMOps 观测" description="每次 LLM 调用的 token / 成本 / 延时；数据来自 spring-agent-observability。">
    <div class="mb-3 flex items-center justify-end gap-3">
      <div class="flex items-center gap-2 text-sm text-gray-500">
        每 5 秒自动刷新
        <Switch :checked="autoRefresh" @change="(v) => toggleAutoRefresh(v as boolean)" />
      </div>
      <Button :loading="loading" @click="refresh">刷新</Button>
    </div>
    <div class="grid grid-cols-1 gap-4 md:grid-cols-4">
      <Card>
        <Statistic title="总调用" :value="total?.calls ?? 0" />
      </Card>
      <Card>
        <Statistic title="总 tokens" :value="total?.totalTokens ?? 0" />
      </Card>
      <Card>
        <Statistic
          title="总成本"
          :value="costOf"
          :suffix="costUnit"
          :precision="4"
        />
      </Card>
      <Card>
        <Statistic
          title="失败次数"
          :value="total?.errors ?? 0"
          :value-style="{ color: (total?.errors ?? 0) > 0 ? '#ef4444' : undefined }"
        />
      </Card>
    </div>

    <Card class="mt-4" title="按模型汇总">
      <Empty v-if="stats.length === 0" description="还没有调用记录" />
      <Table
        v-else
        row-key="model"
        :columns="modelColumns"
        :data-source="stats"
        :loading="loading"
        :pagination="false"
      />
    </Card>

    <Card class="mt-4" title="最近调用">
      <Empty v-if="recent.length === 0" description="没有近期调用" />
      <Table
        v-else
        row-key="id"
        :columns="recentColumns"
        :data-source="recent"
        :loading="loading"
        :pagination="{ pageSize: 10 }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'success'">
            <Tag :color="record.success ? 'green' : 'red'">
              {{ record.success ? '成功' : '失败' }}
            </Tag>
          </template>
        </template>
      </Table>
    </Card>
  </Page>
</template>
