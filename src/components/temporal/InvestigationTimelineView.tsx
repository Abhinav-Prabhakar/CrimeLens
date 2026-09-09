'use client';

import React, { useState, useMemo } from 'react';
import { Clock, Calendar, ShieldAlert, ArrowRight, Filter, Split, CheckCircle2 } from 'lucide-react';
import { InvestigationEntity, InvestigationRelationship, InvestigationCase } from '@/lib/types/investigation';

interface TimelineViewProps {
  activeCase: InvestigationCase | null;
  entities: InvestigationEntity[];
  relationships: InvestigationRelationship[];
  onSelectEntity: (id: string) => void;
}

interface TimelineEvent {
  id: string;
  timestamp: string;
  title: string;
  category: 'incident' | 'communication' | 'financial' | 'forensic' | 'surveillance';
  description: string;
  isPostIncident: boolean;
  involvedEntityIds: string[];
}

export const InvestigationTimelineView: React.FC<TimelineViewProps> = ({
  activeCase,
  entities,
  relationships,
  onSelectEntity,
}) => {
  const incidentDate = activeCase?.incidentDate || '2026-09-01T21:30:00Z';
  const incidentTime = new Date(incidentDate).getTime();

  // Mode: 'all' | 'before' | 'after'
  const [temporalFilter, setTemporalFilter] = useState<'all' | 'before' | 'after'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Synthesize rich chronological events from relationships and entities
  const events: TimelineEvent[] = useMemo(() => {
    const list: TimelineEvent[] = [
      {
        id: 'ev_pre_meeting',
        timestamp: '2026-08-28T16:00:00Z',
        title: 'Julian Marlowe & Elena Rostova Meeting',
        category: 'surveillance',
        description: 'Subjects observed together at Royal Yacht Club. Initial consultation on offshore escrow setup.',
        isPostIncident: false,
        involvedEntityIds: ['ent_marlowe', 'ent_elena'],
      },
      {
        id: 'ev_burner_act',
        timestamp: '2026-08-30T10:00:00Z',
        title: 'Burner SIM Line Activated',
        category: 'communication',
        description: 'Target prepaid line (+91 98112-44120) powered on in South Bombay sector.',
        isPostIncident: false,
        involvedEntityIds: ['ent_burner', 'ent_vance'],
      },
      {
        id: 'ev_burst_calls',
        timestamp: '2026-09-01T19:45:00Z',
        title: 'Pre-Breach Communication Burst',
        category: 'communication',
        description: '14 rapid encrypted calls recorded between Marlowe, Vance, and Burner SIM.',
        isPostIncident: false,
        involvedEntityIds: ['ent_marlowe', 'ent_vance', 'ent_burner'],
      },
      {
        id: 'ev_incident_breach',
        timestamp: '2026-09-01T21:30:00Z',
        title: 'CRIME OCCURRENCE: Pier 9 Warehouse Breach',
        category: 'incident',
        description: 'Security gate breached via thermal lance. High-value antiquities extracted from vault.',
        isPostIncident: false,
        involvedEntityIds: ['ent_scene', 'ent_vance', 'ent_bag'],
      },
      {
        id: 'ev_getaway',
        timestamp: '2026-09-01T21:42:00Z',
        title: 'Red Sedan Fled Scene',
        category: 'surveillance',
        description: 'Vehicle MH-01-BX-4912 captured on southern expressway toll camera fleeing with headlights extinguished.',
        isPostIncident: true,
        involvedEntityIds: ['ent_vehicle', 'ent_vance'],
      },
      {
        id: 'ev_forensic_recovery',
        timestamp: '2026-09-02T06:15:00Z',
        title: 'Crime Scene Forensics & Fingerprint Recovery',
        category: 'forensic',
        description: 'Titanium lockpick set and latent fingerprint LP-4 recovered near breached padlock.',
        isPostIncident: true,
        involvedEntityIds: ['ent_scene', 'ent_print', 'ent_bag'],
      },
      {
        id: 'ev_wire_transfer',
        timestamp: '2026-09-03T11:20:00Z',
        title: 'Wire Transfer of $450,000 Dispatched',
        category: 'financial',
        description: 'Apex Maritime Holdings Ltd wired $450,000 USD into Elena Rostova escrow retainer.',
        isPostIncident: true,
        involvedEntityIds: ['ent_shell_co', 'ent_transaction', 'ent_elena'],
      },
    ];

    list.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    return list;
  }, []);

  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      const evTime = new Date(ev.timestamp).getTime();
      if (temporalFilter === 'before' && evTime > incidentTime) return false;
      if (temporalFilter === 'after' && evTime < incidentTime) return false;
      if (selectedCategory !== 'all' && ev.category !== selectedCategory) return false;
      return true;
    });
  }, [events, temporalFilter, selectedCategory, incidentTime]);

  const preCount = events.filter((e) => new Date(e.timestamp).getTime() <= incidentTime).length;
  const postCount = events.filter((e) => new Date(e.timestamp).getTime() > incidentTime).length;

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
              Track how relationships evolved before and after the incident (Incident Anchor: {new Date(incidentDate).toLocaleString()}).
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
            <option value="surveillance">Surveillance Observations</option>
            <option value="forensic">Forensic Recoveries</option>
          </select>
        </div>
      </div>

      {/* Before / After Comparison Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono">
        <div className="p-4 bg-noir-900/90 border border-amber-accent/30 rounded-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-amber-accent flex items-center gap-1.5 uppercase">
              <Calendar className="w-4 h-4" /> PHASE 1: PRE-INCIDENT NETWORK
            </span>
            <span className="text-[10px] text-noir-400">Preparation & Surveillance</span>
          </div>
          <p className="text-noir-300 text-[11px] leading-relaxed">
            Network centered on covert encrypted communications (14 calls) between Julian Marlowe and Daniel Vance via burner lines.
          </p>
          <div className="text-[10px] text-amber-accent font-bold">
            Key Hub: <span className="text-noir-100">Julian Marlowe (Financier)</span> • Density: Medium
          </div>
        </div>

        <div className="p-4 bg-noir-900/90 border border-cobalt/40 rounded-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-cobalt flex items-center gap-1.5 uppercase">
              <Calendar className="w-4 h-4" /> PHASE 2: POST-INCIDENT NETWORK
            </span>
            <span className="text-[10px] text-noir-400">Breach, Transit & Liquidation</span>
          </div>
          <p className="text-noir-300 text-[11px] leading-relaxed">
            Abrupt emergence of financial layering ($450,000 wire) to Elena Rostova and physical forensic traces (AFIS fingerprint match LP-4).
          </p>
          <div className="text-[10px] text-cobalt font-bold">
            Key Hub: <span className="text-noir-100">Daniel Vance (Courier) & Elena Rostova</span> • Density: High
          </div>
        </div>
      </div>

      {/* Chronological Timeline Stream */}
      <div className="relative pl-6 border-l-2 border-noir-800 space-y-6">
        {filteredEvents.map((ev) => {
          const isAnchor = ev.category === 'incident';
          return (
            <div key={ev.id} className="relative group">
              {/* Timeline Bullet Node */}
              <div
                className={`absolute -left-[31px] top-1.5 w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                  isAnchor
                    ? 'bg-crimson border-white ring-4 ring-crimson/30 animate-pulse'
                    : ev.isPostIncident
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
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        isAnchor
                          ? 'bg-crimson text-white'
                          : ev.category === 'financial'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          : ev.category === 'communication'
                          ? 'bg-amber-accent/20 text-amber-accent border border-amber-accent/40'
                          : 'bg-noir-800 text-noir-300'
                      }`}
                    >
                      {ev.category}
                    </span>
                    <h3 className="font-bold text-sm text-noir-100">{ev.title}</h3>
                  </div>

                  <span className="text-[11px] text-noir-400 flex items-center gap-1 font-mono">
                    <Clock className="w-3.5 h-3.5" />
                    {new Date(ev.timestamp).toLocaleString()}
                  </span>
                </div>

                <p className="text-noir-300 text-[11px] mt-2 leading-relaxed">{ev.description}</p>

                {/* Involved Entities Pills */}
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
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
