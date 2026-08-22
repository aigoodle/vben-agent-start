/**
 * Shim for `vue-agent-start` — the unified UI kit that replaces the previous four
 * separate packages (provider-hub / knowledge-hub / agent-studio / agent-flow).
 *
 * We deliberately declare everything as `any`: the sub-module source has some
 * legacy TS issues that would derail the app-level typecheck if we let it read
 * their real types. Runtime is unaffected — vite still bundles the real files.
 */
declare module 'vue-agent-start' {
  // ---- unified SDK / host integration ----
  export const createAgentStartClient: any;
  export const installAgentStartClient: any;
  export const useAgentStartClient: any;
  export type AgentStartClient = any;
  export type AgentStartClientOptions = any;

  // ---- provider-hub ----
  export const CredentialForm: any;
  export const DefaultModelsPanel: any;
  export const ModelCardGrid: any;
  export const ModelParameterDrawer: any;
  export const ModelPickerPopover: any;
  export const ProviderApp: any;
  export const ProviderCredentialModal: any;
  export const ProviderGallery: any;
  export const ProviderHubShell: any;
  export const ProviderIcon: any;
  export const useProviderHub: any;
  export const setProviderHubApiBase: any;
  export const setProviderHubHeaders: any;
  export const providerIcon: any;
  export const providerBg: any;
  export const modelTypeLabel: any;
  export const modelTypeColor: any;
  export type SelectedModel = any;
  export type ProviderView = any;
  export type ModelEntity = any;
  export type ModelType = any;
  export type ModelTestResult = any;
  export type ModelRegistration = any;
  export type CredentialField = any;
  export type PredefinedModel = any;
  export type RemoteModel = any;
  export type ProviderCredentialInfo = any;

  // ---- knowledge-hub ----
  export const KnowledgeHubApp: any;
  export const CreateDatasetWizard: any;
  export const DatasetCardGrid: any;
  export const DatasetDetailDrawer: any;
  export const DatasetSettingsPanel: any;
  export const DatasetSidebar: any;
  export const DocumentChunksView: any;
  export const DocumentTable: any;
  export const RecallTestingPanelV2: any;
  export const DatasetPicker: any;
  export const HitTestingPanel: any;
  export const RetrievedList: any;
  export const createSpringAgentStartAdapter: any;
  export const useKnowledge: any;
  export const setKnowledgeApiBase: any;
  export const setKnowledgeHeaders: any;
  export type KnowledgeHubApi = any;
  export type SpringAgentStartAdapterOptions = any;
  export type DatasetTab = 'documents' | 'pipeline' | 'recall' | 'settings';
  export type DatasetCardItem = any;
  export type DatasetSummary = any;
  export type DatasetDetailHub = any;
  export type DocumentRow = any;
  export type Chunk = any;
  export type DocMetadata = any;
  export type RecallHit = any;
  export type RecentQuery = any;

  // ---- agent-studio ----
  export const AgentAppsPage: any;
  export const AgentCardGrid: any;
  export const AgentChatPage: any;
  export const AppDesignDrawer: any;
  export const CreateAppModal: any;
  export const AgentForm: any;
  export const AgentStudioShell: any;
  export const AgentOrchestrate: any;
  export const AgentPromptEditor: any;
  export const AgentVariablesPanel: any;
  export const AgentToolsPanel: any;
  export const AgentDebugPanel: any;
  export const AgentApiDocs: any;
  export const AgentLogsPanel: any;
  export const AgentMonitorPanel: any;
  export const SparkChart: any;
  export const LogAnnotationPanel: any;
  export const MonitorPanel: any;
  export const DrawerFlowDesigner: any;
  export type AppStudioApi = any;
  export type StudioHistoryMessage = any;
  export type StudioConversationSummary = any;
  export type StudioAnnotation = any;
  export type StudioAnnotationRequest = any;
  export type StudioAppMetrics = any;
  export type StudioLlmUsageStats = any;
  export type StudioLlmCallRecord = any;
  export const useAgentStudio: any;
  export const setAgentStudioApiBase: any;
  export const setAgentStudioHeaders: any;
  export const createAgentStudioSpringBackend: any;
  export type AgentStudioApi = any;
  export const APP_TYPES: any;
  export type AgentEntity = any;
  export type AgentStrategy = any;
  export type AppType = any;
  export type AppTypeDescriptor = any;
  export type CreateAgentRequest = any;
  export type StudioTab = any;
  export type StudioNavItem = any;
  export type PromptVariable = any;
  export type VariableType = any;
  export type StudioTool = any;
  export type StudioKnowledge = any;
  export type StudioModelOption = any;
  export type StudioChatMessage = any;
  export type StudioLogEntry = any;
  export type StudioMonitorMetric = any;

  // ---- agent-flow ----
  export const FlowDesigner: any;
  export const NodeConfig: any;
  export const NodeConfigCard: any;
  export const CustomEdge: any;
  export const NodeHandle: any;
  export const Icon: any;
  export const useWorkflowStore: any;
  export const provideBackend: any;
  export const nodeCatalog: any;
  export const nodeCardForm: any;
  export const workflowUtils: any;
  export const AgentFlowPlugin: any;
  export type BackendAdapter = any;
  export type AgentFlowInstallOptions = any;
}

declare module 'vue-agent-start/connector-hub' {
  export const ConnectorHubApp: any;
  export const MyRobotsPanel: any;
  export const RobotFormModal: any;
  export const useConnectorHub: any;
  export type ConnectorDefinition = any;
  export type ConnectorInstallation = any;
  export type ConnectorConnection = any;
  export type ConnectorExecutionRecord = any;
  export type RobotUser = any;
}
