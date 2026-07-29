import { requestClient } from '#/api/request';

export interface RetrieveRequest {
  query: string;
  method?: 'HYBRID' | 'VECTOR' | 'FULL_TEXT';
  topK?: number;
  scoreThreshold?: number;
  vectorWeight?: number;
  metadataFilter?: Record<string, unknown>;
}

export interface RetrievedSegment {
  segmentId: string;
  datasetId: string;
  documentId: string;
  position: number;
  content: string;
  parentContent?: string;
  vectorScore: number;
  keywordScore: number;
  score: number;
  metadata?: Record<string, unknown>;
}

export function retrieve(datasetId: string, req: RetrieveRequest) {
  return requestClient.post<RetrievedSegment[]>(
    `/datasets/${datasetId}/retrieve`,
    req,
  );
}

export interface HitTestingLog {
  id: string;
  datasetId: string;
  query: string;
  method?: string;
  topK?: number;
  hitCount?: number;
  latencyMs?: number;
  resultsJson?: string;
  createdAt?: string;
}

export function listHitTestingHistory(datasetId: string, limit = 30) {
  return requestClient.get<HitTestingLog[]>(
    `/datasets/${datasetId}/hit-testing/history`,
    { params: { limit } },
  );
}
