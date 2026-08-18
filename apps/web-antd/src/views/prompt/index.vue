<script setup lang="ts">
/**
 * Prompt 模板库：新建/编辑 prompt 模板，可预览渲染结果。Agent / workflow LLM
 * 节点都能从这里"载入"prompt，避免每次都手写系统提示。
 */
import { onMounted, reactive, ref } from 'vue';

import { Page } from '@vben/common-ui';

import {
  Button,
  Card,
  Empty,
  Form,
  FormItem,
  Input,
  message,
  Modal,
  Popconfirm,
  Table,
  Tag,
  Textarea,
} from 'ant-design-vue';

import {
  createTemplate,
  deleteTemplate,
  listTemplates,
  type PromptTemplate,
  renderTemplate,
  type TemplateReference,
  templateReferences,
  templateVariables,
  updateTemplate,
} from '#/api/prompt';

const templates = ref<PromptTemplate[]>([]);
const loading = ref(false);
const filterCategory = ref<string | undefined>(undefined);

const showEdit = ref(false);
const submitting = ref(false);
const form = reactive({
  id: '' as string | '',
  name: '',
  category: '',
  description: '',
  content: '',
});

// preview
const showPreview = ref(false);
const previewVarsJson = ref('{}');
const previewRendered = ref<string | null>(null);
const previewLoading = ref(false);
const previewId = ref<string | null>(null);
const previewNeededVars = ref<string[]>([]);

async function refresh() {
  loading.value = true;
  try {
    templates.value = await listTemplates(filterCategory.value);
  } finally {
    loading.value = false;
  }
}

function openCreate() {
  form.id = '';
  form.name = '';
  form.category = '';
  form.description = '';
  form.content = '';
  showEdit.value = true;
}

function openEdit(row: any) {
  const t = row as PromptTemplate;
  form.id = t.id;
  form.name = t.name;
  form.category = t.category ?? '';
  form.description = t.description ?? '';
  form.content = t.content;
  showEdit.value = true;
}

async function submitEdit() {
  if (!form.name || !form.content) {
    message.warning('请填写名称和内容');
    return;
  }
  submitting.value = true;
  try {
    const payload = {
      name: form.name,
      category: form.category || undefined,
      description: form.description || undefined,
      content: form.content,
    };
    if (form.id) {
      await updateTemplate(form.id, payload);
      message.success('已更新');
    } else {
      await createTemplate(payload);
      message.success('已保存');
    }
    showEdit.value = false;
    await refresh();
  } finally {
    submitting.value = false;
  }
}

async function remove(row: any) {
  // Warn the user if the template is in use — deleting without notice would break
  // running workflows.
  const t = row as PromptTemplate;
  try {
    const refs = await templateReferences(t.id);
    if (refs.length > 0) {
      message.warning(`该模板被 ${refs.length} 个工作流引用，请先解绑再删除`);
      return;
    }
  } catch {
    // best-effort — allow delete if references API failed
  }
  await deleteTemplate(t.id);
  message.success('已删除');
  await refresh();
}

// -- references preview modal, shown from a small info button on each row --
const showRefs = ref(false);
const refsLoading = ref(false);
const refsList = ref<TemplateReference[]>([]);
const refsFor = ref<PromptTemplate | null>(null);

async function openRefs(row: any) {
  refsFor.value = row as PromptTemplate;
  refsList.value = [];
  showRefs.value = true;
  refsLoading.value = true;
  try {
    refsList.value = await templateReferences(refsFor.value.id);
  } finally {
    refsLoading.value = false;
  }
}

async function openPreview(row: any) {
  const t = row as PromptTemplate;
  previewId.value = t.id;
  previewRendered.value = null;
  previewNeededVars.value = [];
  try {
    previewNeededVars.value = await templateVariables(t.id);
    // seed the preview vars form with empty strings for each detected variable.
    const seed: Record<string, string> = {};
    for (const v of previewNeededVars.value) {
      seed[v] = '';
    }
    previewVarsJson.value = JSON.stringify(seed, null, 2);
  } catch {
    previewVarsJson.value = '{}';
  }
  showPreview.value = true;
}

async function doRender() {
  if (!previewId.value) return;
  let vars: Record<string, unknown> = {};
  try {
    vars = previewVarsJson.value.trim() ? JSON.parse(previewVarsJson.value) : {};
  } catch (e: any) {
    message.error(`变量 JSON 无效: ${e?.message ?? e}`);
    return;
  }
  previewLoading.value = true;
  try {
    const r = await renderTemplate(previewId.value, vars);
    previewRendered.value = r.rendered;
  } finally {
    previewLoading.value = false;
  }
}

onMounted(refresh);

const columns = [
  { title: '名称', dataIndex: 'name', key: 'name' },
  { title: '分类', dataIndex: 'category', key: 'category', width: 130 },
  { title: '描述', dataIndex: 'description', key: 'description' },
  { title: '更新时间', dataIndex: 'updatedAt', key: 'updatedAt', width: 180 },
  { title: '操作', key: 'action', width: 220 },
];
</script>

<template>
  <Page
    title="Prompt 模板"
    description="集中管理常用系统提示 / 分类器 / 摘要器等模板。Agent 和 workflow LLM 节点都能引用。"
  >
    <Card>
      <div class="mb-3 flex flex-wrap items-center gap-2">
        <Button type="primary" @click="openCreate">新建模板</Button>
        <Input
          v-model:value="filterCategory"
          placeholder="按分类筛选（如 summarization）"
          allow-clear
          style="width: 240px"
          @press-enter="refresh"
          @change="refresh"
        />
        <span class="text-xs text-gray-500 ml-auto">共 {{ templates.length }} 个</span>
      </div>
      <Empty
        v-if="!loading && templates.length === 0"
        description="没有模板。点击“新建模板”从零开始。"
      />
      <Table
        v-else
        row-key="id"
        :columns="columns"
        :data-source="templates"
        :loading="loading"
        :pagination="{ pageSize: 10 }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'category'">
            <Tag v-if="record.category" color="processing">{{ record.category }}</Tag>
          </template>
          <template v-else-if="column.key === 'action'">
            <Button type="link" size="small" @click="openPreview(record)">预览</Button>
            <Button type="link" size="small" @click="openRefs(record)">引用者</Button>
            <Button type="link" size="small" @click="openEdit(record)">编辑</Button>
            <Popconfirm title="删除该模板？" @confirm="remove(record)">
              <Button type="link" size="small" danger>删除</Button>
            </Popconfirm>
          </template>
        </template>
      </Table>
    </Card>

    <Modal
      v-model:open="showEdit"
      :title="form.id ? '编辑模板' : '新建模板'"
      width="720px"
      :confirm-loading="submitting"
      @ok="submitEdit"
    >
      <Form :model="form" layout="vertical">
        <FormItem label="名称" required>
          <Input v-model:value="form.name" placeholder="例如 summarize-en" />
        </FormItem>
        <div class="grid grid-cols-2 gap-4">
          <FormItem label="分类">
            <Input v-model:value="form.category" placeholder="summarization / classifier / …" />
          </FormItem>
          <FormItem label="描述">
            <Input v-model:value="form.description" placeholder="用途简介" />
          </FormItem>
        </div>
        <FormItem label="模板内容（支持 {{#var#}} 占位）" required>
          <Textarea
            v-model:value="form.content"
            :rows="10"
            style="font-family: monospace; font-size: 12px;"
            placeholder="You are a helpful assistant. Summarize:\n{{#input#}}"
          />
        </FormItem>
      </Form>
    </Modal>

    <Modal
      v-model:open="showPreview"
      title="预览渲染"
      width="720px"
      :footer="null"
    >
      <div class="mb-2 text-xs text-gray-500">
        模板变量：
        <Tag v-for="v in previewNeededVars" :key="v" color="processing">{{ v }}</Tag>
        <span v-if="previewNeededVars.length === 0" class="text-gray-400">无 —— 直接渲染即可</span>
      </div>
      <div class="text-xs text-gray-500 mb-1">变量 JSON</div>
      <Textarea
        v-model:value="previewVarsJson"
        :rows="6"
        style="font-family: monospace; font-size: 12px;"
      />
      <div class="mt-3 flex gap-2">
        <Button type="primary" :loading="previewLoading" @click="doRender">渲染</Button>
      </div>
      <div v-if="previewRendered !== null" class="mt-3">
        <div class="text-xs text-gray-500 mb-1">渲染结果</div>
        <pre class="rounded bg-gray-50 p-2 text-xs whitespace-pre-wrap">{{ previewRendered }}</pre>
      </div>
    </Modal>

    <Modal
      v-model:open="showRefs"
      :title="refsFor ? `引用者 · ${refsFor.name}` : '引用者'"
      :footer="null"
    >
      <div v-if="refsLoading" class="text-center py-6 text-gray-400">加载中...</div>
      <div v-else-if="refsList.length === 0" class="text-center py-6 text-sm text-gray-400">
        暂无引用。可以安全地重命名或删除。
      </div>
      <div v-else>
        <div class="mb-2 text-xs text-gray-500">
          以下资源在 <code>systemPromptTemplateId</code> 里引用了本模板：
        </div>
        <div
          v-for="r in refsList"
          :key="r.kind + r.id"
          class="mb-2 rounded border p-2 text-sm"
        >
          <Tag color="processing">{{ r.kind }}</Tag>
          <span class="ml-2">{{ r.name }}</span>
          <span class="ml-2 text-xs text-gray-400">{{ r.id.slice(0, 8) }}</span>
        </div>
      </div>
    </Modal>
  </Page>
</template>
