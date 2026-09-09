'use client';

import {
  InvestigationCase,
  InvestigationEntity,
  InvestigationRelationship,
  IngestedDocument,
  InvestigationTimelineEvent,
} from '../types/investigation';

/**
 * Client accessor for the Neo4j-backed graph API.
 * All knowledge-graph persistence flows through these server routes — the
 * browser never holds database credentials.
 */

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
  });
  let json: any = null;
  try {
    json = await res.json();
  } catch {
    /* non-JSON error body */
  }
  if (!res.ok || json?.error) {
    throw new Error(json?.error || `Graph API request failed (${res.status} ${res.statusText})`);
  }
  return json as T;
}

export interface GraphStatus {
  online: boolean;
  configured: boolean;
  caseCount?: number;
  entityCount?: number;
  relationshipCount?: number;
  error?: string;
}

export interface CaseSummary {
  caseItem: InvestigationCase;
  entityCount: number;
  relationshipCount: number;
  anomalyCount: number;
}

export interface FullCaseState {
  caseItem: InvestigationCase;
  entities: InvestigationEntity[];
  relationships: InvestigationRelationship[];
  documents: IngestedDocument[];
  timelineEvents: InvestigationTimelineEvent[];
}

export interface CommitExtractionResponse {
  addedEntities: InvestigationEntity[];
  addedRelationships: InvestigationRelationship[];
  addedEvents: InvestigationTimelineEvent[];
  updatedEntities: InvestigationEntity[];
  document: IngestedDocument;
}

export const graphApi = {
  status: () => request<GraphStatus>('/api/graph/status'),

  listCases: () => request<{ cases: CaseSummary[] }>('/api/graph/cases').then((r) => r.cases),

  createCase: (data: Partial<InvestigationCase>) =>
    request<{ caseItem: InvestigationCase }>('/api/graph/cases', {
      method: 'POST',
      body: JSON.stringify(data),
    }).then((r) => r.caseItem),

  updateCase: (caseId: string, updates: Partial<InvestigationCase>) =>
    request<{ caseItem: InvestigationCase }>('/api/graph/cases', {
      method: 'PATCH',
      body: JSON.stringify({ caseId, updates }),
    }).then((r) => r.caseItem),

  deleteCase: (caseId: string) =>
    request<{ deleted: string }>(`/api/graph/cases?caseId=${encodeURIComponent(caseId)}`, {
      method: 'DELETE',
    }),

  getCaseState: (caseId: string) =>
    request<FullCaseState>(`/api/graph/case?caseId=${encodeURIComponent(caseId)}`),

  createEntity: (caseId: string, entity: Partial<InvestigationEntity>) =>
    request<{ entity: InvestigationEntity }>('/api/graph/entities', {
      method: 'POST',
      body: JSON.stringify({ caseId, entity }),
    }).then((r) => r.entity),

  updateEntity: (entityId: string, updates: Partial<InvestigationEntity>) =>
    request<{ entity: InvestigationEntity }>('/api/graph/entities', {
      method: 'PATCH',
      body: JSON.stringify({ entityId, updates }),
    }).then((r) => r.entity),

  deleteEntity: (entityId: string) =>
    request<{ deleted: string }>(`/api/graph/entities?id=${encodeURIComponent(entityId)}`, {
      method: 'DELETE',
    }),

  createRelationship: (caseId: string, relationship: Partial<InvestigationRelationship>, threadColor?: string) =>
    request<{ relationship: InvestigationRelationship }>('/api/graph/relationships', {
      method: 'POST',
      body: JSON.stringify({ caseId, relationship, threadColor }),
    }).then((r) => r.relationship),

  updateRelationship: (relationshipId: string, updates: Partial<InvestigationRelationship>) =>
    request<{ relationship: InvestigationRelationship }>('/api/graph/relationships', {
      method: 'PATCH',
      body: JSON.stringify({ relationshipId, updates }),
    }).then((r) => r.relationship),

  deleteRelationship: (relationshipId: string) =>
    request<{ deleted: boolean }>(`/api/graph/relationships?id=${encodeURIComponent(relationshipId)}`, {
      method: 'DELETE',
    }),

  mergeEntities: (keptId: string, mergedId: string) =>
    request<{ kept: InvestigationEntity; movedRelationshipCount: number }>('/api/graph/merge', {
      method: 'POST',
      body: JSON.stringify({ keptId, mergedId }),
    }),

  commitExtraction: (
    caseId: string,
    entities: any[],
    relationships: any[],
    timelineEvents: any[],
    docMeta: { title: string; documentType: string; rawText: string; summary?: string }
  ) =>
    request<CommitExtractionResponse>('/api/graph/commit-extraction', {
      method: 'POST',
      body: JSON.stringify({ caseId, entities, relationships, timelineEvents, docMeta }),
    }),

  importBundle: (raw: unknown) =>
    request<{ ok: true; caseId: string; message: string; renamed: boolean }>('/api/graph/import', {
      method: 'POST',
      body: JSON.stringify(raw),
    }),

  upsertTimelineEvent: (caseId: string, event: Partial<InvestigationTimelineEvent>) =>
    request<{ event: InvestigationTimelineEvent }>('/api/graph/timeline-events', {
      method: 'POST',
      body: JSON.stringify({ caseId, event }),
    }).then((r) => r.event),

  seed: (force = false) =>
    request<{ seeded: boolean; caseId: string }>('/api/graph/seed', {
      method: 'POST',
      body: JSON.stringify({ force }),
    }),
};
