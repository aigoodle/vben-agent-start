import { requestClient } from '#/api/request';

export interface CredentialFieldView {
  name: string;
  label: string;
  type: string;
  required: boolean;
  secret: boolean;
  defaultValue?: string;
  placeholder?: string;
}

export interface PredefinedModelView {
  model: string;
  label: string;
  modelType: string;
  features?: string[];
  contextLength?: number;
  dimensions?: number;
}

export interface ProviderView {
  name: string;
  label: string;
  supportedModelTypes: string[];
  credentialSchema: CredentialFieldView[];
  predefinedModels: PredefinedModelView[];
}

export function listProviders() {
  return requestClient.get<ProviderView[]>('/model-providers');
}

export function getProvider(name: string) {
  return requestClient.get<ProviderView>(`/model-providers/${name}`);
}
