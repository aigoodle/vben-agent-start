import { requestClient } from '#/api/request';

export interface SystemInfo {
  name: string;
  version: string;
  modules: Record<string, boolean>;
}

export function fetchHealth() {
  return requestClient.get<{ status: string; name: string }>('/health');
}

export function fetchSystemInfo() {
  return requestClient.get<SystemInfo>('/system/info');
}
