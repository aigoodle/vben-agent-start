import { requestClient } from '#/api/request';

/**
 * Per-app QA annotation — Dify's "标注回复" feature. When a chat query is close
 * enough to `question`, the app returns `content` verbatim.
 */
export interface AppAnnotation {
  id: string;
  tenantId?: string;
  appId: string;
  question?: string;
  content?: string;
  hitCount?: number;
  enabled?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AppAnnotationRequest {
  question: string;
  content: string;
  enabled?: boolean;
}

export function listAnnotations(appId: string) {
  return requestClient.get<AppAnnotation[]>(`/apps/${appId}/annotations`);
}

export function createAnnotation(appId: string, req: AppAnnotationRequest) {
  return requestClient.post<AppAnnotation>(`/apps/${appId}/annotations`, req);
}

export function updateAnnotation(
  appId: string,
  id: string,
  req: AppAnnotationRequest,
) {
  return requestClient.put<AppAnnotation>(`/apps/${appId}/annotations/${id}`, req);
}

export function deleteAnnotation(appId: string, id: string) {
  return requestClient.delete<void>(`/apps/${appId}/annotations/${id}`);
}

export function hitAnnotation(appId: string, id: string) {
  return requestClient.post<void>(`/apps/${appId}/annotations/${id}/hit`);
}
