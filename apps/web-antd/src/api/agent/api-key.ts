import { requestClient } from '#/api/request';

/**
 * A per-app API key issued from the 访问 API tab. Backed by the {@code
 * api_tokens} table on the server; matches the shape emitted by
 * {@code ApiTokenController} under {@code /api/apps/{appId}/api-tokens}.
 *
 * The full token value is present in every response — this is an internal
 * console (Dify parity), so we don't hide it after the mint call.
 */
export interface AppApiKey {
  id: string;
  tenantId?: string;
  appId: string;
  type?: string;
  name?: string;
  token: string;
  lastUsedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export function listApiKeys(appId: string) {
  return requestClient.get<AppApiKey[]>(`/apps/${appId}/api-tokens`);
}

export function createApiKey(appId: string, name?: string) {
  return requestClient.post<AppApiKey>(`/apps/${appId}/api-tokens`, {
    name,
  });
}

export function renameApiKey(appId: string, id: string, name: string) {
  return requestClient.post<AppApiKey>(
    `/apps/${appId}/api-tokens/${id}/rename`,
    { name },
  );
}

export function deleteApiKey(appId: string, id: string) {
  return requestClient.delete<void>(`/apps/${appId}/api-tokens/${id}`);
}
