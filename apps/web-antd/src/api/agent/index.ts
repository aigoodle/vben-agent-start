import { requestClient } from '#/api/request';

export type AgentStrategy = 'FUNCTION_CALLING' | 'PLAN_EXECUTE' | 'REACT';

/** Dify-parity app mode determining the runtime path. */
export type AppMode =
  | 'agent'      // ReAct / function-calling loop (default; existing behaviour)
  | 'chat'       // Simple LLM chat with optional retrieval
  | 'chatflow'   // Conversational workflow
  | 'completion' // One-shot completion, no memory
  | 'workflow';  // References a workflow id (deferred)

export interface AgentEntity {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  icon?: string;
  iconBackground?: string;
  mode?: AppMode;
  instructions?: string;
  openingStatement?: string;
  suggestedQuestionsJson?: string;
  datasetIdsJson?: string;
  /** JSON blob controlling retrieval — top-k, method, rerank, etc. */
  retrievalConfigJson?: string;
  /**
   * FK to `workflows.id` — for workflow-mode apps this points to the mutable
   * DRAFT workflow (the id equals `apps.id` by invariant). Runtime consumers
   * follow the same field once a snapshot has been published. Never carries
   * the graph itself — fetch via `getWorkflowDraft(appId)`.
   */
  workflowId?: string;
  /** Plain vendor model name (e.g. {@code qwen3.6-plus}). */
  modelName?: string;
  /** Provider key that owns {@link modelName} (e.g. {@code qwen}). */
  modelProvider?: string;
  /**
   * Serialised model runtime overrides — the 模型设置 drawer payload
   * ({@code temperature}, {@code topP}, {@code maxTokens},
   * {@code thinkingMode}, …). Mirror of {@code app_model_configs.configs},
   * populated by the backend's {@code AgentService.enrich} so the
   * drawer's ModelPickerPopover can hydrate its parameter panel from a
   * single {@code GET /agents/{id}} response.
   */
  modelSettingsJson?: string;
  strategy: AgentStrategy;
  /** JSON array of tool names — from the backend's toolNamesJson column. */
  toolNamesJson?: string;
  approvalToolsJson?: string;
  delegateAgentIdsJson?: string;
  maxIterations?: number;
  memoryEnabled?: boolean;
  memoryWindow?: number;
  published?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateAgentRequest {
  tenantId?: string;
  name: string;
  description?: string;
  icon?: string;
  iconBackground?: string;
  mode?: AppMode;
  instructions?: string;
  openingStatement?: string;
  suggestedQuestions?: string[];
  datasetIds?: string[];
  /**
   * Free-form JSON for {@code retrieval_config_json} — controls *how* retrieval
   * runs against the attached datasets (top-k, method, rerank). Backend column
   * accepts any JSON; the drawer builds an object matching
   * {@code io.github.springagent.knowledge.RetrievalConfig}.
   */
  retrievalConfig?: Record<string, unknown>;
  /** Plain vendor model name (e.g. {@code qwen3.6-plus}). */
  modelName?: string;
  /** Provider key that owns {@link modelName} (e.g. {@code qwen}). */
  modelProvider?: string;
  strategy?: AgentStrategy;
  toolNames?: string[];
  approvalRequiredTools?: string[];
  delegateAgentIds?: string[];
  maxIterations?: number;
  memoryEnabled?: boolean;
  memoryWindow?: number;
  published?: boolean;
  /**
   * Per-app model runtime overrides collected from the "模型设置" drawer.
   * Recognised keys: `temperature`, `topP`, `maxTokens`, `presencePenalty`,
   * `frequencyPenalty`, `stop`, `thinkingMode` (`auto|enabled|disabled`), plus
   * `extraBody` for vendor-specific raw pass-through. Persisted verbatim on
   * `app_model_configs.configs`; vendor-specific translation happens at chat
   * time in `AgentChatOptionsFactory`.
   */
  modelSettings?: Record<string, unknown>;
}

export interface AgentStepView {
  action?: string;
  thought?: string;
  observation?: string;
  toolName?: string;
  toolArgsJson?: string;
  toolResultJson?: string;
}

export interface AgentResponse {
  status: 'COMPLETED' | 'FAILED' | 'PENDING_APPROVAL';
  text?: string;
  conversationId?: string;
  steps?: AgentStepView[];
  error?: string;
}

export interface ChatRequest {
  query: string;
  conversationId?: string;
  variables?: Record<string, unknown>;
}

export function listAgents(tenantId?: string) {
  return requestClient.get<AgentEntity[]>('/agents', { params: { tenantId } });
}

export function getAgent(id: string) {
  return requestClient.get<AgentEntity>(`/agents/${id}`);
}

export function createAgent(req: CreateAgentRequest) {
  return requestClient.post<AgentEntity>('/agents', req);
}

export function updateAgent(id: string, req: CreateAgentRequest) {
  return requestClient.put<AgentEntity>(`/agents/${id}`, req);
}

export function deleteAgent(id: string) {
  return requestClient.delete<void>(`/agents/${id}`);
}

export interface AgentToolView {
  name: string;
  description: string;
  inputSchema?: string;
}

export function fetchAgentTools(id: string) {
  return requestClient.get<AgentToolView[]>(`/agents/${id}/tools`);
}

export interface AgentHistoryMessage {
  role: 'USER' | 'ASSISTANT' | 'SYSTEM';
  content: string;
}

/**
 * Fetch the USER/ASSISTANT message log for one conversation. Posts against
 * ChatController's dedicated console endpoint so both agent-mode and
 * workflow-mode apps show up — the earlier {@code GET /agents/{id}/conversations/...}
 * lived on AgentController and 404'd for flow-mode apps that don't hit that
 * controller at runtime.
 */
export function fetchHistory(agentId: string, conversationId: string, limit = 500) {
  return requestClient.post<AgentHistoryMessage[]>(
    `/chat/conversations/${agentId}/${conversationId}/messages`,
    { limit },
  );
}

export interface ConversationSummary {
  conversationId: string;
  /** Editable session title — auto-generated from the first user message. */
  name?: string;
  /**
   * 会话所有者标识 —— 后端优先取 {@code conversations.from_end_user_id}
   * （Dify 兼容端点里 antd-react-chat 落的 {@code dify-user-xxx}），
   * 兜底 {@code from_account_id}。null 表示历史数据未记录用户。
   */
  userId?: null | string;
  firstMessage?: string;
  updatedAt?: string;
  pinned?: boolean;
}

export function fetchConversations(agentId: string, limit = 100) {
  return requestClient.post<ConversationSummary[]>(
    `/chat/conversations/${agentId}`,
    { limit },
  );
}

export function chat(id: string, req: ChatRequest) {
  return requestClient.post<AgentResponse>(`/agents/${id}/chat`, req);
}

/** Return a raw fetch Response for SSE consumption (EventSource can't POST). */
export function chatStream(id: string, req: ChatRequest, apiBase = '/api') {
  return fetch(`${apiBase}/agents/${id}/chat/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
    },
    body: JSON.stringify(req),
  });
}
