<script setup lang="ts">
/**
 * /knowledge — thin adapter for vue-agent-start.
 *
 * The entire feature (card grid, wizard, detail drawer, chunks browser, and
 * the "先注册 Embedding 模型" empty-state nudge) lives inside
 * {@code <KnowledgeHubApp>}. The demo just:
 *   1. Builds the {@code KnowledgeHubApi} bag via {@code createSpringAgentStartAdapter}.
 *   2. Wires toast helpers, the copy-api handler, and the "去配置模型"
 *      redirect callback to whatever this app already has.
 *
 * That's it. No route configs, no dialog plumbing, no data-source glue.
 */
import { KnowledgeHubApp, createSpringAgentStartAdapter } from 'vue-agent-start';
import { message } from 'ant-design-vue';
import { useRouter } from 'vue-router';

const router = useRouter();

// Single adapter, whole KnowledgeHubApi. Everything the plugin needs is
// declared here — no downstream file has to know the wire shapes.
const api = createSpringAgentStartAdapter({
  // baseUrl 只传宿主代理前缀（默认 /api，可省略）；/agent-start 命名空间由适配器内部拼。
  onSuccess: (msg: string) => message.success(msg),
  onError: (msg: string) => message.error(msg),
  onCopyApi: (id: string) => {
    const url = `${window.location.origin}/api/agent-start/datasets/${id}`;
    navigator.clipboard.writeText(url).then(
      () => message.success('已复制 API 地址'),
      () => message.error('复制失败'),
    );
  },
  onGoToEmbeddingSetup: () => {
    router.push({ name: 'ModelList' });
  },
});
</script>

<template>
  <KnowledgeHubApp :api="api" />
</template>
