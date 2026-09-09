'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { X, History, User, Clock, Filter } from 'lucide-react';
import { AuditLogEntry } from '@/lib/types/investigation';
import { getAuditLogs } from '@/lib/storage/db';

interface AuditLogModalProps {
  isOpen: boolean;
  caseId: string;
  onClose: () => void;
}

const SEVERITY_STYLES: Record<string, string> = {
  case_created: 'bg-emerald-950 text-emerald-400 border border-emerald-800',
  case_updated: 'bg-noir-850 text-noir-300 border border-noir-700',
  case_deleted: 'bg-crimson/20 text-crimson border border-crimson/40',
  entity_created: 'bg-cobalt/20 text-cobalt border border-cobalt/40',
  entity_updated: 'bg-noir-850 text-noir-300 border border-noir-700',
  entity_deleted: 'bg-crimson/20 text-crimson border border-crimson/40',
  entities_merged: 'bg-amber-accent/15 text-amber-accent border border-amber-accent/35',
  relationship_created: 'bg-cobalt/20 text-cobalt border border-cobalt/40',
  relationship_confirmed: 'bg-emerald-950 text-emerald-400 border border-emerald-800',
  relationship_deleted: 'bg-crimson/20 text-crimson border border-crimson/40',
  document_ingested: 'bg-cobalt/20 text-cobalt border border-cobalt/40',
  ai_extraction_approved: 'bg-amber-accent/15 text-amber-accent border border-amber-accent/35',
  report_generated: 'bg-noir-850 text-noir-300 border border-noir-700',
  link_prediction_confirmed: 'bg-amber-accent/15 text-amber-accent border border-amber-accent/35',
  bundle_exported: 'bg-noir-850 text-noir-300 border border-noir-700',
  bundle_imported: 'bg-emerald-950 text-emerald-400 border border-emerald-800',
  intel_triaged: 'bg-noir-850 text-noir-300 border border-noir-700',
  intel_promoted: 'bg-amber-accent/15 text-amber-accent border border-amber-accent/35',
  sos_dispatched: 'bg-crimson text-white',
};

export const AuditLogModal: React.FC<AuditLogModalProps> = ({ isOpen, caseId, onClose }) => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [actionFilter, setActionFilter] = useState<string>('all');

  useEffect(() => {
    if (isOpen && caseId) {
      getAuditLogs(caseId).then((all) => {
        all.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setLogs(all);
      });
    }
  }, [isOpen, caseId]);

  const availableActions = useMemo(
    () => Array.from(new Set(logs.map((l) => l.action))).sort(),
    [logs]
  );

  const filtered = useMemo(
    () => (actionFilter === 'all' ? logs : logs.filter((l) => l.action === actionFilter)),
    [logs, actionFilter]
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-3xl max-h-[85vh] bg-noir-900 border border-noir-700 rounded-xl shadow-2xl flex flex-col font-mono text-xs text-noir-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-noir-850 border-b border-noir-700">
          <div className="flex items-center gap-2.5">
            <History className="w-5 h-5 text-amber-accent" />
            <div>
              <h2 className="text-sm font-bold text-noir-100 uppercase tracking-wider">
                Investigative Audit Trail & Chain of Custody
              </h2>
              <p className="text-[11px] text-noir-400">
                Immutable record of all investigator actions, evidence additions, merges, AI approvals, imports and
                escalations.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-noir-400 hover:text-noir-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter bar */}
        <div className="flex items-center justify-between px-6 py-2.5 bg-noir-950/80 border-b border-noir-800">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-noir-500" />
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="bg-noir-900 border border-noir-700 rounded px-2 py-1 text-noir-200 focus:outline-none"
            >
              <option value="all">All actions ({logs.length})</option>
              {availableActions.map((a) => (
                <option key={a} value={a}>
                  {a.replace(/_/g, ' ')} ({logs.filter((l) => l.action === a).length})
                </option>
              ))}
            </select>
          </div>
          <span className="text-[10px] text-noir-500">
            {filtered.length} entr{filtered.length === 1 ? 'y' : 'ies'} displayed
          </span>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {logs.length === 0 ? (
            <div className="p-8 text-center text-noir-400">
              No audit actions recorded for this case yet. Every create, edit, merge, ingestion, AI approval, import
              and SOS dispatch will appear here.
            </div>
          ) : (
            filtered.map((log) => (
              <div
                key={log.id}
                className="p-3 bg-noir-950 border border-noir-800 rounded-lg flex items-start justify-between gap-3"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase whitespace-nowrap ${
                        SEVERITY_STYLES[log.action] || 'bg-noir-850 text-noir-300 border border-noir-700'
                      }`}
                    >
                      {log.action.replace(/_/g, ' ')}
                    </span>
                    <span className="text-noir-100 font-bold break-words">{log.details}</span>
                  </div>
                  <div className="text-[10px] text-noir-400 flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3 text-noir-500" /> {log.investigator || 'System'}
                    </span>
                    <span>
                      Target: {log.targetType.toUpperCase()} ({log.targetId})
                    </span>
                  </div>
                </div>

                <span className="text-[10px] text-noir-500 flex items-center gap-1 flex-shrink-0 whitespace-nowrap">
                  <Clock className="w-3 h-3" />
                  {new Date(log.timestamp).toLocaleString()}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
