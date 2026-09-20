'use client';

import React, { useMemo } from 'react';
import { AlertTriangle, DollarSign, MapPin, PhoneCall, Users, Zap } from 'lucide-react';
import { AnomalyPattern } from '@/lib/types/investigation';

/* ============================================================================
   ANOMALY SCOPE — shared visual meta + the radar scope itself.
   Bearing (angle) is derived from the anomaly category; range (radius) from
   severity — critical contacts sit near the incident epicenter, low-severity
   contacts drift to the outer rings. A deterministic hash of the anomaly id
   jitters each blip so same-type contacts never stack.
   ========================================================================== */

export type AsIcon = React.ComponentType<
  React.SVGProps<SVGSVGElement> & { size?: number | string }
>;

export interface AsSeverityMeta {
  color: string;
  glow: string;
  icon: string;
  badge: string;
}

export const AS_SEVERITY: Record<AnomalyPattern['severity'], AsSeverityMeta> = {
  critical: { color: '#e13c32', glow: 'rgba(225,60,50,0.45)', icon: '#ffb3ad', badge: 'cb-badge cb-badge-red' },
  high:     { color: '#a53a2e', glow: 'rgba(165,58,46,0.38)', icon: '#ff8d84', badge: 'cb-badge cb-badge-red' },
  medium:   { color: '#d9a520', glow: 'rgba(217,165,32,0.36)', icon: '#e8c160', badge: 'cb-badge cb-badge-amber' },
  low:      { color: '#2f5f9e', glow: 'rgba(47,95,158,0.45)', icon: '#7fa6d8', badge: 'cb-badge cb-badge-cobalt' },
};

export const AS_SEVERITY_ORDER: AnomalyPattern['severity'][] = [
  'critical',
  'high',
  'medium',
  'low',
];

export interface AsTypeMeta {
  angle: number;
  icon: AsIcon;
  label: string;
}

/** Category -> scope bearing. 0deg = top of dial, clockwise. */
export const AS_TYPE: Record<AnomalyPattern['type'], AsTypeMeta> = {
  rapid_financial_hop: { angle: 0, icon: DollarSign, label: 'FINANCIAL LAYERING' },
  communication_burst: { angle: 72, icon: PhoneCall, label: 'COMMS SURGE' },
  geographic_anomaly: { angle: 144, icon: MapPin, label: 'GEO PROXIMITY' },
  new_intermediary: { angle: 216, icon: Users, label: 'COVERT INTERMEDIARY' },
  shell_structure: { angle: 288, icon: Zap, label: 'SHELL VEHICLE' },
};

const AS_TYPE_FALLBACK: AsTypeMeta = { angle: 324, icon: AlertTriangle, label: 'UNCLASSIFIED' };

export const asTypeMeta = (t: AnomalyPattern['type']): AsTypeMeta => AS_TYPE[t] ?? AS_TYPE_FALLBACK;

/** Tactical callsign cross-referenced between scope blips and lead cards. */
export const asCallsign = (index: number) => `T-${String(index + 1).padStart(2, '0')}`;

const hashStr = (s: string) => {
  let h = 7;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
};

/* Scope geometry */
const SIZE = 520;
const C = SIZE / 2;
const R_RING = 208; // outermost data ring
const R_FACE = 232; // phosphor face
const R_BEZEL = 245; // outer bezel

/** Severity -> fraction of the dial radius (critical hugs the epicenter). */
const SEV_RADIUS: Record<AnomalyPattern['severity'], number> = {
  critical: 0.2,
  high: 0.42,
  medium: 0.65,
  low: 0.87,
};

const polar = (deg: number, r: number): [number, number] => {
  const rad = (deg * Math.PI) / 180;
  return [C + r * Math.sin(rad), C - r * Math.cos(rad)];
};

interface ScopeBlip {
  a: AnomalyPattern;
  index: number;
  x: number;
  y: number;
}

interface AnomalyScopeProps {
  anomalies: AnomalyPattern[];
  selectedId: string | null;
  hoveredId: string | null;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
}

export const AnomalyScope: React.FC<AnomalyScopeProps> = ({
  anomalies,
  selectedId,
  hoveredId,
  onSelect,
  onHover,
}) => {
  const blips = useMemo<ScopeBlip[]>(
    () =>
      anomalies.map((a, index) => {
        const meta = asTypeMeta(a.type);
        const h = hashStr(a.id);
        const angle = meta.angle + ((h % 37) - 18); // +-18deg deterministic jitter
        const frac = SEV_RADIUS[a.severity] + (((h >> 4) % 13) - 6) / 100; // +-0.06 radius jitter
        const r = Math.max(36, Math.min(R_RING - 16, frac * R_RING));
        const [x, y] = polar(angle, r);
        return { a, index, x, y };
      }),
    [anomalies]
  );

  const sevCounts = useMemo(() => {
    const m: Record<AnomalyPattern['severity'], number> = { critical: 0, high: 0, medium: 0, low: 0 };
    anomalies.forEach((a) => m[a.severity]++);
    return m;
  }, [anomalies]);
  const maxSev = Math.max(1, ...AS_SEVERITY_ORDER.map((s) => sevCounts[s]));

  const presentTypes = useMemo(
    () => Array.from(new Set(anomalies.map((a) => a.type))),
    [anomalies]
  );

  const activeId = hoveredId ?? selectedId;
  const active = blips.find((b) => b.a.id === activeId) ?? null;

  return (
    <div className="as-scope-col">
      {/* Scoped finish — .cb-scope resets margin/padding utilities, so all
          spacing + instrument styling lives here. */}
      <style>{`
        .as-scope-col{display:flex;flex-direction:column;gap:12px;}
        .as-scope{position:relative;width:100%;max-width:492px;margin:0 auto;aspect-ratio:1/1;}
        .as-scope svg.as-face{display:block;width:100%;height:100%;}
        .as-scope svg.as-blips{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;}
        .as-sweep{position:absolute;inset:10.8%;border-radius:50%;overflow:hidden;pointer-events:none;mix-blend-mode:screen;
          background:conic-gradient(from -82deg, transparent 0deg, rgba(225,60,50,0.10) 50deg, rgba(225,60,50,0.42) 82deg, transparent 83deg);
          animation:as-spin 5.5s linear infinite;}
        .as-sweep-beam{position:absolute;left:50%;top:0;width:2px;height:50%;margin-left:-1px;
          background:linear-gradient(180deg, rgba(255,140,130,0.9), rgba(225,60,50,0.2) 75%, transparent);}
        @keyframes as-spin{to{transform:rotate(360deg);}}
        @keyframes as-pulse{0%,100%{opacity:.35;}50%{opacity:.1;}}
        .as-deg{fill:#5d574f;font-family:var(--mono);font-size:9px;letter-spacing:.08em;text-anchor:middle;dominant-baseline:middle;}
        .as-epi-tag{fill:#8d867c;font-family:var(--mono);font-size:7.5px;letter-spacing:.18em;text-anchor:middle;}
        .as-epi-halo{animation:as-pulse 2.4s ease-in-out infinite;}
        .as-epi-ring{transform-box:fill-box;transform-origin:center;animation:as-spin 14s linear infinite;}
        .as-blip{cursor:pointer;pointer-events:auto;outline:none;}
        .as-blip .as-core{transform-box:fill-box;transform-origin:center;transition:transform .15s ease;}
        .as-blip:hover .as-core,.as-blip.as-hot .as-core{transform:scale(1.16);}
        .as-blip .as-halo{animation:as-pulse 2.2s ease-in-out infinite;}
        .as-blip.as-hot .as-halo{opacity:.55;}
        .as-blip:focus-visible .as-core circle{stroke-width:2.4;}
        .as-blip-tag{fill:#5d574f;font-family:var(--mono);font-size:8px;letter-spacing:.1em;text-anchor:middle;}
        .as-blip.as-hot .as-blip-tag{fill:#d9d4cc;}
        .as-ret{transform-box:fill-box;transform-origin:center;animation:as-spin 9s linear infinite;}
        .as-spoke{stroke-dasharray:3 4;opacity:.55;}
        .as-readout{font-family:var(--mono);font-size:9.5px;letter-spacing:.08em;color:var(--dim);
          border:1px solid var(--line);border-radius:5px;background:#0d0b0a;padding:7px 10px;
          white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
        .as-readout b{color:var(--txt);font-weight:700;}
        .as-histo{display:flex;gap:10px;align-items:flex-end;}
        .as-histo-col{display:flex;flex:1;flex-direction:column;align-items:center;gap:3px;min-width:0;}
        .as-histo-barwrap{display:flex;align-items:flex-end;justify-content:center;width:100%;height:30px;border-bottom:1px solid #2a2522;}
        .as-histo-barwrap i{display:block;width:58%;min-height:2px;border-radius:1px 1px 0 0;}
        .as-histo-n{font-family:var(--mono);font-size:10px;font-weight:700;color:var(--txt);line-height:1;}
        .as-histo-l{font-family:var(--mono);font-size:8px;letter-spacing:.12em;color:var(--faint);text-transform:uppercase;}
        .as-typekey{display:flex;flex-wrap:wrap;gap:6px 14px;}
        .as-key{display:inline-flex;align-items:center;gap:5px;font-family:var(--mono);font-size:8.5px;
          letter-spacing:.1em;color:var(--dim);text-transform:uppercase;}
        .as-key svg{color:var(--faint);}
        @media (prefers-reduced-motion: reduce){
          .as-sweep,.as-ret,.as-epi-ring{animation:none !important;}
          .as-blip .as-halo,.as-epi-halo{animation:none !important;opacity:.3;}
          .as-blip .as-core{transition:none;}
        }
      `}</style>

      <div className="as-scope">
        {/* Static dial: bezel, face, ticks, rings, cross-hairs, degree labels */}
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="as-face" aria-hidden>
          <defs>
            <radialGradient id="asFace" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#1c1715" />
              <stop offset="62%" stopColor="#141110" />
              <stop offset="100%" stopColor="#0b0908" />
            </radialGradient>
          </defs>

          <circle cx={C} cy={C} r={R_BEZEL} fill="#0d0b0a" stroke="#2a2522" strokeWidth={1.5} />
          <circle cx={C} cy={C} r={R_FACE} fill="url(#asFace)" stroke="#3a322d" strokeWidth={1} />

          {/* tick ring — minor every 6deg, major every 30deg */}
          {Array.from({ length: 60 }, (_, k) => {
            const d = k * 6;
            const major = d % 30 === 0;
            const [x1, y1] = polar(d, major ? R_RING + 6 : R_RING + 9);
            const [x2, y2] = polar(d, R_RING + 16);
            return (
              <line
                key={d}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={major ? '#4a3b34' : '#2a2522'}
                strokeWidth={major ? 1.2 : 0.8}
              />
            );
          })}

          {/* range rings */}
          {[0.25, 0.5, 0.75, 1].map((f) => (
            <circle
              key={f}
              cx={C}
              cy={C}
              r={f * R_RING}
              fill="none"
              stroke={f === 1 ? '#3a322d' : '#2a2522'}
              strokeWidth={f === 1 ? 1.4 : 1}
              strokeDasharray={f === 1 ? undefined : '2 5'}
            />
          ))}

          {/* cross-hairs + diagonals */}
          <line x1={C - R_RING} y1={C} x2={C + R_RING} y2={C} stroke="#2a2522" strokeWidth={1} />
          <line x1={C} y1={C - R_RING} x2={C} y2={C + R_RING} stroke="#2a2522" strokeWidth={1} />
          {[45, 135].map((d) => {
            const [x1, y1] = polar(d, R_RING);
            const [x2, y2] = polar(d + 180, R_RING);
            return <line key={d} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#221d1a" strokeWidth={1} />;
          })}

          {/* degree labels every 30deg */}
          {Array.from({ length: 12 }, (_, k) => {
            const d = k * 30;
            const [x, y] = polar(d, R_RING - 19);
            return (
              <text key={d} x={x} y={y} className="as-deg">
                {String(d).padStart(3, '0')}
              </text>
            );
          })}

          {/* incident epicenter */}
          <circle cx={C} cy={C} r={11} fill="none" stroke="#8c2620" strokeWidth={1} strokeDasharray="2 3" className="as-epi-ring" />
          <circle cx={C} cy={C} r={7} fill="rgba(225,60,50,0.18)" className="as-epi-halo" />
          <circle cx={C} cy={C} r={3} fill="#e13c32" />
          <text x={C} y={C + 24} className="as-epi-tag">
            EPICENTER
          </text>
        </svg>

        {/* rotating sweep beam (CSS conic gradient; static under reduced motion) */}
        <div className="as-sweep" aria-hidden>
          <i className="as-sweep-beam" />
        </div>

        {/* blip layer — kept above the sweep so contacts stay crisp */}
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="as-blips">
          {active && (
            <line
              x1={C}
              y1={C}
              x2={active.x}
              y2={active.y}
              stroke={AS_SEVERITY[active.a.severity].color}
              strokeWidth={1}
              className="as-spoke"
            />
          )}

          {blips.map((b) => {
            const sev = AS_SEVERITY[b.a.severity];
            const meta = asTypeMeta(b.a.type);
            const Icon = meta.icon;
            const isSel = b.a.id === selectedId;
            const isHot = b.a.id === activeId;
            return (
              <g
                key={b.a.id}
                transform={`translate(${b.x} ${b.y})`}
                className={`as-blip ${isHot ? 'as-hot' : ''}`}
                role="button"
                tabIndex={0}
                aria-label={`${asCallsign(b.index)} ${b.a.title}`}
                onClick={() => onSelect(b.a.id)}
                onMouseEnter={() => onHover(b.a.id)}
                onMouseLeave={() => onHover(null)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelect(b.a.id);
                  }
                }}
              >
                <circle r={isSel ? 18 : 15} fill={sev.color} className="as-halo" opacity={0.3} />
                <g className="as-core">
                  <circle r={isSel ? 11 : 9.5} fill="#100e0c" stroke={sev.color} strokeWidth={isSel ? 1.8 : 1.3} />
                  <g transform="translate(-5 -5)">
                    <Icon size={10} color={sev.icon} strokeWidth={2.2} />
                  </g>
                </g>
                {isSel && (
                  <g className="as-ret">
                    <circle r={20} fill="none" stroke={sev.color} strokeWidth={1} strokeDasharray="5 6" />
                    {[0, 90, 180, 270].map((d) => {
                      const rad = (d * Math.PI) / 180;
                      return (
                        <line
                          key={d}
                          x1={Math.sin(rad) * 25}
                          y1={-Math.cos(rad) * 25}
                          x2={Math.sin(rad) * 29}
                          y2={-Math.cos(rad) * 29}
                          stroke={sev.color}
                          strokeWidth={1.6}
                        />
                      );
                    })}
                  </g>
                )}
                <text y={-17} className="as-blip-tag" style={isHot ? { fill: sev.icon } : undefined}>
                  {asCallsign(b.index)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* targeting readout */}
      <div className="as-readout">
        {active ? (
          <>
            LOCK <b>{asCallsign(active.index)}</b> · {active.a.title} —{' '}
            <b style={{ color: AS_SEVERITY[active.a.severity].icon }}>
              {active.a.severity.toUpperCase()} / {(active.a.confidence * 100).toFixed(0)}%
            </b>
          </>
        ) : (
          <>SWEEP ACTIVE — {anomalies.length} CONTACT{anomalies.length === 1 ? '' : 'S'} · NO TARGET LOCKED</>
        )}
      </div>

      {/* severity histogram strip */}
      <div className="as-histo" aria-hidden>
        {AS_SEVERITY_ORDER.map((s) => (
          <div key={s} className="as-histo-col">
            <span className="as-histo-n">{sevCounts[s]}</span>
            <div className="as-histo-barwrap">
              <i
                style={{
                  height: `${Math.max(6, (sevCounts[s] / maxSev) * 100)}%`,
                  background: AS_SEVERITY[s].color,
                  boxShadow: `0 0 8px ${AS_SEVERITY[s].glow}`,
                  opacity: sevCounts[s] === 0 ? 0.18 : 1,
                }}
              />
            </div>
            <span className="as-histo-l">{s === 'critical' ? 'crit' : s === 'medium' ? 'med' : s}</span>
          </div>
        ))}
      </div>

      {/* category bearing key */}
      <div className="as-typekey">
        {presentTypes.map((t) => {
          const m = asTypeMeta(t);
          const KIcon = m.icon;
          return (
            <span key={t} className="as-key">
              <KIcon size={11} />
              {m.label}
            </span>
          );
        })}
      </div>
    </div>
  );
};
