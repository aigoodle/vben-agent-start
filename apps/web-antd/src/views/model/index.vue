<script setup lang="ts">
/**
 * 模型供应商设置页 · Dify-parity 三段式。
 *
 * 交互全部下沉到 vue-agent-start 的 <ProviderHubShell>：
 *   - 顶部「模型列表」：已配置且已导入模型的供应商，一行一个 provider。
 *   - 中部「待配置」  ：保存了 API Key 但尚未导入任何模型的 provider。
 *   - 底部「安装模型供应商」：其余可选的供应商目录。
 *
 * "添加 API Key" 会打开 <ProviderCredentialModal>：填 Key → 后端调 vendor 的
 * /v1/models 拉列表 → 用户勾选 → 批量导入 —— 用户不再需要一条一条注册模型。
 *
 * 已经导入的模型如需 设为默认 / 测试连接 / 删除，走 /models/* 那套接口
 * （<ProviderHubShell> 从后端 provider view 里拿到 installedModelCount，仍然可以在
 * 未来扩展；本页 MVP 保留 <ModelCardGrid> 作为进阶操作出口）。
 */
import { onMounted, ref } from 'vue';

import {
  ModelCardGrid,
  ProviderHubShell,
  useProviderHub,
} from 'vue-agent-start';
import { message, Modal, Spin, Switch } from 'ant-design-vue';

import type { ModelEntity, ModelTestResult, ProviderView } from '#/api/model';

const { listProviders, listModels, deleteModel, setDefault } = useProviderHub();

const providers = ref<ProviderView[]>([]);
const models = ref<ModelEntity[]>([]);
const loading = ref(false);
const showAdvanced = ref(false);

async function refresh() {
  loading.value = true;
  try {
    const [ps, ms] = await Promise.all([listProviders(), listModels()]);
    providers.value = ps;
    models.value = ms;
  } finally {
    loading.value = false;
  }
}

onMounted(refresh);

// ---------- 已装模型的进阶操作（仅在 showAdvanced=true 时展开）
async function onSetDefault(m: ModelEntity) {
  await setDefault(m.id);
  message.success('已设为默认');
  await refresh();
}

async function onTestModel(_m: ModelEntity, r: ModelTestResult) {
  if (r.ok) message.success(`连接成功 · ${r.latencyMs}ms`);
  else message.error(`连接失败: ${r.error ?? 'unknown'}`);
}

function onDelete(m: ModelEntity) {
  Modal.confirm({
    title: '删除模型',
    content: `确认删除「${m.providerName} / ${m.modelName}」？依赖它的知识库/智能体运行时会失败。`,
    okText: '删除',
    okType: 'danger',
    onOk: async () => {
      await deleteModel(m.id);
      message.success('已删除');
      await refresh();
    },
  });
}

// 已装模型的编辑凭证入口仍然可用，但由于 Dify-parity 流程下模型共享 provider 凭证，
// 单条模型的凭证覆写只有边缘场景（自建 endpoint 之类）才需要 —— 藏到进阶面板里。
function onEditCredentials(m: ModelEntity) {
  Modal.info({
    title: '编辑模型级凭证',
    content:
      `此模型继承供应商级 API Key。如需覆写单条模型的 endpoint/dimensions，` +
      `请通过 API PUT /models/${m.id}/credentials 直接调用。` +
      `\n\n(该操作已从 UI 收起 —— 99% 的场景直接改供应商级凭证更合适)`,
  });
}
</script>

<template>
  <div>
    <Spin :spinning="loading">
      <ProviderHubShell :models="models" @change="refresh" />

      <!-- 进阶面板：已装模型的行级操作（默认收起） -->
      <div v-if="models.length > 0" class="mt-6">
        <div class="mb-2 flex items-center gap-2">
          <span class="text-sm font-medium">进阶：已装模型逐条管理</span>
          <Switch v-model:checked="showAdvanced" size="small" />
          <span class="text-xs text-gray-500">
            设为默认 / 测试 / 删除 / 覆写凭证
          </span>
        </div>
        <div v-if="showAdvanced">
          <ModelCardGrid
            :models="models"
            :providers="providers"
            @set-default="onSetDefault"
            @test="onTestModel"
            @delete="onDelete"
            @edit-credentials="onEditCredentials"
          />
        </div>
      </div>
    </Spin>
  </div>
</template>
