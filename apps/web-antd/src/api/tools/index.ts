import { requestClient } from '#/api/request';

export interface ToolView {
  name: string;
  description: string;
  inputSchema?: string;
}

export function listTools() {
  return requestClient.get<ToolView[]>('/tools');
}

export function getTool(name: string) {
  return requestClient.get<ToolView>(`/tools/${name}`);
}

export function invokeTool(name: string, args: Record<string, unknown>) {
  return requestClient.post<unknown>(`/tools/${name}/invoke`, args);
}
