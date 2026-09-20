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
  case_created: 'cb-badge cb-badge-green',
  case_updated: 'cb-badge',
  case_deleted: 'cb-badge cb-badge-red',
  entity_created: 'cb-badge cb-badge-cobalt',
  entity_updated: 'cb-badge',
  entity_deleted: 'cb-badge cb-badge-red',
  entities_merged: 'cb-badge cb-badge-amber',
  relationship_created: 'cb-badge cb-badge-cobalt',
  relationship_confirmed: 'cb-badge cb-badge-green',
  relationship_deleted: 'cb-badge cb-badge-red',
  document_ingested: 'cb-badge cb-badge-cobalt',
  ai_extraction_approved: 'cb-badge cb-badge-amber',
  report_generated: 'cb-badge',
  link_prediction_confirmed: 'cb-badge cb-badge-amber',
  bundle_exported: 'cb-badge',
  bundle_imported: 'cb-badge cb-badge-green',
  intel_triaged: 'cb-badge',
  intel_promoted: 'cb-badge cb-badge-amber',
  sos_dispatched: 'cb-badge cb-badge-red',
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
    <div className="cb-modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="cb-dossier w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="cb-dossier-head flex items-center justify-between px-5 py-4">
          <div className="flex items-center gap-2.5">
            <History className="w-5 h-5 text-amber-accent flex-shrink-0" />
            <div>
              <h2 className="text-sm font-bold">Investigative Audit Trail & Chain of Custody</h2>
              <p className="text-[11px] cb-dim">
                Immutable record of all investigator actions, evidence additions, merges, AI approvals, imports and
                escalations.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="cb-btn cb-btn-ghost cb-btn-icon" title="Close audit trail">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Filter strip */}
        <div className="flex items-center justify-between px-5 py-2.5 border-b border-noir-700">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 cb-faint" />
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="cb-select !w-auto"
            >
              <option value="all">All actions ({logs.length})</option>
              {availableActions.map((a) => (
                <option key={a} value={a}>
                  {a.replace(/_/g, ' ')} ({logs.filter((l) => l.action === a).length})
                </option>
              ))}
            </select>
          </div>
          <span className="cb-mono text-[10px] cb-faint">
            {filtered.length} entr{filtered.length === 1 ? 'y' : 'ies'} displayed
          </span>
        </div>

        {/* Content */}
        <div className="cb-dossier-body cb-scroll flex-1 overflow-y-auto p-5 space-y-2.5">
          {logs.length === 0 ? (
            <div className="cb-empty">
              <div className="cb-empty-icon">
                <History className="w-5 h-5" />
              </div>
              <p className="text-xs cb-dim max-w-md">
                No audit actions recorded for this case yet. Every create, edit, merge, ingestion, AI approval, import
                and SOS dispatch will appear here.
              </p>
            </div>
          ) : (
            filtered.map((log) => (
              <div
                key={log.id}
                className="cb-card cb-card-pad flex items-start justify-between gap-3"
              >
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={SEVERITY_STYLES[log.action] || 'cb-badge'}>
                      {log.action.replace(/_/g, ' ')}
                    </span>
                    <span className="text-noir-100 font-bold text-xs break-words">{log.details}</span>
                  </div>
                  <div className="cb-mono text-[10px] cb-faint flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" /> {log.investigator || 'System'}
                    </span>
                    <span>
                      Target: {log.targetType.toUpperCase()} ({log.targetId})
                    </span>
                  </div>
                </div>

                <span className="cb-mono text-[10px] cb-faint flex items-center gap-1 flex-shrink-0 whitespace-nowrap">
                  <Clock className="w-3 h-3" />
                  {new Date(log.timestamp).toLocaleString()}
                </span>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="cb-dossier-foot flex items-center justify-between px-5 py-2.5 cb-mono text-[10px] cb-faint">
          <span>Append-only record — audit entries cannot be edited or removed</span>
          <span>
            {filtered.length} of {logs.length} entries
          </span>
        </div>
      </div>
    </div>
  );
};
