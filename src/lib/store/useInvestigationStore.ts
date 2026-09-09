'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  InvestigationCase,
  InvestigationEntity,
  InvestigationRelationship,
  IngestedDocument,
  InvestigationTimelineEvent,
  AuditLogEntry,
  BoardCardType,
  EntityType,
} from '../types/investigation';
import {
  getAllCases,
  getCaseById,
  saveCase,
  getEntitiesByCase,
  saveEntity,
  deleteEntity as dbDeleteEntity,
  getRelationshipsByCase,
  saveRelationship,
  deleteRelationship as dbDeleteRelationship,
  getDocumentsByCase,
  saveDocument,
  getTimelineEventsByCase,
  saveTimelineEvent,
  logAuditEvent,
  exportCaseData,
  purgeCaseData,
} from '../storage/db';
import { validateBundle, planImport, BundleValidationError } from '../storage/importExport';
import { stringSimilarity } from '../resolution/identityMatcher';
import { SEED_CASE, SEED_ENTITIES, SEED_RELATIONSHIPS } from '../storage/seedData';
import { GraphEngine } from '../graph/algorithms';

const ACTIVE_CASE_STORAGE_KEY = 'crimelens.activeCaseId';
const HISTORY_LIMIT = 40;

interface HistorySnapshot {
  entities: InvestigationEntity[];
  relationships: InvestigationRelationship[];
}

function genId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

/**
 * Resolve an extracted label to an existing entity using exact label, alias,
 * and high-threshold fuzzy similarity (same type) to avoid duplicate nodes.
 */
function findExistingEntity(
  label: string,
  type: EntityType,
  existing: InvestigationEntity[]
): InvestigationEntity | null {
  const norm = (s: string) => s.toLowerCase().trim();
  const target = norm(label);
  if (!target) return null;

  for (const e of existing) {
    if (norm(e.label) === target) return e;
    if (e.aliases.some((a) => norm(a) === target)) return e;
  }

  let best: InvestigationEntity | null = null;
  let bestSim = 0;
  for (const e of existing) {
    if (e.type !== type) continue;
    const sim = stringSimilarity(e.label, label);
    if (sim > bestSim) {
      bestSim = sim;
      best = e;
    }
  }
  return best && bestSim >= 0.92 ? best : null;
}

/** Collision-free board placement: random sampling then expanding spiral rings. */
function collisionFreePosition(existing: InvestigationEntity[]): { x: number; y: number } {
  const occupied = existing.map((e) => e.boardPosition);
  const farEnough = (x: number, y: number) =>
    occupied.every((p) => Math.hypot(p.x - x, p.y - y) >= 13);

  for (let i = 0; i < 80; i++) {
    const x = (Math.random() - 0.5) * 54;
    const y = (Math.random() - 0.5) * 36;
    if (farEnough(x, y)) return { x, y };
  }
  // Spiral fallback: guaranteed distinct ring position
  const ring = 14 + Math.floor(occupied.length / 12) * 6;
  const angle = occupied.length * 1.7;
  return { x: Math.cos(angle) * ring, y: Math.sin(angle) * ring * 0.7 };
}

function inferEventCategory(description: string): InvestigationTimelineEvent['category'] {
  const d = description.toLowerCase();
  if (/call|phone|sms|messag|communicat/.test(d)) return 'communication';
  if (/transfer|wire|payment|escrow|fund|deposit|money/.test(d)) return 'financial';
  if (/fingerprint|forensic|recover|dna|latent|ballistic/.test(d)) return 'forensic';
  if (/breach|theft|burglar|incident|assault|explosion|heist/.test(d)) return 'incident';
  return 'surveillance';
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

  // -------- Audit helper --------
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
          id: genId('log'),
          caseId: scopeCase,
          action,
          targetType,
          targetId,
          details,
          timestamp: new Date().toISOString(),
          investigator: activeCase?.leadInvestigator || 'System',
        });
      } catch {
        // Audit persistence failure must not corrupt the primary mutation;
        // the dbError banner surfaces storage problems.
      }
    },
    [activeCase]
  );

  // -------- Case loading --------
  const loadCaseState = useCallback(async (caseId: string) => {
    const [caseItem, loadedEntities, loadedRelationships, loadedDocs, loadedEvents] = await Promise.all([
      getCaseById(caseId),
      getEntitiesByCase(caseId),
      getRelationshipsByCase(caseId),
      getDocumentsByCase(caseId),
      getTimelineEventsByCase(caseId),
    ]);
    setActiveCase(caseItem || null);
    setEntities(loadedEntities);
    setRelationships(loadedRelationships);
    setDocuments(loadedDocs);
    setTimelineEvents(loadedEvents);
    setSelectedEntityId(null);
    setSelectedEntityIds([]);
    historyRef.current = [];
    futureRef.current = [];
    refreshHistoryFlags();
  }, []);

  // Initialize & Seed if empty
  const init = useCallback(async () => {
    try {
      setLoading(true);
      let cases = await getAllCases();
      let targetCase: InvestigationCase | undefined;

      if (cases.length === 0) {
        // Seed default demo case on first run
        await saveCase(SEED_CASE);
        for (const ent of SEED_ENTITIES) await saveEntity(ent);
        for (const rel of SEED_RELATIONSHIPS) await saveRelationship(rel);
        cases = await getAllCases();
      }

      // Restore last active case (design.md §7: LocalStorage — active case ID)
      const storedId = typeof window !== 'undefined' ? localStorage.getItem(ACTIVE_CASE_STORAGE_KEY) : null;
      targetCase = cases.find((c) => c.id === storedId) || cases[0];

      localStorage.setItem(ACTIVE_CASE_STORAGE_KEY, targetCase.id);
      await loadCaseState(targetCase.id);
      setDbError('');
    } catch (err: any) {
      // Environmental failure (e.g. storage blocked): run on in-memory seed so the
      // workspace stays usable, and surface the storage problem explicitly.
      setDbError(err?.message || 'IndexedDB unavailable — running in memory-only mode.');
      setActiveCase(SEED_CASE);
      setEntities(SEED_ENTITIES);
      setRelationships(SEED_RELATIONSHIPS);
    } finally {
      setLoading(false);
    }
  }, [loadCaseState]);

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
      } finally {
        setLoading(false);
      }
    },
    [loadCaseState]
  );

  const createCase = useCallback(
    async (caseData: Partial<InvestigationCase>): Promise<InvestigationCase | null> => {
      const newCase: InvestigationCase = {
        id: genId('case'),
        title: caseData.title || 'Untitled Investigation',
        caseNumber: caseData.caseNumber || `CR-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        description: caseData.description || '',
        status: 'active',
        priority: caseData.priority || 'medium',
        leadInvestigator: caseData.leadInvestigator || 'Unassigned',
        jurisdiction: caseData.jurisdiction || 'Unspecified',
        incidentDate: caseData.incidentDate,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tags: caseData.tags || ['active_inquiry'],
      };
      try {
        await saveCase(newCase);
      } catch (err: any) {
        setDbError(err?.message || 'Failed to persist case.');
        return null;
      }
      await recordAudit('case_created', 'case', newCase.id, `Initialized case ${newCase.title} (${newCase.caseNumber})`, newCase.id);
      await switchCase(newCase.id);
      return newCase;
    },
    [recordAudit, switchCase]
  );

  const updateCase = useCallback(
    async (caseId: string, updates: Partial<InvestigationCase>) => {
      if (!activeCase || activeCase.id !== caseId) return;
      const updated = { ...activeCase, ...updates, updatedAt: new Date().toISOString() };
      setActiveCase(updated);
      try {
        await saveCase(updated);
      } catch {
        /* surfaced via dbError on load */
      }
      await recordAudit('case_updated', 'case', caseId, `Case record updated (${Object.keys(updates).join(', ')})`);
    },
    [activeCase, recordAudit]
  );

  const deleteCase = useCallback(
    async (caseId: string) => {
      await recordAudit('case_deleted', 'case', caseId, `Case purged with all scoped records`, caseId);
      await purgeCaseData(caseId);
      const remaining = await getAllCases();
      if (remaining.length > 0) {
        await switchCase(remaining[0].id);
      } else {
        // Nothing left: re-seed the demo workspace
        await init();
      }
    },
    [recordAudit, switchCase, init]
  );

  // -------- Entity actions --------

  const addEntity = useCallback(
    async (entityData: Partial<InvestigationEntity>): Promise<InvestigationEntity> => {
      if (!activeCase) throw new Error('No active case');
      pushHistory();

      const newEntity: InvestigationEntity = {
        id: genId('ent'),
        caseId: activeCase.id,
        type: entityData.type || 'person',
        label: entityData.label || 'New Entity',
        aliases: entityData.aliases || [],
        attributes: entityData.attributes || {},
        confidence: entityData.confidence ?? 0.85,
        status: entityData.status || 'investigator_confirmed',
        provenance:
          entityData.provenance || {
            sourceId: 'manual',
            sourceType: 'fir',
            sourceTitle: 'Manual Investigator Entry',
            confidence: 1.0,
          },
        boardPosition: entityData.boardPosition || collisionFreePosition(entities),
        visualType: entityData.visualType || 'suspect',
        notes: entityData.notes || '',
        tags: entityData.tags || [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setEntities((prev) => [...prev, newEntity]);
      try {
        await saveEntity(newEntity);
        await recordAudit(
          'entity_created',
          'entity',
          newEntity.id,
          `Created entity ${newEntity.label} (${newEntity.type})`
        );
      } catch (err: any) {
        setDbError(err?.message || 'Entity persistence failed.');
      }

      return newEntity;
    },
    [activeCase, entities, pushHistory, recordAudit]
  );

  const updateEntity = useCallback(
    async (id: string, updates: Partial<InvestigationEntity>) => {
      const isPositionOnly =
        Object.keys(updates).length === 1 && 'boardPosition' in updates;

      setEntities((prev) =>
        prev.map((e) => {
          if (e.id === id) {
            const updated = { ...e, ...updates, updatedAt: new Date().toISOString() };
            saveEntity(updated).catch(() => {});
            return updated;
          }
          return e;
        })
      );

      if (!isPositionOnly) {
        await recordAudit(
          'entity_updated',
          'entity',
          id,
          `Updated ${Object.keys(updates).join(', ')}`
        );
      }
    },
    [recordAudit]
  );

  const deleteEntity = useCallback(
    async (id: string) => {
      if (!activeCase) return;
      pushHistory();
      const label = entities.find((e) => e.id === id)?.label || id;

      setRelationships((prev) => prev.filter((r) => r.sourceId !== id && r.targetId !== id));
      setEntities((prev) => prev.filter((e) => e.id !== id));
      if (selectedEntityId === id) setSelectedEntityId(null);
      setSelectedEntityIds((prev) => prev.filter((sid) => sid !== id));

      try {
        await dbDeleteEntity(id); // cascades relationship deletion in storage
      } catch (err: any) {
        setDbError(err?.message || 'Entity deletion failed.');
      }
      await recordAudit('entity_deleted', 'entity', id, `Removed entity ${label} and its connections`);
    },
    [activeCase, entities, pushHistory, recordAudit, selectedEntityId]
  );

  // -------- Relationship actions --------

  const addRelationship = useCallback(
    async (relData: Partial<InvestigationRelationship>): Promise<InvestigationRelationship> => {
      if (!activeCase) throw new Error('No active case');
      if (!relData.sourceId || !relData.targetId) throw new Error('Source and Target required');
      if (relData.sourceId === relData.targetId) throw new Error('Source and Target must differ');
      pushHistory();

      const newRel: InvestigationRelationship = {
        id: genId('rel'),
        caseId: activeCase.id,
        sourceId: relData.sourceId,
        targetId: relData.targetId,
        predicate: relData.predicate || 'ASSOCIATED_WITH',
        label: relData.label || 'Connected',
        weight: relData.weight || 1,
        confidence: relData.confidence ?? 0.85,
        status: relData.status || 'investigator_confirmed',
        threadColor: relData.threadColor || threadColor,
        validFrom: relData.validFrom,
        validTo: relData.validTo,
        provenance:
          relData.provenance || {
            sourceId: 'manual',
            sourceType: 'fir',
            sourceTitle: 'Manual Pin Connection',
            confidence: 1.0,
          },
        notes: relData.notes || '',
        manuallyConfirmed: relData.manuallyConfirmed ?? true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setRelationships((prev) => [...prev, newRel]);
      try {
        await saveRelationship(newRel);
        await recordAudit(
          'relationship_created',
          'relationship',
          newRel.id,
          `Connected entities via ${newRel.predicate} (${newRel.status})`
        );
      } catch (err: any) {
        setDbError(err?.message || 'Relationship persistence failed.');
      }

      return newRel;
    },
    [activeCase, threadColor, pushHistory, recordAudit]
  );

  const updateRelationship = useCallback(
    async (id: string, updates: Partial<InvestigationRelationship>) => {
      setRelationships((prev) =>
        prev.map((r) => {
          if (r.id === id) {
            const updated = { ...r, ...updates, updatedAt: new Date().toISOString() };
            saveRelationship(updated).catch(() => {});
            return updated;
          }
          return r;
        })
      );
    },
    []
  );

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
      pushHistory();
      setRelationships((prev) => prev.filter((r) => r.id !== id));
      try {
        await dbDeleteRelationship(id);
      } catch (err: any) {
        setDbError(err?.message || 'Relationship deletion failed.');
      }
      await recordAudit('relationship_deleted', 'relationship', id, 'Removed connection from graph');
    },
    [pushHistory, recordAudit]
  );

  // -------- Identity merge --------

  const mergeEntities = useCallback(
    async (keptId: string, mergedId: string) => {
      if (!activeCase || keptId === mergedId) return;
      pushHistory();

      const kept = entities.find((e) => e.id === keptId);
      const merged = entities.find((e) => e.id === mergedId);
      if (!kept || !merged) return;

      // Union attributes: kept entity wins conflicts, merged contributes the rest
      const mergedAttributes: Record<string, any> = { ...(merged.attributes || {}) };
      for (const [k, v] of Object.entries(kept.attributes || {})) {
        mergedAttributes[k] = v;
      }

      const updatedKept: InvestigationEntity = {
        ...kept,
        aliases: Array.from(new Set([...kept.aliases, merged.label, ...merged.aliases])).filter(
          (a) => a.toLowerCase() !== kept.label.toLowerCase()
        ),
        attributes: mergedAttributes,
        tags: Array.from(new Set([...kept.tags, ...merged.tags])),
        notes: `${kept.notes || ''}\n[MERGED IDENTITY]: Combined records with ${merged.label} (records unified on ${new Date().toLocaleDateString()}).`.trim(),
        updatedAt: new Date().toISOString(),
      };

      // Move relationships to the kept entity, PRESERVING ids, predicates, provenance & confidence
      const movedRelationships = relationships
        .filter((r) => r.sourceId === mergedId || r.targetId === mergedId)
        .map((r) => ({
          ...r,
          sourceId: r.sourceId === mergedId ? keptId : r.sourceId,
          targetId: r.targetId === mergedId ? keptId : r.targetId,
          updatedAt: new Date().toISOString(),
        }))
        .filter((r) => r.sourceId !== r.targetId); // drop self-loops created by the merge

      setEntities((prev) => prev.map((e) => (e.id === keptId ? updatedKept : e)).filter((e) => e.id !== mergedId));
      setRelationships((prev) => [
        ...prev.filter((r) => r.sourceId !== mergedId && r.targetId !== mergedId),
        ...movedRelationships,
      ]);

      try {
        await saveEntity(updatedKept);
        for (const rel of movedRelationships) await saveRelationship(rel);
        await dbDeleteEntity(mergedId); // removes stale rels still pointing at mergedId
      } catch (err: any) {
        setDbError(err?.message || 'Merge persistence failed.');
      }

      await recordAudit(
        'entities_merged',
        'entity',
        keptId,
        `Merged identity ${merged.label} into ${kept.label}; ${movedRelationships.length} connection(s) transferred with provenance intact`
      );
    },
    [activeCase, entities, relationships, pushHistory, recordAudit]
  );

  // -------- Timeline events --------

  const addTimelineEvent = useCallback(
    async (ev: Partial<InvestigationTimelineEvent>) => {
      if (!activeCase) return;
      const newEvent: InvestigationTimelineEvent = {
        id: genId('ev'),
        caseId: activeCase.id,
        timestamp: ev.timestamp || new Date().toISOString(),
        title: ev.title || 'Investigative Event',
        category: ev.category || 'surveillance',
        description: ev.description || '',
        involvedEntityIds: ev.involvedEntityIds || [],
        source: ev.source || 'manual',
        sourceRefId: ev.sourceRefId,
        createdAt: new Date().toISOString(),
      };
      setTimelineEvents((prev) => [...prev, newEvent]);
      try {
        await saveTimelineEvent(newEvent);
      } catch (err: any) {
        setDbError(err?.message || 'Timeline event persistence failed.');
      }
    },
    [activeCase]
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

      pushHistory();

      const labelToIdMap = new Map<string, string>();
      entities.forEach((e) => {
        labelToIdMap.set(e.label.toLowerCase(), e.id);
        e.aliases.forEach((a) => labelToIdMap.set(a.toLowerCase(), e.id));
      });

      const newEntities: InvestigationEntity[] = [];
      const workingEntities = [...entities];

      for (const item of extractedEntities) {
        const type = (item.type as EntityType) || 'person';

        // Fuzzy + alias resolution against existing records — no duplicate nodes
        const existing = findExistingEntity(item.label, type, workingEntities);
        if (existing) {
          labelToIdMap.set(item.label.toLowerCase(), existing.id);
          // Fold newly learned aliases onto the existing entity
          const newAliases = (item.aliases || []).filter(
            (a: string) =>
              a.toLowerCase() !== existing.label.toLowerCase() &&
              !existing.aliases.some((x) => x.toLowerCase() === a.toLowerCase())
          );
          if (newAliases.length > 0) {
            const updated = {
              ...existing,
              aliases: [...existing.aliases, ...newAliases],
              updatedAt: new Date().toISOString(),
            };
            setEntities((prev) => prev.map((e) => (e.id === existing.id ? updated : e)));
            workingEntities.splice(workingEntities.indexOf(existing), 1, updated);
            await saveEntity(updated).catch(() => {});
          }
          continue;
        }

        const newId = genId('ent');
        labelToIdMap.set(item.label.toLowerCase(), newId);

        const newEnt: InvestigationEntity = {
          id: newId,
          caseId: activeCase.id,
          type,
          label: item.label,
          aliases: item.aliases || [],
          attributes: item.attributes || {},
          confidence: item.confidence || 0.8,
          status: 'ai_inferred',
          provenance: {
            sourceId: 'ai_extraction',
            sourceType: 'fir',
            sourceTitle: docMeta.title,
            excerpt: item.excerpt,
            confidence: item.confidence || 0.8,
          },
          boardPosition: collisionFreePosition(workingEntities),
          visualType: (item.visualType as BoardCardType) || 'suspect',
          notes: item.notes || `Extracted from ${docMeta.title}`,
          tags: ['ai_extracted', type],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        newEntities.push(newEnt);
        workingEntities.push(newEnt);
        await saveEntity(newEnt).catch(() => {});
      }

      const newRels: InvestigationRelationship[] = [];
      for (const item of extractedRelationships) {
        const srcId = labelToIdMap.get(item.sourceLabel?.toLowerCase());
        const tgtId = labelToIdMap.get(item.targetLabel?.toLowerCase());
        if (!srcId || !tgtId || srcId === tgtId) continue;

        const newRel: InvestigationRelationship = {
          id: genId('rel'),
          caseId: activeCase.id,
          sourceId: srcId,
          targetId: tgtId,
          predicate: item.predicate || 'ASSOCIATED_WITH',
          label: item.label || item.predicate,
          weight: item.weight || 1,
          confidence: item.confidence || 0.75,
          status: 'ai_inferred',
          threadColor: item.threadColor || 'crimson',
          validFrom: item.validFrom,
          provenance: {
            sourceId: 'ai_extraction',
            sourceType: 'fir',
            sourceTitle: docMeta.title,
            excerpt: item.excerpt,
            confidence: item.confidence || 0.75,
          },
          notes: item.notes,
          manuallyConfirmed: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        newRels.push(newRel);
        await saveRelationship(newRel).catch(() => {});
      }

      // Persist committed AI timeline events (labels resolved to entity ids where possible)
      const newEvents: InvestigationTimelineEvent[] = [];
      for (const ev of extractedTimelineEvents || []) {
        const involvedIds = (ev.entitiesInvolved || [])
          .map((lbl: string) => labelToIdMap.get(lbl.toLowerCase()))
          .filter((id: string | undefined): id is string => Boolean(id));

        let timestamp = ev.timestamp && !Number.isNaN(new Date(ev.timestamp).getTime())
          ? new Date(ev.timestamp).toISOString()
          : null;
        if (!timestamp) {
          // Undated extraction events anchor to ingestion time, explicitly noted
          timestamp = new Date().toISOString();
        }

        const newEvent: InvestigationTimelineEvent = {
          id: genId('ev'),
          caseId: activeCase.id,
          timestamp,
          title: ev.description ? String(ev.description).slice(0, 90) : 'Extracted event',
          category: inferEventCategory(ev.description || ''),
          description: ev.timestamp
            ? String(ev.description || '')
            : `${ev.description || ''} (timestamp unspecified in source — anchored to ingestion time)`,
          involvedEntityIds: Array.from(new Set(involvedIds)),
          source: 'ai_extraction',
          sourceRefId: docMeta.title,
          createdAt: new Date().toISOString(),
        };
        newEvents.push(newEvent);
        await saveTimelineEvent(newEvent).catch(() => {});
      }

      // Persist the ingested document record (chain of custody for the source)
      const doc: IngestedDocument = {
        id: genId('doc'),
        caseId: activeCase.id,
        title: docMeta.title,
        documentType: (docMeta.documentType as IngestedDocument['documentType']) || 'fir',
        rawText: docMeta.rawText || '',
        summary: docMeta.summary,
        extractionStatus: 'confirmed',
        extractedEntitiesCount: newEntities.length,
        extractedRelationshipsCount: newRels.length,
        importedAt: new Date().toISOString(),
      };
      await saveDocument(doc).catch(() => {});

      setEntities((prev) => [...prev, ...newEntities]);
      setRelationships((prev) => [...prev, ...newRels]);
      setTimelineEvents((prev) => [...prev, ...newEvents]);
      setDocuments((prev) => [...prev, doc]);

      await recordAudit(
        'document_ingested',
        'document',
        doc.id,
        `Ingested ${docMeta.documentType.toUpperCase()} "${docMeta.title}" (${(docMeta.rawText || '').length} chars)`
      );
      if (newEntities.length > 0 || newRels.length > 0) {
        await recordAudit(
          'ai_extraction_approved',
          'document',
          doc.id,
          `Investigator approved ${newEntities.length} new entities, ${newRels.length} connections, ${newEvents.length} timeline events`
        );
      }

      return {
        addedEntities: newEntities.length,
        addedRelationships: newRels.length,
        addedEvents: newEvents.length,
      };
    },
    [activeCase, entities, pushHistory, recordAudit]
  );

  // -------- Undo / Redo --------

  const reconcileDb = useCallback(
    async (snapshot: HistorySnapshot, current: HistorySnapshot) => {
      const snapEntIds = new Set(snapshot.entities.map((e) => e.id));
      const snapRelIds = new Set(snapshot.relationships.map((r) => r.id));
      for (const e of current.entities) if (!snapEntIds.has(e.id)) await dbDeleteEntity(e.id).catch(() => {});
      for (const r of current.relationships) if (!snapRelIds.has(r.id)) await dbDeleteRelationship(r.id).catch(() => {});
      for (const e of snapshot.entities) await saveEntity(e).catch(() => {});
      for (const r of snapshot.relationships) await saveRelationship(r).catch(() => {});
    },
    []
  );

  const undo = useCallback(async () => {
    if (historyRef.current.length === 0) return;
    const snapshot = historyRef.current.pop()!;
    futureRef.current.push({ entities, relationships });
    setEntities(snapshot.entities);
    setRelationships(snapshot.relationships);
    setSelectedEntityId(null);
    refreshHistoryFlags();
    await reconcileDb(snapshot, { entities, relationships });
  }, [entities, relationships, reconcileDb]);

  const redo = useCallback(async () => {
    if (futureRef.current.length === 0) return;
    const snapshot = futureRef.current.pop()!;
    historyRef.current.push({ entities, relationships });
    setEntities(snapshot.entities);
    setRelationships(snapshot.relationships);
    setSelectedEntityId(null);
    refreshHistoryFlags();
    await reconcileDb(snapshot, { entities, relationships });
  }, [entities, relationships, reconcileDb]);

  // -------- Bundle import / reset --------

  const importBundle = useCallback(
    async (rawJson: unknown): Promise<{ ok: boolean; message: string; caseId?: string }> => {
      let bundle;
      try {
        bundle = validateBundle(rawJson);
      } catch (err: any) {
        return { ok: false, message: err instanceof BundleValidationError ? err.message : 'Bundle validation failed.' };
      }

      const existingIds = new Set((await getAllCases()).map((c) => c.id));
      const plan = planImport(bundle, existingIds);

      try {
        await saveCase(plan.bundle.caseItem);
        for (const e of plan.bundle.entities) await saveEntity(e);
        for (const r of plan.bundle.relationships) await saveRelationship(r);
        for (const d of plan.bundle.documents) await saveDocument(d);
        for (const ev of plan.bundle.timelineEvents) await saveTimelineEvent(ev);
        for (const log of plan.bundle.auditLogs) await logAuditEvent(log);
      } catch (err: any) {
        return { ok: false, message: `Import persistence failed: ${err?.message || 'unknown error'}` };
      }

      await recordAudit(
        'bundle_imported',
        'case',
        plan.bundle.caseItem.id,
        `Imported case bundle "${bundle.caseItem.title}" (${bundle.entities.length} entities, ${bundle.relationships.length} relationships)${plan.renamed ? ' with re-scoped identity to avoid overwrite' : ''}`,
        plan.bundle.caseItem.id
      );

      await switchCase(plan.bundle.caseItem.id);
      return {
        ok: true,
        caseId: plan.bundle.caseItem.id,
        message: plan.renamed
          ? `Imported as "${plan.bundle.caseItem.title}" (original case id existed locally).`
          : `Imported case "${plan.bundle.caseItem.title}".`,
      };
    },
    [recordAudit, switchCase]
  );

  const resetToSeed = useCallback(async () => {
    try {
      setLoading(true);
      await saveCase(SEED_CASE);
      for (const ent of SEED_ENTITIES) await saveEntity(ent);
      for (const rel of SEED_RELATIONSHIPS) await saveRelationship(rel);
      localStorage.setItem(ACTIVE_CASE_STORAGE_KEY, SEED_CASE.id);
      await loadCaseState(SEED_CASE.id);
    } finally {
      setLoading(false);
    }
  }, [loadCaseState]);

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
    exportData: () => (activeCase ? exportCaseData(activeCase.id) : null),
  };
}
