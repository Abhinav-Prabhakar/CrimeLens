'use client';

import React, { useState } from 'react';
import { InvestigationEntity, InvestigationRelationship } from '@/lib/types/investigation';
import { X, Shield, FileText, Trash2, CheckCircle2, AlertTriangle, Link as LinkIcon, Tag } from 'lucide-react';

interface InspectorDrawerProps {
  entity: InvestigationEntity | null;
  relationships: InvestigationRelationship[];
  allEntities: InvestigationEntity[];
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<InvestigationEntity>) => void;
  onDelete: (id: string) => void;
}

export const InspectorDrawer: React.FC<InspectorDrawerProps> = ({
  entity,
  relationships,
  allEntities,
  onClose,
  onUpdate,
  onDelete,
}) => {
  if (!entity) return null;

  const [notes, setNotes] = useState(entity.notes || '');
  const [label, setLabel] = useState(entity.label);

  const connectedRels = relationships.filter(
    (r) => r.sourceId === entity.id || r.targetId === entity.id
  );

  const handleSaveNotes = () => {
    onUpdate(entity.id, { notes, label });
  };

  const handleConfirm = () => {
    onUpdate(entity.id, { status: 'investigator_confirmed', confidence: 1.0 });
  };

  return (
    <div className="absolute top-14 right-4 z-30 w-96 max-h-[85vh] overflow-y-auto bg-noir-850/95 border border-noir-600 rounded-xl shadow-2xl backdrop-blur-md p-4 font-mono text-xs text-noir-200 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-noir-700 pb-2.5">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-crimson" />
          <span className="font-bold tracking-wider text-noir-100">DOSSIER INSPECTOR</span>
        </div>
        <button onClick={onClose} className="text-noir-400 hover:text-noir-100 transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Entity Title & Type */}
      <div className="space-y-1.5">
        <label className="text-[10px] uppercase text-noir-400">Designation / Label</label>
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onBlur={handleSaveNotes}
          className="w-full bg-noir-900 border border-noir-700 rounded px-2.5 py-1.5 text-sm font-bold text-noir-100 focus:border-crimson focus:outline-none"
        />
        <div className="flex items-center justify-between text-[11px] text-noir-400 pt-1">
          <span>Type: <strong className="text-noir-200 uppercase">{entity.type}</strong></span>
          <span>Card: <strong className="text-noir-200 uppercase">{entity.visualType}</strong></span>
        </div>
      </div>

      {/* Status & Confidence Badge */}
      <div className="p-2.5 bg-noir-900 rounded-lg border border-noir-700 space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase text-noir-400">Verification Status</span>
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
              entity.status === 'verified_source'
                ? 'bg-cobalt/20 text-cobalt border border-cobalt/40'
                : entity.status === 'investigator_confirmed'
                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                : 'bg-crimson/20 text-crimson border border-crimson/40'
            }`}
          >
            {entity.status.toUpperCase()}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase text-noir-400">Confidence Score</span>
          <span className="font-bold text-noir-100">{(entity.confidence * 100).toFixed(0)}%</span>
        </div>
        {entity.status !== 'investigator_confirmed' && (
          <button
            onClick={handleConfirm}
            className="w-full mt-2 py-1.5 bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-800 rounded font-bold flex items-center justify-center gap-1.5 transition-colors"
          >
            <CheckCircle2 className="w-3.5 h-3.5" /> Confirm as Verified Lead
          </button>
        )}
      </div>

      {/* Source Provenance (Where did this come from?) */}
      <div className="space-y-1.5">
        <label className="text-[10px] uppercase text-noir-400 flex items-center gap-1">
          <FileText className="w-3 h-3 text-amber-accent" /> Source Provenance
        </label>
        <div className="p-2.5 bg-noir-900 rounded border border-noir-700 text-[11px] space-y-1">
          <div className="font-bold text-noir-200">{entity.provenance.sourceTitle}</div>
          <div className="text-noir-400">Origin: {entity.provenance.sourceType.toUpperCase()}</div>
          {entity.provenance.excerpt && (
            <blockquote className="border-l-2 border-noir-600 pl-2 text-noir-400 italic text-[10px] mt-1">
              &ldquo;{entity.provenance.excerpt}&rdquo;
            </blockquote>
          )}
        </div>
      </div>

      {/* Connected Nodes */}
      <div className="space-y-1.5">
        <label className="text-[10px] uppercase text-noir-400 flex items-center gap-1">
          <LinkIcon className="w-3 h-3 text-cobalt" /> Linked Network ({connectedRels.length})
        </label>
        <div className="max-h-36 overflow-y-auto space-y-1">
          {connectedRels.length === 0 ? (
            <div className="text-noir-500 text-[10px] italic">No active connections recorded.</div>
          ) : (
            connectedRels.map((rel) => {
              const otherId = rel.sourceId === entity.id ? rel.targetId : rel.sourceId;
              const other = allEntities.find((e) => e.id === otherId);
              return (
                <div key={rel.id} className="p-1.5 bg-noir-900 rounded border border-noir-700 text-[10px] flex items-center justify-between">
                  <span className="text-noir-200">{other?.label || otherId}</span>
                  <span className="text-crimson font-bold">{rel.predicate}</span>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-1.5">
        <label className="text-[10px] uppercase text-noir-400">Investigator Notes</label>
        <textarea
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={handleSaveNotes}
          placeholder="Add observations, forensic leads..."
          className="w-full bg-noir-900 border border-noir-700 rounded p-2 text-[11px] text-noir-200 focus:border-crimson focus:outline-none"
        />
      </div>

      {/* Danger Zone: Delete */}
      <div className="pt-2 border-t border-noir-700">
        <button
          onClick={() => onDelete(entity.id)}
          className="w-full py-1.5 bg-crimson/10 hover:bg-crimson/20 text-crimson border border-crimson/40 rounded font-bold flex items-center justify-center gap-1.5 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" /> Remove from Investigation
        </button>
      </div>
    </div>
  );
};
