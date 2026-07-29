import { requestClient } from '#/api/request';

export interface NodeDef {
  id: string;
  type: string;
  title?: string;
  data?: Record<string, unknown>;
}

export interface EdgeDef {
  source: string;
  target: string;
  sourceHandle?: string;
}

export interface WorkflowGraph {
  nodes: NodeDef[];
  edges: EdgeDef[];
}

export interface WorkflowEntity {
  id: string;
  tenantId?: string;
  /** FK to `apps.id`. Null for the standalone `/workflows` playground entries. */
  appId?: string;
  name?: string;
  mode?: string;
  /**
   * The workflow graph — nodes + edges + designer metadata (`viewport`,
   * per-node UI fields). Backend field is a `JsonNode` mapped onto the
   * `workflows.graph` column via MyBatis-Plus's JacksonTypeHandler; over the
   * wire it's a plain object (not a string), so consumers can access
   * `entity.graph.nodes` etc. directly.
   */
  graph?: WorkflowGraph | Record<string, unknown> | null;
  /** `'draft'` for the mutable draft; timestamp / semver-ish label for snapshots. */
  version?: string;
  published?: boolean;
  features?: string;
  environmentVariables?: string;
  conversationVariables?: string;
  markedName?: string;
  markedComment?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface StepRecord {
  nodeId: string;
  nodeType: string;
  title?: string;
  handle?: string;
  outputs?: Record<string, unknown>;
  elapsedMillis?: number;
  failed?: boolean;
  error?: string;
}

export interface WorkflowRunResult {
  runId: string;
  success: boolean;
  error?: string;
  outputs?: Record<string, unknown>;
  steps?: StepRecord[];
}

export interface WorkflowSaveRequest {
  tenantId?: string;
  /**
   * Owning app id. When set the workflow row's PK is pinned to it — every
   * save for the same app upserts the same row (one draft per app). Omit for
   * the standalone JSON playground where the backend mints a fresh UUID.
   */
  appId?: string;
  name: string;
  mode?: 'workflow' | 'chatflow';
  graph: WorkflowGraph;
}

export interface WorkflowRunRequest {
  workflowId?: string;
  graph?: WorkflowGraph;
  inputs?: Record<string, unknown>;
  conversationId?: string;
}

export interface NodeTypeMeta {
  name: string;
  category: 'flow' | 'data' | 'io' | 'llm';
}

export function listWorkflows(tenantId?: string) {
  return requestClient.get<WorkflowEntity[]>('/workflows', {
    params: { tenantId },
  });
}

export function saveWorkflow(req: WorkflowSaveRequest) {
  return requestClient.post<WorkflowEntity>('/workflows', req);
}

export function updateWorkflow(id: string, req: WorkflowSaveRequest) {
  return requestClient.put<WorkflowEntity>(`/workflows/${id}`, req);
}

export function deleteWorkflow(id: string) {
  return requestClient.delete<void>(`/workflows/${id}`);
}

export function getWorkflow(id: string) {
  return requestClient.get<WorkflowEntity>(`/workflows/${id}`);
}

export interface WorkflowRunEntity {
  id: string;
  workflowId?: string;
  conversationId?: string;
  status: string;
  inputsJson?: string;
  outputsJson?: string;
  stepsJson?: string;
  error?: string;
  createdAt?: string;
}

export function listRuns(workflowId: string, limit = 20) {
  return requestClient.get<WorkflowRunEntity[]>(
    `/workflows/${workflowId}/runs`,
    { params: { limit } },
  );
}

export function runWorkflow(id: string, req: WorkflowRunRequest) {
  return requestClient.post<WorkflowRunResult>(`/workflows/${id}/run`, req);
}

export function runGraph(req: WorkflowRunRequest) {
  return requestClient.post<WorkflowRunResult>('/workflows/run-graph', req);
}

export function runGraphStream(req: WorkflowRunRequest, apiBase = '/api') {
  return fetch(`${apiBase}/workflows/run-graph/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
    },
    body: JSON.stringify(req),
  });
}

export function listNodeTypes() {
  return requestClient.get<NodeTypeMeta[]>('/node-types');
}

export interface WorkflowExample {
  id: string;
  name: string;
  description: string;
  defaultInputs?: Record<string, unknown>;
  graph: WorkflowGraph;
}

export function listWorkflowExamples() {
  return requestClient.get<WorkflowExample[]>('/workflow-examples');
}

// ============================================================================
// App-scoped draft flow (Dify parity)
//
// Invariant: for a workflow-mode app, the DRAFT workflow row's primary key
// equals the app's id. So the "load the draft" call is a predictable
// PK-shaped URL. Publishing snapshots the draft into a new immutable row.
// ============================================================================

/** GET the draft workflow (its graph + metadata) for an app. */
export function getWorkflowDraft(appId: string) {
  return requestClient.get<WorkflowEntity>(
    `/apps/${appId}/workflow/draft`,
  );
}

/** PUT the draft's graph. Version stays `'draft'`. */
export function saveWorkflowDraft(appId: string, graph: WorkflowGraph) {
  return requestClient.put<WorkflowEntity>(
    `/apps/${appId}/workflow/draft`,
    { graph },
  );
}

/** POST publish the draft as an immutable snapshot; rebinds `apps.workflow_id`. */
export function publishWorkflowDraft(
  appId: string,
  markedName?: string,
  markedComment?: string,
) {
  return requestClient.post<WorkflowEntity>(
    `/apps/${appId}/workflow/publish`,
    { markedName, markedComment },
  );
}

/** List all workflow rows for an app — draft + snapshots, newest first. */
export function listWorkflowsByApp(appId: string) {
  return requestClient.get<WorkflowEntity[]>(
    `/apps/${appId}/workflows`,
  );
}
