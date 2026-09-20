'use client';

import React, { useState, useMemo } from 'react';
import { Clock, Calendar, Filter, Activity } from 'lucide-react';
import {
  InvestigationCase,
  InvestigationEntity,
  InvestigationRelationship,
  IngestedDocument,
  InvestigationTimelineEvent,
} from '@/lib/types/investigation';
import { buildTimeline, networkStateAtTime, beforeAfterStats } from '@/lib/temporal/timeline';

interface TimelineViewProps {
  activeCase: InvestigationCase | null;
  entities: InvestigationEntity[];
  relationships: InvestigationRelationship[];
  documents: IngestedDocument[];
  timelineEvents: InvestigationTimelineEvent[];
  onSelectEntity: (id: string) => void;
}

const CATEGORY_STYLES: Record<string, string> = {
  incident: 'cb-badge cb-badge-red',
  communication: 'cb-badge cb-badge-amber',
  financial: 'cb-badge cb-badge-green',
  forensic: 'cb-badge cb-badge-cobalt',
  surveillance: 'cb-badge',
  document: 'cb-badge',
};

export const InvestigationTimelineView: React.FC<TimelineViewProps> = ({
  activeCase,
  entities,
  relationships,
  documents,
  timelineEvents,
  onSelectEntity,
}) => {
  const incidentDate = activeCase?.incidentDate;

  const [temporalFilter, setTemporalFilter] = useState<'all' | 'before' | 'after'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [scrubRatio, setScrubRatio] = useState<number>(1); // 0..1 across the chronology

  // The real chronology, derived from case records — never hardcoded demo content.
  const events = useMemo(
    () => buildTimeline(activeCase, entities, relationships, documents, timelineEvents),
    [activeCase, entities, relationships, documents, timelineEvents]
  );

  const incidentTime = incidentDate ? new Date(incidentDate).getTime() : null;

  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      const evTime = new Date(ev.timestamp).getTime();
      if (incidentTime !== null) {
        if (temporalFilter === 'before' && evTime > incidentTime) return false;
        if (temporalFilter === 'after' && evTime <= incidentTime) return false;
      }
      if (selectedCategory !== 'all' && ev.category !== selectedCategory) return false;
      return true;
    });
  }, [events, temporalFilter, selectedCategory, incidentTime]);

  const preCount = incidentTime !== null ? events.filter((e) => new Date(e.timestamp).getTime() <= incidentTime).length : 0;
  const postCount = incidentTime !== null ? events.filter((e) => new Date(e.timestamp).getTime() > incidentTime).length : 0;

  // ---- Temporal scrubber: network state as-of the scrub position ----
  const timeBounds = useMemo(() => {
    if (events.length === 0) return null;
    const times = events.map((ev) => new Date(ev.timestamp).getTime());
    return { min: Math.min(...times), max: Math.max(...times) };
  }, [events]);

  const scrubTime = useMemo(() => {
    if (!timeBounds) return null;
    const t = timeBounds.min + (timeBounds.max - timeBounds.min) * scrubRatio;
    return new Date(t).toISOString();
  }, [timeBounds, scrubRatio]);

  const scrubState = useMemo(
    () => (scrubTime ? networkStateAtTime(scrubTime, entities, relationships) : null),
    [scrubTime, entities, relationships]
  );

  const comparison = useMemo(
    () => beforeAfterStats(incidentDate, events, entities, relationships),
    [incidentDate, events, entities, relationships]
  );

  const scrubChange = (ratio: number) => {
    setScrubRatio(ratio);
    // Jumping the scrubber contextualizes the full chronology
    setTemporalFilter('all');
  };

  return (
    <div className="cb-workspace tl-view w-full h-full overflow-y-auto cb-scroll text-[11px] text-noir-200 flex flex-col gap-5">
      {/* Scoped finish: spacing + the instrument-rail scrubber (margin/padding
          utilities are reset inside .cb-scope, so spacing lives here). */}
      <style>{`
        .tl-view .cb-workspace-head{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:16px;padding:14px 16px;font-family:var(--mono);}
        .tl-view .cb-select{width:auto;padding:5px 26px 5px 9px;font-family:var(--mono);font-size:11px;}
        .tl-view .tl-pad{padding:14px 16px;}
        .tl-view .tl-metric-pad{padding:10px 12px;}
        .tl-view .tl-scrub{-webkit-appearance:none;appearance:none;width:100%;height:4px;border-radius:2px;background:#2a2522;outline:none;cursor:pointer;}
        .tl-view .tl-scrub::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:14px;height:14px;border-radius:50%;background:#e13c32;border:2px solid #0c0a09;box-shadow:0 0 0 1px #8c2620,0 0 10px rgba(225,60,50,0.4);cursor:pointer;}
        .tl-view .tl-scrub::-moz-range-thumb{width:12px;height:12px;border-radius:50%;background:#e13c32;border:2px solid #0c0a09;box-shadow:0 0 0 1px #8c2620;cursor:pointer;}
        .tl-view .cb-tab.tl-before.active{background:rgba(217,165,32,0.14);border-color:#6e5518;color:#e8c160;}
        .tl-view .cb-tab.tl-after.active{background:rgba(47,95,158,0.18);border-color:#2f5f9e;color:#7fa6d8;}
        .tl-view .tl-foot{display:flex;align-items:center;gap:8px;margin-top:10px;padding-top:8px;border-top:1px solid var(--line);}
      `}</style>

      {/* Header & Controls Bar */}
      <div className="cb-workspace-head">
        <div className="flex items-center gap-3">
          <Clock className="w-5 h-5 text-amber-accent" />
          <div>
            <h2 className="text-sm font-bold text-noir-100 uppercase tracking-wider">
              Investigation Chronology & Temporal Network Analysis
            </h2>
            <p className="text-[11px] cb-dim">
              Derived live from {relationships.length} relationships, {documents.length} ingested documents and{' '}
              {timelineEvents.length} committed AI events
              {incidentDate ? ` (Incident Anchor: ${new Date(incidentDate).toLocaleString()})` : ' — no incident anchor set on this case'}.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Temporal Split Tabs */}
          <div className="cb-tabs">
            <button
              onClick={() => setTemporalFilter('all')}
              className={`cb-tab ${temporalFilter === 'all' ? 'active' : ''}`}
            >
              Full Chronology ({events.length})
            </button>
            <button
              onClick={() => setTemporalFilter('before')}
              className={`cb-tab tl-before ${temporalFilter === 'before' ? 'active' : ''}`}
            >
              Pre-Incident ({preCount})
            </button>
            <button
              onClick={() => setTemporalFilter('after')}
              className={`cb-tab tl-after ${temporalFilter === 'after' ? 'active' : ''}`}
            >
              Post-Incident ({postCount})
            </button>
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 cb-faint" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="cb-select"
            >
              <option value="all">All Event Categories</option>
              <option value="incident">Crime Incidents</option>
              <option value="communication">Communications</option>
              <option value="financial">Financial Transfers</option>
              <option value="surveillance">Surveillance & Movement</option>
              <option value="forensic">Forensic Recoveries</option>
              <option value="document">Document Ingestion</option>
            </select>
          </div>
        </div>
      </div>

      {/* Temporal Scrubber — network evolution at any point in time */}
      {timeBounds && (
        <div className="cb-card tl-pad flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="cb-eyebrow flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-crimson" /> Temporal Network Scrubber
            </span>
            <span className="text-[11px] cb-dim cb-mono">
              As of <strong className="text-noir-100">{scrubTime ? new Date(scrubTime).toLocaleString() : '—'}</strong>
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.001}
            value={scrubRatio}
            onChange={(e) => scrubChange(parseFloat(e.target.value))}
            className="tl-scrub"
          />
          <div className="flex items-center justify-between text-[10px] cb-faint cb-mono">
            <span>{new Date(timeBounds.min).toLocaleString()}</span>
            <span>{new Date(timeBounds.max).toLocaleString()}</span>
          </div>
          {scrubState && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="cb-metric tl-metric-pad">
                <div className="cb-eyebrow">Active Nodes</div>
                <div className="text-lg font-bold text-noir-100 cb-mono">{scrubState.activeEntityIds.length}</div>
                <div className="text-[9px] cb-faint">of {entities.length} total</div>
              </div>
              <div className="cb-metric tl-metric-pad">
                <div className="cb-eyebrow">Active Edges</div>
                <div className="text-lg font-bold text-noir-100 cb-mono">{scrubState.activeRelationshipIds.length}</div>
                <div className="text-[9px] cb-faint">of {relationships.length} total</div>
              </div>
              <div className="cb-metric tl-metric-pad">
                <div className="cb-eyebrow">Dominant Hub</div>
                <div className="text-sm font-bold text-amber-accent truncate">{scrubState.dominantHubLabel || '—'}</div>
                <div className="text-[9px] cb-faint">{scrubState.dominantHubDegree} connections</div>
              </div>
              <div className="cb-metric tl-metric-pad">
                <div className="cb-eyebrow">Graph Density Signal</div>
                <div className="text-lg font-bold text-noir-100 cb-mono">
                  {entities.length > 1
                    ? ((2 * scrubState.activeRelationshipIds.length) / (scrubState.activeEntityIds.length * (scrubState.activeEntityIds.length - 1) || 1)).toFixed(2)
                    : '0.00'}
                </div>
                <div className="text-[9px] cb-faint">edges / possible pairs</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Before / After Comparison Summary Cards — computed from the filtered graph */}
      {comparison && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="cb-card tl-pad flex flex-col gap-2" style={{ borderColor: 'rgba(217,165,32,0.45)' }}>
            <div className="flex items-center justify-between">
              <span className="cb-eyebrow cb-amber flex items-center gap-1.5">
                <Calendar className="w-4 h-4" /> Phase 1: Pre-Incident Network
              </span>
              <span className="cb-badge cb-badge-amber">90 days before anchor</span>
            </div>
            <p className="text-noir-300 text-[11px] leading-relaxed">
              {comparison.before.relationshipCount} evidential link(s) recorded across{' '}
              {comparison.before.entityCount} active entities in the preparation window.
            </p>
            <div className="text-[10px] cb-amber font-bold cb-mono">
              Key Hub:{' '}
              <span className="text-noir-100">
                {comparison.before.dominantHubLabel
                  ? `${comparison.before.dominantHubLabel} (${comparison.before.dominantHubDegree} links)`
                  : 'None emerged yet'}
              </span>
            </div>
            <div className="text-[10px] cb-dim cb-mono">
              Dominant activity: {comparison.before.topCategories.map((c) => `${c.category} ×${c.count}`).join(' · ') || '—'}
            </div>
          </div>

          <div className="cb-card tl-pad flex flex-col gap-2" style={{ borderColor: 'rgba(47,95,158,0.55)' }}>
            <div className="flex items-center justify-between">
              <span className="cb-eyebrow cb-cobalt flex items-center gap-1.5">
                <Calendar className="w-4 h-4" /> Phase 2: Post-Incident Network
              </span>
              <span className="cb-badge cb-badge-cobalt">90 days after anchor</span>
            </div>
            <p className="text-noir-300 text-[11px] leading-relaxed">
              {comparison.after.relationshipCount} evidential link(s) recorded across{' '}
              {comparison.after.entityCount} active entities in the breach & liquidation window.
            </p>
            <div className="text-[10px] cb-cobalt font-bold cb-mono">
              Key Hub:{' '}
              <span className="text-noir-100">
                {comparison.after.dominantHubLabel
                  ? `${comparison.after.dominantHubLabel} (${comparison.after.dominantHubDegree} links)`
                  : 'None recorded'}
              </span>
            </div>
            <div className="text-[10px] cb-dim cb-mono">
              Dominant activity: {comparison.after.topCategories.map((c) => `${c.category} ×${c.count}`).join(' · ') || '—'}
            </div>
          </div>
        </div>
      )}

      {/* Chronological Timeline Stream */}
      {filteredEvents.length === 0 ? (
        <div className="cb-empty">
          <div className="cb-empty-icon">
            <Clock className="w-5 h-5" />
          </div>
          <p className="font-bold text-noir-200">No chronology events match the current filters.</p>
          <p className="text-[11px] cb-dim max-w-lg">
            Events derive from relationship timestamps (validFrom / provenance), ingested documents and the case
            incident anchor. Ingest evidence or set relationship dates to populate the chronology.
          </p>
        </div>
      ) : (
        <div className="relative border-l-2 border-noir-700 flex flex-col gap-5" style={{ paddingLeft: 24 }}>
          {filteredEvents.map((ev) => {
            const isAnchor = ev.source === 'incident_anchor';
            const isPost = incidentTime !== null && new Date(ev.timestamp).getTime() > incidentTime;
            const isFuture = scrubTime ? new Date(ev.timestamp).getTime() > new Date(scrubTime).getTime() : false;
            return (
              <div key={ev.id} className={`relative group transition-opacity ${isFuture ? 'opacity-40' : ''}`}>
                {/* Timeline Bullet Node */}
                <div
                  className={`absolute -left-[31px] top-1.5 w-4 h-4 rounded-full border-2 ${
                    isAnchor
                      ? 'bg-crimson border-noir-100 ring-4 ring-crimson/30 animate-pulse'
                      : isPost
                      ? 'bg-cobalt border-noir-950'
                      : 'bg-amber-accent border-noir-950'
                  }`}
                />

                <div
                  className="cb-card tl-pad transition-colors"
                  style={
                    isAnchor
                      ? {
                          borderColor: 'rgba(225,60,50,0.55)',
                          background: 'linear-gradient(145deg, rgba(58,20,16,0.9), rgba(20,12,10,0.92))',
                          boxShadow: '0 8px 28px rgba(225,60,50,0.10)',
                        }
                      : undefined
                  }
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={CATEGORY_STYLES[ev.category] || CATEGORY_STYLES.surveillance}>
                        {ev.category}
                      </span>
                      <h3 className="font-bold text-sm text-noir-100">{ev.title}</h3>
                      {ev.source === 'ai_extraction' && (
                        <span className="cb-badge cb-badge-amber">AI-Extracted</span>
                      )}
                    </div>

                    <span className="text-[11px] cb-dim cb-mono flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {new Date(ev.timestamp).toLocaleString()}
                    </span>
                  </div>

                  <p className="text-noir-300 text-[11px] leading-relaxed" style={{ marginTop: 8 }}>{ev.description}</p>

                  {/* Involved Entities Pills */}
                  {ev.involvedEntityIds.length > 0 && (
                    <div className="tl-foot">
                      <span className="cb-eyebrow">Involved:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {ev.involvedEntityIds.map((id) => {
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
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
