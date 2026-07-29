<script setup lang="ts">
/**
 * 工具页：列出所有已注册工具（含 MCP / built-in），试运行界面支持
 * (1) 根据 JSON Schema 自动生成表单
 * (2) 最近 5 次调用历史（含参数、返回、耗时、成功/失败）
 * (3) 延时徽章 + 一键复制 curl
 */
import { computed, onMounted, reactive, ref } from 'vue';

import { Page } from '@vben/common-ui';

import {
  Button,
  Card,
  Dropdown,
  Empty,
  Input,
  InputNumber,
  Menu,
  MenuItem,
  message,
  Modal,
  Radio,
  RadioGroup,
  Spin,
  Switch,
  Table,
  Tag,
} from 'ant-design-vue';

import { invokeTool, listTools, type ToolView } from '#/api/tools';

const tools = ref<ToolView[]>([]);
const loading = ref(false);
const showRun = ref(false);
const running = ref(false);
const current = ref<null | ToolView>(null);
const searchText = ref('');

// -------- form vs raw JSON args --------
const inputMode = ref<'form' | 'json'>('form');
const argsJson = ref('{}');
const formArgs = reactive({} as Record<string, unknown>);

// -------- output + history --------
const output = ref<null | string>(null);
const lastLatencyMs = ref<null | number>(null);
const lastOk = ref<boolean>(true);

interface RunEntry {
  args: Record<string, unknown>;
  latencyMs: number;
  ok: boolean;
  output: string;
  ts: number;
}
const history = ref<Record<string, RunEntry[]>>({});

function historyKey(name: string): string {
  return `spring-agent:tool-history:${name}`;
}
function loadHistoryFor(name: string): RunEntry[] {
  try {
    const raw = localStorage.getItem(historyKey(name));
    if (!raw) return [];
    return JSON.parse(raw) as RunEntry[];
  } catch {
    return [];
  }
}
function persistHistory(name: string, list: RunEntry[]) {
  history.value[name] = list;
  localStorage.setItem(historyKey(name), JSON.stringify(list));
}

const currentHistory = computed(() =>
  current.value ? (history.value[current.value.name] ?? []) : [],
);

// -------- schema parsing (best-effort) --------
interface SchemaField {
  name: string;
  type: 'boolean' | 'integer' | 'number' | 'string';
  required: boolean;
  description?: string;
  defaultValue?: unknown;
  enumValues?: unknown[];
}

const currentSchema = computed<null | { fields: SchemaField[] }>(() => {
  if (!current.value?.inputSchema) return null;
  try {
    const s =
      typeof current.value.inputSchema === 'string'
        ? JSON.parse(current.value.inputSchema)
        : current.value.inputSchema;
    if (!s || typeof s !== 'object' || !s.properties) return null;
    const required = Array.isArray(s.required) ? new Set(s.required) : new Set();
    const fields: SchemaField[] = Object.entries(
      s.properties as Record<string, any>,
    ).map(([k, v]) => ({
      name: k,
      type: normalizeType(v?.type),
      required: required.has(k),
      description: v?.description,
      defaultValue: v?.default,
      enumValues: Array.isArray(v?.enum) ? v.enum : undefined,
    }));
    return { fields };
  } catch {
    return null;
  }
});

function normalizeType(t: string | undefined): SchemaField['type'] {
  if (t === 'integer' || t === 'number' || t === 'boolean') return t;
  return 'string';
}

// -------- lifecycle --------
async function refresh() {
  loading.value = true;
  try {
    tools.value = await listTools();
  } finally {
    loading.value = false;
  }
}

function openRun(t: any) {
  current.value = t as ToolView;
  argsJson.value = '{}';
  output.value = null;
  lastLatencyMs.value = null;
  Object.keys(formArgs).forEach((k) => delete formArgs[k]);
  // Seed form defaults from the schema, if present
  if (currentSchema.value) {
    for (const f of currentSchema.value.fields) {
      if (f.defaultValue !== undefined) {
        formArgs[f.name] = f.defaultValue;
      } else if (f.type === 'boolean') {
        formArgs[f.name] = false;
      } else if (f.type === 'integer' || f.type === 'number') {
        formArgs[f.name] = null;
      } else {
        formArgs[f.name] = '';
      }
    }
    inputMode.value = 'form';
  } else {
    inputMode.value = 'json';
  }
  history.value[t.name] = loadHistoryFor(t.name);
  showRun.value = true;
}

function currentArgs(): Record<string, unknown> {
  if (inputMode.value === 'form' && currentSchema.value) {
    // Drop empty strings + nulls so servers using strict validation don't complain.
    const out: Record<string, unknown> = {};
    for (const f of currentSchema.value.fields) {
      const v = formArgs[f.name];
      if (v === '' || v === null || v === undefined) continue;
      out[f.name] = v;
    }
    return out;
  }
  return argsJson.value.trim() ? JSON.parse(argsJson.value) : {};
}

async function run() {
  if (!current.value) return;
  let args: Record<string, unknown>;
  try {
    args = currentArgs();
  } catch (e: any) {
    message.error(`参数不是合法 JSON: ${e?.message ?? e}`);
    return;
  }
  running.value = true;
  const started = performance.now();
  let ok = true;
  let outText: string;
  try {
    const result = await invokeTool(current.value.name, args);
    outText = typeof result === 'string' ? result : JSON.stringify(result, null, 2);
  } catch (e: any) {
    ok = false;
    outText = `❌ ${e?.message ?? e}`;
  } finally {
    running.value = false;
  }
  const elapsed = Math.round(performance.now() - started);
  output.value = outText;
  lastLatencyMs.value = elapsed;
  lastOk.value = ok;

  const list = history.value[current.value.name] ?? [];
  const entry: RunEntry = {
    args,
    latencyMs: elapsed,
    ok,
    output: outText,
    ts: Date.now(),
  };
  persistHistory(current.value.name, [entry, ...list].slice(0, 5));
}

function replayHistory(h: RunEntry) {
  if (!current.value) return;
  argsJson.value = JSON.stringify(h.args, null, 2);
  inputMode.value = 'json';
  output.value = h.output;
  lastLatencyMs.value = h.latencyMs;
  lastOk.value = h.ok;
}

function clearHistory() {
  if (!current.value) return;
  persistHistory(current.value.name, []);
  message.success('已清空历史');
}

function copyCurl() {
  if (!current.value) return;
  let args: Record<string, unknown>;
  try {
    args = currentArgs();
  } catch {
    args = {};
  }
  const cmd =
    `curl -X POST http://localhost:18090/api/tools/${encodeURIComponent(current.value.name)}/invoke \\\n` +
    `  -H "Content-Type: application/json" \\\n` +
    `  -d '${JSON.stringify(args).replace(/'/g, `'\\''`)}'`;
  navigator.clipboard.writeText(cmd).then(
    () => message.success('已复制 curl'),
    () => message.error('复制失败'),
  );
}

const filteredTools = computed(() => {
  const q = searchText.value.trim().toLowerCase();
  if (!q) return tools.value;
  return tools.value.filter(
    (t) =>
      t.name.toLowerCase().includes(q) ||
      (t.description ?? '').toLowerCase().includes(q),
  );
});

const columns = [
  { title: '名称', dataIndex: 'name', key: 'name', width: 240 },
  { title: '说明', dataIndex: 'description', key: 'description' },
  { title: '操作', key: 'action', width: 120 },
];

function relTime(ms: number): string {
  const diff = (Date.now() - ms) / 1000;
  if (diff < 60) return `${Math.max(1, Math.floor(diff))}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

onMounted(refresh);
</script>

<template>
  <Page
    title="工具"
    description="Agent 可调用的所有工具（内置 + MCP）。点击试运行验证工具本身可用。"
  >
    <Card>
      <div class="mb-3 flex items-center justify-between gap-2">
        <div class="text-sm text-gray-500">共 {{ tools.length }} 个工具</div>
        <Input.Search
          v-model:value="searchText"
          placeholder="搜索工具"
          style="width: 240px"
          allow-clear
        />
      </div>
      <Table
        row-key="name"
        :columns="columns"
        :data-source="filteredTools"
        :loading="loading"
        :pagination="{ pageSize: 12 }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'name'">
            <Tag color="processing">{{ record.name }}</Tag>
          </template>
          <template v-else-if="column.key === 'action'">
            <Button type="link" size="small" @click="openRun(record)">
              试运行
            </Button>
          </template>
        </template>
      </Table>
    </Card>

    <Modal
      v-model:open="showRun"
      :title="`试运行 · ${current?.name ?? ''}`"
      width="820px"
    >
      <template #footer>
        <Button @click="showRun = false">关闭</Button>
        <Button @click="copyCurl">复制 curl</Button>
        <Button type="primary" :loading="running" @click="run">运行</Button>
      </template>

      <div class="mb-2 text-sm text-gray-500">{{ current?.description }}</div>

      <div v-if="currentSchema" class="mb-2 flex items-center gap-2">
        <span class="text-xs text-gray-500">参数输入方式：</span>
        <RadioGroup v-model:value="inputMode" size="small">
          <Radio value="form">表单</Radio>
          <Radio value="json">JSON</Radio>
        </RadioGroup>
      </div>

      <!-- Form mode: rendered from JSON Schema -->
      <div v-if="inputMode === 'form' && currentSchema" class="mb-3">
        <div
          v-for="f in currentSchema.fields"
          :key="f.name"
          class="mb-2"
        >
          <div class="mb-1 text-xs">
            <span class="font-medium">{{ f.name }}</span>
            <Tag v-if="f.required" color="red" style="margin-left: 4px">
              必填
            </Tag>
            <Tag style="margin-left: 4px">{{ f.type }}</Tag>
            <span v-if="f.description" class="ml-2 text-gray-500">
              {{ f.description }}
            </span>
          </div>
          <template v-if="f.enumValues">
            <RadioGroup
              v-model:value="formArgs[f.name]"
              :options="f.enumValues.map((v) => ({ label: String(v), value: v }))"
            />
          </template>
          <template v-else-if="f.type === 'boolean'">
            <Switch v-model:checked="formArgs[f.name] as boolean" />
          </template>
          <template v-else-if="f.type === 'integer' || f.type === 'number'">
            <InputNumber
              v-model:value="formArgs[f.name] as number"
              style="width: 100%"
            />
          </template>
          <template v-else>
            <Input.TextArea
              v-model:value="formArgs[f.name] as string"
              :auto-size="{ minRows: 1, maxRows: 4 }"
              :placeholder="f.description"
            />
          </template>
        </div>
      </div>

      <!-- JSON mode -->
      <template v-else>
        <div v-if="current?.inputSchema" class="mb-3">
          <div class="mb-1 text-xs text-gray-500">输入 Schema</div>
          <pre class="rounded bg-gray-50 p-2 text-xs">{{ current.inputSchema }}</pre>
        </div>
        <div class="mb-1 text-xs text-gray-500">调用参数（JSON）</div>
        <Input.TextArea
          v-model:value="argsJson"
          :rows="4"
          style="font-family: monospace; font-size: 12px"
        />
      </template>

      <!-- Output -->
      <Spin :spinning="running">
        <template v-if="output !== null">
          <div class="mt-3 mb-1 flex items-center gap-2 text-xs text-gray-500">
            <span>返回</span>
            <Tag v-if="lastLatencyMs !== null" :color="lastOk ? 'green' : 'red'">
              {{ lastLatencyMs }}ms · {{ lastOk ? 'ok' : 'error' }}
            </Tag>
          </div>
          <pre class="rounded bg-gray-50 p-2 text-xs">{{ output }}</pre>
        </template>
        <Empty v-else description="尚未运行" class="mt-3" />
      </Spin>

      <!-- History (last 5 runs) -->
      <div v-if="currentHistory.length > 0" class="mt-4">
        <div class="mb-2 flex items-center justify-between">
          <span class="text-xs text-gray-500">
            最近 {{ currentHistory.length }} 次运行
          </span>
          <Button type="link" size="small" danger @click="clearHistory">
            清空
          </Button>
        </div>
        <div
          v-for="(h, i) in currentHistory"
          :key="i"
          class="mb-2 rounded border p-2 text-xs"
        >
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <Tag :color="h.ok ? 'green' : 'red'" style="margin: 0">
                {{ h.ok ? 'ok' : 'error' }}
              </Tag>
              <span>{{ h.latencyMs }}ms</span>
              <span class="text-gray-400">· {{ relTime(h.ts) }}</span>
            </div>
            <Dropdown :trigger="['click']">
              <Button type="text" size="small">···</Button>
              <template #overlay>
                <Menu>
                  <MenuItem key="replay" @click="replayHistory(h)">
                    重放到编辑器
                  </MenuItem>
                </Menu>
              </template>
            </Dropdown>
          </div>
          <div class="mt-1 text-gray-500">
            args: {{ JSON.stringify(h.args) }}
          </div>
        </div>
      </div>
    </Modal>
  </Page>
</template>
