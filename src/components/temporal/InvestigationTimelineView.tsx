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
  incident: 'bg-crimson text-white',
  communication: 'bg-amber-accent/20 text-amber-accent border border-amber-accent/40',
  financial: 'bg-emerald-950 text-emerald-400 border border-emerald-800',
  forensic: 'bg-cobalt/20 text-cobalt border border-cobalt/40',
  surveillance: 'bg-noir-800 text-noir-300',
  document: 'bg-noir-800 text-noir-400 border border-noir-700',
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
    <div className="w-full h-full p-6 bg-noir-950 overflow-y-auto font-mono text-xs text-noir-200 space-y-6">
      {/* Header & Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-noir-700 pb-4">
        <div className="flex items-center gap-3">
          <Clock className="w-5 h-5 text-amber-accent" />
          <div>
            <h2 className="text-base font-bold text-noir-100 uppercase tracking-wider">
              Investigation Chronology & Temporal Network Analysis
            </h2>
            <p className="text-[11px] text-noir-400">
              Derived live from {relationships.length} relationships, {documents.length} ingested documents and{' '}
              {timelineEvents.length} committed AI events
              {incidentDate ? ` (Incident Anchor: ${new Date(incidentDate).toLocaleString()})` : ' — no incident anchor set on this case'}.
            </p>
          </div>
        </div>

        {/* Temporal Split Buttons */}
        <div className="flex items-center gap-2 bg-noir-900 p-1 rounded-lg border border-noir-700">
          <button
            onClick={() => setTemporalFilter('all')}
            className={`px-3 py-1 rounded font-bold transition-colors ${
              temporalFilter === 'all' ? 'bg-crimson text-white' : 'text-noir-400 hover:text-noir-200'
            }`}
          >
            Full Chronology ({events.length})
          </button>
          <button
            onClick={() => setTemporalFilter('before')}
            className={`px-3 py-1 rounded font-bold transition-colors ${
              temporalFilter === 'before' ? 'bg-amber-accent text-noir-950' : 'text-noir-400 hover:text-noir-200'
            }`}
          >
            Pre-Incident ({preCount})
          </button>
          <button
            onClick={() => setTemporalFilter('after')}
            className={`px-3 py-1 rounded font-bold transition-colors ${
              temporalFilter === 'after' ? 'bg-cobalt text-white' : 'text-noir-400 hover:text-noir-200'
            }`}
          >
            Post-Incident ({postCount})
          </button>
        </div>

        {/* Category Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-noir-400" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-noir-900 border border-noir-700 rounded px-2.5 py-1 text-noir-200 focus:outline-none"
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

      {/* Temporal Scrubber — network evolution at any point in time */}
      {timeBounds && (
        <div className="p-4 bg-noir-900/90 border border-noir-700 rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-bold text-noir-100 uppercase flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-crimson" /> Temporal Network Scrubber
            </span>
            <span className="text-[11px] text-noir-400">
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
            className="w-full accent-crimson cursor-pointer"
          />
          <div className="flex items-center justify-between text-[10px] text-noir-500">
            <span>{new Date(timeBounds.min).toLocaleString()}</span>
            <span>{new Date(timeBounds.max).toLocaleString()}</span>
          </div>
          {scrubState && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-1">
              <div className="p-2.5 bg-noir-950 rounded border border-noir-800">
                <div className="text-[9px] uppercase text-noir-500">Active Nodes</div>
                <div className="text-lg font-bold text-noir-100">{scrubState.activeEntityIds.length}</div>
                <div className="text-[9px] text-noir-600">of {entities.length} total</div>
              </div>
              <div className="p-2.5 bg-noir-950 rounded border border-noir-800">
                <div className="text-[9px] uppercase text-noir-500">Active Edges</div>
                <div className="text-lg font-bold text-noir-100">{scrubState.activeRelationshipIds.length}</div>
                <div className="text-[9px] text-noir-600">of {relationships.length} total</div>
              </div>
              <div className="p-2.5 bg-noir-950 rounded border border-noir-800">
                <div className="text-[9px] uppercase text-noir-500">Dominant Hub</div>
                <div className="text-sm font-bold text-amber-accent truncate">{scrubState.dominantHubLabel || '—'}</div>
                <div className="text-[9px] text-noir-600">{scrubState.dominantHubDegree} connections</div>
              </div>
              <div className="p-2.5 bg-noir-950 rounded border border-noir-800">
                <div className="text-[9px] uppercase text-noir-500">Graph Density Signal</div>
                <div className="text-lg font-bold text-noir-100">
                  {entities.length > 1
                    ? ((2 * scrubState.activeRelationshipIds.length) / (scrubState.activeEntityIds.length * (scrubState.activeEntityIds.length - 1) || 1)).toFixed(2)
                    : '0.00'}
                </div>
                <div className="text-[9px] text-noir-600">edges / possible pairs</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Before / After Comparison Summary Cards — computed from the filtered graph */}
      {comparison && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono">
          <div className="p-4 bg-noir-900/90 border border-amber-accent/30 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-amber-accent flex items-center gap-1.5 uppercase">
                <Calendar className="w-4 h-4" /> PHASE 1: PRE-INCIDENT NETWORK
              </span>
              <span className="text-[10px] text-noir-400">90 days before anchor</span>
            </div>
            <p className="text-noir-300 text-[11px] leading-relaxed">
              {comparison.before.relationshipCount} evidential link(s) recorded across{' '}
              {comparison.before.entityCount} active entities in the preparation window.
            </p>
            <div className="text-[10px] text-amber-accent font-bold">
              Key Hub:{' '}
              <span className="text-noir-100">
                {comparison.before.dominantHubLabel
                  ? `${comparison.before.dominantHubLabel} (${comparison.before.dominantHubDegree} links)`
                  : 'None emerged yet'}
              </span>
            </div>
            <div className="text-[10px] text-noir-400">
              Dominant activity: {comparison.before.topCategories.map((c) => `${c.category} ×${c.count}`).join(' · ') || '—'}
            </div>
          </div>

          <div className="p-4 bg-noir-900/90 border border-cobalt/40 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-cobalt flex items-center gap-1.5 uppercase">
                <Calendar className="w-4 h-4" /> PHASE 2: POST-INCIDENT NETWORK
              </span>
              <span className="text-[10px] text-noir-400">90 days after anchor</span>
            </div>
            <p className="text-noir-300 text-[11px] leading-relaxed">
              {comparison.after.relationshipCount} evidential link(s) recorded across{' '}
              {comparison.after.entityCount} active entities in the breach & liquidation window.
            </p>
            <div className="text-[10px] text-cobalt font-bold">
              Key Hub:{' '}
              <span className="text-noir-100">
                {comparison.after.dominantHubLabel
                  ? `${comparison.after.dominantHubLabel} (${comparison.after.dominantHubDegree} links)`
                  : 'None recorded'}
              </span>
            </div>
            <div className="text-[10px] text-noir-400">
              Dominant activity: {comparison.after.topCategories.map((c) => `${c.category} ×${c.count}`).join(' · ') || '—'}
            </div>
          </div>
        </div>
      )}

      {/* Chronological Timeline Stream */}
      {filteredEvents.length === 0 ? (
        <div className="py-16 text-center text-noir-400 space-y-2">
          <Clock className="w-10 h-10 mx-auto text-noir-600" />
          <p className="font-bold text-noir-200">No chronology events match the current filters.</p>
          <p className="text-[11px]">
            Events derive from relationship timestamps (validFrom / provenance), ingested documents and the case
            incident anchor. Ingest evidence or set relationship dates to populate the chronology.
          </p>
        </div>
      ) : (
        <div className="relative pl-6 border-l-2 border-noir-800 space-y-6">
          {filteredEvents.map((ev) => {
            const isAnchor = ev.source === 'incident_anchor';
            const isPost = incidentTime !== null && new Date(ev.timestamp).getTime() > incidentTime;
            const isFuture = scrubTime ? new Date(ev.timestamp).getTime() > new Date(scrubTime).getTime() : false;
            return (
              <div key={ev.id} className={`relative group transition-opacity ${isFuture ? 'opacity-40' : ''}`}>
                {/* Timeline Bullet Node */}
                <div
                  className={`absolute -left-[31px] top-1.5 w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                    isAnchor
                      ? 'bg-crimson border-white ring-4 ring-crimson/30 animate-pulse'
                      : isPost
                      ? 'bg-cobalt border-noir-950'
                      : 'bg-amber-accent border-noir-950'
                  }`}
                />

                <div
                  className={`p-4 rounded-xl border transition-all ${
                    isAnchor
                      ? 'bg-crimson/15 border-crimson/50 shadow-lg shadow-crimson/10'
                      : 'bg-noir-900/80 border-noir-700 hover:border-noir-600'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${CATEGORY_STYLES[ev.category] || CATEGORY_STYLES.surveillance}`}>
                        {ev.category}
                      </span>
                      <h3 className="font-bold text-sm text-noir-100">{ev.title}</h3>
                      {ev.source === 'ai_extraction' && (
                        <span className="px-1.5 py-0.5 bg-amber-accent/15 border border-amber-accent/30 text-amber-accent rounded text-[9px] font-bold">
                          AI-EXTRACTED
                        </span>
                      )}
                    </div>

                    <span className="text-[11px] text-noir-400 flex items-center gap-1 font-mono">
                      <Clock className="w-3.5 h-3.5" />
                      {new Date(ev.timestamp).toLocaleString()}
                    </span>
                  </div>

                  <p className="text-noir-300 text-[11px] mt-2 leading-relaxed">{ev.description}</p>

                  {/* Involved Entities Pills */}
                  {ev.involvedEntityIds.length > 0 && (
                    <div className="flex items-center gap-2 mt-3 pt-2 border-t border-noir-800">
                      <span className="text-[10px] text-noir-500 uppercase">Involved Entities:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {ev.involvedEntityIds.map((id) => {
                          const ent = entities.find((e) => e.id === id);
                          return (
                            <button
                              key={id}
                              onClick={() => onSelectEntity(id)}
                              className="px-2 py-0.5 bg-noir-800 hover:bg-noir-700 text-noir-200 hover:text-white rounded text-[10px] transition-colors"
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
