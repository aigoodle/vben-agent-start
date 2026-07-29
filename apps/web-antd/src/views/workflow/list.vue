<script setup lang="ts">
/**
 * Workflow list 页：Dify-style 卡片网格 + 每卡运行历史/加载/导出/删除。
 * 底部保留 /node-types 节点分类，帮助用户理解画布词汇。
 */
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';

import {
  Button,
  Card,
  Drawer,
  Dropdown,
  Empty,
  Input,
  Menu,
  MenuItem,
  message,
  Select,
  Skeleton,
  Spin,
  Tag,
} from 'ant-design-vue';

import {
  deleteWorkflow,
  listNodeTypes,
  listRuns,
  listWorkflows,
  type NodeTypeMeta,
  saveWorkflow,
  type WorkflowEntity,
  type WorkflowRunEntity,
} from '#/api/workflow';

const router = useRouter();
const workflows = ref<WorkflowEntity[]>([]);
const loading = ref(false);
const nodeTypes = ref<NodeTypeMeta[]>([]);

const keyword = ref('');
const filterMode = ref<'ALL' | 'chatflow' | 'workflow'>('ALL');

// ---- Card icon helper ----------------------------------------------------
const MODE_ICONS: Record<string, string> = {
  chatflow: '💬',
  workflow: '🧬',
};
const BGS = [
  '#EEF4FF',
  '#EFFDF4',
  '#FEF3F2',
  '#FFF4ED',
  '#FDF2FA',
  '#F0F9FF',
];
function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = Math.trunc((h << 5) - h + s.charCodeAt(i));
  return Math.abs(h);
}
function iconOf(w: WorkflowEntity) {
  return MODE_ICONS[w.mode ?? 'workflow'] ?? '🧬';
}
function bgOf(w: WorkflowEntity) {
  return BGS[hashCode((w.id || w.name) + '.bg') % BGS.length];
}
function fromNow(iso?: string): string {
  if (!iso) return '';
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '';
  const diff = (Date.now() - t) / 1000;
  if (diff < 60) return '刚刚';
  if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`;
  if (diff < 86_400) return `${Math.floor(diff / 3600)} 小时前`;
  if (diff < 86_400 * 30) return `${Math.floor(diff / 86_400)} 天前`;
  return new Date(iso).toLocaleDateString();
}

// ---- Filtering -----------------------------------------------------------
const filtered = computed(() => {
  const q = keyword.value.trim().toLowerCase();
  return workflows.value.filter((w) => {
    if (filterMode.value !== 'ALL' && (w.mode ?? 'workflow') !== filterMode.value) {
      return false;
    }
    if (!q) return true;
    return (w.name ?? '').toLowerCase().includes(q);
  });
});

// ---- Run history drawer --------------------------------------------------
const runsDrawerOpen = ref(false);
const runsCurrentWf = ref<WorkflowEntity | null>(null);
const runs = ref<WorkflowRunEntity[]>([]);
const runsLoading = ref(false);
const expandedRunId = ref<string | undefined>(undefined);

async function openRuns(wf: WorkflowEntity) {
  runsCurrentWf.value = wf;
  runsDrawerOpen.value = true;
  runsLoading.value = true;
  try {
    runs.value = await listRuns(wf.id, 30);
  } finally {
    runsLoading.value = false;
  }
}

function toggleRun(id: string) {
  expandedRunId.value = expandedRunId.value === id ? undefined : id;
}

function parseJson<T = unknown>(s: string | undefined): null | T {
  if (!s) return null;
  try {
    return JSON.parse(s) as T;
  } catch {
    return null;
  }
}

// ---- Supported node type panel ------------------------------------------
const grouped = computed(() => {
  const acc: Record<string, NodeTypeMeta[]> = {};
  for (const n of nodeTypes.value) (acc[n.category] ??= []).push(n);
  return acc;
});
const categoryLabels: Record<string, string> = {
  data: '数据处理',
  flow: '流程控制',
  io: 'I/O',
  llm: 'LLM 相关',
};

async function refresh() {
  loading.value = true;
  try {
    workflows.value = await listWorkflows();
  } finally {
    loading.value = false;
  }
}

async function loadNodes() {
  try {
    nodeTypes.value = await listNodeTypes();
  } catch {
    nodeTypes.value = [];
  }
}

function edit(w: WorkflowEntity) {
  router.push({ name: 'WorkflowPlayground', query: { id: w.id } });
}

function remove(w: WorkflowEntity) {
  // Use imperative confirm to work inside dropdown-menu click handlers
  import('ant-design-vue').then(({ Modal }) =>
    Modal.confirm({
      title: '删除工作流',
      content: `确认删除「${w.name}」？该操作不可恢复，历史运行记录仍会保留。`,
      okText: '删除',
      okType: 'danger',
      onOk: async () => {
        await deleteWorkflow(w.id);
        message.success('已删除');
        await refresh();
      },
    }),
  );
}

// ---- Import / export ----------------------------------------------------
function exportOne(w: WorkflowEntity) {
  // Backend `graph` is already a JSON object via JacksonTypeHandler — no parse
  // needed.
  const payload = {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    name: w.name,
    mode: w.mode ?? 'workflow',
    graph: w.graph ?? null,
  };
  downloadJson(`${w.name || 'workflow'}.json`, payload);
}
function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

async function onImportFile(event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;
  try {
    const text = await file.text();
    const parsed = JSON.parse(text) as {
      graph?: any;
      mode?: 'chatflow' | 'workflow';
      name?: string;
      workflows?: Array<{
        graph?: any;
        mode?: 'chatflow' | 'workflow';
        name?: string;
      }>;
    };
    const items = parsed.workflows ?? (parsed.graph ? [parsed] : []);
    if (items.length === 0) {
      message.error('导入失败：文件里没有 graph / workflows 字段');
      return;
    }
    let ok = 0;
    for (const item of items) {
      if (!item.graph) continue;
      await saveWorkflow({
        name: item.name ?? file.name.replace(/\.json$/i, ''),
        mode: item.mode ?? 'workflow',
        graph: item.graph,
      });
      ok++;
    }
    message.success(`已导入 ${ok} 个工作流`);
    await refresh();
  } catch (e: any) {
    message.error(`导入失败: ${e?.message ?? e}`);
  } finally {
    target.value = '';
  }
}

onMounted(() => {
  refresh();
  loadNodes();
});
</script>

<template>
  <Page
    title="工作流"
    description="DAG 编排 · 变量池 · SSE 实时事件。列出所有保存的工作流并可在调试台里加载。"
  >
    <!-- 顶部搜索 + 过滤 + 导入按钮 -->
    <div
      class="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white p-3 shadow-sm dark:bg-neutral-900"
    >
      <div class="flex items-center gap-2">
        <Input
          v-model:value="keyword"
          placeholder="搜索工作流..."
          allow-clear
          style="width: 240px"
        />
        <Select
          v-model:value="filterMode"
          :options="[
            { label: '全部模式', value: 'ALL' },
            { label: 'Workflow (DAG)', value: 'workflow' },
            { label: 'Chatflow', value: 'chatflow' },
          ]"
          style="width: 180px"
        />
      </div>
      <div class="flex items-center gap-2">
        <span class="text-xs text-gray-500">
          共 {{ filtered.length }} / {{ workflows.length }} 个
        </span>
        <Button>
          <label class="cursor-pointer">
            导入 JSON
            <input
              type="file"
              accept=".json,application/json"
              class="hidden"
              @change="onImportFile"
            />
          </label>
        </Button>
      </div>
    </div>

    <div v-if="loading && workflows.length === 0" class="dify-grid">
      <div v-for="n in 6" :key="n" class="dify-card">
        <Skeleton :active="true" :paragraph="{ rows: 3 }" />
      </div>
    </div>

    <Spin :spinning="loading && workflows.length > 0">
      <div v-if="!loading || workflows.length > 0" class="dify-grid">
        <!-- "新建" 占位卡 -->
        <div
          class="dify-card dify-card-new"
          @click="router.push({ name: 'WorkflowPlayground' })"
        >
          <div class="dify-new-inner">
            <div class="dify-new-plus">+</div>
            <div class="dify-new-text">新建工作流</div>
            <div class="dify-new-sub">拖拽节点 · JSON · 或从画布保存</div>
          </div>
        </div>

        <!-- 工作流卡 -->
        <div
          v-for="w in filtered"
          :key="w.id"
          class="dify-card"
          @click="edit(w)"
        >
          <div class="dify-header">
            <div class="dify-icon" :style="{ background: bgOf(w) }">
              {{ iconOf(w) }}
            </div>
            <div class="dify-title-wrap">
              <div class="dify-title" :title="w.name">{{ w.name }}</div>
              <div class="dify-meta">
                <Tag color="processing" style="margin-right: 4px">
                  {{ w.mode ?? 'workflow' }}
                </Tag>
                <Tag v-if="w.published" color="green" style="margin-right: 4px">
                  已发布
                </Tag>
                <Tag v-else style="margin-right: 4px">草稿</Tag>
                <span>· v{{ w.version ?? 1 }}</span>
              </div>
            </div>
          </div>

          <div class="dify-desc" title="graph 节点摘要">
            {{ w.mode === 'chatflow' ? '会话式编排（Chatflow）' : 'DAG 工作流编排' }}
          </div>

          <div class="dify-spacer" />

          <div class="dify-footer">
            <span class="dify-footer-item">
              🕒 {{ fromNow(w.updatedAt) || '刚刚' }}
            </span>
          </div>

          <div class="dify-more" @click.stop>
            <Dropdown :trigger="['click']" placement="bottomRight">
              <Button type="text" size="small" class="dify-more-btn">⋯</Button>
              <template #overlay>
                <Menu>
                  <MenuItem key="load" @click="edit(w)">加载到调试台</MenuItem>
                  <MenuItem key="runs" @click="openRuns(w)">运行历史</MenuItem>
                  <MenuItem key="export" @click="exportOne(w)">导出 JSON</MenuItem>
                  <MenuItem key="delete" danger @click="remove(w)">
                    删除
                  </MenuItem>
                </Menu>
              </template>
            </Dropdown>
          </div>
        </div>
      </div>

      <Empty
        v-if="!loading && filtered.length === 0"
        class="mt-8"
        :description="keyword ? '没有找到匹配的工作流' : '还没有工作流，点上面的“新建工作流”开始吧'"
      />
    </Spin>

    <Drawer
      v-model:open="runsDrawerOpen"
      width="720"
      :title="runsCurrentWf ? `${runsCurrentWf.name} · 运行历史` : '运行历史'"
    >
      <Empty
        v-if="!runsLoading && runs.length === 0"
        description="尚无运行记录"
      />
      <div
        v-for="r in runs"
        :key="r.id"
        class="mb-3 rounded border p-3 text-sm"
      >
        <div class="flex items-center justify-between">
          <div>
            <Tag :color="r.status === 'SUCCESS' ? 'green' : 'red'">
              {{ r.status }}
            </Tag>
            <span class="ml-2 text-xs text-gray-500">{{ r.createdAt }}</span>
          </div>
          <Button type="link" size="small" @click="toggleRun(r.id)">
            {{ expandedRunId === r.id ? '收起' : '详情' }}
          </Button>
        </div>
        <div v-if="r.error" class="mt-1 text-xs text-red-500">
          {{ r.error }}
        </div>
        <template v-if="expandedRunId === r.id">
          <div class="mt-3">
            <div class="mb-1 text-xs text-gray-500">Inputs</div>
            <pre class="rounded bg-gray-50 p-2 text-xs">{{ r.inputsJson ?? '' }}</pre>
          </div>
          <div class="mt-2">
            <div class="mb-1 text-xs text-gray-500">Outputs</div>
            <pre class="rounded bg-gray-50 p-2 text-xs">{{ r.outputsJson ?? '' }}</pre>
          </div>
          <div v-if="parseJson<any[]>(r.stepsJson)" class="mt-2">
            <div class="mb-1 text-xs text-gray-500">
              Steps ({{ (parseJson<any[]>(r.stepsJson) ?? []).length }})
            </div>
            <div
              v-for="(s, i) in parseJson<any[]>(r.stepsJson) ?? []"
              :key="i"
              class="mb-1 rounded border p-2 text-xs"
            >
              <div class="flex justify-between">
                <span>
                  <Tag :color="s.failed ? 'red' : 'blue'">{{ s.nodeType }}</Tag>
                  {{ s.nodeId }}
                </span>
                <span class="text-gray-500">{{ s.elapsedMillis }}ms</span>
              </div>
              <pre
                v-if="s.outputs && Object.keys(s.outputs).length > 0"
                class="mt-1 whitespace-pre-wrap"
              >{{ JSON.stringify(s.outputs, null, 2) }}</pre>
              <div v-if="s.error" class="text-red-500">{{ s.error }}</div>
            </div>
          </div>
        </template>
      </div>
    </Drawer>

    <Card class="mt-6" title="后端支持的节点类型">
      <div v-for="(items, cat) in grouped" :key="cat" class="mb-3">
        <div class="mb-1 text-xs text-gray-500">
          {{ categoryLabels[cat] ?? cat }}
        </div>
        <div class="flex flex-wrap gap-2">
          <Tag v-for="t in items" :key="t.name" color="processing">
            {{ t.name }}
          </Tag>
        </div>
      </div>
    </Card>
  </Page>
</template>

<style scoped>
.dify-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}
.dify-card {
  position: relative;
  height: 180px;
  padding: 14px 16px 12px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  cursor: pointer;
  transition:
    box-shadow 0.15s ease,
    transform 0.15s ease,
    background 0.15s ease;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
:global(.dark) .dify-card {
  background: #1f1f1f;
  border-color: #2d2d2d;
}
.dify-card:hover {
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.08);
  transform: translateY(-1px);
}
.dify-card-new {
  border: 1.5px dashed #c7d2fe;
  background: linear-gradient(135deg, #f5f9ff 0%, #f0f5ff 100%);
}
.dify-card-new:hover {
  border-color: #6366f1;
  background: linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%);
}
.dify-new-inner {
  margin: auto 0;
  text-align: center;
  color: #6366f1;
}
.dify-new-plus {
  font-size: 42px;
  line-height: 1;
  font-weight: 200;
}
.dify-new-text {
  margin-top: 6px;
  font-size: 15px;
  font-weight: 500;
}
.dify-new-sub {
  margin-top: 4px;
  font-size: 12px;
  color: #94a3b8;
}
.dify-header {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}
.dify-icon {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  font-size: 22px;
}
.dify-title-wrap {
  min-width: 0;
  flex: 1;
}
.dify-title {
  font-size: 15px;
  font-weight: 600;
  color: #111827;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
:global(.dark) .dify-title {
  color: #f3f4f6;
}
.dify-meta {
  margin-top: 4px;
  font-size: 12px;
  color: #6b7280;
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
}
.dify-desc {
  margin-top: 10px;
  font-size: 13px;
  color: #6b7280;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.dify-spacer {
  flex: 1;
}
.dify-footer {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 12px;
  color: #6b7280;
  border-top: 1px solid #f3f4f6;
  padding-top: 8px;
}
:global(.dark) .dify-footer {
  border-top-color: #2d2d2d;
}
.dify-footer-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.dify-more {
  position: absolute;
  top: 8px;
  right: 8px;
  opacity: 0;
  transition: opacity 0.15s ease;
}
.dify-card:hover .dify-more {
  opacity: 1;
}
.dify-more-btn {
  font-size: 18px;
  line-height: 1;
  padding: 0 6px;
  height: 26px;
}
</style>
