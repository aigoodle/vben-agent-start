<script setup lang="ts">
/**
 * Landing 页：探测后端各模块状态 + 给出下一步建议。
 * 后端 /system/info 会告诉我们哪些模块的 bean 存在（反射探测）；
 * 我们再拉一次 datasets/agents/models 的数量，就能给出精准的引导。
 */
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';

import { Button, Card, Statistic, Tag } from 'ant-design-vue';
import { useAgentStartClient } from 'vue-agent-start';

import { listAgents } from '#/api/agent';
import { listDatasets } from '#/api/knowledge';
import { listModels } from '#/api/model';
import { fetchTotal, type LlmUsageStats } from '#/api/observability';
import { fetchSystemInfo, type SystemInfo } from '#/api/system';
import { listTools } from '#/api/tools';
import { listTriggers } from '#/api/trigger';

const router = useRouter();
const agentStartClient = useAgentStartClient();

const info = ref<SystemInfo | null>(null);
const stats = ref({
  models: 0,
  datasets: 0,
  agents: 0,
  tools: 0,
  connectors: 0,
  triggers: 0,
});
const llmTotal = ref<LlmUsageStats | null>(null);

const firstStep = computed(() => {
  if (stats.value.models === 0) {
    return {
      title: '第一步：注册一个模型',
      detail:
        '所有能力都建立在模型之上。先选一个 LLM 供应商填 API Key，可选再加一个 Embedding 模型给知识库用。',
      route: 'ModelList',
      icon: '🧠',
    };
  }
  if (stats.value.datasets === 0 && stats.value.agents === 0) {
    return {
      title: '第二步：建一个知识库或智能体',
      detail:
        '有了模型就可以：上传文档做检索问答（知识库），或者定义一个能调用工具的 Agent。',
      route: 'KnowledgeList',
      icon: '📚',
    };
  }
  if ((llmTotal.value?.calls ?? 0) === 0) {
    return {
      title: '试试工作流调试台',
      detail: '把 LLM / 知识库 / 工具串成一张图，实时看每步的输入输出。',
      route: 'WorkflowPlayground',
      icon: '🧪',
    };
  }
  return {
    title: '查看 LLMOps 观测',
    detail: '看看每次调用的 token、成本、延时，按模型汇总。',
    route: 'LlmOps',
    icon: '📈',
  };
});

const costText = computed(() =>
  llmTotal.value
    ? (llmTotal.value.costMicros / 1_000_000).toFixed(4)
    : '0.0000',
);

// 四步接入指引：模型 → 知识库 → Connector → 智能体。
// 新用户按顺序点下来就能跑通一个最小可用的 RAG-agent。
const onboardingSteps = computed(() => [
  {
    n: 1,
    title: '建一个模型',
    detail: '选择供应商（OpenAI / DeepSeek / Ollama 等）填 API Key。',
    done: stats.value.models > 0,
    route: 'ModelList',
    doneText: `${stats.value.models} 个模型已就绪`,
  },
  {
    n: 2,
    title: '建一个知识库',
    detail: '上传 PDF / Markdown / TXT，选一个 embedding 模型自动切片入库。',
    done: stats.value.datasets > 0,
    route: 'KnowledgeList',
    doneText: `${stats.value.datasets} 个知识库已就绪`,
  },
  {
    n: 3,
    title: '接入外部生态',
    detail: '配置原生消息 Connector，接入邮件、IM、机器人等外部能力。',
    done: stats.value.connectors > 0,
    route: 'ConnectorHub',
    doneText: `${stats.value.connectors} 个连接器可用`,
  },
  {
    n: 4,
    title: '建一个智能体',
    detail: '选 LLM + 挂载知识库 / 工具，直接开聊。',
    done: stats.value.agents > 0,
    route: 'AgentList',
    doneText: `${stats.value.agents} 个智能体已就绪`,
  },
]);
const onboardingAllDone = computed(() =>
  onboardingSteps.value.every((s) => s.done),
);

// 每张状态卡的可视化配置——统一色系，方便扩展新模块。
const moduleCards = computed(() => [
  { title: '模型', count: stats.value.models, route: 'ModelList', icon: '🧠' },
  { title: '知识库', count: stats.value.datasets, route: 'KnowledgeList', icon: '📚' },
  { title: '智能体', count: stats.value.agents, route: 'AgentList', icon: '🤖' },
  { title: '工具', count: stats.value.tools, route: 'ToolsList', icon: '🔧' },
  { title: '连接器', count: stats.value.connectors, route: 'ConnectorHub', icon: '🔌' },
  { title: '触发器', count: stats.value.triggers, route: 'TriggerList', icon: '⚡' },
  { title: 'LLM 调用', count: llmTotal.value?.calls ?? 0, route: 'LlmOps', icon: '📊' },
]);

onMounted(async () => {
  try {
    info.value = await fetchSystemInfo();
  } catch {
    info.value = null;
  }
  const [ms, ds, ags, ts, cs, tgs, tot] = await Promise.all([
    listModels().catch(() => []),
    listDatasets().catch(() => []),
    listAgents().catch(() => []),
    listTools().catch(() => []),
    agentStartClient?.connectors.list().catch(() => []) ?? Promise.resolve([]),
    listTriggers().catch(() => []),
    fetchTotal().catch(() => null),
  ]);
  stats.value = {
    models: ms.length,
    datasets: ds.length,
    agents: ags.length,
    tools: ts.length,
    connectors: cs.length,
    triggers: tgs.length,
  };
  llmTotal.value = tot;
});

function goto(name: string) {
  router.push({ name });
}
</script>

<template>
  <Page
    title="Spring Agent Boot"
    description="模块化的 AI 应用后端 —— 无登录直连，从这里开始。"
  >
    <div class="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
      <Card
        v-for="m in moduleCards"
        :key="m.title"
        :body-style="{ padding: '16px' }"
        hoverable
        @click="goto(m.route)"
      >
        <div class="flex items-center justify-between">
          <Statistic :title="m.title" :value="m.count" />
          <div class="text-3xl">{{ m.icon }}</div>
        </div>
      </Card>
    </div>

    <div v-if="llmTotal && llmTotal.calls > 0" class="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
      <Card>
        <Statistic
          title="累计 tokens"
          :value="llmTotal.totalTokens"
          :value-style="{ fontSize: '1.25rem' }"
        />
      </Card>
      <Card>
        <Statistic
          title="累计成本 (USD)"
          :value="costText"
          :precision="4"
          :value-style="{ fontSize: '1.25rem' }"
        />
      </Card>
      <Card>
        <Statistic
          title="平均延时 (ms)"
          :value="llmTotal.avgLatencyMs"
          :precision="0"
          :value-style="{ fontSize: '1.25rem' }"
        />
      </Card>
    </div>

    <Card class="mt-4" title="接入指引 · 三步跑通">
      <div class="ob-steps">
        <template v-for="(s, i) in onboardingSteps" :key="s.n">
          <div class="ob-step" :class="{ 'ob-step--done': s.done }">
            <div class="ob-step-badge">
              <span v-if="s.done">✓</span>
              <span v-else>{{ s.n }}</span>
            </div>
            <div class="ob-step-body">
              <div class="ob-step-title">{{ s.title }}</div>
              <div class="ob-step-detail">{{ s.detail }}</div>
              <div class="ob-step-cta">
                <Tag v-if="s.done" color="green">{{ s.doneText }}</Tag>
                <Button
                  :type="s.done ? 'default' : 'primary'"
                  size="small"
                  @click="goto(s.route)"
                >
                  {{ s.done ? '管理' : '去创建' }}
                </Button>
              </div>
            </div>
          </div>
          <div
            v-if="i < onboardingSteps.length - 1"
            class="ob-arrow"
            :class="{ 'ob-arrow--done': s.done }"
          >
            →
          </div>
        </template>
      </div>
      <div v-if="onboardingAllDone" class="ob-celebrate">
        🎉 三步都完成了！可以去 <a @click.prevent="goto('AgentChat')">与智能体聊天</a>
        或 <a @click.prevent="goto('WorkflowPlayground')">试试工作流调试台</a>。
      </div>
    </Card>

    <Card class="mt-4" title="推荐下一步">
      <div class="flex items-start gap-3">
        <div class="text-3xl">{{ firstStep.icon }}</div>
        <div class="flex-1">
          <div class="text-base font-medium">{{ firstStep.title }}</div>
          <div class="mt-1 text-sm text-gray-500">{{ firstStep.detail }}</div>
          <Button type="primary" size="small" class="mt-2" @click="goto(firstStep.route)">
            前往
          </Button>
        </div>
      </div>
    </Card>

    <Card class="mt-4" title="后端模块状态">
      <div v-if="info" class="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4">
        <div v-for="(present, name) in info.modules" :key="name" class="flex items-center gap-2">
          <Tag :color="present ? 'green' : 'default'">
            {{ present ? '✓' : '—' }}
          </Tag>
          <span class="text-sm">{{ name }}</span>
        </div>
      </div>
      <div v-else class="text-sm text-gray-400">
        无法连接后端 (spring-agent-example 是否在跑？默认端口 18090)
      </div>
    </Card>
  </Page>
</template>

<style scoped>
.ob-steps {
  display: flex;
  align-items: stretch;
  gap: 12px;
  flex-wrap: wrap;
}
.ob-step {
  flex: 1;
  min-width: 220px;
  padding: 14px 16px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  background: #fff;
  display: flex;
  gap: 12px;
  transition: border-color 0.2s, background 0.2s;
}
.ob-step--done {
  background: #f6ffed;
  border-color: #b7eb8f;
}
.ob-step-badge {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #e5e7eb;
  color: #6b7280;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  flex-shrink: 0;
}
.ob-step--done .ob-step-badge {
  background: #52c41a;
  color: #fff;
}
.ob-step-body {
  flex: 1;
  min-width: 0;
}
.ob-step-title {
  font-size: 14px;
  font-weight: 600;
  color: #111;
}
.ob-step-detail {
  margin-top: 4px;
  font-size: 12px;
  color: #6b7280;
  line-height: 1.5;
}
.ob-step-cta {
  margin-top: 10px;
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.ob-arrow {
  align-self: center;
  color: #d1d5db;
  font-size: 20px;
  flex-shrink: 0;
}
.ob-arrow--done {
  color: #52c41a;
}
.ob-celebrate {
  margin-top: 12px;
  padding: 10px 12px;
  border-radius: 8px;
  background: #f0f9ff;
  border: 1px solid #bae6fd;
  color: #075985;
  font-size: 13px;
}
.ob-celebrate a {
  color: #0369a1;
  cursor: pointer;
  text-decoration: underline;
}
@media (max-width: 768px) {
  .ob-arrow {
    display: none;
  }
}
</style>
