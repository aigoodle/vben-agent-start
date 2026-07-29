import { requestClient } from '#/api/request';

export type TriggerType = 'WEBHOOK' | 'CRON' | 'EVENT';
export type InvocationStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';

export interface TriggerEntity {
  id: string;
  tenantId?: string;
  name: string;
  type: TriggerType;
  enabled: boolean;
  targetType: string;
  targetId: string;
  configJson?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateTriggerRequest {
  tenantId?: string;
  name: string;
  type: TriggerType;
  enabled?: boolean;
  targetType: string;
  targetId: string;
  config?: Record<string, unknown>;
}

export interface TriggerInvocationEntity {
  id: string;
  triggerId: string;
  source?: string;
  status: InvocationStatus;
  payloadJson?: string;
  outputsJson?: string;
  runId?: string;
  replayOf?: string;
  error?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface DispatchResult {
  success: boolean;
  runId?: string;
  outputs?: Record<string, unknown>;
  error?: string;
}

export function listTriggers(tenantId?: string) {
  return requestClient.get<TriggerEntity[]>('/triggers', { params: { tenantId } });
}

export function getTrigger(id: string) {
  return requestClient.get<TriggerEntity>(`/triggers/${id}`);
}

export function createTrigger(req: CreateTriggerRequest) {
  return requestClient.post<TriggerEntity>('/triggers', req);
}

export function setTriggerEnabled(id: string, enabled: boolean) {
  return requestClient.put<void>(`/triggers/${id}/enabled`, undefined, {
    params: { enabled },
  });
}

export function deleteTrigger(id: string) {
  return requestClient.delete<void>(`/triggers/${id}`);
}

export function fireTrigger(id: string, payload: Record<string, unknown>) {
  return requestClient.post<DispatchResult>(`/triggers/${id}/fire`, payload);
}

export function listInvocations(triggerId: string) {
  return requestClient.get<TriggerInvocationEntity[]>(
    `/triggers/${triggerId}/invocations`,
  );
}

export function replayInvocation(invocationId: string) {
  return requestClient.post<TriggerInvocationEntity>(
    `/invocations/${invocationId}/replay`,
  );
}
