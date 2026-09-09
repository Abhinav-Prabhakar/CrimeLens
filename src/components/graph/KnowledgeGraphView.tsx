'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { InvestigationEntity, InvestigationRelationship } from '@/lib/types/investigation';
import { GraphEngine, GraphPathResult } from '@/lib/graph/algorithms';
import { detectCommunities } from '@/lib/graph/louvain';
import { predictMissingLinks, PredictedLink } from '@/lib/graph/linkPrediction';
import { Search, Route, Share2, Sparkles, ShieldAlert, ZoomIn, ZoomOut, Crosshair } from 'lucide-react';

interface KnowledgeGraphViewProps {
  entities: InvestigationEntity[];
  relationships: InvestigationRelationship[];
  selectedEntityId: string | null;
  filterTypes: Record<string, boolean>;
  onSelectEntity: (id: string | null) => void;
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

interface SimNode {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  pinned: boolean;
}

export const KnowledgeGraphView: React.FC<KnowledgeGraphViewProps> = ({
  entities,
  relationships,
  selectedEntityId,
  filterTypes,
  onSelectEntity,
  onAddPredictedLink,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Analytics State
  const [sourcePathId, setSourcePathId] = useState<string>('');
  const [targetPathId, setTargetPathId] = useState<string>('');
  const [pathResult, setPathResult] = useState<GraphPathResult | null>(null);
  const [showPredictions, setShowPredictions] = useState<boolean>(false);
  const [colorMode, setColorMode] = useState<'community' | 'type' | 'centrality'>('community');
  const [searchQuery, setSearchQuery] = useState<string>('');

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
  const dragRef = useRef<{ nodeId: string | null; panning: boolean; lastX: number; lastY: number }>({
    nodeId: null,
    panning: false,
    lastX: 0,
    lastY: 0,
  });
  // Latest render inputs for the animation loop
  const renderRef = useRef({
    visibleEntities,
    visibleRelationships,
    selectedEntityId,
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
    pathResult,
    showPredictions,
    colorMode,
    searchQuery,
    betweenness,
    communities,
    degreeCentrality,
    predictedLinks,
  };

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

  const nodeRadius = useCallback(
    (id: string) => {
      const cent = renderRef.current.betweenness[id] || 0;
      const deg = renderRef.current.degreeCentrality.totalDegree[id] || 0;
      return Math.max(7, 9 + cent * 38 + Math.min(deg, 6));
    },
    []
  );

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

      // 1. Edges
      for (const rel of r.visibleRelationships) {
        const p1 = nodesRef.current.get(rel.sourceId);
        const p2 = nodesRef.current.get(rel.targetId);
        if (!p1 || !p2) continue;

        const isPathEdge = pathRelIds.has(rel.id);
        const touched =
          r.selectedEntityId === rel.sourceId || r.selectedEntityId === rel.targetId;
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

      // 3. Nodes
      const search = r.searchQuery.trim().toLowerCase();
      for (const ent of r.visibleEntities) {
        const pos = nodesRef.current.get(ent.id);
        if (!pos) continue;

        const isSelected = r.selectedEntityId === ent.id;
        const isPathNode = pathNodes.has(ent.id);
        const isSearchMatch = search.length > 0 && ent.label.toLowerCase().includes(search);

        const radius = Math.max(7, 9 + (r.betweenness[ent.id] || 0) * 38 + Math.min(r.degreeCentrality.totalDegree[ent.id] || 0, 6));

        let nodeColor = '#8d867c';
        if (r.colorMode === 'community') {
          nodeColor = COMMUNITY_COLORS[(r.communities.communities[ent.id] ?? 0) % COMMUNITY_COLORS.length];
        } else if (r.colorMode === 'type') {
          nodeColor = ent.type === 'person' ? '#e13c32' : ent.type === 'organization' ? '#2f5f9e' : '#d9a520';
        } else if (r.colorMode === 'centrality') {
          const normDeg = r.degreeCentrality.normalizedDegree[ent.id] || 0;
          nodeColor = normDeg > 0.4 ? '#e13c32' : normDeg > 0.2 ? '#d9a520' : '#2f5f9e';
        }

        ctx.beginPath();
        ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = nodeColor;
        ctx.fill();

        if (isSelected || isPathNode || isSearchMatch) {
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
      const w = container?.clientWidth ?? 900;
      const h = container?.clientHeight ?? 600;

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

  // ---- Pointer interaction: node drag, pan, click-select ----
  const toWorldCoords = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const view = viewRef.current;
    return {
      x: (clientX - rect.left - view.x) / view.k,
      y: (clientY - rect.top - view.y) / view.k,
    };
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const { x, y } = toWorldCoords(e.clientX, e.clientY);
    let hitId: string | null = null;
    for (const ent of visibleEntities) {
      const pos = nodesRef.current.get(ent.id);
      if (!pos) continue;
      const radius = nodeRadius(ent.id);
      if (Math.hypot(pos.x - x, pos.y - y) <= radius + 5) {
        hitId = ent.id;
        break;
      }
    }
    if (hitId) {
      dragRef.current.nodeId = hitId;
      const node = nodesRef.current.get(hitId)!;
      node.pinned = true;
      alphaRef.current = Math.max(alphaRef.current, 0.3);
    } else {
      dragRef.current.panning = true;
      dragRef.current.lastX = e.clientX;
      dragRef.current.lastY = e.clientY;
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (dragRef.current.nodeId) {
      const { x, y } = toWorldCoords(e.clientX, e.clientY);
      const node = nodesRef.current.get(dragRef.current.nodeId);
      if (node) {
        node.x = x;
        node.y = y;
        node.vx = 0;
        node.vy = 0;
      }
    } else if (dragRef.current.panning) {
      viewRef.current.x += e.clientX - dragRef.current.lastX;
      viewRef.current.y += e.clientY - dragRef.current.lastY;
      dragRef.current.lastX = e.clientX;
      dragRef.current.lastY = e.clientY;
    }
  };

  const pannedSincePointerDownRef = useRef(false);
  const nodeDraggedRef = useRef(false);

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (dragRef.current.nodeId) {
      const node = nodesRef.current.get(dragRef.current.nodeId);
      if (node) {
        node.pinned = false;
        onSelectEntity(dragRef.current.nodeId);
      }
      dragRef.current.nodeId = null;
      // Suppress the trailing click so releasing a drag never toggles selection
      nodeDraggedRef.current = true;
      window.setTimeout(() => (nodeDraggedRef.current = false), 60);
    } else if (dragRef.current.panning) {
      dragRef.current.panning = false;
      pannedSincePointerDownRef.current = true;
      window.setTimeout(() => (pannedSincePointerDownRef.current = false), 60);
      void e;
    }
  };

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (pannedSincePointerDownRef.current || nodeDraggedRef.current) return;
    const { x, y } = toWorldCoords(e.clientX, e.clientY);
    let clickedId: string | null = null;
    for (const ent of visibleEntities) {
      const pos = nodesRef.current.get(ent.id);
      if (!pos) continue;
      if (Math.hypot(pos.x - x, pos.y - y) <= nodeRadius(ent.id) + 5) {
        clickedId = ent.id;
        break;
      }
    }
    if (!clickedId) onSelectEntity(null);
  };

  const zoomAt = useCallback((factor: number, cx?: number, cy?: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = cx ?? rect.width / 2;
    const my = cy ?? rect.height / 2;
    const view = viewRef.current;
    const newK = Math.max(0.25, Math.min(4, view.k * factor));
    // Zoom about the anchor point
    view.x = mx - ((mx - view.x) * newK) / view.k;
    view.y = my - ((my - view.y) * newK) / view.k;
    view.k = newK;
  }, []);

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    zoomAt(e.deltaY < 0 ? 1.12 : 1 / 1.12, e.clientX - rect.left, e.clientY - rect.top);
  };

  const resetView = () => {
    viewRef.current = { x: 0, y: 0, k: 1 };
  };

  // Shortest path computation
  const handleCalculatePath = () => {
    if (!sourcePathId || !targetPathId) return;
    const res = graphEngine.findShortestPath(sourcePathId, targetPathId);
    setPathResult(res);
  };

  return (
    <div ref={containerRef} className="relative w-full h-full bg-noir-950 flex flex-col select-none overflow-hidden">
      {/* Top Analytical Bar */}
      <div className="z-20 flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-noir-900 border-b border-noir-700 text-xs font-mono text-noir-200">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 font-bold text-amber-accent">
            <Share2 className="w-4 h-4" /> KNOWLEDGE GRAPH ANALYTICS
          </span>
          <div className="h-4 w-px bg-noir-700" />
          <span className="text-noir-400">
            Nodes: <strong className="text-noir-100">{visibleEntities.length}</strong>
            {visibleEntities.length !== entities.length && (
              <span className="text-noir-500"> / {entities.length}</span>
            )}
          </span>
          <span className="text-noir-400">
            Edges: <strong className="text-noir-100">{visibleRelationships.length}</strong>
          </span>
          <span className="text-noir-400">
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
            className="bg-noir-800 border border-noir-600 rounded px-2 py-1 text-noir-100 focus:outline-none"
          >
            <option value="">Origin Suspect...</option>
            {visibleEntities.map((e) => (
              <option key={e.id} value={e.id}>
                {e.label}
              </option>
            ))}
          </select>
          <span className="text-noir-500">→</span>
          <select
            value={targetPathId}
            onChange={(e) => {
              setTargetPathId(e.target.value);
              invalidatePath();
            }}
            className="bg-noir-800 border border-noir-600 rounded px-2 py-1 text-noir-100 focus:outline-none"
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
            className="px-2.5 py-1 bg-crimson hover:bg-crimson-bright disabled:opacity-40 text-white rounded font-bold transition-colors"
          >
            Find Path
          </button>
          {pathResult && (
            <button onClick={() => setPathResult(null)} className="px-2 py-1 bg-noir-800 hover:bg-noir-700 text-noir-400 rounded">
              Clear
            </button>
          )}
        </div>

        {/* View Options & Predictions */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowPredictions(!showPredictions)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded border transition-colors ${
              showPredictions
                ? 'bg-amber-accent/20 border-amber-accent text-amber-accent'
                : 'bg-noir-800 border-noir-700 text-noir-400 hover:text-noir-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Link Prediction ({predictedLinks.length})
          </button>

          <select
            value={colorMode}
            onChange={(e: any) => setColorMode(e.target.value)}
            className="bg-noir-800 border border-noir-600 rounded px-2 py-1 text-noir-100 focus:outline-none"
          >
            <option value="community">Color: Communities</option>
            <option value="type">Color: Entity Type</option>
            <option value="centrality">Color: Centrality Heatmap</option>
          </select>

          <div className="flex items-center gap-1 bg-noir-800 border border-noir-600 rounded px-1 py-0.5">
            <button onClick={() => zoomAt(1.25)} className="p-0.5 text-noir-400 hover:text-noir-100" title="Zoom in">
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => zoomAt(1 / 1.25)} className="p-0.5 text-noir-400 hover:text-noir-100" title="Zoom out">
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button onClick={resetView} className="p-0.5 text-noir-400 hover:text-noir-100" title="Reset view">
              <Crosshair className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Search box */}
      <div className="z-20 flex items-center gap-2 px-4 py-1.5 bg-noir-900/60 border-b border-noir-800 font-mono text-xs">
        <Search className="w-3.5 h-3.5 text-noir-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Highlight entities by name..."
          className="bg-transparent text-noir-200 placeholder:text-noir-600 focus:outline-none w-72"
        />
        <span className="text-[10px] text-noir-600 ml-auto">
          drag nodes • drag canvas to pan • scroll to zoom
        </span>
      </div>

      {/* Path Finding Result Banner */}
      {pathResult && (
        <div className="z-20 bg-noir-850/95 border-b border-crimson/40 px-4 py-2 flex items-center justify-between text-xs font-mono text-noir-200">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-crimson" />
            {pathResult.found ? (
              <span>
                <strong className="text-crimson">PATH DISCOVERED ({pathResult.path.length} hops):</strong>{' '}
                {pathResult.path.map((id) => visibleEntities.find((e) => e.id === id)?.label || id).join('  ──►  ')}
              </span>
            ) : (
              <span className="text-amber-accent">No connecting path found between selected entities.</span>
            )}
          </div>
          <span className="text-noir-400">Total Distance: {pathResult.distance.toFixed(2)}</span>
        </div>
      )}

      {/* Main Canvas */}
      <div className="relative flex-1 w-full h-full">
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          onClick={handleClick}
          onWheel={handleWheel}
          className="w-full h-full cursor-crosshair touch-none"
        />

        {/* Predictive Links Drawer Overlay */}
        {showPredictions && predictedLinks.length > 0 && (
          <div className="absolute top-4 right-4 z-20 w-80 max-h-96 overflow-y-auto bg-noir-850/95 border border-amber-accent/40 rounded-lg p-3 shadow-xl backdrop-blur-md font-mono text-xs text-noir-200 space-y-2.5">
            <div className="flex items-center justify-between font-bold text-amber-accent border-b border-noir-700 pb-1.5">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> SUGGESTED COVERT LINKS
              </span>
              <span className="text-[10px] text-noir-400">GRAPH HEURISTIC</span>
            </div>
            {predictedLinks.map((pl, idx) => (
              <div key={idx} className="p-2 bg-noir-800/80 rounded border border-noir-700 space-y-1">
                <div className="flex items-center justify-between font-bold">
                  <span className="text-noir-100">{pl.sourceLabel}</span>
                  <span className="text-amber-accent">{(pl.score * 100).toFixed(0)}%</span>
                </div>
                <div className="text-[10px] text-noir-400">─────?───── {pl.targetLabel}</div>
                <div className="text-[10px] text-noir-400">Signals: {pl.reasons.join(', ')}</div>
                {onAddPredictedLink && (
                  <button
                    onClick={() => onAddPredictedLink(pl)}
                    className="w-full mt-1.5 py-1 bg-noir-700 hover:bg-amber-accent/20 text-noir-200 hover:text-amber-accent rounded text-[10px] font-bold transition-colors"
                  >
                    + Stage to Graph (Requires Confirmation)
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
