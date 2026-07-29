<script setup lang="ts">
import { nextTick, onMounted, ref, shallowRef } from 'vue';

import { FlowDesigner, NodeConfigCard } from 'vue-agent-start';
import { Button, message, Space } from 'ant-design-vue';

/**
 * vue-agent-start 的调试入口
 *
 * 特意跟 /workflow/designer 生产入口分开：
 *   - 不接后端持久化 API，纯前端调试
 *   - 顶部有一条小工具栏方便快速验证 designer 的 defineExpose 方法
 *
 * 用途：迭代 designer 组件本身的样式/交互，验证不需要真跑一个工作流的场景。
 */

const designerRef = shallowRef<any>(null);
const selectedNode = ref<any>(null);
const mode = ref<'WORKFLOW' | 'CHATFLOW'>('WORKFLOW');

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

function onReset() {
  designerRef.value?.reloadGraph?.(null);
  selectedNode.value = null;
}

function onDumpGraph() {
  const info = designerRef.value?.getFlowInfo?.();
  // eslint-disable-next-line no-console
  console.log('[agent-flow debug] graph:', info);
  message.success(`已打印图数据到 console：${info?.nodes?.length ?? 0} 节点 / ${info?.edges?.length ?? 0} 边`);
}

function onValidate() {
  const errors = designerRef.value?.validateWorkflow?.() ?? [];
  if (errors.length === 0) message.success('校验通过');
  else message.warning(`校验失败：${errors.join('；')}`);
}

function toggleMode() {
  mode.value = mode.value === 'WORKFLOW' ? 'CHATFLOW' : 'WORKFLOW';
  onReset();
}

onMounted(async () => {
  await nextTick();
  designerRef.value?.reloadGraph?.(null);
});
</script>

<template>
  <div class="agent-flow-debug">
    <div class="agent-flow-debug-canvas">
      <!-- 顶部调试小工具栏（跟 designer 内建工具栏错开位置） -->
      <div class="agent-flow-debug-bar">
        <span class="agent-flow-debug-tag">DEBUG</span>
        <span class="agent-flow-debug-mode">
          mode = {{ mode }}
        </span>
        <Space :size="6">
          <Button size="small" @click="onReset">重置画布</Button>
          <Button size="small" @click="toggleMode">切换模式</Button>
          <Button size="small" @click="onDumpGraph">打印图数据</Button>
          <Button size="small" @click="onValidate">运行校验</Button>
        </Space>
      </div>

      <FlowDesigner
        ref="designerRef"
        class="agent-flow-debug-designer"
        :mode="mode"
        @node-click="onNodeClick"
        @node-delete="onNodeDelete"
      />
    </div>

    <div v-if="selectedNode" class="agent-flow-debug-panel">
      <NodeConfigCard
        :select-node="selectedNode"
        @on-close="onCloseConfig"
        @data-change="onConfigDataChange"
      />
    </div>
  </div>
</template>

<style scoped>
.agent-flow-debug {
  position: relative;
  display: flex;
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  background: #f5f7fa;
}

.agent-flow-debug-canvas {
  position: relative;
  flex: 1;
  min-width: 0;
  height: 100%;
}

.agent-flow-debug-bar {
  position: absolute;
  top: 12px;
  left: 12px;
  z-index: 11;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 10px;
  background: rgba(255, 255, 255, 0.97);
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  box-shadow: 0 3px 12px rgba(15, 23, 42, 0.08);
}

.agent-flow-debug-tag {
  padding: 2px 8px;
  font-size: 10px;
  font-weight: 700;
  color: #ffffff;
  background: linear-gradient(135deg, #f97316, #dc2626);
  border-radius: 4px;
  letter-spacing: 0.5px;
}

.agent-flow-debug-mode {
  font-size: 11px;
  color: #6b7280;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
}

.agent-flow-debug-designer {
  width: 100%;
  height: 100%;
}

.agent-flow-debug-panel {
  flex: none;
  height: 100%;
  background: #ffffff;
  border-left: 1px solid #e5e7eb;
}
</style>
