'use client';

import React, { useMemo } from 'react';
import { ShieldAlert, AlertTriangle, Zap, MapPin, DollarSign, PhoneCall } from 'lucide-react';
import { InvestigationCase, InvestigationEntity, InvestigationRelationship } from '@/lib/types/investigation';
import { detectSuspiciousPatterns } from '@/lib/patterns/anomalyDetectors';

interface AnomalyPanelProps {
  activeCase: InvestigationCase | null;
  entities: InvestigationEntity[];
  relationships: InvestigationRelationship[];
  onSelectEntity: (id: string) => void;
}

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

  return (
    <div className="cb-workspace an-view w-full h-full overflow-y-auto cb-scroll text-[11px] text-noir-200 flex flex-col gap-5">
      {/* Scoped finish: spacing lives here because margin/padding utilities
          are reset inside .cb-scope. */}
      <style>{`
        .an-view .cb-workspace-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 16px;font-family:var(--mono);}
        .an-view .an-pad{padding:14px 16px;}
        .an-view .an-foot{display:flex;align-items:center;justify-content:space-between;gap:8px;padding-top:8px;border-top:1px solid var(--line);}
      `}</style>

      {/* Header */}
      <div className="cb-workspace-head">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-crimson" />
          <h2 className="text-sm font-bold text-noir-100 uppercase tracking-wider">
            Suspicious Pattern & Behavioral Anomaly Detection
          </h2>
        </div>
        <span className="cb-badge cb-badge-red">{anomalies.length} Alerts Flagged</span>
      </div>

      <p className="cb-dim text-[11px] max-w-3xl">
        Rule & topological heuristics identifying rapid financial hopping, communication surges, geographic
        anomalies, and covert intermediaries.
        {activeCase?.incidentDate
          ? ` Windows anchored to incident ${new Date(activeCase.incidentDate).toLocaleString()}.`
          : ''}
      </p>

      {!activeCase?.incidentDate && (
        <div className="cb-alert cb-alert-amber">
          <AlertTriangle className="w-4 h-4 cb-amber flex-shrink-0" />
          <span>
            <strong>Warning:</strong> no incident anchor on this case — temporal correlation unavailable,
            severities downgraded.
          </span>
        </div>
      )}

      {/* Anomaly Cards Grid */}
      {anomalies.length === 0 ? (
        <div className="cb-empty">
          <div className="cb-empty-icon">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <p className="font-bold text-noir-200">No suspicious patterns flagged.</p>
          <p className="text-[11px] cb-dim max-w-md">
            The heuristic sweep found no rapid financial hops, communication bursts, geographic anomalies, or
            covert intermediaries in the current case graph.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {anomalies.map((anom) => (
            <div key={anom.id} className="cb-card an-pad flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 font-bold text-sm text-noir-100">
                  {anom.type === 'rapid_financial_hop' && <DollarSign className="w-4 h-4 text-amber-accent" />}
                  {anom.type === 'communication_burst' && <PhoneCall className="w-4 h-4 cb-cobalt" />}
                  {anom.type === 'geographic_anomaly' && <MapPin className="w-4 h-4 text-crimson" />}
                  {anom.type === 'shell_structure' && <Zap className="w-4 h-4" style={{ color: '#c9a76a' }} />}
                  <span>{anom.title}</span>
                </div>
                <span
                  className={`cb-badge ${
                    anom.severity === 'critical' || anom.severity === 'high'
                      ? 'cb-badge-red'
                      : 'cb-badge-amber'
                  }`}
                >
                  {anom.severity}
                </span>
              </div>

              <p className="text-noir-300 text-[11px] leading-relaxed">{anom.description}</p>

              {/* Lead Recommendation */}
              <div className="cb-alert cb-alert-amber">
                <div>
                  <div className="cb-eyebrow cb-amber">Recommended Investigative Action</div>
                  <p className="text-noir-300 text-[11px]" style={{ marginTop: 4 }}>
                    {anom.investigativeLead}
                  </p>
                </div>
              </div>

              {/* Confidence */}
              <div>
                <div className="flex items-center justify-between text-[10px] cb-dim cb-mono" style={{ marginBottom: 5 }}>
                  <span>Confidence</span>
                  <strong className="text-noir-100">{(anom.confidence * 100).toFixed(0)}%</strong>
                </div>
                <div className="cb-progress">
                  <span style={{ width: `${Math.round(anom.confidence * 100)}%` }} />
                </div>
              </div>

              {/* Involved Entities */}
              <div className="an-foot">
                <div className="flex flex-wrap gap-1.5">
                  {anom.involvedEntityIds.slice(0, 3).map((id) => {
                    const ent = entities.find((e) => e.id === id);
                    return (
                      <button
                        key={id}
                        onClick={() => onSelectEntity(id)}
                        className="cb-btn cb-btn-ghost cb-btn-sm"
                      >
                        {ent?.label || id}
                      </button>
                    );
                  })}
                </div>
                {anom.involvedEntityIds.length > 0 && (
                  <button
                    onClick={() => onSelectEntity(anom.involvedEntityIds[0])}
                    className="cb-btn cb-btn-sm"
                  >
                    Inspect Lead
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
