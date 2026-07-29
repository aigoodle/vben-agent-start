import { requestClient } from '#/api/request';

export interface LlmUsageStats {
  model: string;
  calls: number;
  errors: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costMicros: number;
  avgLatencyMs: number;
}

export interface LlmCallRecord {
  id: string;
  tenantId?: string;
  provider: string;
  model: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  costMicros?: number;
  latencyMs?: number;
  success: boolean;
  errorType?: string;
  createdAt?: string;
}

export function fetchStats(tenantId?: string) {
  return requestClient.get<LlmUsageStats[]>('/llmops/stats', {
    params: { tenantId },
  });
}

export function fetchTotal(tenantId?: string) {
  return requestClient.get<LlmUsageStats>('/llmops/total', {
    params: { tenantId },
  });
}

export function fetchRecent(limit = 50) {
  return requestClient.get<LlmCallRecord[]>('/llmops/recent', { params: { limit } });
}
