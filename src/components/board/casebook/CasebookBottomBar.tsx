'use client';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { BoardTool } from '@/lib/board/casebook/types';
import { TYPE_LABEL } from '@/lib/board/casebook/types';

export type AppView = 'board' | 'graph' | 'timeline' | 'patterns';

export interface TimelineItem {
  id: string;
  name: string;
  created: number;
}

export interface CasebookBottomBarProps {
  filterTypes: Record<string, boolean>;
  typeCounts: Record<string, number>;
  onToggleFilter(t: string): void;
  activeView: AppView;
  graphStatus: 'checking' | 'online' | 'offline';
  onSelectView(v: AppView): void;
  timelineItems: TimelineItem[];
  onJumpToItem(id: string): void;
  activeTool: BoardTool;
  onSelectTool(t: BoardTool): void;
  zoomPct: number;
  canUndo: boolean;
  canRedo: boolean;
  onUndo(): void;
  onRedo(): void;
  onZoomIn(): void;
  onZoomOut(): void;
}

type PopId = 'filters' | 'timeline';
interface PopPos {
  bottom: number;
  left: number;
}

const fmtDay = (ms: number) =>
  new Date(ms).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

export const CasebookBottomBar: React.FC<CasebookBottomBarProps> = ({
  filterTypes,
  typeCounts,
  onToggleFilter,
  activeView,
  graphStatus,
  onSelectView,
  timelineItems,
  onJumpToItem,
  activeTool,
  onSelectTool,
  zoomPct,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onZoomIn,
  onZoomOut,
}) => {
  const filtersBtnRef = useRef<HTMLButtonElement>(null);
  const timelineBtnRef = useRef<HTMLButtonElement>(null);
  const [openPop, setOpenPop] = useState<PopId | null>(null);
  const [popPos, setPopPos] = useState<PopPos | null>(null);

  const disabledCount = Object.values(filterTypes).filter((v) => !v).length;

  /* Ported from togglePop(): bottombar anchors open the pop ABOVE the pill —
   * bottom: innerHeight - r.top + 8; left: r.left. */
  const togglePop = useCallback((id: PopId, anchor: HTMLButtonElement | null) => {
    setOpenPop((cur) => {
      const next = cur === id ? null : id;
      if (next && anchor) {
        const r = anchor.getBoundingClientRect();
        setPopPos({
          bottom: window.innerHeight - r.top + 8,
          left: r.left,
        });
      }
      return next;
    });
  }, []);

  /* Ported global click-closer: pointerdown outside .pop / .bpill / .iconbtn
   * closes open popovers (capture phase). */
  useEffect(() => {
    if (!openPop) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as Element | null;
      if (!t) return;
      if (
        !t.closest('.pop') &&
        !t.closest('.bpill') &&
        !t.closest('.iconbtn')
      )
        setOpenPop(null);
    };
    document.addEventListener('pointerdown', onDown, true);
    return () => document.removeEventListener('pointerdown', onDown, true);
  }, [openPop]);

  const activePillStyle: React.CSSProperties = {
    borderColor: 'var(--dim)',
    background: 'var(--panel2)',
  };

  const sortedTimeline = [...timelineItems].sort(
    (a, b) => a.created - b.created,
  );

  return (
    <>
      <div id="bottombar">
        <button
          className="bpill"
          id="filtersBtn"
          ref={filtersBtnRef}
          onClick={(e) => {
            e.stopPropagation();
            togglePop('filters', filtersBtnRef.current);
          }}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M4 6h16M7 12h10M10 18h4" />
          </svg>
          Filters{' '}
          <span
            className="cnt"
            id="filterCnt"
            style={disabledCount === 0 ? { display: 'none' } : undefined}
          >
            {disabledCount}
          </span>
        </button>
        <button
          className="bpill"
          id="boardBtn"
          style={activeView === 'board' ? activePillStyle : undefined}
          onClick={() => onSelectView('board')}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <rect x="3" y="4" width="18" height="16" rx="2" />
            <path d="M8 4v4M16 4v4M3 12h18" />
          </svg>
          Board
        </button>
        <button
          className="bpill"
          id="timelineBtn"
          ref={timelineBtnRef}
          style={activeView === 'timeline' ? activePillStyle : undefined}
          onClick={(e) => {
            e.stopPropagation();
            togglePop('timeline', timelineBtnRef.current);
          }}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M3 5h18M3 12h18M3 19h18M7 5v3M12 12v3M17 19v-3" />
          </svg>
          Timeline
        </button>
        <button
          className="bpill"
          id="graphBtn"
          style={activeView === 'graph' ? activePillStyle : undefined}
          onClick={() => onSelectView('graph')}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="5" cy="6" r="2" />
            <circle cx="19" cy="6" r="2" />
            <circle cx="12" cy="18" r="2" />
            <path d="M6.5 7.5L11 16M17.5 7.5L13 16M7 6h10" />
          </svg>
          Graph
        </button>
        <button
          className="bpill"
          id="anomaliesBtn"
          style={activeView === 'patterns' ? activePillStyle : undefined}
          onClick={() => onSelectView('patterns')}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M12 3l7 3v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6z" />
            <path d="M12 9v4M12 16.5v.5" />
          </svg>
          Anomalies
        </button>
        <div
          className="bpill"
          title={`Neo4j graph link: ${graphStatus}`}
          style={{ cursor: 'default', pointerEvents: 'none' }}
        >
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background:
                graphStatus === 'online'
                  ? '#4a8a5a'
                  : graphStatus === 'offline'
                    ? 'var(--red)'
                    : '#c9a76a',
              boxShadow:
                graphStatus === 'online'
                  ? '0 0 7px rgba(74,138,90,.7)'
                  : undefined,
            }}
          />
          NEO4J {graphStatus.toUpperCase()}
        </div>
        <div id="bspace"></div>
        <div id="navcluster">
          <canvas id="minimap" width={240} height={104}></canvas>
          <button
            className={`nbtn${activeTool === 'pan' ? ' on' : ''}`}
            id="handBtn"
            title="Pan"
            onClick={() => onSelectTool('pan')}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M18 11V6.5a1.5 1.5 0 00-3 0V11m0-6a1.5 1.5 0 00-3 0v5m0-4a1.5 1.5 0 00-3 0v7L7.5 11A1.8 1.8 0 005 13.5L9 19a5 5 0 004 2h1a5 5 0 005-5z" />
            </svg>
          </button>
          <button
            className="nbtn"
            id="zoomOut"
            title="Zoom out"
            onClick={onZoomOut}
          >
            −
          </button>
          <div id="zoomPct">{zoomPct}%</div>
          <button
            className="nbtn"
            id="zoomIn"
            title="Zoom in"
            onClick={onZoomIn}
          >
            +
          </button>
          <button
            className="nbtn"
            id="undoBtn"
            title="Undo (Ctrl+Z)"
            style={!canUndo ? { opacity: 0.35 } : undefined}
            onClick={onUndo}
          >
            ↶
          </button>
          <button
            className="nbtn"
            id="redoBtn"
            title="Redo (Ctrl+Y)"
            style={!canRedo ? { opacity: 0.35 } : undefined}
            onClick={onRedo}
          >
            ↷
          </button>
          <button
            className="nbtn"
            id="fsBtn"
            title="Fullscreen"
            onClick={() => {
              if (document.fullscreenElement) {
                void document.exitFullscreen();
              } else {
                void document.documentElement.requestFullscreen();
              }
            }}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5" />
            </svg>
          </button>
        </div>
      </div>

      <div
        className={`pop${openPop === 'filters' ? ' open' : ''}`}
        id="filtersPop"
        style={
          openPop === 'filters' && popPos
            ? { bottom: popPos.bottom, left: popPos.left }
            : undefined
        }
      >
        <div className="popTitle">Evidence filters</div>
        {Object.keys(TYPE_LABEL).map((t) => (
          <div className="popRow" key={t}>
            <label
              style={{ display: 'flex', alignItems: 'center', gap: 9, flex: 1 }}
            >
              <input
                type="checkbox"
                checked={filterTypes[t] !== false}
                onChange={() => onToggleFilter(t)}
              />
              {TYPE_LABEL[t as keyof typeof TYPE_LABEL]}
              <small>{typeCounts[t] || 0}</small>
            </label>
          </div>
        ))}
      </div>

      <div
        className={`pop${openPop === 'timeline' ? ' open' : ''}`}
        id="timelinePop"
        style={
          openPop === 'timeline' && popPos
            ? {
                bottom: popPos.bottom,
                left: popPos.left,
                maxHeight: 320,
                overflowY: 'auto',
              }
            : { maxHeight: 320, overflowY: 'auto' }
        }
      >
        <div className="popTitle">Case timeline</div>
        {sortedTimeline.map((it) => (
          <div
            className="popRow"
            key={it.id}
            onClick={() => {
              setOpenPop(null);
              onJumpToItem(it.id);
            }}
          >
            {it.name}
            <small>{fmtDay(it.created)}</small>
          </div>
        ))}
        <div
          className="popRow"
          onClick={() => {
            setOpenPop(null);
            onSelectView('timeline');
          }}
        >
          Open full timeline →
        </div>
      </div>
    </>
  );
};
