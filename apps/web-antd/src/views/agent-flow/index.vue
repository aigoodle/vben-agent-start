<script setup lang="ts">
import { nextTick, onMounted, ref, shallowRef } from 'vue';

import { FlowDesigner, NodeConfigCard } from 'vue-agent-start';
import {
  Button,
  Dropdown,
  Input,
  Menu,
  MenuItem,
  message,
  Modal,
} from 'ant-design-vue';

import {
  getWorkflow,
  listWorkflows,
  saveWorkflow as apiSaveWorkflow,
  updateWorkflow,
  type WorkflowEntity,
} from '#/api/workflow';

const designerRef = shallowRef<any>(null);
const selectedNode = ref<any>(null);

// Currently loaded workflow (null = brand-new draft). Standalone-playground
// entries have no real owning app — we mint a scratch UUID on first save so
// the backend's "workflows.id == appId" invariant still holds and subsequent
// saves in this session upsert the same row.
const currentId = ref<null | string>(null);
const currentName = ref('未命名工作流');
const workflows = ref<WorkflowEntity[]>([]);

// Name modal for first-time save
const showNameModal = ref(false);
const nameDraft = ref('');
const saving = ref(false);

function onNodeClick(node: any) {
  selectedNode.value = node;
}
function onNodeDelete() {
  selectedNode.value = null;
}
function onCloseConfig() {
  selectedNode.value = null;
}
function onConfigDataChange({ nodeId, data }: { nodeId: string; data: any }) {
  designerRef.value?.patchNodeData?.(nodeId, data);
}

async function refreshList() {
  try {
    workflows.value = await listWorkflows();
  } catch {
    workflows.value = [];
  }
}

async function loadWorkflow(wf: WorkflowEntity) {
  try {
    const full = await getWorkflow(wf.id);
    // Backend `graph` is a JSON object (JacksonTypeHandler) — no parse.
    const graph = full.graph ?? { nodes: [], edges: [] };
    designerRef.value?.reloadGraph?.(graph);
    currentId.value = full.id;
    currentName.value = full.name ?? '未命名工作流';
    message.success(`已加载 · ${currentName.value}`);
  } catch (e: any) {
    message.error(`加载失败: ${e?.message ?? e}`);
  }
}

function newWorkflow() {
  designerRef.value?.reloadGraph?.(null);
  currentId.value = null;
  currentName.value = '未命名工作流';
}

async function saveCurrent() {
  const flowInfo = designerRef.value?.getFlowInfo?.();
  if (!flowInfo) {
    message.error('无法读取当前画布');
    return;
  }
  saving.value = true;
  try {
    if (currentId.value) {
      // Update in place
      await updateWorkflow(currentId.value, {
        name: currentName.value,
        mode: 'workflow',
        graph: flowInfo,
      });
      message.success('已更新');
    } else {
      // First save — prompt for a name.
      nameDraft.value = currentName.value;
      showNameModal.value = true;
    }
  } catch (e: any) {
    message.error(`保存失败: ${e?.message ?? e}`);
  } finally {
    saving.value = false;
  }
}

async function submitFirstSave() {
  if (!nameDraft.value.trim()) {
    message.warning('请填写名称');
    return;
  }
  const flowInfo = designerRef.value?.getFlowInfo?.();
  if (!flowInfo) return;
  saving.value = true;
  try {
    // Backend requires appId — mint a scratch UUID for this standalone
    // playground row so the "id == appId" invariant is preserved.
    const appId = crypto.randomUUID();
    const wf = await apiSaveWorkflow({
      appId,
      name: nameDraft.value.trim(),
      mode: 'workflow',
      graph: flowInfo,
    });
    currentId.value = wf.id;
    currentName.value = wf.name ?? '未命名工作流';
    showNameModal.value = false;
    message.success('已保存');
    await refreshList();
  } catch (e: any) {
    message.error(`保存失败: ${e?.message ?? e}`);
  } finally {
    saving.value = false;
  }
}

async function testRun() {
  const flowInfo = designerRef.value?.getFlowInfo?.();
  if (!flowInfo) return;
  try {
    const { runGraph } = await import('#/api/workflow');
    const res = await runGraph({ graph: flowInfo, inputs: {} });
    if (res.success) {
      Modal.info({
        title: '试运行成功',
        width: 720,
        content: JSON.stringify(res.outputs ?? {}, null, 2),
      });
    } else {
      message.error(`试运行失败: ${res.error ?? 'unknown'}`);
    }
  } catch (e: any) {
    message.error(`试运行失败: ${e?.message ?? e}`);
  }
}

onMounted(async () => {
  await nextTick();
  designerRef.value?.reloadGraph?.(null);
  await refreshList();
});
</script>

<template>
  <div class="agent-flow-host">
    <div class="agent-flow-canvas">
      <!-- Top-right floating toolbar for save/load -->
      <div class="agent-flow-actionbar">
        <Input
          v-model:value="currentName"
          size="small"
          style="width: 220px"
          placeholder="工作流名称"
        />
        <Dropdown :trigger="['click']">
          <Button size="small">加载现有 ({{ workflows.length }})</Button>
          <template #overlay>
            <Menu>
              <MenuItem key="new" @click="newWorkflow">➕ 新建空白</MenuItem>
              <MenuItem
                v-for="wf in workflows"
                :key="wf.id"
                @click="loadWorkflow(wf)"
              >
                <div class="max-w-[240px] truncate">{{ wf.name }}</div>
                <div class="text-xs text-gray-500">
                  {{ wf.mode }} · v{{ wf.version ?? 1 }}
                </div>
              </MenuItem>
            </Menu>
          </template>
        </Dropdown>
        <Button size="small" @click="testRun">试运行</Button>
        <Button size="small" type="primary" :loading="saving" @click="saveCurrent">
          {{ currentId ? '更新' : '保存' }}
        </Button>
      </div>

      <FlowDesigner
        ref="designerRef"
        class="flowdesigner"
        mode="WORKFLOW"
        @node-click="onNodeClick"
        @node-delete="onNodeDelete"
      />
    </div>
    <div v-if="selectedNode" class="agent-flow-panel">
      <NodeConfigCard
        :select-node="selectedNode"
        @on-close="onCloseConfig"
        @data-change="onConfigDataChange"
      />
    </div>

    <Modal v-model:open="showNameModal" title="保存工作流" @ok="submitFirstSave">
      <Input v-model:value="nameDraft" placeholder="工作流名称" />
    </Modal>
  </div>
</template>

<style scoped>
.agent-flow-host {
  position: relative;
  display: flex;
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  background: #f5f7fa;
}

.agent-flow-canvas {
  position: relative;
  flex: 1;
  min-width: 0;
  height: 100%;
}

.agent-flow-actionbar {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 10;
  display: flex;
  gap: 6px;
  padding: 6px 10px;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  box-shadow: 0 3px 12px rgba(0, 0, 0, 0.06);
  align-items: center;
}

.flowdesigner {
  width: 100%;
  height: 100%;
}

.agent-flow-panel {
  flex: none;
  height: 100%;
  background: #fff;
  border-left: 1px solid #e5e7eb;
}
</style>
