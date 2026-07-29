/**
 * BackendAdapter implementation that maps the workflow designer's expected API surface
 * onto the spring-agent-web REST endpoints. Registered from bootstrap.ts so the visual
 * designer's toolbar "保存/试运行/发布" buttons all persist real work to /api.
 */
import type { BackendAdapter } from 'vue-agent-start';

import {
  listModels,
  type ModelType,
} from '#/api/model';
import {
  listWorkflows,
  runGraph,
  saveWorkflow as apiSaveWorkflow,
} from '#/api/workflow';

/**
 * Vue Flow graph → backend payload. Now that the designer's palette emits
 * canonical backend {@code NodeType} strings directly (see
 * {@code node_config.ts} and {@code FlowDesigner.vue}), we no longer need a
 * type-translation table — the graph is already engine-ready. We do preserve
 * the {@code viewport} so the canvas restores the user's pan/zoom on reload,
 * and normalise {@code edges} to the {@code {source, target, sourceHandle}}
 * subset the engine cares about (dropping VueFlow's embedded
 * {@code sourceNode}/{@code targetNode} node snapshots that would otherwise
 * bloat the persisted JSON with duplicates).
 */
/**
 * Guard: every workflow save must be scoped to an app. Callers that don't pass
 * an {@code appId} are broken by design — the backend rejects the request with
 * {@code app_id_required}. Raising here surfaces the caller in the stack
 * instead of relying on the server round-trip to name the mistake.
 */
function requireAppId(payload: any, caller: string): string {
  const appId = payload?.appId;
  if (!appId || String(appId).trim() === '') {
    throw new Error(
      `[${caller}] appId is required — the workflow row's PK is pinned to it. ` +
        'Pass appId from the enclosing app context (e.g. AppDesignDrawer) before saving.',
    );
  }
  return String(appId);
}

function toBackendGraph(graph: any): any {
  if (!graph?.nodes) return { nodes: [], edges: [], viewport: graph?.viewport };
  return {
    nodes: graph.nodes,
    viewport: graph.viewport,
    // Strip VueFlow's edge runtime bloat (embedded sourceNode/targetNode
    // snapshots, sourceX/Y/targetX/Y layout floats, event/style handles) —
    // the engine only needs the connectivity + which branch handle. Keep
    // {id, type, animated, style, markerEnd, label} so the canvas re-renders
    // the same visual on reload.
    edges: (graph.edges ?? []).map((e: any) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle,
      targetHandle: e.targetHandle,
      type: e.type,
      animated: e.animated,
      style: e.style,
      markerEnd: e.markerEnd,
      label: e.label,
      data: e.data,
    })),
  };
}

const modelListCache: { data: any[]; loaded: boolean } = {
  data: [],
  loaded: false,
};

async function fetchModels(): Promise<any[]> {
  if (modelListCache.loaded) return modelListCache.data;
  try {
    const models = await listModels();
    modelListCache.data = models.map((m) => ({
      id: m.id,
      name: `${m.providerName} · ${m.modelName}`,
      provider: m.providerName,
      model: m.modelName,
      modelType: m.modelType,
    }));
    modelListCache.loaded = true;
  } catch {
    modelListCache.data = [];
  }
  return modelListCache.data;
}

export const springAgentBackend: BackendAdapter = {
  async getCurrentModel(modelType: string) {
    // agent-flow uses 'LLM' | 'EMBEDDING' | ...; our API uses ModelType enum shape.
    const map: Record<string, ModelType> = {
      EMBEDDING: 'TEXT_EMBEDDING',
      LLM: 'LLM',
      TEXT_EMBEDDING: 'TEXT_EMBEDDING',
    };
    const type = map[modelType] ?? 'LLM';
    const models = await listModels(undefined, type);
    const def = models.find((m) => m.isDefault) ?? models[0];
    return { data: def ?? {} };
  },

  async getWorkflow() {
    try {
      const list = await listWorkflows();
      return { data: list };
    } catch {
      return { data: [] };
    }
  },

  async publishWorkflow(payload: any) {
    const appId = requireAppId(payload, 'publishWorkflow');
    const res = await apiSaveWorkflow({
      appId,
      name: payload.name ?? `wf-${Date.now()}`,
      mode: 'workflow',
      graph: toBackendGraph(payload.graph),
    });
    return { data: { code: 0, message: '已保存并发布', workflow: res } };
  },

  async saveWorkflow(payload: any) {
    // Backend's WorkflowService.save() requires appId — the workflow row's PK
    // is pinned to it so every save for the same app upserts the same row.
    // The FlowDesigner used to call this without an appId when embedded in
    // the AppDesignDrawer; that path is a bug (the drawer's own save button,
    // which knows the appId, is the correct one). Fail loudly here rather
    // than let the request 400 with a generic message.
    const appId = requireAppId(payload, 'saveWorkflow');
    const res = await apiSaveWorkflow({
      appId,
      name: payload.name ?? `draft-${Date.now()}`,
      mode: 'workflow',
      graph: toBackendGraph(payload.graph),
    });
    return { data: { code: 0, message: '已保存草稿', workflow: res } };
  },

  async runWorkflow(payload: any) {
    const result = await runGraph({
      graph: toBackendGraph(payload.graph),
      inputs: payload.inputs ?? {},
    });
    return {
      data: {
        code: result.success ? 0 : 1,
        message: result.success ? '试运行成功' : (result.error ?? '失败'),
        outputs: result.outputs,
        steps: result.steps,
      },
    };
  },

  useModelState() {
    return {
      modelList: modelListCache.data,
      // agent-flow calls one of these two names depending on the sub-component; expose both
      fetchModelList: fetchModels,
      getModelList: fetchModels,
    };
  },
};
