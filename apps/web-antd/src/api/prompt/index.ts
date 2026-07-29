import { requestClient } from '#/api/request';

export interface PromptTemplate {
  id: string;
  tenantId?: string;
  name: string;
  category?: string;
  description?: string;
  content: string;
  tagsJson?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PromptTemplateRequest {
  tenantId?: string;
  name: string;
  category?: string;
  description?: string;
  content: string;
  tags?: string[];
}

export function listTemplates(category?: string, tenantId?: string) {
  return requestClient.get<PromptTemplate[]>('/prompt-templates', {
    params: { category, tenantId },
  });
}

export function getTemplate(id: string) {
  return requestClient.get<PromptTemplate>(`/prompt-templates/${id}`);
}

export function createTemplate(req: PromptTemplateRequest) {
  return requestClient.post<PromptTemplate>('/prompt-templates', req);
}

export function updateTemplate(id: string, req: PromptTemplateRequest) {
  return requestClient.put<PromptTemplate>(`/prompt-templates/${id}`, req);
}

export function deleteTemplate(id: string) {
  return requestClient.delete<void>(`/prompt-templates/${id}`);
}

export function templateVariables(id: string) {
  return requestClient.get<string[]>(`/prompt-templates/${id}/variables`);
}

export function renderTemplate(id: string, vars: Record<string, unknown>) {
  return requestClient.post<{ rendered: string }>(
    `/prompt-templates/${id}/render`,
    vars,
  );
}

export interface TemplateReference {
  kind: string;
  id: string;
  name: string;
  updatedAt?: string;
}

export function templateReferences(id: string) {
  return requestClient.get<TemplateReference[]>(`/prompt-templates/${id}/references`);
}
