'use client';

import React, { useState, useEffect } from 'react';
import { X, ShieldAlert, History, User, Clock } from 'lucide-react';
import { AuditLogEntry } from '@/lib/types/investigation';
import { getAuditLogs } from '@/lib/storage/db';

interface AuditLogModalProps {
  isOpen: boolean;
  caseId: string;
  onClose: () => void;
}

export const AuditLogModal: React.FC<AuditLogModalProps> = ({ isOpen, caseId, onClose }) => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);

  useEffect(() => {
    if (isOpen && caseId) {
      getAuditLogs(caseId).then((all) => {
        all.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setLogs(all);
      });
    }
  }, [isOpen, caseId]);

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
                Immutable record of all investigator actions, evidence additions, merges, and AI approvals.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-noir-400 hover:text-noir-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {logs.length === 0 ? (
            <div className="p-8 text-center text-noir-400">
              No audit actions recorded for this case yet.
            </div>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                className="p-3 bg-noir-950 border border-noir-800 rounded-lg flex items-start justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-noir-850 border border-noir-700 rounded text-[10px] font-bold uppercase text-noir-300">
                      {log.action.replace(/_/g, ' ')}
                    </span>
                    <span className="text-noir-100 font-bold">{log.details}</span>
                  </div>
                  <div className="text-[10px] text-noir-400 flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3 text-noir-500" /> {log.investigator || 'System'}
                    </span>
                    <span>Target: {log.targetType.toUpperCase()} ({log.targetId})</span>
                  </div>
                </div>

                <span className="text-[10px] text-noir-500 flex items-center gap-1 flex-shrink-0">
                  <Clock className="w-3 h-3" />
                  {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
