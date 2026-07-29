import { requestClient } from '#/api/request';

/** Per-app conversation/message metrics powering the drawer's 监测 tab. */
export interface AppMetrics {
  appId: string;
  totalConversations: number;
  totalMessages: number;
  userMessages: number;
  assistantMessages: number;
  avgInteractionsPerConversation: number;
  lastActivityAt?: string;
}

export function fetchAppMetrics(appId: string) {
  return requestClient.get<AppMetrics>(`/apps/${appId}/metrics`);
}
