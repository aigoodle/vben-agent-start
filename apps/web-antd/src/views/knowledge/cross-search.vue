<script setup lang="ts">
/**
 * "跨数据集检索"演示页 —— 完全使用 vue-agent-start 组件包实现：
 *
 *   - DatasetPicker：多选数据集
 *   - HitTestingPanel：向选中数据集依次发起检索
 *   - RetrievedList：格式化结果
 *
 * 关键：这个页面 NOT 通过 web-antd 自己的 api/knowledge 层——它直接用
 * vue-agent-start 内置的 fetch 客户端（`useKnowledge`）。这就是 vue-agent-start
 * 作为独立组件包的价值证明：拿到任何一个 Vue 3 项目里都能直接用。
 */
import { onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';

import { Card, Empty, message } from 'ant-design-vue';

// NOTE: 通过 vite alias `vue-agent-start` 引入。
import {
  DatasetPicker,
  HitTestingPanel,
  setKnowledgeApiBase,
  useKnowledge,
} from 'vue-agent-start';

// composable 默认 apiBase 就是 /api（宿主代理前缀），/agent-start 命名空间在
// 内部自动拼。这里显式再调一次是幂等的 —— 保留下来只为了让读者看清约定。
setKnowledgeApiBase('/api');

const selected = ref<string[]>([]);
const datasetCount = ref(0);

onMounted(async () => {
  try {
    const list = await useKnowledge().listDatasets();
    datasetCount.value = list.length;
  } catch (e: any) {
    message.error(`加载数据集失败: ${e?.message ?? e}`);
  }
});
</script>

<template>
  <Page
    title="跨数据集检索"
    description="演示 vue-agent-start 组件包。同一个组件可以放到任何 Vue 3 项目里用。"
  >
    <Card title="选中数据集">
      <div class="mb-3 text-xs text-gray-500">
        共 {{ datasetCount }} 个可用数据集。选中一个或多个再看下方检索面板。
      </div>
      <DatasetPicker v-model="selected" placeholder="选择要检索的数据集" />
    </Card>

    <div v-if="selected.length === 0" class="mt-4">
      <Card>
        <Empty description="选一个数据集试试检索" />
      </Card>
    </div>

    <div v-else class="mt-4 grid grid-cols-1 gap-4">
      <Card v-for="id in selected" :key="id" :title="`数据集 ${id.slice(0, 8)}...`">
        <HitTestingPanel :dataset-id="id" :top-k="5" />
      </Card>
    </div>
  </Page>
</template>
