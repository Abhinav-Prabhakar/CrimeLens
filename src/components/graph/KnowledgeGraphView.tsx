'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { InvestigationEntity, InvestigationRelationship, EntityType } from '@/lib/types/investigation';
import { GraphEngine, GraphPathResult } from '@/lib/graph/algorithms';
import { detectCommunities } from '@/lib/graph/louvain';
import { predictMissingLinks, PredictedLink } from '@/lib/graph/linkPrediction';
import { Search, Route, Share2, Sparkles, ShieldAlert, ZoomIn, ZoomOut, Crosshair } from 'lucide-react';
import type { BoardTool, ThreadColorId } from '@/lib/board/casebook/types';
import { THREAD_COLOR_HEX } from '@/lib/board/casebook/types';

/** Mirror of the corkboard WorldApi so the shared chrome can drive either representation. */
export interface GraphViewApi {
  zoomIn(): void;
  zoomOut(): void;
  center(): void;
  focusItem(id: string): void;
  /** view-center in board coordinates — where a quick-added card lands */
  getSpawnPoint(): { x: number; y: number };
}

interface KnowledgeGraphViewProps {
  entities: InvestigationEntity[];
  relationships: InvestigationRelationship[];
  selectedEntityId: string | null;
  selectedEntityIds: string[];
  activeTool: BoardTool;
  threadColor: ThreadColorId;
  filterTypes: Record<string, boolean>;
  paused: boolean;
  apiRef: React.MutableRefObject<GraphViewApi | null>;
  onSelect(ids: string[], primaryId: string | null): void;
  onConnect(sourceId: string, targetId: string): void;
  onDeleteEntities(ids: string[]): void;
  onCommitPositions(moves: { id: string; x: number; y: number }[]): void;
  onZoomChange(pct: number): void;
  onToolRequest(t: BoardTool): void;
  onAddPredictedLink?: (link: PredictedLink) => void;
}

const COMMUNITY_COLORS = [
  '#e13c32', // Crimson
  '#2f5f9e', // Cobalt
  '#d9a520', // Amber
  '#2e7d4f', // Emerald
  '#9333ea', // Purple
  '#0891b2', // Cyan
  '#ea580c', // Orange
];

/** Evidence-status coloring — the default node semantics (design.md §9.2). */
const STATUS_COLORS: Record<string, string> = {
  verified_source: '#4a8a5a',
  investigator_confirmed: '#4a8a5a',
  ai_inferred: '#d9a520',
  predicted: '#d9a520',
  unverified: '#8d867c',
};

const ENTITY_TYPE_COLORS: Record<EntityType, string> = {
  person: '#e13c32',
  organization: '#2f5f9e',
  location: '#4a8a5a',
  vehicle: '#c9a76a',
  phone: '#d9a520',
  account: '#a8823c',
  document: '#d8d0be',
  event: '#8c2620',
  evidence_item: '#8a5a20',
};

interface SimNode {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  pinned: boolean;
}

interface MarqueeRect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export const KnowledgeGraphView: React.FC<KnowledgeGraphViewProps> = ({
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
  onConnect,
  onDeleteEntities,
  onCommitPositions,
  onZoomChange,
  onToolRequest,
  onAddPredictedLink,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Analytics State
  const [sourcePathId, setSourcePathId] = useState<string>('');
  const [targetPathId, setTargetPathId] = useState<string>('');
  const [pathResult, setPathResult] = useState<GraphPathResult | null>(null);
  const [showPredictions, setShowPredictions] = useState<boolean>(false);
  const [colorMode, setColorMode] = useState<'status' | 'community' | 'type' | 'centrality'>('status');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [marquee, setMarquee] = useState<MarqueeRect | null>(null);

  // Filtered projection — the graph honors the same evidence filters as the board
  const visibleEntities = useMemo(
    () => entities.filter((e) => filterTypes[e.visualType] !== false),
    [entities, filterTypes]
  );
  const visibleIds = useMemo(() => new Set(visibleEntities.map((e) => e.id)), [visibleEntities]);
  const visibleRelationships = useMemo(
    () => relationships.filter((r) => visibleIds.has(r.sourceId) && visibleIds.has(r.targetId)),
    [relationships, visibleIds]
  );

  // Graph Engine & Analytics (on the filtered projection)
  const graphEngine = useMemo(
    () => new GraphEngine(visibleEntities, visibleRelationships),
    [visibleEntities, visibleRelationships]
  );
  const degreeCentrality = useMemo(() => graphEngine.calculateDegreeCentrality(), [graphEngine]);
  const betweenness = useMemo(() => graphEngine.calculateBetweennessCentrality(), [graphEngine]);
  const communities = useMemo(
    () => detectCommunities(visibleEntities, visibleRelationships),
    [visibleEntities, visibleRelationships]
  );
  const predictedLinks = useMemo(
    () => predictMissingLinks(visibleEntities, visibleRelationships, 6),
    [visibleEntities, visibleRelationships]
  );

  // Simulation state (kept in refs; the rAF loop owns it)
  const nodesRef = useRef<Map<string, SimNode>>(new Map());
  const alphaRef = useRef(1);
  const viewRef = useRef({ x: 0, y: 0, k: 1 });
  const dragRef = useRef<{
    nodeId: string | null;
    panning: boolean;
    moved: boolean;
    connectSourceId: string | null;
    connectX: number;
    connectY: number;
    lasso: boolean;
    lastX: number;
    lastY: number;
  }>({
    nodeId: null,
    panning: false,
    moved: false,
    connectSourceId: null,
    connectX: 0,
    connectY: 0,
    lasso: false,
    lastX: 0,
    lastY: 0,
  });
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const toolRef = useRef(activeTool);
  toolRef.current = activeTool;
  const threadColorRef = useRef(threadColor);
  threadColorRef.current = threadColor;
  const marqueeRef = useRef<MarqueeRect | null>(null);

  // Latest render inputs for the animation loop
  const renderRef = useRef({
    visibleEntities,
    visibleRelationships,
    selectedEntityId,
    selectedEntityIds,
    pathResult,
    showPredictions,
    colorMode,
    searchQuery,
    betweenness,
    communities,
    degreeCentrality,
    predictedLinks,
  });
  renderRef.current = {
    visibleEntities,
    visibleRelationships,
    selectedEntityId,
    selectedEntityIds,
    pathResult,
    showPredictions,
    colorMode,
    searchQuery,
    betweenness,
    communities,
    degreeCentrality,
    predictedLinks,
  };

  const cbRef = useRef({ onSelect, onConnect, onDeleteEntities, onCommitPositions, onZoomChange, onToolRequest });
  cbRef.current = { onSelect, onConnect, onDeleteEntities, onCommitPositions, onZoomChange, onToolRequest };

  const invalidatePath = useCallback(() => setPathResult(null), []);

  // Re-seed simulation when the filtered node set changes: keep known positions,
  // initialize newcomers from their corkboard coordinates, and reheat the layout.
  useEffect(() => {
    const nodes = nodesRef.current;
    const w = containerRef.current?.clientWidth || 900;
    const h = containerRef.current?.clientHeight || 600;
    const keep = new Set(visibleEntities.map((e) => e.id));
    for (const id of Array.from(nodes.keys())) if (!keep.has(id)) nodes.delete(id);
    for (const ent of visibleEntities) {
      if (!nodes.has(ent.id)) {
        nodes.set(ent.id, {
          id: ent.id,
          x: w / 2 + ent.boardPosition.x * 10,
          y: h / 2 + ent.boardPosition.y * 8,
          vx: 0,
          vy: 0,
          pinned: false,
        });
      }
    }
    alphaRef.current = 1;
  }, [visibleEntities]);

  const nodeRadius = useCallback((id: string) => {
    const cent = renderRef.current.betweenness[id] || 0;
    const deg = renderRef.current.degreeCentrality.totalDegree[id] || 0;
    return Math.max(7, 9 + cent * 38 + Math.min(deg, 6));
  }, []);

  const toWorldCoords = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const view = viewRef.current;
    return {
      x: (clientX - rect.left - view.x) / view.k,
      y: (clientY - rect.top - view.y) / view.k,
    };
  }, []);

  const hitTest = useCallback(
    (wx: number, wy: number): string | null => {
      for (const ent of renderRef.current.visibleEntities) {
        const pos = nodesRef.current.get(ent.id);
        if (!pos) continue;
        if (Math.hypot(pos.x - wx, pos.y - wy) <= nodeRadius(ent.id) + 5) return ent.id;
      }
      return null;
    },
    [nodeRadius]
  );

  const reportZoom = useCallback(() => {
    cbRef.current.onZoomChange(Math.round(viewRef.current.k * 100));
  }, []);

  // Re-report zoom when this representation becomes visible again
  useEffect(() => {
    if (!paused) reportZoom();
  }, [paused, reportZoom]);

  const zoomAt = useCallback(
    (factor: number, cx?: number, cy?: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const mx = cx ?? rect.width / 2;
      const my = cy ?? rect.height / 2;
      const view = viewRef.current;
      const newK = Math.max(0.25, Math.min(4, view.k * factor));
      view.x = mx - ((mx - view.x) * newK) / view.k;
      view.y = my - ((my - view.y) * newK) / view.k;
      view.k = newK;
      reportZoom();
    },
    [reportZoom]
  );

  const resetView = useCallback(() => {
    viewRef.current = { x: 0, y: 0, k: 1 };
    reportZoom();
  }, [reportZoom]);

  // Chrome drives this representation through the same contract as the corkboard.
  useEffect(() => {
    apiRef.current = {
      zoomIn: () => zoomAt(1.25),
      zoomOut: () => zoomAt(1 / 1.25),
      center: resetView,
      focusItem: (id) => {
        const n = nodesRef.current.get(id);
        const c = containerRef.current;
        if (!n || !c) return;
        const view = viewRef.current;
        view.x = c.clientWidth / 2 - n.x * view.k;
        view.y = c.clientHeight / 2 - n.y * view.k;
      },
      getSpawnPoint: () => {
        const c = containerRef.current;
        const w = c?.clientWidth || 900;
        const h = c?.clientHeight || 600;
        const view = viewRef.current;
        const wx = (w / 2 - view.x) / view.k;
        const wy = (h / 2 - view.y) / view.k;
        // inverse of the boardPosition → sim-coordinate seeding
        return { x: (wx - w / 2) / 10, y: (wy - h / 2) / 8 };
      },
    };
    return () => {
      apiRef.current = null;
    };
  }, [apiRef, zoomAt, resetView]);

  // Delete/Backspace removes the current selection, same as the corkboard.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (pausedRef.current) return;
      if (e.key !== 'Delete' && e.key !== 'Backspace') return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      const ids = renderRef.current.selectedEntityIds.length
        ? renderRef.current.selectedEntityIds
        : renderRef.current.selectedEntityId
          ? [renderRef.current.selectedEntityId]
          : [];
      if (ids.length) {
        e.preventDefault();
        cbRef.current.onDeleteEntities(ids);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // ---- Simulation + render loop ----
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    let disposed = false;
    let frameId = 0;
    const ctx = canvas.getContext('2d')!;

    const REPULSION = 2600;
    const SPRING_LENGTH = 115;
    const SPRING_K = 0.018;
    const GRAVITY = 0.0016;
    const DAMPING = 0.86;

    function stepPhysics(w: number, h: number) {
      const nodes = Array.from(nodesRef.current.values());
      const alpha = alphaRef.current;
      if (alpha < 0.005 && !dragRef.current.nodeId) return;

      // Pairwise repulsion
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i];
          const b = nodes[j];
          let dx = b.x - a.x;
          let dy = b.y - a.y;
          let d2 = dx * dx + dy * dy;
          if (d2 < 1) {
            dx = (Math.random() - 0.5) * 2;
            dy = (Math.random() - 0.5) * 2;
            d2 = 4;
          }
          const d = Math.sqrt(d2);
          const force = Math.min(REPULSION / d2, 18);
          const fx = (dx / d) * force * alpha;
          const fy = (dy / d) * force * alpha;
          a.vx -= fx;
          a.vy -= fy;
          b.vx += fx;
          b.vy += fy;
        }
      }

      // Springs along relationships
      for (const rel of renderRef.current.visibleRelationships) {
        const a = nodesRef.current.get(rel.sourceId);
        const b = nodesRef.current.get(rel.targetId);
        if (!a || !b) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d = Math.max(1, Math.hypot(dx, dy));
        const force = (d - SPRING_LENGTH) * SPRING_K * alpha;
        const fx = (dx / d) * force;
        const fy = (dy / d) * force;
        a.vx += fx;
        a.vy += fy;
        b.vx -= fx;
        b.vy -= fy;
      }

      // Center gravity + integration
      for (const n of nodes) {
        n.vx -= n.x * GRAVITY * alpha;
        n.vy -= n.y * GRAVITY * alpha;
        n.vx *= DAMPING;
        n.vy *= DAMPING;
        if (n.pinned) {
          n.vx = 0;
          n.vy = 0;
          continue;
        }
        n.x += Math.max(-24, Math.min(24, n.vx));
        n.y += Math.max(-24, Math.min(24, n.vy));
        // Keep the projection on canvas
        n.x = Math.max(-w, Math.min(2 * w, n.x));
        n.y = Math.max(-h, Math.min(2 * h, n.y));
      }

      alphaRef.current = Math.max(0, alpha * 0.985);
    }

    function nodeColor(ent: InvestigationEntity, r: typeof renderRef.current): string {
      if (r.colorMode === 'status') return STATUS_COLORS[ent.status] || '#8d867c';
      if (r.colorMode === 'community') {
        return COMMUNITY_COLORS[(r.communities.communities[ent.id] ?? 0) % COMMUNITY_COLORS.length];
      }
      if (r.colorMode === 'type') return ENTITY_TYPE_COLORS[ent.type] || '#8d867c';
      const normDeg = r.degreeCentrality.normalizedDegree[ent.id] || 0;
      return normDeg > 0.4 ? '#e13c32' : normDeg > 0.2 ? '#d9a520' : '#2f5f9e';
    }

    function draw(w: number, h: number) {
      const r = renderRef.current;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const view = viewRef.current;
      ctx.translate(view.x, view.y);
      ctx.scale(view.k, view.k);

      const pathNodes = new Set(r.pathResult?.path || []);
      const pathRelIds = new Set(r.pathResult?.relationships.map((x) => x.id) || []);
      const selected = new Set(r.selectedEntityIds);
      if (r.selectedEntityId) selected.add(r.selectedEntityId);

      // 1. Edges
      for (const rel of r.visibleRelationships) {
        const p1 = nodesRef.current.get(rel.sourceId);
        const p2 = nodesRef.current.get(rel.targetId);
        if (!p1 || !p2) continue;

        const isPathEdge = pathRelIds.has(rel.id);
        const touched = selected.has(rel.sourceId) || selected.has(rel.targetId);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.strokeStyle = isPathEdge
          ? '#ff4d42'
          : touched
            ? 'rgba(225, 60, 50, 0.55)'
            : rel.status === 'ai_inferred' || rel.status === 'predicted'
              ? 'rgba(217, 165, 32, 0.35)'
              : 'rgba(141, 134, 124, 0.25)';
        ctx.lineWidth = isPathEdge ? 3.5 : touched ? 2 : 1.2;
        ctx.setLineDash(rel.status === 'predicted' ? [5, 4] : []);
        ctx.stroke();
        ctx.setLineDash([]);

        if (isPathEdge || touched) {
          const midX = (p1.x + p2.x) / 2;
          const midY = (p1.y + p2.y) / 2;
          ctx.fillStyle = isPathEdge ? '#ff4d42' : '#8d867c';
          ctx.font = '10px Courier New, monospace';
          ctx.fillText(rel.label || rel.predicate, midX, midY - 4);
        }
      }

      // 2. Predicted missing links
      if (r.showPredictions) {
        for (const pl of r.predictedLinks) {
          const p1 = nodesRef.current.get(pl.sourceId);
          const p2 = nodesRef.current.get(pl.targetId);
          if (!p1 || !p2) continue;
          ctx.beginPath();
          ctx.setLineDash([4, 4]);
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.strokeStyle = 'rgba(217, 165, 32, 0.75)';
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.setLineDash([]);

          const midX = (p1.x + p2.x) / 2;
          const midY = (p1.y + p2.y) / 2;
          ctx.fillStyle = '#d9a520';
          ctx.font = 'bold 9px Courier New, monospace';
          ctx.fillText(`? ${(pl.score * 100).toFixed(0)}% PREDICTED`, midX, midY);
        }
      }

      // 3. In-progress connect thread (connect tool drag)
      if (dragRef.current.connectSourceId) {
        const src = nodesRef.current.get(dragRef.current.connectSourceId);
        if (src) {
          ctx.beginPath();
          ctx.setLineDash([6, 4]);
          ctx.moveTo(src.x, src.y);
          ctx.lineTo(dragRef.current.connectX, dragRef.current.connectY);
          ctx.strokeStyle = `#${(THREAD_COLOR_HEX[threadColorRef.current] ?? 0xb01722)
            .toString(16)
            .padStart(6, '0')}`;
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }

      // 4. Nodes
      const search = r.searchQuery.trim().toLowerCase();
      for (const ent of r.visibleEntities) {
        const pos = nodesRef.current.get(ent.id);
        if (!pos) continue;

        const isSelected = selected.has(ent.id);
        const isPathNode = pathNodes.has(ent.id);
        const isSearchMatch = search.length > 0 && ent.label.toLowerCase().includes(search);
        const isConnectSource = dragRef.current.connectSourceId === ent.id;

        const radius = Math.max(
          7,
          9 + (r.betweenness[ent.id] || 0) * 38 + Math.min(r.degreeCentrality.totalDegree[ent.id] || 0, 6)
        );

        ctx.beginPath();
        ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = nodeColor(ent, r);
        ctx.fill();

        if (isSelected || isPathNode || isSearchMatch || isConnectSource) {
          ctx.lineWidth = 3;
          ctx.strokeStyle = isPathNode ? '#ff4d42' : '#ffffff';
          ctx.stroke();
        } else {
          ctx.lineWidth = 1.5;
          ctx.strokeStyle = '#141110';
          ctx.stroke();
        }

        const label = ent.label.length > 26 ? ent.label.slice(0, 24) + '…' : ent.label;
        ctx.fillStyle = isSelected ? '#ffffff' : '#d9d4cc';
        ctx.font = isSelected ? 'bold 12px Courier New' : '11px Courier New';
        ctx.fillText(label, pos.x + radius + 4, pos.y + 4);

        const cent = r.betweenness[ent.id] || 0;
        if (cent > 0.15) {
          ctx.fillStyle = '#ff4d42';
          ctx.font = 'bold 9px Courier New';
          ctx.fillText('⚡ BRIDGE HUB', pos.x + radius + 4, pos.y + 16);
        }
      }
    }

    function loop() {
      if (disposed) return;
      frameId = requestAnimationFrame(loop);
      if (pausedRef.current) return;
      const w = container?.clientWidth ?? 900;
      const h = container?.clientHeight ?? 600;
      if (w === 0 || h === 0) return;

      // DPR-aware sizing
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const targetW = Math.round(w * dpr);
      const targetH = Math.round(h * dpr);
      if (canvas && (canvas.width !== targetW || canvas.height !== targetH)) {
        canvas.width = targetW;
        canvas.height = targetH;
      }

      stepPhysics(w, h);
      draw(w, h);
    }
    loop();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Pointer interaction: tool-aware (select / lasso / connect / pan) ----

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (paused) return;
    const { x, y } = toWorldCoords(e.clientX, e.clientY);
    const hitId = hitTest(x, y);
    const d = dragRef.current;
    d.moved = false;
    d.lastX = e.clientX;
    d.lastY = e.clientY;
    e.currentTarget.setPointerCapture(e.pointerId);

    if (toolRef.current === 'connect') {
      if (hitId) {
        d.connectSourceId = hitId;
        d.connectX = x;
        d.connectY = y;
      } else {
        d.panning = true;
      }
      return;
    }

    if (toolRef.current === 'lasso') {
      const rect = e.currentTarget.getBoundingClientRect();
      marqueeRef.current = {
        x0: e.clientX - rect.left,
        y0: e.clientY - rect.top,
        x1: e.clientX - rect.left,
        y1: e.clientY - rect.top,
      };
      d.lasso = true;
      setMarquee(marqueeRef.current);
      return;
    }

    if (hitId && toolRef.current !== 'pan') {
      d.nodeId = hitId;
      const node = nodesRef.current.get(hitId)!;
      node.pinned = true;
      alphaRef.current = Math.max(alphaRef.current, 0.3);
    } else {
      d.panning = true;
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const d = dragRef.current;
    const dx = e.clientX - d.lastX;
    const dy = e.clientY - d.lastY;
    if (Math.abs(dx) + Math.abs(dy) > 2) d.moved = true;

    if (d.connectSourceId) {
      const { x, y } = toWorldCoords(e.clientX, e.clientY);
      d.connectX = x;
      d.connectY = y;
      return;
    }
    if (d.lasso) {
      const rect = e.currentTarget.getBoundingClientRect();
      marqueeRef.current = {
        ...marqueeRef.current!,
        x1: e.clientX - rect.left,
        y1: e.clientY - rect.top,
      };
      setMarquee(marqueeRef.current);
      return;
    }
    if (d.nodeId) {
      const { x, y } = toWorldCoords(e.clientX, e.clientY);
      const node = nodesRef.current.get(d.nodeId);
      if (node) {
        node.x = x;
        node.y = y;
        node.vx = 0;
        node.vy = 0;
      }
    } else if (d.panning) {
      viewRef.current.x += dx;
      viewRef.current.y += dy;
      d.lastX = e.clientX;
      d.lastY = e.clientY;
    }
  };

  const commitNodePosition = (nodeId: string) => {
    const node = nodesRef.current.get(nodeId);
    const c = containerRef.current;
    if (!node || !c) return;
    const w = c.clientWidth || 900;
    const h = c.clientHeight || 600;
    // board coordinates are the persisted layout; convert sim coords back
    cbRef.current.onCommitPositions([{ id: nodeId, x: (node.x - w / 2) / 10, y: (node.y - h / 2) / 8 }]);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const d = dragRef.current;

    if (d.connectSourceId) {
      const { x, y } = toWorldCoords(e.clientX, e.clientY);
      const targetId = hitTest(x, y);
      if (targetId && targetId !== d.connectSourceId) {
        cbRef.current.onConnect(d.connectSourceId, targetId);
      }
      d.connectSourceId = null;
      return;
    }

    if (d.lasso) {
      const m = marqueeRef.current;
      d.lasso = false;
      marqueeRef.current = null;
      setMarquee(null);
      if (m) {
        const view = viewRef.current;
        const minX = Math.min(m.x0, m.x1);
        const maxX = Math.max(m.x0, m.x1);
        const minY = Math.min(m.y0, m.y1);
        const maxY = Math.max(m.y0, m.y1);
        const ids = renderRef.current.visibleEntities
          .filter((ent) => {
            const n = nodesRef.current.get(ent.id);
            if (!n) return false;
            const sx = n.x * view.k + view.x;
            const sy = n.y * view.k + view.y;
            return sx >= minX && sx <= maxX && sy >= minY && sy <= maxY;
          })
          .map((ent) => ent.id);
        if (ids.length) cbRef.current.onSelect(ids, ids[0]);
        else if (Math.abs(m.x1 - m.x0) < 4 && Math.abs(m.y1 - m.y0) < 4) cbRef.current.onSelect([], null);
        cbRef.current.onToolRequest('select'); // same as the corkboard: lasso disarms after use
      }
      return;
    }

    if (d.nodeId) {
      const node = nodesRef.current.get(d.nodeId);
      if (node) node.pinned = false;
      if (d.moved) {
        // a real drag commits the new board position to the shared model
        commitNodePosition(d.nodeId);
      } else if (e.shiftKey) {
        const ids = renderRef.current.selectedEntityIds.includes(d.nodeId)
          ? renderRef.current.selectedEntityIds.filter((i) => i !== d.nodeId)
          : [...renderRef.current.selectedEntityIds, d.nodeId];
        cbRef.current.onSelect(ids, d.nodeId);
      } else {
        cbRef.current.onSelect([d.nodeId], d.nodeId);
      }
      d.nodeId = null;
      return;
    }

    if (d.panning) {
      d.panning = false;
      if (!d.moved) cbRef.current.onSelect([], null); // click on empty canvas clears
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    zoomAt(e.deltaY < 0 ? 1.12 : 1 / 1.12, e.clientX - rect.left, e.clientY - rect.top);
  };

  // Shortest path computation
  const handleCalculatePath = () => {
    if (!sourcePathId || !targetPathId) return;
    const res = graphEngine.findShortestPath(sourcePathId, targetPathId);
    setPathResult(res);
  };

  const cursor =
    activeTool === 'connect' ? 'crosshair' : activeTool === 'pan' ? 'grab' : 'default';

  return (
    <div
      ref={containerRef}
      className="cb-workspace kg-view relative w-full h-full flex flex-col gap-2 select-none overflow-hidden"
      style={{ display: paused ? 'none' : 'flex' }}
    >
      {/* Scoped finish: spacing + compact instrument controls (margin/padding
          utilities are reset inside .cb-scope, so spacing lives here). */}
      <style>{`
        .kg-view .cb-workspace-head{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px;padding:10px 16px;font-family:var(--mono);}
        .kg-view .cb-select{width:auto;padding:5px 26px 5px 9px;font-family:var(--mono);font-size:11px;}
        .kg-view .cb-input{width:18rem;padding:5px 9px;font-family:var(--mono);font-size:11px;}
        .kg-view .kg-strip{display:flex;align-items:center;gap:8px;padding:7px 16px;border:1px solid var(--line);border-radius:8px;background:rgba(16,13,12,0.6);}
        .kg-view .kg-banner{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:8px 14px;border:1px solid rgba(140,38,32,0.55);border-left:3px solid var(--red);border-radius:6px;background:rgba(26,13,11,0.92);font-family:var(--mono);font-size:11px;color:var(--txt);}
        .kg-view .kg-drawer{position:absolute;top:16px;right:16px;z-index:20;width:20rem;max-height:24rem;overflow-y:auto;padding:12px;font-family:var(--mono);font-size:11px;color:var(--txt);}
        .kg-view .kg-pl-card{padding:8px 10px;}
        .kg-view .cb-btn.kg-on{border-color:#6e5518;color:#d9a520;background:rgba(217,165,32,0.14);}
        .kg-view .kg-marquee{position:absolute;z-index:15;border:1px dashed var(--red);background:rgba(225,60,50,0.08);pointer-events:none;}
      `}</style>

      {/* Top Analytical Bar */}
      <div className="cb-workspace-head z-20 text-[11px] text-noir-200">
        <div className="flex items-center gap-3">
          <span className="cb-eyebrow cb-amber flex items-center gap-1.5">
            <Share2 className="w-4 h-4" /> Knowledge Graph Analytics
          </span>
          <div className="h-4 w-px bg-noir-600" />
          <span className="cb-dim">
            Nodes: <strong className="text-noir-100">{visibleEntities.length}</strong>
            {visibleEntities.length !== entities.length && (
              <span className="cb-faint"> / {entities.length}</span>
            )}
          </span>
          <span className="cb-dim">
            Edges: <strong className="text-noir-100">{visibleRelationships.length}</strong>
          </span>
          <span className="cb-dim">
            Communities: <strong className="text-noir-100">{communities.communityCount}</strong>
          </span>
        </div>

        {/* Shortest Path Controls */}
        <div className="flex items-center gap-2">
          <Route className="w-3.5 h-3.5 text-crimson" />
          <select
            value={sourcePathId}
            onChange={(e) => {
              setSourcePathId(e.target.value);
              invalidatePath();
            }}
            className="cb-select"
          >
            <option value="">Origin Suspect...</option>
            {visibleEntities.map((e) => (
              <option key={e.id} value={e.id}>
                {e.label}
              </option>
            ))}
          </select>
          <span className="cb-faint">→</span>
          <select
            value={targetPathId}
            onChange={(e) => {
              setTargetPathId(e.target.value);
              invalidatePath();
            }}
            className="cb-select"
          >
            <option value="">Target Suspect...</option>
            {visibleEntities.map((e) => (
              <option key={e.id} value={e.id}>
                {e.label}
              </option>
            ))}
          </select>
          <button
            onClick={handleCalculatePath}
            disabled={!sourcePathId || !targetPathId}
            className="cb-btn cb-btn-primary cb-btn-sm"
          >
            Find Path
          </button>
          {pathResult && (
            <button onClick={() => setPathResult(null)} className="cb-btn cb-btn-ghost cb-btn-sm">
              Clear
            </button>
          )}
        </div>

        {/* View Options & Predictions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPredictions(!showPredictions)}
            className={`cb-btn cb-btn-sm ${showPredictions ? 'kg-on' : 'cb-btn-ghost'}`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Link Prediction ({predictedLinks.length})
          </button>

          <select
            value={colorMode}
            onChange={(e: any) => setColorMode(e.target.value)}
            className="cb-select"
          >
            <option value="status">Color: Evidence Status</option>
            <option value="community">Color: Communities</option>
            <option value="type">Color: Entity Type</option>
            <option value="centrality">Color: Centrality Heatmap</option>
          </select>

          <div className="cb-card flex items-center gap-0.5" style={{ padding: 2 }}>
            <button onClick={() => zoomAt(1.25)} className="cb-btn cb-btn-ghost cb-btn-icon" title="Zoom in">
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => zoomAt(1 / 1.25)} className="cb-btn cb-btn-ghost cb-btn-icon" title="Zoom out">
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button onClick={resetView} className="cb-btn cb-btn-ghost cb-btn-icon" title="Reset view">
              <Crosshair className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Search box */}
      <div className="kg-strip z-20">
        <Search className="w-3.5 h-3.5 cb-faint" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Highlight entities by name..."
          className="cb-input"
        />
        <span className="text-[10px] cb-faint ml-auto">
          drag nodes to reposition · <b>C</b> string a thread · <b>L</b> lasso · scroll to zoom
        </span>
      </div>

      {/* Path Finding Result Banner */}
      {pathResult && (
        <div className="kg-banner z-20">
          <div className="flex items-center gap-2 min-w-0">
            <ShieldAlert className="w-4 h-4 text-crimson flex-shrink-0" />
            {pathResult.found ? (
              <span className="truncate">
                <strong className="text-crimson">PATH DISCOVERED ({pathResult.path.length} hops):</strong>{' '}
                {pathResult.path.map((id) => visibleEntities.find((e) => e.id === id)?.label || id).join('  ──►  ')}
              </span>
            ) : (
              <span className="cb-amber">No connecting path found between selected entities.</span>
            )}
          </div>
          <span className="cb-dim flex-shrink-0">Total Distance: {pathResult.distance.toFixed(2)}</span>
        </div>
      )}

      {/* Main Canvas */}
      <div className="relative flex-1 w-full min-h-0">
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          onWheel={handleWheel}
          className="w-full h-full touch-none"
          style={{ cursor }}
        />

        {/* Lasso marquee overlay */}
        {marquee && (
          <div
            className="kg-marquee"
            style={{
              left: Math.min(marquee.x0, marquee.x1),
              top: Math.min(marquee.y0, marquee.y1),
              width: Math.abs(marquee.x1 - marquee.x0),
              height: Math.abs(marquee.y1 - marquee.y0),
            }}
          />
        )}

        {/* Predictive Links Drawer Overlay */}
        {showPredictions && predictedLinks.length > 0 && (
          <div className="cb-card kg-drawer cb-scroll">
            <div className="flex items-center justify-between border-b border-noir-600" style={{ paddingBottom: 6, marginBottom: 10 }}>
              <span className="cb-eyebrow cb-amber flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> Suggested Covert Links
              </span>
              <span className="cb-badge">Graph Heuristic</span>
            </div>
            <div className="cb-list">
              {predictedLinks.map((pl, idx) => (
                <div key={idx} className="cb-metric kg-pl-card">
                  <div className="flex items-center justify-between font-bold">
                    <span className="text-noir-100">{pl.sourceLabel}</span>
                    <span className="cb-amber">{(pl.score * 100).toFixed(0)}%</span>
                  </div>
                  <div className="text-[10px] cb-faint" style={{ marginTop: 2 }}>
                    ─────?───── {pl.targetLabel}
                  </div>
                  <div className="text-[10px] cb-dim" style={{ marginTop: 2 }}>
                    Signals: {pl.reasons.join(', ')}
                  </div>
                  {onAddPredictedLink && (
                    <button
                      onClick={() => onAddPredictedLink(pl)}
                      className="cb-btn cb-btn-ghost cb-btn-sm w-full"
                      style={{ marginTop: 6 }}
                    >
                      + Stage to Graph (Requires Confirmation)
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
