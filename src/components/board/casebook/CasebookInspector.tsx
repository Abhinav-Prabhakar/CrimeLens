'use client';

import React, { useState } from 'react';
import type {
  InvestigationEntity,
  InvestigationRelationship,
} from '@/lib/types/investigation';
import { TYPE_LABEL } from '@/lib/board/casebook/types';

export interface CasebookInspectorProps {
  entity: InvestigationEntity | null;
  selectedCount: number; // >1 → show multiSel block instead
  relationships: InvestigationRelationship[];
  allEntities: InvestigationEntity[];
  getThumbnail(id: string): string | null; // world thumbnail dataURL
  getConnections(id: string): { otherId: string; confidence: number }[]; // ordered, world-derived (fall back to `relationships` if it returns empty)
  onClose(): void;
  onSelectEntity(id: string): void; // clicking a connRow navigates
  onUpdate(id: string, updates: Partial<InvestigationEntity>): void;
  onDelete(id: string): void;
  onConfirmRelationship(id: string): void;
  onDeleteRelationship(id: string): void;
}

interface ConnRow {
  otherId: string;
  confidence: number;
  rel?: InvestigationRelationship;
}

const strengthWord = (conf: number): string =>
  conf >= 0.66 ? 'Strong' : conf >= 0.4 ? 'Medium' : 'Weak';

const attrToString = (v: unknown): string =>
  v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v);

/* Inline styles for the extra (non-reference) sections, matching the panel look. */
const panelBox: React.CSSProperties = {
  background: 'var(--panel2)',
  border: '1px solid var(--line)',
  borderRadius: 8,
  padding: '10px 12px',
  fontSize: 12.5,
  color: 'var(--txt)',
};

const fieldStyle: React.CSSProperties = {
  background: 'var(--panel2)',
  border: '1px solid var(--line)',
  borderRadius: 6,
  color: 'var(--txt)',
  fontSize: 12,
  padding: '5px 8px',
  outline: 'none',
  fontFamily: 'var(--sans)',
  flex: 1,
  minWidth: 0,
};

const miniBtnStyle: React.CSSProperties = {
  padding: '3px 7px',
  cursor: 'pointer',
  lineHeight: 1.2,
  fontFamily: 'var(--sans)',
  flex: '0 0 auto',
};

const attrKeyStyle: React.CSSProperties = {
  flex: '0 0 84px',
  fontSize: 10.5,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'var(--dim)',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const attrRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '5px 0',
};

export const CasebookInspector: React.FC<CasebookInspectorProps> = (props) => {
  const {
    entity,
    selectedCount,
    relationships,
    allEntities,
    getThumbnail,
    getConnections,
    onClose,
    onSelectEntity,
    onUpdate,
    onDelete,
    onConfirmRelationship,
    onDeleteRelationship,
  } = props;

  const [showAll, setShowAll] = useState(false);
  const [newAttrKey, setNewAttrKey] = useState('');
  const [newAttrValue, setNewAttrValue] = useState('');

  if (selectedCount <= 1 && !entity) return null;

  /* ---------- connections (world-derived order, relationships fallback) ---------- */
  const conns: ConnRow[] = [];
  if (entity) {
    const touching = relationships.filter(
      (r) => r.sourceId === entity.id || r.targetId === entity.id,
    );
    const otherOf = (r: InvestigationRelationship) =>
      r.sourceId === entity.id ? r.targetId : r.sourceId;
    const worldConns = getConnections(entity.id) ?? [];
    if (worldConns.length) {
      for (const c of worldConns) {
        conns.push({
          otherId: c.otherId,
          confidence: c.confidence,
          rel: touching.find((r) => otherOf(r) === c.otherId),
        });
      }
    } else {
      for (const r of touching) {
        conns.push({ otherId: otherOf(r), confidence: r.confidence, rel: r });
      }
    }
  }

  const avg = conns.length
    ? conns.reduce((s, c) => s + c.confidence, 0) / conns.length
    : 0;
  const filled = Math.round(avg * 7);
  const strWord =
    avg >= 0.66 ? 'Strong' : avg >= 0.4 ? 'Medium' : avg > 0 ? 'Weak' : '—';
  const strPct = avg ? `${Math.trunc(avg * 100)}%` : '';

  const thumb = entity ? getThumbnail(entity.id) : null;

  const created = entity ? new Date(entity.createdAt) : null;
  const createdStr =
    created && !isNaN(created.getTime())
      ? created.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
      : '';

  const noteLines = entity?.notes
    ? entity.notes.split('\n').filter((l) => l.trim().length > 0)
    : [];

  const verified =
    !!entity &&
    (entity.status === 'investigator_confirmed' ||
      entity.status === 'verified_source');

  const handleAddAttr = () => {
    if (!entity) return;
    const k = newAttrKey.trim();
    if (!k) return;
    onUpdate(entity.id, {
      attributes: { ...entity.attributes, [k]: newAttrValue },
    });
    setNewAttrKey('');
    setNewAttrValue('');
  };

  return (
    <div id="inspector" className="open">
      <div id="insHead">
        <span className="eyebrow">Evidence</span>
        <button
          className="iconbtn"
          id="insClose"
          style={{ width: 26, height: 26 }}
          onClick={onClose}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>
      <div id="insBody">
        {selectedCount > 1 ? (
          <div id="multiSel">
            <b style={{ color: 'var(--txt)' }}>
              {selectedCount} items selected
            </b>
            <br />
            Drag any one to move the group · Delete removes all
          </div>
        ) : entity ? (
          <div id="singleSel">
            <div id="itemCard">
              <img
                id="itemThumb"
                alt=""
                src={thumb ?? undefined}
                style={thumb ? undefined : { display: 'none' }}
              />
              <div>
                <div id="itemName">{entity.label}</div>
                <div id="itemType">
                  {TYPE_LABEL[entity.visualType] ?? entity.visualType}
                </div>
                <div id="itemMeta">
                  Added {createdStr}
                  <br />
                  by {entity.provenance.sourceTitle}
                </div>
              </div>
            </div>

            <div className="insSec">
              <div className="insSecHead">
                <span className="eyebrow" id="connCount">
                  Connections ({conns.length})
                </span>
              </div>
              <div id="connList">
                {(showAll ? conns : conns.slice(0, 6)).map((c) => {
                  const other = allEntities.find((e) => e.id === c.otherId);
                  const cThumb = getThumbnail(c.otherId);
                  const rel = c.rel;
                  const needsConfirm =
                    !!rel &&
                    (rel.status === 'ai_inferred' ||
                      rel.status === 'predicted');
                  return (
                    <div
                      key={rel?.id ?? c.otherId}
                      className="connRow"
                      onClick={() => onSelectEntity(c.otherId)}
                    >
                      <img
                        className="connDot"
                        alt=""
                        src={cThumb ?? undefined}
                        style={cThumb ? undefined : { display: 'none' }}
                      />
                      <span className="connName">
                        {other?.label ?? c.otherId}
                      </span>
                      <span className="connBar">
                        <i
                          style={{
                            width: `${Math.trunc(c.confidence * 100)}%`,
                          }}
                        />
                      </span>
                      <span className="connStr">
                        {strengthWord(c.confidence)}
                      </span>
                      {needsConfirm && rel && (
                        <>
                          <button
                            className="tag"
                            style={miniBtnStyle}
                            title="Confirm link"
                            onClick={(e) => {
                              e.stopPropagation();
                              onConfirmRelationship(rel.id);
                            }}
                          >
                            ✓
                          </button>
                          <button
                            className="tag"
                            style={miniBtnStyle}
                            title="Sever link"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteRelationship(rel.id);
                            }}
                          >
                            ×
                          </button>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
              {conns.length > 6 && (
                <button id="viewAll" onClick={() => setShowAll((v) => !v)}>
                  {showAll ? 'Show less' : 'View all'}
                </button>
              )}
            </div>

            <div className="insSec">
              <div className="insSecHead">
                <span className="eyebrow">Tags</span>
              </div>
              <div id="tags">
                {(entity.tags ?? []).map((t) => (
                  <span key={t} className="tag">
                    {t}
                  </span>
                ))}
                <span
                  className="tag add"
                  onClick={() => {
                    const t = window.prompt('New tag');
                    if (t && t.trim()) {
                      onUpdate(entity.id, {
                        tags: [...(entity.tags ?? []), t.trim()],
                      });
                    }
                  }}
                >
                  +
                </span>
              </div>
            </div>

            <div className="insSec">
              <div className="insSecHead">
                <span className="eyebrow">Evidence strength</span>
              </div>
              <div id="strBlocks">
                {Array.from({ length: 7 }, (_, i) => (
                  <i key={i} className={i < filled ? 'f' : undefined} />
                ))}
              </div>
              <div id="strLabelRow">
                <span id="strWord">{strWord}</span>
                <span id="strPct">{strPct}</span>
              </div>
            </div>

            <div className="insSec">
              <div className="insSecHead">
                <span className="eyebrow">Notes</span>
              </div>
              <div id="notesList">
                {noteLines.length === 0
                  ? 'No notes yet'
                  : noteLines.map((line, i) => (
                      <div key={i} className="noteRow">
                        {line}
                        <small>{entity.provenance.sourceTitle}</small>
                      </div>
                    ))}
              </div>
              <input
                id="noteInput"
                placeholder="Add a note…"
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === 'Enter') {
                    const v = e.currentTarget.value.trim();
                    if (v) {
                      onUpdate(entity.id, {
                        notes: entity.notes ? `${entity.notes}\n${v}` : v,
                      });
                      e.currentTarget.value = '';
                    }
                  }
                }}
              />
            </div>

            {/* ---------- Verification ---------- */}
            <div className="insSec">
              <div className="insSecHead">
                <span className="eyebrow">Verification</span>
              </div>
              <div style={panelBox}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span style={{ color: 'var(--dim)', fontSize: 11 }}>
                    Status
                  </span>
                  <span
                    style={{
                      border: '1px solid var(--line)',
                      borderRadius: 6,
                      padding: '3px 8px',
                      fontSize: 10.5,
                      fontWeight: 700,
                      letterSpacing: '0.08em',
                      color: verified ? '#4a8a5a' : 'var(--red)',
                    }}
                  >
                    {entity.status.toUpperCase()}
                  </span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginTop: 8,
                  }}
                >
                  <span style={{ color: 'var(--dim)', fontSize: 11 }}>
                    Confidence
                  </span>
                  <span style={{ fontWeight: 600 }}>
                    {Math.trunc(entity.confidence * 100)}%
                  </span>
                </div>
                {!verified && (
                  <button
                    onClick={() =>
                      onUpdate(entity.id, {
                        status: 'investigator_confirmed',
                        confidence: 1,
                      })
                    }
                    style={{
                      width: '100%',
                      marginTop: 10,
                      background: 'var(--panel)',
                      border: '1px solid var(--line)',
                      color: 'var(--txt)',
                      fontSize: 12,
                      fontWeight: 600,
                      padding: '8px',
                      borderRadius: 8,
                      cursor: 'pointer',
                      fontFamily: 'var(--sans)',
                    }}
                  >
                    Confirm as verified lead
                  </button>
                )}
              </div>
            </div>

            {/* ---------- Provenance ---------- */}
            <div className="insSec">
              <div className="insSecHead">
                <span className="eyebrow">Provenance</span>
              </div>
              <div style={panelBox}>
                <div style={{ fontWeight: 700 }}>
                  {entity.provenance.sourceTitle}
                </div>
                <div
                  style={{ color: 'var(--dim)', fontSize: 11, marginTop: 3 }}
                >
                  Origin: {entity.provenance.sourceType.toUpperCase()}
                </div>
                {entity.provenance.excerpt && (
                  <blockquote
                    style={{
                      margin: '8px 0 0',
                      padding: '2px 0 2px 10px',
                      borderLeft: '2px solid var(--line)',
                      fontStyle: 'italic',
                      color: 'var(--dim)',
                      fontSize: 11.5,
                      lineHeight: 1.5,
                    }}
                  >
                    “{entity.provenance.excerpt}”
                  </blockquote>
                )}
              </div>
            </div>

            {/* ---------- Attributes ---------- */}
            <div className="insSec">
              <div className="insSecHead">
                <span className="eyebrow">Attributes</span>
              </div>
              {Object.keys(entity.attributes ?? {}).length === 0 && (
                <div
                  style={{
                    fontSize: 11,
                    color: 'var(--faint)',
                    padding: '4px 0',
                  }}
                >
                  No attributes recorded.
                </div>
              )}
              {Object.entries(entity.attributes ?? {}).map(([k, v]) => (
                <div key={k} style={attrRowStyle}>
                  <span style={attrKeyStyle} title={k}>
                    {k}
                  </span>
                  <input
                    defaultValue={attrToString(v)}
                    style={fieldStyle}
                    onKeyDown={(e) => e.stopPropagation()}
                    onBlur={(e) => {
                      const nv = e.target.value;
                      if (nv !== attrToString(v)) {
                        onUpdate(entity.id, {
                          attributes: { ...entity.attributes, [k]: nv },
                        });
                      }
                    }}
                  />
                  <button
                    className="tag"
                    style={miniBtnStyle}
                    title={`Remove ${k}`}
                    onClick={() => {
                      const next = { ...entity.attributes };
                      delete next[k];
                      onUpdate(entity.id, { attributes: next });
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
              <div style={{ ...attrRowStyle, marginTop: 6, padding: 0 }}>
                <input
                  value={newAttrKey}
                  onChange={(e) => setNewAttrKey(e.target.value)}
                  onKeyDown={(e) => e.stopPropagation()}
                  placeholder="key"
                  style={{ ...fieldStyle, flex: '0 0 84px', fontSize: 11 }}
                />
                <input
                  value={newAttrValue}
                  onChange={(e) => setNewAttrValue(e.target.value)}
                  onKeyDown={(e) => {
                    e.stopPropagation();
                    if (e.key === 'Enter') handleAddAttr();
                  }}
                  placeholder="value"
                  style={{ ...fieldStyle, fontSize: 11 }}
                />
                <span
                  className="tag add"
                  style={{ padding: '4px 9px' }}
                  onClick={handleAddAttr}
                >
                  +
                </span>
              </div>
            </div>

            {/* ---------- Danger ---------- */}
            <div className="insSec">
              <div className="insSecHead">
                <span className="eyebrow">Danger</span>
              </div>
              <button
                onClick={() => {
                  if (window.confirm(`Remove ${entity.label}?`)) {
                    onDelete(entity.id);
                  }
                }}
                style={{
                  width: '100%',
                  background: 'rgba(176, 23, 34, 0.1)',
                  border: '1px solid var(--red)',
                  color: 'var(--red)',
                  fontSize: 12.5,
                  fontWeight: 600,
                  padding: '9px',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontFamily: 'var(--sans)',
                }}
              >
                Remove from investigation
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default CasebookInspector;
