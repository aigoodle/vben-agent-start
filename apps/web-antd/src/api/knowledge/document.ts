import { requestClient } from '#/api/request';

export interface KnowledgeDocumentEntity {
  id: string;
  datasetId: string;
  name: string;
  sourceType: string;
  status: string;
  errorMessage?: string;
  wordCount?: number;
  segmentCount?: number;
  enabled: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export function listDocuments(datasetId: string) {
  return requestClient.get<KnowledgeDocumentEntity[]>(
    `/datasets/${datasetId}/documents`,
  );
}

export function getDocument(datasetId: string, documentId: string) {
  return requestClient.get<KnowledgeDocumentEntity>(
    `/datasets/${datasetId}/documents/${documentId}`,
  );
}

export function addText(datasetId: string, name: string, text: string) {
  return requestClient.post<KnowledgeDocumentEntity>(
    `/datasets/${datasetId}/documents/text`,
    { name, text },
  );
}

export function addMarkdown(datasetId: string, name: string, text: string) {
  return requestClient.post<KnowledgeDocumentEntity>(
    `/datasets/${datasetId}/documents/markdown`,
    { name, text },
  );
}

export function uploadDocument(datasetId: string, file: File) {
  const formData = new FormData();
  formData.append('file', file);
  return requestClient.post<KnowledgeDocumentEntity>(
    `/datasets/${datasetId}/documents/upload`,
    formData,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
    },
  );
}

export function deleteDocument(datasetId: string, documentId: string) {
  return requestClient.delete<void>(
    `/datasets/${datasetId}/documents/${documentId}`,
  );
}

export function reindexDocument(datasetId: string, documentId: string) {
  return requestClient.post<{ segmentCount: number }>(
    `/datasets/${datasetId}/documents/${documentId}/reindex`,
  );
}

export interface SegmentEntity {
  id: string;
  datasetId: string;
  documentId: string;
  position: number;
  content: string;
  tokenCount?: number;
  keywords?: string;
  enabled: boolean;
}

export function listSegments(
  datasetId: string,
  documentId: string,
  page = 1,
  pageSize = 50,
) {
  return requestClient.get<SegmentEntity[]>(
    `/datasets/${datasetId}/documents/${documentId}/segments`,
    { params: { page, pageSize } },
  );
}

export function appendSegment(
  datasetId: string,
  documentId: string,
  content: string,
) {
  return requestClient.post<SegmentEntity>(
    `/datasets/${datasetId}/documents/${documentId}/segments`,
    { content },
  );
}

export function updateSegment(
  datasetId: string,
  documentId: string,
  segmentId: string,
  content: string,
) {
  return requestClient.put<SegmentEntity>(
    `/datasets/${datasetId}/documents/${documentId}/segments/${segmentId}`,
    { content },
  );
}

export function deleteSegment(
  datasetId: string,
  documentId: string,
  segmentId: string,
) {
  return requestClient.delete<void>(
    `/datasets/${datasetId}/documents/${documentId}/segments/${segmentId}`,
  );
}

export function setSegmentEnabled(
  datasetId: string,
  documentId: string,
  segmentId: string,
  enabled: boolean,
) {
  return requestClient.put<SegmentEntity>(
    `/datasets/${datasetId}/documents/${documentId}/segments/${segmentId}/enabled`,
    { enabled },
  );
}
