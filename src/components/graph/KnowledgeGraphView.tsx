'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { InvestigationEntity, InvestigationRelationship } from '@/lib/types/investigation';
import { GraphEngine, GraphPathResult } from '@/lib/graph/algorithms';
import { detectCommunities } from '@/lib/graph/louvain';
import { predictMissingLinks, PredictedLink } from '@/lib/graph/linkPrediction';
import { Search, Route, Share2, Sparkles, Filter, ShieldAlert } from 'lucide-react';

interface KnowledgeGraphViewProps {
  entities: InvestigationEntity[];
  relationships: InvestigationRelationship[];
  selectedEntityId: string | null;
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

export const KnowledgeGraphView: React.FC<KnowledgeGraphViewProps> = ({
  entities,
  relationships,
  selectedEntityId,
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

  // Graph Engine & Analytics
  const graphEngine = useMemo(() => new GraphEngine(entities, relationships), [entities, relationships]);
  const degreeCentrality = useMemo(() => graphEngine.calculateDegreeCentrality(), [graphEngine]);
  const betweenness = useMemo(() => graphEngine.calculateBetweennessCentrality(), [graphEngine]);
  const communities = useMemo(() => detectCommunities(entities, relationships), [entities, relationships]);
  const predictedLinks = useMemo(() => predictMissingLinks(entities, relationships, 6), [entities, relationships]);

  // Simulation node positions
  const [nodePositions, setNodePositions] = useState<Map<string, { x: number; y: number; vx: number; vy: number }>>(
    new Map()
  );

  // Initialize force positions from corkboard coordinates
  useEffect(() => {
    const pos = new Map<string, { x: number; y: number; vx: number; vy: number }>();
    const w = containerRef.current?.clientWidth || 900;
    const h = containerRef.current?.clientHeight || 600;

    entities.forEach((ent, idx) => {
      // Map corkboard (-50..50) to canvas (0..w)
      const x = w / 2 + ent.boardPosition.x * 12;
      const y = h / 2 + ent.boardPosition.y * 8;
      pos.set(ent.id, { x, y, vx: 0, vy: 0 });
    });
    setNodePositions(pos);
  }, [entities]);

  // Handle Shortest Path
  const handleCalculatePath = () => {
    if (!sourcePathId || !targetPathId) return;
    const res = graphEngine.findShortestPath(sourcePathId, targetPathId);
    setPathResult(res);
  };

  // Canvas Render
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || nodePositions.size === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Path set for highlighting
    const pathNodes = new Set(pathResult?.path || []);
    const pathRelIds = new Set(pathResult?.relationships.map((r) => r.id) || []);

    // 1. Draw Edges
    relationships.forEach((rel) => {
      const p1 = nodePositions.get(rel.sourceId);
      const p2 = nodePositions.get(rel.targetId);
      if (!p1 || !p2) return;

      const isPathEdge = pathRelIds.has(rel.id);
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);

      if (isPathEdge) {
        ctx.strokeStyle = '#ff4d42';
        ctx.lineWidth = 3.5;
      } else {
        ctx.strokeStyle = 'rgba(141, 134, 124, 0.25)';
        ctx.lineWidth = 1.2;
      }
      ctx.stroke();

      // Predicate Label
      if (isPathEdge || selectedEntityId === rel.sourceId || selectedEntityId === rel.targetId) {
        const midX = (p1.x + p2.x) / 2;
        const midY = (p1.y + p2.y) / 2;
        ctx.fillStyle = isPathEdge ? '#ff4d42' : '#8d867c';
        ctx.font = '10px Courier New, monospace';
        ctx.fillText(rel.label || rel.predicate, midX, midY - 4);
      }
    });

    // 2. Draw Predicted Missing Links (if enabled)
    if (showPredictions) {
      predictedLinks.forEach((pl) => {
        const p1 = nodePositions.get(pl.sourceId);
        const p2 = nodePositions.get(pl.targetId);
        if (!p1 || !p2) return;

        ctx.beginPath();
        ctx.setLineDash([4, 4]);
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.strokeStyle = 'rgba(217, 165, 32, 0.75)'; // Amber dashed
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.setLineDash([]);

        const midX = (p1.x + p2.x) / 2;
        const midY = (p1.y + p2.y) / 2;
        ctx.fillStyle = '#d9a520';
        ctx.font = 'bold 9px Courier New, monospace';
        ctx.fillText(`? ${(pl.score * 100).toFixed(0)}% PREDICTED`, midX, midY);
      });
    }

    // 3. Draw Nodes
    entities.forEach((ent) => {
      const pos = nodePositions.get(ent.id);
      if (!pos) return;

      const isSelected = selectedEntityId === ent.id;
      const isPathNode = pathNodes.has(ent.id);
      const isSearchMatch = searchQuery && ent.label.toLowerCase().includes(searchQuery.toLowerCase());

      // Dynamic Node Radius by Centrality
      const cent = betweenness[ent.id] || 0;
      const radius = 10 + cent * 40;

      // Color by Mode
      let nodeColor = '#8d867c';
      if (colorMode === 'community') {
        const commIdx = communities.communities[ent.id] ?? 0;
        nodeColor = COMMUNITY_COLORS[commIdx % COMMUNITY_COLORS.length];
      } else if (colorMode === 'type') {
        nodeColor = ent.type === 'person' ? '#e13c32' : ent.type === 'organization' ? '#2f5f9e' : '#d9a520';
      } else if (colorMode === 'centrality') {
        const normDeg = degreeCentrality.normalizedDegree[ent.id] || 0;
        nodeColor = normDeg > 0.4 ? '#e13c32' : normDeg > 0.2 ? '#d9a520' : '#2f5f9e';
      }

      // Draw Node Circle
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = nodeColor;
      ctx.fill();

      // Border / Selection ring
      if (isSelected || isPathNode || isSearchMatch) {
        ctx.lineWidth = 3;
        ctx.strokeStyle = isPathNode ? '#ff4d42' : '#ffffff';
        ctx.stroke();
      } else {
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = '#141110';
        ctx.stroke();
      }

      // Label
      ctx.fillStyle = isSelected ? '#ffffff' : '#d9d4cc';
      ctx.font = isSelected ? 'bold 12px Courier New' : '11px Courier New';
      ctx.fillText(ent.label, pos.x + radius + 4, pos.y + 4);

      // Betweenness / Bridge Badge
      if (cent > 0.15) {
        ctx.fillStyle = '#ff4d42';
        ctx.font = 'bold 9px Courier New';
        ctx.fillText('⚡ BRIDGE HUB', pos.x + radius + 4, pos.y + 16);
      }
    });
  }, [
    entities,
    relationships,
    nodePositions,
    selectedEntityId,
    pathResult,
    showPredictions,
    colorMode,
    searchQuery,
    betweenness,
    communities,
    degreeCentrality,
    predictedLinks,
  ]);

  // Handle Click on Canvas
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    let clickedId: string | null = null;
    entities.forEach((ent) => {
      const pos = nodePositions.get(ent.id);
      if (!pos) return;
      const d = Math.hypot(pos.x - x, pos.y - y);
      const radius = 10 + (betweenness[ent.id] || 0) * 40;
      if (d <= radius + 5) {
        clickedId = ent.id;
      }
    });

    onSelectEntity(clickedId);
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
            Nodes: <strong className="text-noir-100">{entities.length}</strong>
          </span>
          <span className="text-noir-400">
            Edges: <strong className="text-noir-100">{relationships.length}</strong>
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
            onChange={(e) => setSourcePathId(e.target.value)}
            className="bg-noir-800 border border-noir-600 rounded px-2 py-1 text-noir-100 focus:outline-none"
          >
            <option value="">Origin Suspect...</option>
            {entities.map((e) => (
              <option key={e.id} value={e.id}>
                {e.label}
              </option>
            ))}
          </select>
          <span className="text-noir-500">→</span>
          <select
            value={targetPathId}
            onChange={(e) => setTargetPathId(e.target.value)}
            className="bg-noir-800 border border-noir-600 rounded px-2 py-1 text-noir-100 focus:outline-none"
          >
            <option value="">Target Suspect...</option>
            {entities.map((e) => (
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
            <button
              onClick={() => setPathResult(null)}
              className="px-2 py-1 bg-noir-800 hover:bg-noir-700 text-noir-400 rounded"
            >
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
            <option value="community">Color: Louvain Communities</option>
            <option value="type">Color: Entity Type</option>
            <option value="centrality">Color: Centrality Heatmap</option>
          </select>
        </div>
      </div>

      {/* Path Finding Result Banner */}
      {pathResult && (
        <div className="z-20 bg-noir-850/95 border-b border-crimson/40 px-4 py-2 flex items-center justify-between text-xs font-mono text-noir-200">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-crimson" />
            {pathResult.found ? (
              <span>
                <strong className="text-crimson">PATH DISCOVERED ({pathResult.path.length} hops):</strong>{' '}
                {pathResult.path.map((id) => entities.find((e) => e.id === id)?.label || id).join('  ──►  ')}
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
          width={1200}
          height={750}
          onClick={handleCanvasClick}
          className="w-full h-full cursor-crosshair"
        />

        {/* Predictive Links Drawer Overlay */}
        {showPredictions && predictedLinks.length > 0 && (
          <div className="absolute top-4 right-4 z-20 w-80 max-h-96 overflow-y-auto bg-noir-850/95 border border-amber-accent/40 rounded-lg p-3 shadow-xl backdrop-blur-md font-mono text-xs text-noir-200 space-y-2.5">
            <div className="flex items-center justify-between font-bold text-amber-accent border-b border-noir-700 pb-1.5">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> SUGGESTED COVERT LINKS
              </span>
              <span className="text-[10px] text-noir-400">AI / GRAPH HEURISTIC</span>
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
                    + Confirm & Add to Graph
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
