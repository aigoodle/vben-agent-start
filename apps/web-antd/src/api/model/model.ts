import { requestClient } from '#/api/request';

export type ModelType =
  | 'LLM'
  | 'TEXT_EMBEDDING'
  | 'RERANK'
  | 'SPEECH_TO_TEXT'
  | 'TEXT_TO_SPEECH'
  | 'IMAGE';

export interface ModelEntity {
  id: string;
  tenantId: string;
  providerName: string;
  modelName: string;
  modelType: ModelType;
  enabled: boolean;
  isDefault: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ModelRegistration {
  tenantId?: string;
  providerName: string;
  modelName: string;
  modelType: ModelType;
  credentials?: Record<string, unknown>;
  credentialId?: string;
  asDefault?: boolean;
}

export function listModels(tenantId?: string, type?: ModelType) {
  return requestClient.get<ModelEntity[]>('/models', {
    params: { tenantId, type },
  });
}

export function getModel(id: string) {
  return requestClient.get<ModelEntity>(`/models/${id}`);
}

export function registerModel(req: ModelRegistration) {
  return requestClient.post<ModelEntity>('/models', req);
}

export function updateCredentials(
  id: string,
  credentials: Record<string, unknown>,
) {
  return requestClient.put<ModelEntity>(
    `/models/${id}/credentials`,
    credentials,
  );
}

export function markDefault(id: string) {
  return requestClient.put<void>(`/models/${id}/default`);
}

export function deleteModel(id: string) {
  return requestClient.delete<void>(`/models/${id}`);
}

export function validateModel(req: ModelRegistration) {
  return requestClient.post<void>('/models/validate', req);
}

export interface ModelTestResult {
  ok: boolean;
  latencyMs: number;
  kind?: string;
  snippet?: string;
  dimensions?: number;
  error?: string;
  message?: string;
}

export function testModel(id: string) {
  return requestClient.post<ModelTestResult>(`/models/${id}/test`);
}
