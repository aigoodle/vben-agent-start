<script setup lang="ts">
/**
 * 工作流"实时运行调试台"：
 *   - 左边一个 JSON 编辑器让你贴图定义
 *   - 中间一个变量输入面板
 *   - 点"运行"后，右边 timeline 实时接收 SSE 事件（run-start / step / result / error）
 *
 * 这是替代还没落地的可视化画布之前的临时体验层——但它其实非常好用：
 * 你可以从 /api/node-types 拷模板、直接观察每一步的输入输出，
 * 对比 Dify 的 workflow debug UI 差不多是同一个用途。
 */
import { computed, onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';

import { useRoute, useRouter } from 'vue-router';

import {
  Button,
  Card,
  Empty,
  Form,
  FormItem,
  Input,
  message,
  Modal,
  Tag,
  Tabs,
  TabPane,
  Timeline,
  TimelineItem,
  Tooltip,
} from 'ant-design-vue';

import {
  getWorkflow,
  listNodeTypes,
  listWorkflowExamples,
  type NodeTypeMeta,
  saveWorkflow,
  type WorkflowExample,
  updateWorkflow,
} from '#/api/workflow';

const nodeTypes = ref<NodeTypeMeta[]>([]);
const route = useRoute();
const router = useRouter();

/** When set, the playground is editing an existing saved workflow. */
const editingId = ref<string | undefined>(undefined);
const examples = ref<WorkflowExample[]>([]);

function applyExample(id: string) {
  const ex = examples.value.find((e) => e.id === id);
  if (!ex) return;
  graphJson.value = JSON.stringify(ex.graph, null, 2);
  inputsJson.value = JSON.stringify(ex.defaultInputs ?? {}, null, 2);
  editingId.value = undefined;
  editingName.value = '';
  reset();
  message.info(`已加载示例: ${ex.name}`);
}
const editingName = ref('');

const showSave = ref(false);
const savingName = ref('');
const savingMode = ref<'workflow' | 'chatflow'>('workflow');
const savingBusy = ref(false);

interface StreamStep {
  nodeId: string;
  nodeType: string;
  title?: string;
  outputs?: Record<string, unknown>;
  elapsedMillis?: number;
  failed?: boolean;
  error?: string;
  handle?: string;
}

interface StreamResult {
  runId: string;
  success: boolean;
  error?: string;
  outputs?: Record<string, unknown>;
}

const graphJson = ref(defaultGraph());
const inputsJson = ref('{"query": "你好"}');

const running = ref(false);
const steps = ref<StreamStep[]>([]);
const finalResult = ref<StreamResult | null>(null);
const errorMsg = ref<string | null>(null);
/** Which steps have their output body expanded — index-keyed for O(1) toggle. */
const expanded = ref<Record<number, boolean>>({});

const totalElapsed = computed(() => {
  if (steps.value.length === 0) return null;
  return steps.value.reduce((sum, s) => sum + (s.elapsedMillis ?? 0), 0);
});

function stepColor(s: StreamStep): string {
  if (s.failed) return 'red';
  return 'green';
}

/** Color the elapsed-time badge based on how slow the step was. */
function elapsedColor(ms?: number): string {
  if (ms == null) return 'default';
  if (ms > 2000) return 'red';
  if (ms > 500) return 'orange';
  return 'green';
}

function toggleStep(i: number) {
  expanded.value = { ...expanded.value, [i]: !expanded.value[i] };
}

const grouped = computed(() => {
  const acc: Record<string, NodeTypeMeta[]> = {};
  for (const n of nodeTypes.value) {
    (acc[n.category] ??= []).push(n);
  }
  return acc;
});

const categoryLabels: Record<string, string> = {
  flow: '流程控制',
  data: '数据处理',
  io: 'I/O',
  llm: 'LLM 相关',
};

onMounted(async () => {
  nodeTypes.value = await listNodeTypes();
  try {
    examples.value = await listWorkflowExamples();
  } catch {
    examples.value = [];
  }
  // Load a saved workflow if the router pushed us here with an id.
  const id = route.query.id as string | undefined;
  if (id) {
    try {
      const entity = await getWorkflow(id);
      editingId.value = entity.id;
      editingName.value = entity.name ?? '未命名工作流';
      if (entity.graph) {
        // Backend returns `graph` as a JSON object (JacksonTypeHandler); the
        // JSON playground textarea wants a pretty-printed string.
        graphJson.value = JSON.stringify(entity.graph, null, 2);
      }
    } catch (e: any) {
      message.error(`加载工作流失败: ${e?.message ?? e}`);
    }
  }
});

function parseGraphOrThrow(): unknown {
  return JSON.parse(graphJson.value);
}

async function save() {
  let graph: unknown;
  try {
    graph = parseGraphOrThrow();
  } catch (e: any) {
    message.error(`图 JSON 无效: ${e?.message ?? e}`);
    return;
  }
  if (editingId.value) {
    savingBusy.value = true;
    try {
      await updateWorkflow(editingId.value, {
        name: editingName.value,
        mode: 'workflow',
        graph: graph as any,
      });
      message.success('已更新');
    } finally {
      savingBusy.value = false;
    }
  } else {
    savingName.value = '';
    showSave.value = true;
  }
}

async function submitSave() {
  if (!savingName.value.trim()) {
    message.warning('请填写名称');
    return;
  }
  let graph: unknown;
  try {
    graph = parseGraphOrThrow();
  } catch (e: any) {
    message.error(`图 JSON 无效: ${e?.message ?? e}`);
    return;
  }
  savingBusy.value = true;
  try {
    // The backend requires appId — every workflow row is scoped to an app so
    // subsequent saves upsert the same row. The playground has no real app,
    // so mint a scratch id per new-save session; the user's browser URL
    // (?id=<uuid>) becomes the app-scoped handle.
    const appId = crypto.randomUUID();
    const saved = await saveWorkflow({
      appId,
      name: savingName.value,
      mode: savingMode.value,
      graph: graph as any,
    });
    editingId.value = saved.id;
    editingName.value = saved.name ?? '未命名工作流';
    showSave.value = false;
    message.success('已保存');
    router.replace({ name: 'WorkflowPlayground', query: { id: saved.id } });
  } finally {
    savingBusy.value = false;
  }
}

function defaultGraph() {
  return JSON.stringify(
    {
      nodes: [
        { id: 'start', type: 'START' },
        {
          id: 'greet',
          type: 'TEMPLATE_TRANSFORM',
          data: {
            template: '你好，{{#sys.query#}}。这是一个 workflow 演示。',
            outputKey: 'msg',
          },
        },
        {
          id: 'end',
          type: 'END',
          data: { outputs: { answer: '{{#greet.msg#}}' } },
        },
      ],
      edges: [
        { source: 'start', target: 'greet' },
        { source: 'greet', target: 'end' },
      ],
    },
    null,
    2,
  );
}

function reset() {
  steps.value = [];
  finalResult.value = null;
  errorMsg.value = null;
  expanded.value = {};
}

async function run() {
  reset();
  let graph: unknown;
  let inputs: unknown;
  try {
    graph = JSON.parse(graphJson.value);
    inputs = inputsJson.value.trim() ? JSON.parse(inputsJson.value) : {};
  } catch (e: any) {
    message.error(`JSON 解析失败: ${e?.message ?? e}`);
    return;
  }
  running.value = true;
  try {
    const res = await fetch('/api/workflows/run-graph/stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
      },
      body: JSON.stringify({ graph, inputs }),
    });
    if (!res.ok || !res.body) {
      throw new Error(`HTTP ${res.status}`);
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = '';
    let event = 'message';
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const parts = buf.split(/\r?\n\r?\n/);
      buf = parts.pop() ?? '';
      for (const chunk of parts) {
        let data = '';
        for (const line of chunk.split(/\r?\n/)) {
          if (line.startsWith('event:')) event = line.slice(6).trim();
          else if (line.startsWith('data:')) data += line.slice(5).trim();
        }
        if (!data) continue;
        try {
          const parsed = JSON.parse(data);
          if (event === 'step') {
            const idx = steps.value.length;
            steps.value = [...steps.value, parsed];
            // Auto-expand steps that failed — the user almost always wants to
            // see the error payload immediately without an extra click.
            if (parsed.failed) {
              expanded.value = { ...expanded.value, [idx]: true };
            }
          } else if (event === 'result') {
            finalResult.value = parsed;
          } else if (event === 'error') {
            errorMsg.value = parsed.message ?? '未知错误';
          }
        } catch (e) {
          // fall through
        }
      }
    }
  } catch (e: any) {
    errorMsg.value = e?.message ?? String(e);
    message.error(String(e));
  } finally {
    running.value = false;
  }
}
</script>

<template>
  <Page title="工作流调试台" description="粘贴一段 workflow JSON、填输入变量，运行后右侧实时看每一节点的输出。">
    <div class="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <Card title="节点面板">
        <div v-for="(items, cat) in grouped" :key="cat" class="mb-2">
          <div class="text-xs text-gray-500 mb-1">{{ categoryLabels[cat] ?? cat }}</div>
          <div class="flex flex-wrap gap-1">
            <Tooltip v-for="t in items" :key="t.name">
              <template #title>{{ t.name }}</template>
              <Tag color="processing">{{ t.name }}</Tag>
            </Tooltip>
          </div>
        </div>
      </Card>

      <Card title="运行结果">
        <div v-if="errorMsg" class="rounded bg-red-50 p-2 text-sm text-red-600 mb-2">
          ❌ {{ errorMsg }}
        </div>
        <div v-if="finalResult" class="mb-3 rounded border p-2 text-sm">
          <Tag :color="finalResult.success ? 'green' : 'red'">
            {{ finalResult.success ? '成功' : '失败' }}
          </Tag>
          <span class="ml-1 text-gray-500">runId {{ finalResult.runId?.slice(0, 8) }}</span>
          <span v-if="totalElapsed !== null" class="ml-2 text-gray-500">
            · 总耗时 {{ totalElapsed }}ms
          </span>
          <pre v-if="finalResult.outputs" class="mt-2 whitespace-pre-wrap text-xs">{{ JSON.stringify(finalResult.outputs, null, 2) }}</pre>
        </div>
        <Empty v-if="steps.length === 0 && !finalResult" description="点击运行看事件" />
        <Timeline v-if="steps.length > 0" class="wp-timeline">
          <TimelineItem
            v-for="(s, i) in steps"
            :key="i"
            :color="stepColor(s)"
          >
            <div class="wp-step-head">
              <div class="wp-step-title">
                <Tag :color="s.failed ? 'red' : 'blue'">{{ s.nodeType }}</Tag>
                <span class="wp-step-id">{{ s.nodeId }}</span>
                <Tag v-if="s.handle" color="purple" class="wp-step-handle">
                  → {{ s.handle }}
                </Tag>
              </div>
              <div class="wp-step-meta">
                <Tag :color="elapsedColor(s.elapsedMillis)">
                  {{ s.elapsedMillis ?? '?' }}ms
                </Tag>
                <button
                  class="wp-step-toggle"
                  :title="expanded[i] ? '收起' : '展开输出'"
                  @click="toggleStep(i)"
                >
                  {{ expanded[i] ? '−' : '+' }}
                </button>
              </div>
            </div>
            <div v-if="expanded[i]" class="wp-step-body">
              <pre v-if="s.outputs && Object.keys(s.outputs).length > 0" class="whitespace-pre-wrap text-xs">{{ JSON.stringify(s.outputs, null, 2) }}</pre>
              <div v-else class="text-xs text-gray-400">（此节点无输出）</div>
              <div v-if="s.error" class="mt-1 text-red-500 text-xs">
                ⚠ {{ s.error }}
              </div>
            </div>
          </TimelineItem>
          <TimelineItem v-if="running" color="blue">
            <div class="text-xs text-gray-500 wp-step-pending">
              <span class="wp-pulse">●</span> 等待下一步…
            </div>
          </TimelineItem>
        </Timeline>
      </Card>
    </div>

    <Card class="mt-4" title="图 JSON + 变量">
      <Tabs>
        <TabPane key="graph" tab="图 (WorkflowGraph JSON)">
          <Input.TextArea
            v-model:value="graphJson"
            :rows="14"
            style="font-family: monospace; font-size: 12px;"
          />
        </TabPane>
        <TabPane key="inputs" tab="输入变量 (sys.*)">
          <Input.TextArea
            v-model:value="inputsJson"
            :rows="6"
            style="font-family: monospace; font-size: 12px;"
          />
        </TabPane>
      </Tabs>
      <div class="mt-3 flex flex-wrap items-center gap-2">
        <Button type="primary" :loading="running" @click="run">运行</Button>
        <Button :disabled="running" @click="reset">清空</Button>
        <Button :loading="savingBusy" @click="save">
          {{ editingId ? `保存 · ${editingName || 'workflow'}` : '保存为工作流' }}
        </Button>
        <div v-if="examples.length > 0" class="flex items-center gap-1 ml-2">
          <span class="text-xs text-gray-500">示例:</span>
          <Tag
            v-for="ex in examples"
            :key="ex.id"
            class="cursor-pointer"
            color="processing"
            @click="applyExample(ex.id)"
          >
            <Tooltip :title="ex.description">
              <span>{{ ex.name }}</span>
            </Tooltip>
          </Tag>
        </div>
        <span v-if="editingId" class="text-xs text-gray-500 ml-2">
          正在编辑 <Tag>{{ editingId.slice(0, 8) }}</Tag>
        </span>
      </div>
    </Card>

    <Modal
      v-model:open="showSave"
      title="保存为工作流"
      :confirm-loading="savingBusy"
      @ok="submitSave"
    >
      <Form :model="{ name: savingName, mode: savingMode }" layout="vertical">
        <FormItem label="名称" required>
          <Input v-model:value="savingName" placeholder="例如 rag-answer-flow" />
        </FormItem>
        <FormItem label="模式">
          <div class="flex gap-2">
            <Tag
              :color="savingMode === 'workflow' ? 'processing' : 'default'"
              class="cursor-pointer"
              @click="savingMode = 'workflow'"
            >
              workflow（一次性）
            </Tag>
            <Tag
              :color="savingMode === 'chatflow' ? 'processing' : 'default'"
              class="cursor-pointer"
              @click="savingMode = 'chatflow'"
            >
              chatflow（对话）
            </Tag>
          </div>
        </FormItem>
      </Form>
    </Modal>
  </Page>
</template>

<style scoped>
.wp-timeline {
  padding-left: 4px;
}
.wp-step-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.wp-step-title {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  min-width: 0;
}
.wp-step-id {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px;
  color: #6b7280;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 160px;
}
.wp-step-handle {
  font-size: 11px !important;
}
.wp-step-meta {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}
.wp-step-toggle {
  width: 20px;
  height: 20px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  background: #f9fafb;
  color: #6b7280;
  cursor: pointer;
  font-size: 14px;
  line-height: 1;
  padding: 0;
  transition: background 0.15s;
}
.wp-step-toggle:hover {
  background: #e5e7eb;
  color: #111;
}
.wp-step-body {
  margin-top: 6px;
  padding: 6px 8px;
  background: #f9fafb;
  border-radius: 4px;
  border: 1px solid #f1f5f9;
}
.wp-step-body pre {
  margin: 0;
  max-height: 260px;
  overflow: auto;
}
.wp-step-pending {
  display: flex;
  align-items: center;
  gap: 4px;
}
.wp-pulse {
  color: #3b82f6;
  animation: wp-pulse 1s ease-in-out infinite;
}
@keyframes wp-pulse {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 1; }
}
</style>
