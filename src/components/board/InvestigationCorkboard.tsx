'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { InvestigationEntity, InvestigationRelationship } from '@/lib/types/investigation';
import {
  createWorld,
  itemSpecForEntity,
  ropeSpecForRelationship,
  specSignature,
  THREAD_COLOR_HEX,
  TYPE_LABEL,
} from '@/lib/board/casebook';
import type { WorldApi, BoardTool, ThreadColorId } from '@/lib/board/casebook';
import { CasebookHint } from '@/components/board/casebook/CasebookHint';
import { CasebookToast } from '@/components/board/casebook/CasebookToast';
import { CasebookEditorModal } from '@/components/board/casebook/CasebookEditorModal';

interface CorkboardProps {
  entities: InvestigationEntity[];
  relationships: InvestigationRelationship[];
  selectedEntityId: string | null;
  selectedEntityIds: string[];
  activeTool: BoardTool;
  threadColor: ThreadColorId;
  filterTypes: Record<string, boolean>;
  paused: boolean;
  /** receives the live WorldApi once mounted so chrome (minimap/zoom/center) can drive it */
  apiRef: React.MutableRefObject<WorldApi | null>;
  onSelect(ids: string[], primaryId: string | null): void;
  onCommitPositions(moves: { id: string; x: number; y: number }[]): void;
  onConnect(sourceId: string, targetId: string): void;
  onDeleteEntities(ids: string[]): void;
  onUpdateEntity(id: string, updates: Partial<InvestigationEntity>): void;
  onZoomChange(pct: number): void;
  onToolRequest(t: BoardTool): void;
}

const DEFAULT_HINT = 'drag the board to pan · scroll to zoom · <b>C</b> to string a thread';

export const InvestigationCorkboard: React.FC<CorkboardProps> = ({
  entities,
  relationships,
  selectedEntityId,
  selectedEntityIds,
  activeTool,
  threadColor,
  filterTypes,
  paused,
  apiRef,
  onSelect,
  onCommitPositions,
  onConnect,
  onDeleteEntities,
  onUpdateEntity,
  onZoomChange,
  onToolRequest,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLCanvasElement>(null);
  const lassoRef = useRef<HTMLCanvasElement>(null);
  const worldRef = useRef<WorldApi | null>(null);

  const [hint, setHint] = useState(DEFAULT_HINT);
  const [editEntity, setEditEntity] = useState<InvestigationEntity | null>(null);

  // Track spec signatures so repaints only happen when card art actually changes
  const sigRef = useRef(new Map<string, string>());
  // Suppress onSelect loops when selection was applied from props
  const selSuppressRef = useRef(false);

  const cbRef = useRef({ onSelect, onCommitPositions, onConnect, onDeleteEntities, onUpdateEntity, onZoomChange, onToolRequest });
  cbRef.current = { onSelect, onCommitPositions, onConnect, onDeleteEntities, onUpdateEntity, onZoomChange, onToolRequest };

  const entitiesRef = useRef(entities);
  entitiesRef.current = entities;

  // ---- Mount the world once ----
  useEffect(() => {
    if (!stageRef.current || !lassoRef.current || !containerRef.current) return;
    const rootEl = (containerRef.current.closest('.cb-scope') as HTMLElement) || containerRef.current;

    const world = createWorld({
      stage: stageRef.current,
      lassoCanvas: lassoRef.current,
      rootEl,
      hooks: {
        onSelect: (ids, primaryId) => {
          if (selSuppressRef.current) return;
          cbRef.current.onSelect(ids, primaryId);
        },
        onCommitPositions: (moves) => cbRef.current.onCommitPositions(moves),
        onRequestConnect: (a, b) => cbRef.current.onConnect(a, b),
        onEditItem: (id) => {
          const ent = entitiesRef.current.find((e) => e.id === id);
          if (ent) setEditEntity(ent);
        },
        onRequestDelete: (ids) => cbRef.current.onDeleteEntities(ids),
        onHint: (html) => setHint(html),
        onZoomChange: (pct) => cbRef.current.onZoomChange(pct),
        onToolRequest: (t) => cbRef.current.onToolRequest(t),
      },
    });
    worldRef.current = world;
    apiRef.current = world;
    return () => {
      apiRef.current = null;
      worldRef.current = null;
      world.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Entity → card sync ----
  useEffect(() => {
    const world = worldRef.current;
    if (!world) return;
    const seen = new Set<string>();
    for (const ent of entities) {
      seen.add(ent.id);
      const spec = itemSpecForEntity(ent);
      const sig = specSignature(spec);
      if (sigRef.current.get(ent.id) !== sig) {
        sigRef.current.set(ent.id, sig);
      }
      world.upsertItem(spec);
    }
    // remove vanished entities
    for (const id of Array.from(sigRef.current.keys())) {
      if (!seen.has(id)) {
        sigRef.current.delete(id);
        world.removeItem(id);
      }
    }
  }, [entities]);

  // ---- Relationship → rope sync ----
  useEffect(() => {
    worldRef.current?.syncRopes(relationships.map(ropeSpecForRelationship));
  }, [relationships]);

  // ---- Filters ----
  useEffect(() => {
    worldRef.current?.setTypeVisibility(filterTypes);
  }, [filterTypes]);

  // ---- Tool + thread color ----
  useEffect(() => {
    worldRef.current?.setTool(activeTool);
  }, [activeTool]);
  useEffect(() => {
    worldRef.current?.setThreadColor(THREAD_COLOR_HEX[threadColor] ?? 0xb01722);
  }, [threadColor]);

  // ---- Selection (store → world) ----
  useEffect(() => {
    const world = worldRef.current;
    if (!world) return;
    const ids = selectedEntityIds.length ? selectedEntityIds : selectedEntityId ? [selectedEntityId] : [];
    selSuppressRef.current = true;
    world.setSelection(ids, selectedEntityId);
    selSuppressRef.current = false;
  }, [selectedEntityId, selectedEntityIds]);

  // ---- Pause when another view is active ----
  useEffect(() => {
    worldRef.current?.setPaused(paused);
  }, [paused]);

  const handleEditSave = useCallback(
    (text: string) => {
      if (!editEntity) return;
      onUpdateEntity(editEntity.id, { notes: text });
      setEditEntity(null);
    },
    [editEntity, onUpdateEntity]
  );

  return (
    <div ref={containerRef} className="absolute inset-0" style={{ display: paused ? 'none' : 'block' }}>
      <canvas id="stage" ref={stageRef} />
      <canvas id="lassoCanvas" ref={lassoRef} />
      <div id="glare" />
      <div id="vignette" />
      <CasebookHint html={hint} />
      <CasebookToast />
      <CasebookEditorModal
        open={!!editEntity}
        title={`Edit ${(editEntity ? TYPE_LABEL[editEntity.visualType] : 'item').toLowerCase()}`}
        text={editEntity?.notes || ''}
        onSave={handleEditSave}
        onCancel={() => setEditEntity(null)}
      />
    </div>
  );
};
