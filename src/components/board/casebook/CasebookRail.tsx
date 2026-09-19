'use client';
import React from 'react';
import type { BoardTool, ThreadColorId } from '@/lib/board/casebook/types';
import { THREADS } from '@/lib/board/casebook/types';

export interface RailAppTool {
  id: string;
  label: string;
  icon: React.ReactNode;
  onSelect(): void;
}

export interface CasebookRailProps {
  boardMode: boolean;
  activeTool: BoardTool;
  threadColor: ThreadColorId;
  onSelectTool(t: BoardTool): void;
  onSelectThreadColor(c: ThreadColorId): void;
  onAddCard(type: string): void; // 'doc'|'statement'|'sticky'|'suspect'|'map'|'news'|'print'
  onPickImageFile(): void; // 'Upload Image' button
  appTools: RailAppTool[]; // extra app actions, rendered as .rtool rows after a .rsep
  onExport(): void;
}

const cssHex = (n: number) => '#' + n.toString(16).padStart(6, '0');

export const CasebookRail: React.FC<CasebookRailProps> = ({
  boardMode,
  activeTool,
  threadColor,
  onSelectTool,
  onSelectThreadColor,
  onAddCard,
  onPickImageFile,
  appTools,
  onExport,
}) => {
  return (
    <div id="rail">
      {boardMode && (
        <>
      <div
        className={`rtool${activeTool === 'select' ? ' on' : ''}`}
        data-tool="select"
        title="Select (V)"
        onClick={() => onSelectTool('select')}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M5 3l14 8-6.5 1.5L9 19z" strokeLinejoin="round" />
        </svg>
        <span>Select</span>
      </div>
      <div
        className={`rtool${activeTool === 'lasso' ? ' on' : ''}`}
        data-tool="lasso"
        title="Lasso (L)"
        onClick={() => onSelectTool('lasso')}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeDasharray="3 3"
        >
          <ellipse cx="12" cy="10" rx="8" ry="6" />
          <path d="M12 16c-1 2-3 3-3 5" strokeDasharray="0" />
        </svg>
        <span>Lasso</span>
      </div>
      <div
        className={`rtool${activeTool === 'connect' ? ' on' : ''}`}
        data-tool="connect"
        title="Connect (C)"
        onClick={() => onSelectTool('connect')}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="6" cy="6" r="2.4" />
          <circle cx="18" cy="18" r="2.4" />
          <path d="M7.8 7.8c4 1 7.4 4.4 8.4 8.4" />
        </svg>
        <span>Connect</span>
      </div>
      <div className="rsep"></div>
      <div
        className="rtool"
        data-add="photo"
        title="Upload Image"
        onClick={onPickImageFile}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <circle cx="9" cy="10" r="1.8" />
          <path d="M4 18l5-5 4 4 3-3 4 4" />
        </svg>
        <span>
          Upload
          <br />
          Image
        </span>
      </div>
      <div
        className="rtool"
        data-add="doc"
        title="Upload Document"
        onClick={() => onAddCard('doc')}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M6 2h8l5 5v13a2 2 0 01-2 2H6a2 2 0 01-2-2V4a2 2 0 012-2z" />
          <path d="M14 2v5h5M9 13h7M9 17h7" />
        </svg>
        <span>
          Upload
          <br />
          Document
        </span>
      </div>
      <div
        className="rtool"
        data-add="statement"
        title="Note"
        onClick={() => onAddCard('statement')}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z" />
        </svg>
        <span>Note</span>
      </div>
      <div
        className="rtool"
        data-add="sticky"
        title="Sticky Note"
        onClick={() => onAddCard('sticky')}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M4 4h16v10l-6 6H4z" />
          <path d="M14 20v-6h6" />
        </svg>
        <span>Sticky Note</span>
      </div>
      <div
        className="rtool"
        data-add="suspect"
        title="Suspect Card"
        onClick={() => onAddCard('suspect')}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <circle cx="9" cy="11" r="2.4" />
          <path d="M5.5 17c.7-2 2-3 3.5-3s2.8 1 3.5 3M15 9h4M15 13h4" />
        </svg>
        <span>
          Suspect
          <br />
          Card
        </span>
      </div>
      <div
        className="rtool"
        data-add="map"
        title="Location Card"
        onClick={() => onAddCard('map')}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M12 21s-7-5.5-7-11a7 7 0 0114 0c0 5.5-7 11-7 11z" />
          <circle cx="12" cy="10" r="2.4" />
        </svg>
        <span>
          Location
          <br />
          Card
        </span>
      </div>
      <div className="rsep"></div>
      <div
        className="rtool"
        data-add="news"
        title="Clipping"
        onClick={() => onAddCard('news')}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M4 5h13v14a2 2 0 002 2H6a2 2 0 01-2-2z" />
          <path d="M17 8h3v11a2 2 0 01-2 2M7 9h7M7 13h7M7 17h4" />
        </svg>
        <span>Clipping</span>
      </div>
      <div
        className="rtool"
        data-add="print"
        title="Fingerprint"
        onClick={() => onAddCard('print')}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M12 11a3 3 0 013 3v3M12 11a3 3 0 00-3 3v1M12 7a7 7 0 017 7v2M12 7a7 7 0 00-7 7M12 15v4" />
        </svg>
        <span>Print</span>
      </div>
      <div
        className="rtool"
        data-add="bag"
        title="Evidence Bag"
        onClick={() => onAddCard('bag')}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M6 3h12l2 18H4zM8 7h8M9 3v4M15 3v4" />
        </svg>
        <span>
          Evidence
          <br />
          Bag
        </span>
      </div>
      <div className="rsep"></div>
      <div className="rtool" title="Thread color">
        <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
          {THREADS.map((t) => (
            <button
              key={t.id}
              title={t.name}
              onClick={(e) => {
                e.stopPropagation();
                onSelectThreadColor(t.id);
              }}
              style={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                background: cssHex(t.color),
                border: '1px solid var(--line)',
                cursor: 'pointer',
                padding: 0,
                boxShadow:
                  threadColor === t.id ? '0 0 0 2px var(--txt)' : 'none',
              }}
            />
          ))}
        </div>
        <span>Yarn</span>
      </div>
        </>
      )}
      {appTools.length > 0 && (
        <>
          <div className="rsep"></div>
          {appTools.map((tool) => (
            <div
              key={tool.id}
              className="rtool"
              title={tool.label}
              onClick={tool.onSelect}
            >
              {tool.icon}
              <span>{tool.label}</span>
            </div>
          ))}
        </>
      )}
      <div className="rsep"></div>
      <div
        className="rtool"
        id="exportBtn"
        title="Export case JSON"
        onClick={onExport}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M8 3l-5 9 5 9M16 3l5 9-5 9" />
        </svg>
        <span>Export</span>
      </div>
    </div>
  );
};
