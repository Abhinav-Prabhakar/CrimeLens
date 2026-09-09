'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  InvestigationCase,
  InvestigationEntity,
  InvestigationRelationship,
  IngestedDocument,
  InvestigationTimelineEvent,
  AuditLogEntry,
} from '../types/investigation';
import { graphApi, CaseSummary } from '../graph/graphApi';
import {
  getAuditLogs,
  logAuditEvent,
  getAllIntelSubmissions,
  getCaseById,
  getEntitiesByCase,
  getRelationshipsByCase,
  getDocumentsByCase,
  getTimelineEventsByCase,
  saveCase as cacheSaveCase,
  replaceCaseScope,
  purgeCaseData,
} from '../storage/db';
import { GraphEngine } from '../graph/algorithms';

const ACTIVE_CASE_STORAGE_KEY = 'crimelens.activeCaseId';
const HISTORY_LIMIT = 40;

export type GraphConnectionStatus = 'checking' | 'online' | 'offline';

interface HistorySnapshot {
  entities: InvestigationEntity[];
  relationships: InvestigationRelationship[];
}

export function useInvestigationStore() {
  const [activeCase, setActiveCase] = useState<InvestigationCase | null>(null);
  const [entities, setEntities] = useState<InvestigationEntity[]>([]);
  const [relationships, setRelationships] = useState<InvestigationRelationship[]>([]);
  const [documents, setDocuments] = useState<IngestedDocument[]>([]);
  const [timelineEvents, setTimelineEvents] = useState<InvestigationTimelineEvent[]>([]);
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [selectedEntityIds, setSelectedEntityIds] = useState<string[]>([]);
  const [activeTool, setActiveTool] = useState<'select' | 'connect' | 'lasso' | 'pan'>('select');
  const [threadColor, setThreadColor] = useState<'crimson' | 'twine' | 'cobalt' | 'shadow'>('crimson');
  const [activeView, setActiveView] = useState<'board' | 'graph' | 'patterns' | 'timeline'>('board');
  const [loading, setLoading] = useState<boolean>(true);
  const [dbError, setDbError] = useState<string>('');
  const [graphStatus, setGraphStatus] = useState<GraphConnectionStatus>('checking');
  const [caseSummaries, setCaseSummaries] = useState<CaseSummary[]>([]);
  const [filterTypes, setFilterTypes] = useState<Record<string, boolean>>({
    photo: true,
    suspect: true,
    sticky: true,
    doc: true,
    news: true,
    print: true,
    map: true,
    statement: true,
    bag: true,
    key: true,
    plan: true,
  });

  // Undo/redo stacks (snapshots of the mutable graph)
  const historyRef = useRef<HistorySnapshot[]>([]);
  const futureRef = useRef<HistorySnapshot[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const refreshHistoryFlags = () => {
    setCanUndo(historyRef.current.length > 0);
    setCanRedo(futureRef.current.length > 0);
  };

  const pushHistory = useCallback(() => {
    historyRef.current.push({ entities, relationships });
    if (historyRef.current.length > HISTORY_LIMIT) historyRef.current.shift();
    futureRef.current = [];
    refreshHistoryFlags();
  }, [entities, relationships]);

  // -------- Audit helper (local, append-only chain of custody) --------
  const recordAudit = useCallback(
    async (
      action: AuditLogEntry['action'],
      targetType: string,
      targetId: string,
      details: string,
      caseId?: string
    ) => {
      const scopeCase = caseId || activeCase?.id;
      if (!scopeCase) return;
      try {
        await logAuditEvent({
          id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          caseId: scopeCase,
          action,
          targetType,
          targetId,
          details,
          timestamp: new Date().toISOString(),
          investigator: activeCase?.leadInvestigator || 'System',
        });
      } catch {
        // Audit persistence failure must not corrupt the primary mutation
      }
    },
    [activeCase]
  );

  // -------- Offline guard: Neo4j is the system of record --------
  const requireOnline = useCallback((): boolean => {
    if (graphStatus === 'online') return true;
    setDbError(
      'Neo4j graph database unreachable — changes are disabled until the connection is restored. ' +
        'Verify the database is running (neo4j status) and reload.'
    );
    return false;
  }, [graphStatus]);

  const mirrorCache = useCallback(
    async (caseItem: InvestigationCase | null) => {
      if (!caseItem) return;
      try {
        await cacheSaveCase(caseItem);
        await replaceCaseScope(caseItem.id, {
          entities: entitiesRef.current,
          relationships: relationshipsRef.current,
          documents: documentsRef.current,
          timelineEvents: timelineEventsRef.current,
        });
      } catch {
        // Cache is best-effort; Neo4j remains authoritative
      }
    },
    []
  );

  // Latest state for cache mirroring without dependency churn
  const entitiesRef = useRef(entities);
  const relationshipsRef = useRef(relationships);
  const documentsRef = useRef(documents);
  const timelineEventsRef = useRef(timelineEvents);
  entitiesRef.current = entities;
  relationshipsRef.current = relationships;
  documentsRef.current = documents;
  timelineEventsRef.current = timelineEvents;

  const applyCaseState = useCallback(
    (state: {
      caseItem: InvestigationCase;
      entities: InvestigationEntity[];
      relationships: InvestigationRelationship[];
      documents: IngestedDocument[];
      timelineEvents: InvestigationTimelineEvent[];
    }) => {
      setActiveCase(state.caseItem);
      setEntities(state.entities);
      setRelationships(state.relationships);
      setDocuments(state.documents);
      setTimelineEvents(state.timelineEvents);
      setSelectedEntityId(null);
      setSelectedEntityIds([]);
      historyRef.current = [];
      futureRef.current = [];
      refreshHistoryFlags();
    },
    []
  );

  // -------- Case loading --------

  const loadCaseState = useCallback(async (caseId: string) => {
    const state = await graphApi.getCaseState(caseId);
    applyCaseState(state);
    // Write-through cache for resilient offline boot
    try {
      await cacheSaveCase(state.caseItem);
      await replaceCaseScope(caseId, {
        entities: state.entities,
        relationships: state.relationships,
        documents: state.documents,
        timelineEvents: state.timelineEvents,
      });
    } catch {
      /* cache is best-effort */
    }
  }, [applyCaseState]);

  const refreshCaseList = useCallback(async (): Promise<CaseSummary[]> => {
    const summaries = await graphApi.listCases();
    setCaseSummaries(summaries);
    return summaries;
  }, []);

  // Initialize: Neo4j is the source of truth; IndexedDB cache boots the UI if unreachable
  const init = useCallback(async () => {
    setLoading(true);
    try {
      const status = await graphApi.status();
      if (!status.online) throw new Error(status.error || 'Neo4j unreachable');

      setGraphStatus('online');
      setDbError('');

      let summaries = await refreshCaseList();
      if (summaries.length === 0) {
        await graphApi.seed();
        summaries = await refreshCaseList();
      }

      const storedId =
        typeof window !== 'undefined' ? localStorage.getItem(ACTIVE_CASE_STORAGE_KEY) : null;
      const target = summaries.find((s) => s.caseItem.id === storedId) || summaries[0];
      localStorage.setItem(ACTIVE_CASE_STORAGE_KEY, target.caseItem.id);
      await loadCaseState(target.caseItem.id);
    } catch (err: any) {
      // Fall back to the local cache so the workspace stays inspectable; writes stay disabled
      setGraphStatus('offline');
      setDbError(err?.message || 'Neo4j graph database unreachable — booted from local cache (read-only).');
      try {
        const storedId =
          typeof window !== 'undefined' ? localStorage.getItem(ACTIVE_CASE_STORAGE_KEY) : null;
        const cachedCase = await getCaseById(storedId || 'case_blackwood_2026');
        if (cachedCase) {
          const [cachedEntities, cachedRels, cachedDocs, cachedEvents] = await Promise.all([
            getEntitiesByCase(cachedCase.id),
            getRelationshipsByCase(cachedCase.id),
            getDocumentsByCase(cachedCase.id),
            getTimelineEventsByCase(cachedCase.id),
          ]);
          applyCaseState({
            caseItem: cachedCase,
            entities: cachedEntities,
            relationships: cachedRels,
            documents: cachedDocs,
            timelineEvents: cachedEvents,
          });
        }
      } catch {
        /* no cache available */
      }
    } finally {
      setLoading(false);
    }
  }, [loadCaseState, refreshCaseList, applyCaseState]);

  useEffect(() => {
    init();
  }, [init]);

  // Graph Engine Instance
  const graphEngine = useMemo(() => {
    return new GraphEngine(entities, relationships);
  }, [entities, relationships]);

  // -------- Case management --------

  const switchCase = useCallback(
    async (caseId: string) => {
      localStorage.setItem(ACTIVE_CASE_STORAGE_KEY, caseId);
      setLoading(true);
      try {
        await loadCaseState(caseId);
        setDbError('');
      } catch (err: any) {
        setDbError(err?.message || `Failed to load case ${caseId} from the graph database.`);
      } finally {
        setLoading(false);
      }
    },
    [loadCaseState]
  );

  const createCase = useCallback(
    async (caseData: Partial<InvestigationCase>): Promise<InvestigationCase | null> => {
      if (!requireOnline()) return null;
      try {
        const newCase = await graphApi.createCase(caseData);
        await recordAudit('case_created', 'case', newCase.id, `Initialized case ${newCase.title} (${newCase.caseNumber})`, newCase.id);
        await refreshCaseList();
        await switchCase(newCase.id);
        return newCase;
      } catch (err: any) {
        setDbError(err?.message || 'Case creation failed.');
        return null;
      }
    },
    [recordAudit, refreshCaseList, switchCase, requireOnline]
  );

  const updateCase = useCallback(
    async (caseId: string, updates: Partial<InvestigationCase>) => {
      if (!activeCase || activeCase.id !== caseId || !requireOnline()) return;
      try {
        const updated = await graphApi.updateCase(caseId, updates);
        setActiveCase(updated);
        await cacheSaveCase(updated).catch(() => {});
        await recordAudit('case_updated', 'case', caseId, `Case record updated (${Object.keys(updates).join(', ')})`);
      } catch (err: any) {
        setDbError(err?.message || 'Case update failed.');
      }
    },
    [activeCase, recordAudit, requireOnline]
  );

  const deleteCase = useCallback(
    async (caseId: string) => {
      if (!requireOnline()) return;
      await recordAudit('case_deleted', 'case', caseId, 'Case purged with all scoped records', caseId);
      await graphApi.deleteCase(caseId);
      await purgeCaseData(caseId).catch(() => {}); // drop the local cache copy too
      const remaining = await refreshCaseList();
      if (remaining.length > 0) {
        await switchCase(remaining[0].caseItem.id);
      } else {
        await graphApi.seed();
        await refreshCaseList();
        await init();
      }
    },
    [recordAudit, refreshCaseList, switchCase, init, requireOnline]
  );

  // -------- Entity actions --------

  const addEntity = useCallback(
    async (entityData: Partial<InvestigationEntity>): Promise<InvestigationEntity> => {
      if (!activeCase) throw new Error('No active case');
      if (!requireOnline()) throw new Error('Graph database unreachable');

      const newEntity = await graphApi.createEntity(activeCase.id, entityData);
      pushHistory();
      setEntities((prev) => [...prev, newEntity]);

      try {
        await recordAudit(
          'entity_created',
          'entity',
          newEntity.id,
          `Created entity ${newEntity.label} (${newEntity.type})`
        );
      } catch { /* audit best-effort */ }
      return newEntity;
    },
    [activeCase, pushHistory, recordAudit, requireOnline]
  );

  const updateEntity = useCallback(
    async (id: string, updates: Partial<InvestigationEntity>) => {
      const isPositionOnly = Object.keys(updates).length === 1 && 'boardPosition' in updates;

      try {
        const updated = await graphApi.updateEntity(id, updates);
        setEntities((prev) => prev.map((e) => (e.id === id ? updated : e)));
      } catch (err: any) {
        setDbError(err?.message || 'Entity update failed.');
        return;
      }

      if (!isPositionOnly) {
        await recordAudit('entity_updated', 'entity', id, `Updated ${Object.keys(updates).join(', ')}`);
      }
    },
    [recordAudit]
  );

  const deleteEntity = useCallback(
    async (id: string) => {
      if (!requireOnline()) return;
      const label = entities.find((e) => e.id === id)?.label || id;
      pushHistory();

      try {
        await graphApi.deleteEntity(id);
      } catch (err: any) {
        setDbError(err?.message || 'Entity deletion failed.');
        return;
      }

      setRelationships((prev) => prev.filter((r) => r.sourceId !== id && r.targetId !== id));
      setEntities((prev) => prev.filter((e) => e.id !== id));
      if (selectedEntityId === id) setSelectedEntityId(null);
      setSelectedEntityIds((prev) => prev.filter((sid) => sid !== id));

      await recordAudit('entity_deleted', 'entity', id, `Removed entity ${label} and its connections`);
    },
    [entities, pushHistory, recordAudit, selectedEntityId, requireOnline]
  );

  // -------- Relationship actions --------

  const addRelationship = useCallback(
    async (relData: Partial<InvestigationRelationship>): Promise<InvestigationRelationship> => {
      if (!activeCase) throw new Error('No active case');
      if (!relData.sourceId || !relData.targetId) throw new Error('Source and Target required');
      if (relData.sourceId === relData.targetId) throw new Error('Source and Target must differ');
      if (!requireOnline()) throw new Error('Graph database unreachable');

      const newRel = await graphApi.createRelationship(activeCase.id, relData, threadColor);
      pushHistory();
      setRelationships((prev) => [...prev, newRel]);

      await recordAudit(
        'relationship_created',
        'relationship',
        newRel.id,
        `Connected entities via ${newRel.predicate} (${newRel.status})`
      );
      return newRel;
    },
    [activeCase, threadColor, pushHistory, recordAudit, requireOnline]
  );

  const updateRelationship = useCallback(async (id: string, updates: Partial<InvestigationRelationship>) => {
    try {
      const updated = await graphApi.updateRelationship(id, updates);
      setRelationships((prev) => prev.map((r) => (r.id === id ? updated : r)));
    } catch (err: any) {
      setDbError(err?.message || 'Relationship update failed.');
    }
  }, []);

  const confirmRelationship = useCallback(
    async (id: string) => {
      const rel = relationships.find((r) => r.id === id);
      if (!rel) return;
      await updateRelationship(id, {
        status: 'investigator_confirmed',
        manuallyConfirmed: true,
        confidence: Math.max(rel.confidence, 0.9),
      });
      await recordAudit(
        'relationship_confirmed',
        'relationship',
        id,
        `Investigator confirmed ${rel.predicate} link (${rel.label || 'connection'})`
      );
    },
    [relationships, updateRelationship, recordAudit]
  );

  const deleteRelationship = useCallback(
    async (id: string) => {
      if (!requireOnline()) return;
      pushHistory();
      try {
        await graphApi.deleteRelationship(id);
      } catch (err: any) {
        setDbError(err?.message || 'Relationship deletion failed.');
        return;
      }
      setRelationships((prev) => prev.filter((r) => r.id !== id));
      await recordAudit('relationship_deleted', 'relationship', id, 'Removed connection from graph');
    },
    [pushHistory, recordAudit, requireOnline]
  );

  // -------- Identity merge --------

  const mergeEntities = useCallback(
    async (keptId: string, mergedId: string) => {
      if (!activeCase || keptId === mergedId || !requireOnline()) return;
      const mergedLabel = entities.find((e) => e.id === mergedId)?.label || mergedId;
      const keptLabel = entities.find((e) => e.id === keptId)?.label || keptId;
      pushHistory();

      try {
        const result = await graphApi.mergeEntities(keptId, mergedId);
        // Reload the authoritative post-merge graph state
        await loadCaseState(activeCase.id);
        await recordAudit(
          'entities_merged',
          'entity',
          keptId,
          `Merged identity ${mergedLabel} into ${keptLabel}; ${result.movedRelationshipCount} connection(s) transferred with provenance intact`
        );
      } catch (err: any) {
        setDbError(err?.message || 'Identity merge failed.');
      }
    },
    [activeCase, entities, pushHistory, recordAudit, requireOnline, loadCaseState]
  );

  // -------- Timeline events --------

  const addTimelineEvent = useCallback(
    async (ev: Partial<InvestigationTimelineEvent>) => {
      if (!activeCase || !requireOnline()) return;
      try {
        const created = await graphApi.upsertTimelineEvent(activeCase.id, ev);
        setTimelineEvents((prev) => [...prev, created]);
      } catch (err: any) {
        setDbError(err?.message || 'Timeline event persistence failed.');
      }
    },
    [activeCase, requireOnline]
  );

  // -------- AI extraction commit (human-in-the-loop approved) --------

  const commitExtraction = useCallback(
    async (
      extractedEntities: any[],
      extractedRelationships: any[],
      extractedTimelineEvents: any[],
      docMeta: { title: string; documentType: string; rawText: string; summary?: string }
    ) => {
      if (!activeCase) return { addedEntities: 0, addedRelationships: 0, addedEvents: 0 };
      if (!requireOnline()) return { addedEntities: 0, addedRelationships: 0, addedEvents: 0 };

      pushHistory();

      const result = await graphApi.commitExtraction(
        activeCase.id,
        extractedEntities,
        extractedRelationships,
        extractedTimelineEvents,
        docMeta
      );

      // Merge the server-created records into local state
      setEntities((prev) => {
        const updatedIds = new Set(result.updatedEntities.map((e) => e.id));
        return [...prev.filter((e) => !updatedIds.has(e.id)), ...result.updatedEntities, ...result.addedEntities];
      });
      setRelationships((prev) => [...prev, ...result.addedRelationships]);
      setTimelineEvents((prev) => [...prev, ...result.addedEvents]);
      setDocuments((prev) => [...prev, result.document]);

      await recordAudit(
        'document_ingested',
        'document',
        result.document.id,
        `Ingested ${docMeta.documentType.toUpperCase()} "${docMeta.title}" (${(docMeta.rawText || '').length} chars)`
      );
      if (result.addedEntities.length > 0 || result.addedRelationships.length > 0) {
        await recordAudit(
          'ai_extraction_approved',
          'document',
          result.document.id,
          `Investigator approved ${result.addedEntities.length} new entities, ${result.addedRelationships.length} connections, ${result.addedEvents.length} timeline events`
        );
      }

      return {
        addedEntities: result.addedEntities.length,
        addedRelationships: result.addedRelationships.length,
        addedEvents: result.addedEvents.length,
      };
    },
    [activeCase, pushHistory, recordAudit, requireOnline]
  );

  // -------- Undo / Redo (reconciled against Neo4j) --------

  const reconcileGraph = useCallback(async (snapshot: HistorySnapshot, current: HistorySnapshot) => {
    const snapEntIds = new Set(snapshot.entities.map((e) => e.id));
    const snapRelIds = new Set(snapshot.relationships.map((r) => r.id));
    for (const e of current.entities) if (!snapEntIds.has(e.id)) await graphApi.deleteEntity(e.id).catch(() => {});
    for (const r of current.relationships) if (!snapRelIds.has(r.id)) await graphApi.deleteRelationship(r.id).catch(() => {});
    for (const e of snapshot.entities) await graphApi.createEntity(e.caseId, e).catch(() => {});
    for (const r of snapshot.relationships) await graphApi.createRelationship(r.caseId, r).catch(() => {});
  }, []);

  const undo = useCallback(async () => {
    if (historyRef.current.length === 0 || !requireOnline()) return;
    const snapshot = historyRef.current.pop()!;
    futureRef.current.push({ entities, relationships });
    await reconcileGraph(snapshot, { entities, relationships });
    setEntities(snapshot.entities);
    setRelationships(snapshot.relationships);
    setSelectedEntityId(null);
    refreshHistoryFlags();
    await mirrorCache(activeCase);
  }, [entities, relationships, reconcileGraph, requireOnline, mirrorCache, activeCase]);

  const redo = useCallback(async () => {
    if (futureRef.current.length === 0 || !requireOnline()) return;
    const snapshot = futureRef.current.pop()!;
    historyRef.current.push({ entities, relationships });
    await reconcileGraph(snapshot, { entities, relationships });
    setEntities(snapshot.entities);
    setRelationships(snapshot.relationships);
    setSelectedEntityId(null);
    refreshHistoryFlags();
    await mirrorCache(activeCase);
  }, [entities, relationships, reconcileGraph, requireOnline, mirrorCache, activeCase]);

  // -------- Bundle import / export / reset --------

  const importBundle = useCallback(
    async (rawJson: unknown): Promise<{ ok: boolean; message: string; caseId?: string }> => {
      if (!requireOnline()) return { ok: false, message: 'Graph database unreachable.' };
      try {
        const result = await graphApi.importBundle(rawJson);
        await recordAudit(
          'bundle_imported',
          'case',
          result.caseId,
          `Imported case bundle into Neo4j${result.renamed ? ' with re-scoped identity to avoid overwrite' : ''}`,
          result.caseId
        );
        await refreshCaseList();
        await switchCase(result.caseId);
        return { ok: true, message: result.message, caseId: result.caseId };
      } catch (err: any) {
        return { ok: false, message: err?.message || 'Bundle import failed.' };
      }
    },
    [recordAudit, refreshCaseList, switchCase, requireOnline]
  );

  const exportData = useCallback(async () => {
    if (!activeCase) return null;
    try {
      const [auditLogs, intelSubmissions] = await Promise.all([
        getAuditLogs(activeCase.id),
        getAllIntelSubmissions(),
      ]);
      return {
        version: '1.1.0',
        system: 'CrimeLens',
        exportedAt: new Date().toISOString(),
        caseItem: activeCase,
        entities,
        relationships,
        documents,
        auditLogs,
        timelineEvents,
        intelSubmissions: intelSubmissions.filter((s) => s.caseId === activeCase.id),
      };
    } catch {
      return {
        version: '1.1.0',
        system: 'CrimeLens',
        exportedAt: new Date().toISOString(),
        caseItem: activeCase,
        entities,
        relationships,
        documents,
        auditLogs: [],
        timelineEvents,
        intelSubmissions: [],
      };
    }
  }, [activeCase, entities, relationships, documents, timelineEvents]);

  const resetToSeed = useCallback(async () => {
    if (!requireOnline()) return;
    setLoading(true);
    try {
      await graphApi.seed(true);
      await loadCaseState('case_blackwood_2026');
      localStorage.setItem(ACTIVE_CASE_STORAGE_KEY, 'case_blackwood_2026');
      await refreshCaseList();
    } catch (err: any) {
      setDbError(err?.message || 'Seed reset failed.');
    } finally {
      setLoading(false);
    }
  }, [loadCaseState, refreshCaseList, requireOnline]);

  return {
    activeCase,
    entities,
    relationships,
    documents,
    timelineEvents,
    selectedEntityId,
    selectedEntityIds,
    activeTool,
    threadColor,
    activeView,
    loading,
    dbError,
    graphStatus,
    caseSummaries,
    filterTypes,
    graphEngine,
    canUndo,
    canRedo,
    setActiveView,
    setActiveTool,
    setThreadColor,
    setSelectedEntityId,
    setSelectedEntityIds,
    setFilterTypes,
    clearDbError: () => setDbError(''),
    init,
    refreshCaseList,
    switchCase,
    createCase,
    updateCase,
    deleteCase,
    addEntity,
    updateEntity,
    deleteEntity,
    addRelationship,
    updateRelationship,
    confirmRelationship,
    deleteRelationship,
    mergeEntities,
    addTimelineEvent,
    commitExtraction,
    undo,
    redo,
    importBundle,
    resetToSeed,
    logCaseEvent: (
      action: AuditLogEntry['action'],
      targetType: string,
      targetId: string,
      details: string
    ) => recordAudit(action, targetType, targetId, details),
    exportData,
  };
}
