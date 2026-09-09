'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  InvestigationCase,
  InvestigationEntity,
  InvestigationRelationship,
  IngestedDocument,
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
  logAuditEvent,
  exportCaseData,
} from '../storage/db';
import { SEED_CASE, SEED_ENTITIES, SEED_RELATIONSHIPS } from '../storage/seedData';
import { GraphEngine } from '../graph/algorithms';

export function useInvestigationStore() {
  const [activeCase, setActiveCase] = useState<InvestigationCase | null>(null);
  const [entities, setEntities] = useState<InvestigationEntity[]>([]);
  const [relationships, setRelationships] = useState<InvestigationRelationship[]>([]);
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [selectedEntityIds, setSelectedEntityIds] = useState<string[]>([]);
  const [activeTool, setActiveTool] = useState<'select' | 'connect' | 'lasso' | 'pan'>('select');
  const [threadColor, setThreadColor] = useState<'crimson' | 'twine' | 'cobalt' | 'shadow'>('crimson');
  const [activeView, setActiveView] = useState<'board' | 'graph' | 'patterns' | 'timeline'>('board');
  const [loading, setLoading] = useState<boolean>(true);
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

  // Initialize & Seed if empty
  const init = useCallback(async () => {
    try {
      setLoading(true);
      const cases = await getAllCases();
      let targetCase = cases[0];

      if (!targetCase) {
        // Seed default case
        await saveCase(SEED_CASE);
        for (const ent of SEED_ENTITIES) {
          await saveEntity(ent);
        }
        for (const rel of SEED_RELATIONSHIPS) {
          await saveRelationship(rel);
        }
        targetCase = SEED_CASE;
      }

      setActiveCase(targetCase);
      const loadedEntities = await getEntitiesByCase(targetCase.id);
      const loadedRelationships = await getRelationshipsByCase(targetCase.id);

      setEntities(loadedEntities.length > 0 ? loadedEntities : SEED_ENTITIES);
      setRelationships(loadedRelationships.length > 0 ? loadedRelationships : SEED_RELATIONSHIPS);
    } catch (err) {
      console.warn('IndexedDB initial load note, using memory seed:', err);
      setActiveCase(SEED_CASE);
      setEntities(SEED_ENTITIES);
      setRelationships(SEED_RELATIONSHIPS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    init();
  }, [init]);

  // Graph Engine Instance
  const graphEngine = useMemo(() => {
    return new GraphEngine(entities, relationships);
  }, [entities, relationships]);

  // Actions
  const addEntity = useCallback(
    async (entityData: Partial<InvestigationEntity>): Promise<InvestigationEntity> => {
      if (!activeCase) throw new Error('No active case');

      const newId = `ent_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const newEntity: InvestigationEntity = {
        id: newId,
        caseId: activeCase.id,
        type: entityData.type || 'person',
        label: entityData.label || 'New Entity',
        aliases: entityData.aliases || [],
        attributes: entityData.attributes || {},
        confidence: entityData.confidence ?? 0.85,
        status: entityData.status || 'investigator_confirmed',
        provenance: entityData.provenance || {
          sourceId: 'manual',
          sourceType: 'fir',
          sourceTitle: 'Manual Investigator Entry',
          confidence: 1.0,
        },
        boardPosition: entityData.boardPosition || {
          x: (Math.random() - 0.5) * 40,
          y: (Math.random() - 0.5) * 30,
        },
        visualType: entityData.visualType || 'suspect',
        notes: entityData.notes || '',
        tags: entityData.tags || [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setEntities((prev) => [...prev, newEntity]);
      try {
        await saveEntity(newEntity);
        await logAuditEvent({
          id: `log_${Date.now()}`,
          caseId: activeCase.id,
          action: 'entity_created',
          targetType: 'entity',
          targetId: newId,
          details: `Created entity ${newEntity.label} (${newEntity.type})`,
          timestamp: new Date().toISOString(),
          investigator: activeCase.leadInvestigator,
        });
      } catch (err) {
        console.warn('DB write note:', err);
      }

      return newEntity;
    },
    [activeCase]
  );

  const updateEntity = useCallback(
    async (id: string, updates: Partial<InvestigationEntity>) => {
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
    },
    []
  );

  const deleteEntity = useCallback(
    async (id: string) => {
      setEntities((prev) => prev.filter((e) => e.id !== id));
      setRelationships((prev) => prev.filter((r) => r.sourceId !== id && r.targetId !== id));
      if (selectedEntityId === id) setSelectedEntityId(null);
      try {
        await dbDeleteEntity(id);
      } catch (err) {
        console.warn('DB delete note:', err);
      }
    },
    [selectedEntityId]
  );

  const addRelationship = useCallback(
    async (relData: Partial<InvestigationRelationship>): Promise<InvestigationRelationship> => {
      if (!activeCase) throw new Error('No active case');
      if (!relData.sourceId || !relData.targetId) throw new Error('Source and Target required');

      const newId = `rel_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const newRel: InvestigationRelationship = {
        id: newId,
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
        provenance: relData.provenance || {
          sourceId: 'manual',
          sourceType: 'fir',
          sourceTitle: 'Manual Pin Connection',
          confidence: 1.0,
        },
        notes: relData.notes || '',
        manuallyConfirmed: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setRelationships((prev) => [...prev, newRel]);
      try {
        await saveRelationship(newRel);
      } catch (err) {
        console.warn('DB write note:', err);
      }

      return newRel;
    },
    [activeCase, threadColor]
  );

  const deleteRelationship = useCallback(async (id: string) => {
    setRelationships((prev) => prev.filter((r) => r.id !== id));
    try {
      await dbDeleteRelationship(id);
    } catch (err) {
      console.warn('DB delete note:', err);
    }
  }, []);

  const resetToSeed = useCallback(async () => {
    try {
      setLoading(true);
      await saveCase(SEED_CASE);
      for (const ent of SEED_ENTITIES) {
        await saveEntity(ent);
      }
      for (const rel of SEED_RELATIONSHIPS) {
        await saveRelationship(rel);
      }
      setActiveCase(SEED_CASE);
      setEntities(SEED_ENTITIES);
      setRelationships(SEED_RELATIONSHIPS);
      setSelectedEntityId(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Commit extracted items from AI staging modal into graph and board
  const commitExtraction = useCallback(
    async (
      extractedEntities: any[],
      extractedRelationships: any[],
      docTitle: string
    ) => {
      if (!activeCase) return;

      const labelToIdMap = new Map<string, string>();
      // Map existing labels
      entities.forEach((e) => labelToIdMap.set(e.label.toLowerCase(), e.id));

      const newEntities: InvestigationEntity[] = [];

      for (let i = 0; i < extractedEntities.length; i++) {
        const item = extractedEntities[i];
        const lower = item.label.toLowerCase();
        if (labelToIdMap.has(lower)) continue;

        const newId = `ent_${Date.now()}_${i}`;
        labelToIdMap.set(lower, newId);

        const newEnt: InvestigationEntity = {
          id: newId,
          caseId: activeCase.id,
          type: item.type as EntityType,
          label: item.label,
          aliases: item.aliases || [],
          attributes: item.attributes || {},
          confidence: item.confidence || 0.8,
          status: 'ai_inferred',
          provenance: {
            sourceId: `doc_${Date.now()}`,
            sourceType: 'fir',
            sourceTitle: docTitle,
            excerpt: item.excerpt,
            confidence: item.confidence || 0.8,
          },
          boardPosition: {
            x: (Math.random() - 0.5) * 50,
            y: (Math.random() - 0.5) * 35,
          },
          visualType: (item.visualType as BoardCardType) || 'suspect',
          notes: item.notes || `Extracted from ${docTitle}`,
          tags: ['ai_extracted', item.type],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        newEntities.push(newEnt);
        await saveEntity(newEnt);
      }

      const newRels: InvestigationRelationship[] = [];
      for (let i = 0; i < extractedRelationships.length; i++) {
        const item = extractedRelationships[i];
        const srcId = labelToIdMap.get(item.sourceLabel.toLowerCase());
        const tgtId = labelToIdMap.get(item.targetLabel.toLowerCase());

        if (!srcId || !tgtId || srcId === tgtId) continue;

        const newRel: InvestigationRelationship = {
          id: `rel_${Date.now()}_${i}`,
          caseId: activeCase.id,
          sourceId: srcId,
          targetId: tgtId,
          predicate: item.predicate || 'ASSOCIATED_WITH',
          label: item.label || item.predicate,
          weight: item.weight || 1,
          confidence: item.confidence || 0.75,
          status: 'ai_inferred',
          threadColor: item.threadColor || 'crimson',
          provenance: {
            sourceId: `doc_${Date.now()}`,
            sourceType: 'fir',
            sourceTitle: docTitle,
            excerpt: item.excerpt,
            confidence: item.confidence || 0.75,
          },
          notes: item.notes,
          manuallyConfirmed: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        newRels.push(newRel);
        await saveRelationship(newRel);
      }

      setEntities((prev) => [...prev, ...newEntities]);
      setRelationships((prev) => [...prev, ...newRels]);
    },
    [activeCase, entities]
  );

  return {
    activeCase,
    entities,
    relationships,
    selectedEntityId,
    selectedEntityIds,
    activeTool,
    threadColor,
    activeView,
    loading,
    filterTypes,
    graphEngine,
    setActiveView,
    setActiveTool,
    setThreadColor,
    setSelectedEntityId,
    setSelectedEntityIds,
    setFilterTypes,
    addEntity,
    updateEntity,
    deleteEntity,
    addRelationship,
    deleteRelationship,
    resetToSeed,
    commitExtraction,
    exportData: () => (activeCase ? exportCaseData(activeCase.id) : null),
  };
}
