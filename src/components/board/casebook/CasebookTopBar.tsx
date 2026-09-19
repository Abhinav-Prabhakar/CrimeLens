'use client';
import React, { useCallback, useEffect, useRef, useState } from 'react';

export interface KebabItem {
  id: string;
  label: string;
  danger?: boolean;
  onSelect(): void;
}

export interface CasebookTopBarProps {
  caseTitle: string;
  caseNumber: string;
  viewLabel: string; // e.g. 'Evidence board'
  onOpenCases(): void; // menuBtn
  onShare(): void; // shareBtn
  onOpenSearch(): void; // a search iconbtn placed before bell
  onOpenAudit(): void; // bellBtn → opens audit trail
  kebabItems: KebabItem[]; // kebabPop rows
}

type PopPos = { top: number; right: number };

export const CasebookTopBar: React.FC<CasebookTopBarProps> = ({
  caseTitle,
  caseNumber,
  viewLabel,
  onOpenCases,
  onShare,
  onOpenSearch,
  onOpenAudit,
  kebabItems,
}) => {
  const kebabBtnRef = useRef<HTMLButtonElement>(null);
  const [kebabOpen, setKebabOpen] = useState(false);
  const [kebabPos, setKebabPos] = useState<PopPos | null>(null);

  /* Ported from togglePop(): open → position below the anchor, right-aligned
   * (top: r.bottom + 8, right: innerWidth - r.right). */
  const toggleKebab = useCallback(() => {
    setKebabOpen((open) => {
      const next = !open;
      if (next && kebabBtnRef.current) {
        const r = kebabBtnRef.current.getBoundingClientRect();
        setKebabPos({
          top: r.bottom + 8,
          right: window.innerWidth - r.right,
        });
      }
      return next;
    });
  }, []);

  /* Ported global click-closer: any pointerdown outside .pop / .iconbtn
   * closes open popovers (capture phase). */
  useEffect(() => {
    if (!kebabOpen) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as Element | null;
      if (!t) return;
      if (!t.closest('.pop') && !t.closest('.iconbtn')) setKebabOpen(false);
    };
    document.addEventListener('pointerdown', onDown, true);
    return () => document.removeEventListener('pointerdown', onDown, true);
  }, [kebabOpen]);

  return (
    <>
      <div id="topbar">
        <button
          className="iconbtn"
          id="menuBtn"
          title="Menu"
          onClick={onOpenCases}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>
        <div id="logo">
          CRIMELENS<span className="dot"></span>
        </div>
        <div id="crumb">
          <span className="hidesm">Cases</span>
          <span className="sep">/</span>
          <b>{caseTitle}</b>
          <span className="sep hidesm">›</span>
          <span className="hidesm">
            {viewLabel} · Case #{caseNumber}
          </span>
        </div>
        <div id="tspace"></div>
        <div id="avatars">
          <div className="av" style={{ background: '#8a4a3a' }}>
            RP
          </div>
          <div className="av" style={{ background: '#3a5a7a' }}>
            MC
          </div>
          <div className="av" style={{ background: '#4a6a3a' }}>
            JW
          </div>
          <div className="av" style={{ background: '#6a4a7a' }}>
            AL
          </div>
          <div className="av more">+2</div>
        </div>
        <button id="shareBtn" onClick={onShare}>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            width="14"
            height="14"
          >
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" />
          </svg>
          Share
        </button>
        <button
          className="iconbtn"
          id="searchBtn"
          title="Search"
          onClick={onOpenSearch}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
        </button>
        <button
          className="iconbtn"
          id="bellBtn"
          title="Notifications"
          onClick={onOpenAudit}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 01-3.4 0" />
          </svg>
          <span className="badge">3</span>
        </button>
        <button
          className="iconbtn"
          id="kebabBtn"
          title="More"
          ref={kebabBtnRef}
          onClick={(e) => {
            e.stopPropagation();
            toggleKebab();
          }}
        >
          <svg viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="5" r="1.7" />
            <circle cx="12" cy="12" r="1.7" />
            <circle cx="12" cy="19" r="1.7" />
          </svg>
        </button>
      </div>

      <div
        className={`pop${kebabOpen ? ' open' : ''}`}
        id="kebabPop"
        style={
          kebabPos
            ? { top: kebabPos.top, right: kebabPos.right }
            : undefined
        }
      >
        {kebabItems.map((item) => (
          <div
            key={item.id}
            className="popRow"
            style={item.danger ? { color: 'var(--red)' } : undefined}
            onClick={() => {
              setKebabOpen(false);
              item.onSelect();
            }}
          >
            {item.label}
          </div>
        ))}
      </div>
    </>
  );
};
