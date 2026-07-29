import { requestClient } from '#/api/request';

export interface DatasetEntity {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  embeddingModelId?: string;
  indexingTechnique?: 'HIGH_QUALITY' | 'ECONOMY';
  documentCount?: number;
  segmentCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateDatasetRequest {
  tenantId?: string;
  name: string;
  description?: string;
  embeddingModelId?: string;
  indexingTechnique?: 'HIGH_QUALITY' | 'ECONOMY';
  vectorStore?: string;
}

export function listDatasets(tenantId?: string) {
  return requestClient.get<DatasetEntity[]>('/datasets', {
    params: { tenantId },
  });
}

export function getDataset(id: string) {
  return requestClient.get<DatasetEntity>(`/datasets/${id}`);
}

export function createDataset(req: CreateDatasetRequest) {
  return requestClient.post<DatasetEntity>('/datasets', req);
}

export interface UpdateDatasetRequest {
  name?: string;
  description?: string;
  embeddingModelId?: string;
  indexingTechnique?: 'ECONOMY' | 'HIGH_QUALITY';
  processRule?: Record<string, unknown>;
  retrievalConfig?: Record<string, unknown>;
  vectorStore?: string;
}

export function updateDataset(id: string, req: UpdateDatasetRequest) {
  return requestClient.put<DatasetEntity>(`/datasets/${id}`, req);
}

export function deleteDataset(id: string) {
  return requestClient.delete<void>(`/datasets/${id}`);
}
