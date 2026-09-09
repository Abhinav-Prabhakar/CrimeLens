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
    <div className="w-full h-full p-6 bg-noir-950 overflow-y-auto font-mono text-xs text-noir-200 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-noir-700 pb-3">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-crimson" />
          <h2 className="text-base font-bold text-noir-100 uppercase tracking-wider">
            Suspicious Pattern & Behavioral Anomaly Detection
          </h2>
        </div>
        <span className="px-3 py-1 bg-crimson/20 border border-crimson/40 text-crimson font-bold rounded">
          {anomalies.length} ALERTS FLAGGED
        </span>
      </div>

      <p className="text-noir-400 text-[11px]">
        Rule & topological heuristics identifying rapid financial hopping, communication surges, geographic
        anomalies, and covert intermediaries.
        {activeCase?.incidentDate
          ? ` Windows anchored to incident ${new Date(activeCase.incidentDate).toLocaleString()}.`
          : ' WARNING: no incident anchor on this case — temporal correlation unavailable, severities downgraded.'}
      </p>

      {/* Anomaly Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {anomalies.map((anom) => (
          <div
            key={anom.id}
            className="p-4 bg-noir-900 border border-noir-700 rounded-xl space-y-3 hover:border-noir-600 transition-colors"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 font-bold text-sm text-noir-100">
                {anom.type === 'rapid_financial_hop' && <DollarSign className="w-4 h-4 text-emerald-400" />}
                {anom.type === 'communication_burst' && <PhoneCall className="w-4 h-4 text-amber-accent" />}
                {anom.type === 'geographic_anomaly' && <MapPin className="w-4 h-4 text-crimson" />}
                {anom.type === 'shell_structure' && <Zap className="w-4 h-4 text-cobalt" />}
                <span>{anom.title}</span>
              </div>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                  anom.severity === 'critical'
                    ? 'bg-crimson text-white'
                    : anom.severity === 'high'
                    ? 'bg-crimson/20 text-crimson border border-crimson/40'
                    : 'bg-amber-accent/20 text-amber-accent'
                }`}
              >
                {anom.severity}
              </span>
            </div>

            <p className="text-noir-300 text-[11px] leading-relaxed">{anom.description}</p>

            {/* Lead Recommendation */}
            <div className="p-2.5 bg-noir-950 rounded border border-noir-800 text-[11px] space-y-1">
              <span className="font-bold text-amber-accent">RECOMMENDED INVESTIGATIVE ACTION:</span>
              <p className="text-noir-300">{anom.investigativeLead}</p>
            </div>

            {/* Involved Entities */}
            <div className="flex items-center justify-between text-[10px] pt-1 border-t border-noir-800">
              <span className="text-noir-400">
                Confidence: <strong>{(anom.confidence * 100).toFixed(0)}%</strong>
              </span>
              <div className="flex gap-1.5">
                {anom.involvedEntityIds.slice(0, 3).map((id) => {
                  const ent = entities.find((e) => e.id === id);
                  return (
                    <button
                      key={id}
                      onClick={() => onSelectEntity(id)}
                      className="px-2 py-0.5 bg-noir-800 hover:bg-noir-700 text-noir-300 hover:text-noir-100 rounded text-[10px]"
                    >
                      {ent?.label || id}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
