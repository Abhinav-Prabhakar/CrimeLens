'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Crosshair, Radar } from 'lucide-react';
import {
  AnomalyPattern,
  InvestigationCase,
  InvestigationEntity,
  InvestigationRelationship,
} from '@/lib/types/investigation';
import { detectSuspiciousPatterns } from '@/lib/patterns/anomalyDetectors';
import {
  AnomalyScope,
  AS_SEVERITY,
  AS_SEVERITY_ORDER,
  asCallsign,
  asTypeMeta,
} from './AnomalyScope';

interface AnomalyPanelProps {
  activeCase: InvestigationCase | null;
  entities: InvestigationEntity[];
  relationships: InvestigationRelationship[];
  onSelectEntity: (id: string) => void;
}

/** Radial arc gauge for confidence %. */
const ConfGauge: React.FC<{ value: number; color: string }> = ({ value, color }) => {
  const r = 19;
  const circ = 2 * Math.PI * r;
  const pct = Math.round(value * 100);
  return (
    <div className="as-gauge" title={`Confidence ${pct}%`}>
      <svg width="54" height="54" viewBox="0 0 54 54">
        <circle cx="27" cy="27" r={r} fill="none" stroke="#241f1c" strokeWidth="4.5" />
        <circle
          cx="27"
          cy="27"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="4.5"
          strokeLinecap="round"
          strokeDasharray={`${(circ * pct) / 100} ${circ}`}
          transform="rotate(-90 27 27)"
        />
        <text
          x="27"
          y="28"
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="10.5"
          fill="#f0ede8"
          fontFamily="var(--mono)"
          fontWeight="700"
        >
          {pct}%
        </text>
      </svg>
      <span className="cb-eyebrow" style={{ fontSize: 8 }}>
        CONFIDENCE
      </span>
    </div>
  );
};

export const AnomalyPanel: React.FC<AnomalyPanelProps> = ({
  activeCase,
  entities,
  relationships,
  onSelectEntity,
}) => {
  const anomalies = useMemo(
    () => detectSuspiciousPatterns(entities, relationships, activeCase?.incidentDate),
    [entities, relationships, activeCase]
  );

  // Shared scope <-> dossier targeting state: a blip lock highlights + scrolls
  // its card; hovering a card lights its blip.
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const cardRefs = useRef<Map<string, HTMLElement>>(new Map());

  useEffect(() => {
    if (!selectedId) return;
    cardRefs.current.get(selectedId)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [selectedId]);

  const sevCounts = useMemo(() => {
    const m: Record<AnomalyPattern['severity'], number> = { critical: 0, high: 0, medium: 0, low: 0 };
    anomalies.forEach((a) => m[a.severity]++);
    return m;
  }, [anomalies]);

  return (
    <div className="cb-workspace as-view w-full h-full overflow-y-auto cb-scroll text-[11px] text-noir-200 flex flex-col gap-5">
      {/* Scoped finish: spacing lives here because margin/padding utilities
          are reset inside .cb-scope. */}
      <style>{`
        .as-view .cb-workspace-head{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:16px;padding:14px 16px;font-family:var(--mono);}
        .as-view .as-head-icon{width:40px;height:40px;flex:none;border:1px solid #4a3b34;border-radius:7px;
          background:linear-gradient(180deg,#2a1712,#1c100d);display:flex;align-items:center;justify-content:center;
          box-shadow:0 0 18px rgba(225,60,50,0.12);}
        .as-view .as-head-right{display:flex;align-items:center;gap:18px;flex-wrap:wrap;}
        .as-view .as-count-wrap{display:flex;align-items:center;gap:9px;}
        .as-view .as-count-dot{width:9px;height:9px;border-radius:50%;background:#e13c32;
          box-shadow:0 0 10px rgba(225,60,50,0.7);animation:as-dot 1.7s ease-in-out infinite;}
        @keyframes as-dot{0%,100%{opacity:1;transform:scale(1);}50%{opacity:.35;transform:scale(.8);}}
        .as-view .as-count{font-size:26px;font-weight:800;color:#f0ede8;line-height:1;font-family:var(--mono);}
        .as-view .as-seg-wrap{display:flex;flex-direction:column;gap:4px;}
        .as-view .as-seg{display:flex;width:168px;height:8px;border-radius:3px;overflow:hidden;
          background:#1a1614;border:1px solid #2a2522;}
        .as-view .as-seg i{display:block;height:100%;}
        .as-view .as-seg-labels{font-size:8px;letter-spacing:.1em;color:var(--faint);}
        .as-view .as-grid{display:flex;flex-direction:column;gap:18px;}
        @media (min-width:1220px){
          .as-view .as-grid{flex-direction:row;align-items:flex-start;}
          .as-view .as-left{flex:0 0 524px;}
          .as-view .as-right{flex:1;min-width:0;}
        }
        .as-view .as-pad{padding:14px 16px;}
        .as-view .as-cards{display:grid;grid-template-columns:1fr;gap:14px;align-content:start;}
        @media (min-width:1760px){.as-view .as-cards{grid-template-columns:1fr 1fr;}}
        .as-view .as-card{position:relative;padding:13px 14px;display:flex;flex-direction:column;gap:11px;
          cursor:pointer;transition:border-color .15s ease, box-shadow .15s ease;}
        .as-view .as-card:hover{border-color:#4a3b34;}
        .as-view .as-card.as-sel{box-shadow:0 0 0 1px rgba(225,60,50,0.22),0 10px 30px rgba(0,0,0,0.3);}
        .as-view .as-card.as-sel::before{content:"";position:absolute;left:-1px;top:-1px;bottom:-1px;width:3px;
          background:linear-gradient(180deg,#e13c32,#8c2620);border-radius:3px 0 0 3px;}
        .as-view .as-diamond{width:38px;height:38px;flex:none;border:1px solid;border-radius:6px;
          transform:rotate(45deg);display:flex;align-items:center;justify-content:center;background:#100e0c;}
        .as-view .as-diamond > svg{transform:rotate(-45deg);}
        .as-view .as-callsign{font-family:var(--mono);font-size:9px;letter-spacing:.12em;color:var(--faint);
          border:1px solid var(--line);border-radius:3px;padding:1px 5px;white-space:nowrap;}
        .as-view .as-foot{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;
          padding-top:10px;border-top:1px solid var(--line);margin-top:auto;}
        .as-view .as-gauge{display:flex;flex-direction:column;align-items:center;gap:3px;flex:none;}
        .as-view .as-gauge text{font-family:var(--mono);}
        @media (prefers-reduced-motion: reduce){
          .as-view .as-count-dot{animation:none !important;}
          .as-view .as-card{transition:none;}
        }
      `}</style>

      {/* Header — workspace head with live alert count + severity distribution */}
      <div className="cb-workspace-head">
        <div className="flex items-center gap-3 min-w-0">
          <div className="as-head-icon">
            <Radar className="w-5 h-5 text-crimson" />
          </div>
          <div className="min-w-0">
            <div className="cb-eyebrow cb-red">Anomaly Scope // Threat Assessment</div>
            <h2 className="text-sm font-bold text-noir-100 uppercase tracking-wider">
              Suspicious Pattern &amp; Behavioral Anomaly Detection
            </h2>
          </div>
        </div>

        <div className="as-head-right">
          <div className="as-count-wrap">
            <span className="as-count-dot" />
            <span className="as-count">{anomalies.length}</span>
            <span className="cb-eyebrow">
              Alerts
              <br />
              Flagged
            </span>
          </div>
          <div className="as-seg-wrap" aria-hidden>
            <div className="as-seg">
              {AS_SEVERITY_ORDER.map((s) =>
                sevCounts[s] > 0 ? (
                  <i
                    key={s}
                    title={`${s}: ${sevCounts[s]}`}
                    style={{ flexGrow: sevCounts[s], background: AS_SEVERITY[s].color }}
                  />
                ) : null
              )}
            </div>
            <div className="as-seg-labels cb-mono">
              CRIT {sevCounts.critical} · HIGH {sevCounts.high} · MED {sevCounts.medium} · LOW{' '}
              {sevCounts.low}
            </div>
          </div>
        </div>
      </div>

      <p className="cb-dim text-[11px] max-w-3xl">
        Rule &amp; topological heuristics identifying rapid financial hopping, communication surges,
        geographic anomalies, and covert intermediaries. Bearing on the scope encodes category;
        range encodes severity — critical contacts converge on the incident epicenter.
        {activeCase?.incidentDate
          ? ` Windows anchored to incident ${new Date(activeCase.incidentDate).toLocaleString()}.`
          : ''}
      </p>

      {!activeCase?.incidentDate && (
        <div className="cb-alert cb-alert-amber">
          <AlertTriangle className="w-4 h-4 cb-amber flex-shrink-0" />
          <span>
            <strong>Warning:</strong> no incident anchor on this case — temporal correlation
            unavailable, severities downgraded.
          </span>
        </div>
      )}

      {anomalies.length === 0 ? (
        <div className="cb-empty">
          <div className="cb-empty-icon">
            <Radar className="w-5 h-5" />
          </div>
          <p className="font-bold text-noir-200">Scope clear — no suspicious patterns flagged.</p>
          <p className="text-[11px] cb-dim max-w-md">
            The heuristic sweep found no rapid financial hops, communication bursts, geographic
            anomalies, or covert intermediaries in the current case graph.
          </p>
        </div>
      ) : (
        <div className="as-grid">
          {/* LEFT — threat scope instrument */}
          <div className="as-left">
            <div className="cb-card as-pad flex flex-col gap-3">
              <div className="flex items-center justify-between gap-2">
                <span className="cb-eyebrow flex items-center gap-1.5">
                  <Radar className="w-3.5 h-3.5 text-crimson" /> Threat Scope — Live Sweep
                </span>
                <span className="cb-mono text-[9px] cb-faint">
                  {anomalies.length} CONTACT{anomalies.length === 1 ? '' : 'S'}
                </span>
              </div>
              <AnomalyScope
                anomalies={anomalies}
                selectedId={selectedId}
                hoveredId={hoveredId}
                onSelect={setSelectedId}
                onHover={setHoveredId}
              />
            </div>
          </div>

          {/* RIGHT — flagged lead dossiers */}
          <div className="as-right flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <span className="cb-eyebrow flex items-center gap-1.5">
                <Crosshair className="w-3.5 h-3.5 cb-amber" /> Flagged Leads
              </span>
              <span className="cb-mono text-[9px] cb-faint">CLICK A BLIP OR CARD TO LOCK TARGET</span>
            </div>

            <div className="as-cards">
              {anomalies.map((anom, i) => {
                const sev = AS_SEVERITY[anom.severity];
                const meta = asTypeMeta(anom.type);
                const TypeIcon = meta.icon;
                const isSel = selectedId === anom.id;
                return (
                  <article
                    key={anom.id}
                    ref={(el) => {
                      if (el) cardRefs.current.set(anom.id, el);
                      else cardRefs.current.delete(anom.id);
                    }}
                    className={`cb-card as-card ${isSel ? 'as-sel' : ''}`}
                    style={isSel ? { borderColor: sev.color } : undefined}
                    onClick={() => setSelectedId(anom.id)}
                    onMouseEnter={() => setHoveredId(anom.id)}
                    onMouseLeave={() => setHoveredId(null)}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="as-diamond"
                        style={{
                          borderColor: sev.color,
                          color: sev.icon,
                          boxShadow: `0 0 16px ${sev.glow}`,
                        }}
                      >
                        <TypeIcon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className="as-callsign"
                            style={isSel ? { color: sev.icon, borderColor: sev.color } : undefined}
                          >
                            {asCallsign(i)}
                          </span>
                          <h3 className="font-bold text-[12.5px] text-noir-100 leading-snug">
                            {anom.title}
                          </h3>
                        </div>
                        <div
                          className="cb-mono text-[9px] cb-faint"
                          style={{ marginTop: 3, letterSpacing: '.1em' }}
                        >
                          {meta.label}
                        </div>
                      </div>
                      <span className={sev.badge}>{anom.severity}</span>
                    </div>

                    <p className="text-noir-300 text-[11px] leading-relaxed">{anom.description}</p>

                    {/* Lead Recommendation */}
                    <div className="cb-alert cb-alert-amber">
                      <Crosshair className="w-3.5 h-3.5 cb-amber flex-shrink-0" style={{ marginTop: 2 }} />
                      <div>
                        <div className="cb-eyebrow cb-amber">Recommended Investigative Action</div>
                        <p className="text-noir-300 text-[11px]" style={{ marginTop: 4 }}>
                          {anom.investigativeLead}
                        </p>
                      </div>
                    </div>

                    {/* Involved entities + confidence gauge */}
                    <div className="as-foot">
                      <div className="flex flex-col gap-2 min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {anom.involvedEntityIds.slice(0, 3).map((id) => {
                            const ent = entities.find((e) => e.id === id);
                            return (
                              <button
                                key={id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onSelectEntity(id);
                                }}
                                className="cb-btn cb-btn-ghost cb-btn-sm"
                              >
                                {ent?.label || id}
                              </button>
                            );
                          })}
                          {anom.involvedEntityIds.length > 3 && (
                            <span className="cb-badge">+{anom.involvedEntityIds.length - 3}</span>
                          )}
                        </div>
                        {anom.involvedEntityIds.length > 0 && (
                          <div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelectEntity(anom.involvedEntityIds[0]);
                              }}
                              className="cb-btn cb-btn-sm"
                            >
                              <Crosshair className="w-3 h-3" />
                              Inspect Lead
                            </button>
                          </div>
                        )}
                      </div>
                      <ConfGauge value={anom.confidence} color={sev.color} />
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
