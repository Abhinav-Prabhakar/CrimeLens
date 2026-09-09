'use client';

import React, { useState } from 'react';
import { InvestigationEntity, InvestigationRelationship } from '@/lib/types/investigation';
import {
  X,
  Shield,
  FileText,
  Trash2,
  CheckCircle2,
  Link as LinkIcon,
  Plus,
  Undo2,
} from 'lucide-react';

interface InspectorDrawerProps {
  entity: InvestigationEntity | null;
  relationships: InvestigationRelationship[];
  allEntities: InvestigationEntity[];
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<InvestigationEntity>) => void;
  onDelete: (id: string) => void;
  onConfirmRelationship: (id: string) => void;
  onDeleteRelationship: (id: string) => void;
}

export const InspectorDrawer: React.FC<InspectorDrawerProps> = ({
  entity,
  relationships,
  allEntities,
  onClose,
  onUpdate,
  onDelete,
  onConfirmRelationship,
  onDeleteRelationship,
}) => {
  const [notes, setNotes] = useState(entity?.notes || '');
  const [label, setLabel] = useState(entity?.label || '');
  const [aliasesText, setAliasesText] = useState((entity?.aliases || []).join(', '));
  const [newAttrKey, setNewAttrKey] = useState('');
  const [newAttrValue, setNewAttrValue] = useState('');

  if (!entity) return null;

  const connectedRels = relationships.filter(
    (r) => r.sourceId === entity.id || r.targetId === entity.id
  );

  const handleSaveCore = () => {
    const aliases = aliasesText
      .split(',')
      .map((a) => a.trim())
      .filter((a) => a.length > 0 && a.toLowerCase() !== label.toLowerCase());
    onUpdate(entity.id, { notes, label, aliases });
  };

  const handleConfirmEntity = () => {
    onUpdate(entity.id, { status: 'investigator_confirmed', confidence: 1.0 });
  };

  const handleAddAttribute = () => {
    if (!newAttrKey.trim()) return;
    onUpdate(entity.id, {
      attributes: { ...entity.attributes, [newAttrKey.trim()]: newAttrValue },
    });
    setNewAttrKey('');
    setNewAttrValue('');
  };

  const handleUpdateAttribute = (key: string, value: string) => {
    onUpdate(entity.id, { attributes: { ...entity.attributes, [key]: value } });
  };

  const handleDeleteAttribute = (key: string) => {
    const next = { ...entity.attributes };
    delete next[key];
    onUpdate(entity.id, { attributes: next });
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
          onBlur={handleSaveCore}
          className="w-full bg-noir-900 border border-noir-700 rounded px-2.5 py-1.5 text-sm font-bold text-noir-100 focus:border-crimson focus:outline-none"
        />
        <div className="space-y-1 pt-1">
          <label className="text-[10px] uppercase text-noir-400">Aliases (comma separated)</label>
          <input
            type="text"
            value={aliasesText}
            onChange={(e) => setAliasesText(e.target.value)}
            onBlur={handleSaveCore}
            placeholder="e.g. The Courier, Danny V"
            className="w-full bg-noir-900 border border-noir-700 rounded px-2.5 py-1.5 text-[11px] text-noir-100 focus:border-crimson focus:outline-none"
          />
        </div>
        <div className="flex items-center justify-between text-[11px] text-noir-400 pt-1">
          <span>
            Type: <strong className="text-noir-200 uppercase">{entity.type}</strong>
          </span>
          <span>
            Card: <strong className="text-noir-200 uppercase">{entity.visualType}</strong>
          </span>
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
        {entity.status !== 'investigator_confirmed' && entity.status !== 'verified_source' && (
          <button
            onClick={handleConfirmEntity}
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

      {/* Attributes editor */}
      <div className="space-y-1.5">
        <label className="text-[10px] uppercase text-noir-400">Case Attributes ({Object.keys(entity.attributes || {}).length})</label>
        <div className="space-y-1">
          {Object.entries(entity.attributes || {}).map(([key, value]) => (
            <div key={key} className="flex items-center gap-1.5">
              <span className="w-24 flex-shrink-0 truncate text-[10px] uppercase text-noir-500" title={key}>
                {key}
              </span>
              <input
                type="text"
                defaultValue={String(value)}
                onBlur={(e) => handleUpdateAttribute(key, e.target.value)}
                className="flex-1 min-w-0 bg-noir-900 border border-noir-800 rounded px-2 py-1 text-[11px] text-noir-200 focus:border-crimson focus:outline-none"
              />
              <button
                onClick={() => handleDeleteAttribute(key)}
                className="p-1 text-noir-600 hover:text-crimson transition-colors"
                title={`Remove ${key}`}
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
          <div className="flex items-center gap-1.5 pt-1">
            <input
              type="text"
              value={newAttrKey}
              onChange={(e) => setNewAttrKey(e.target.value)}
              placeholder="key"
              className="w-24 flex-shrink-0 bg-noir-900 border border-noir-700 rounded px-2 py-1 text-[10px] text-noir-200 focus:border-crimson focus:outline-none"
            />
            <input
              type="text"
              value={newAttrValue}
              onChange={(e) => setNewAttrValue(e.target.value)}
              placeholder="value (e.g. IMEI, plate, age)"
              className="flex-1 min-w-0 bg-noir-900 border border-noir-700 rounded px-2 py-1 text-[10px] text-noir-200 focus:border-crimson focus:outline-none"
            />
            <button
              onClick={handleAddAttribute}
              disabled={!newAttrKey.trim()}
              className="p-1.5 bg-noir-800 hover:bg-noir-700 disabled:opacity-40 text-noir-300 rounded transition-colors"
              title="Add attribute"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Connected Nodes & relationship management */}
      <div className="space-y-1.5">
        <label className="text-[10px] uppercase text-noir-400 flex items-center gap-1">
          <LinkIcon className="w-3 h-3 text-cobalt" /> Linked Network ({connectedRels.length})
        </label>
        <div className="max-h-44 overflow-y-auto space-y-1">
          {connectedRels.length === 0 ? (
            <div className="text-noir-500 text-[10px] italic">No active connections recorded.</div>
          ) : (
            connectedRels.map((rel) => {
              const otherId = rel.sourceId === entity.id ? rel.targetId : rel.sourceId;
              const other = allEntities.find((e) => e.id === otherId);
              const needsConfirmation = rel.status === 'ai_inferred' || rel.status === 'predicted';
              return (
                <div
                  key={rel.id}
                  className={`p-1.5 rounded border text-[10px] space-y-1 ${
                    needsConfirmation ? 'bg-amber-accent/5 border-amber-accent/25' : 'bg-noir-900 border-noir-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-noir-200 truncate">{other?.label || otherId}</span>
                    <span className="text-crimson font-bold flex-shrink-0">{rel.predicate}</span>
                  </div>
                  <div className="flex items-center justify-between gap-1">
                    <span className={`text-[9px] ${needsConfirmation ? 'text-amber-accent' : 'text-noir-500'}`}>
                      {rel.status.toUpperCase()} · {(rel.confidence * 100).toFixed(0)}%
                    </span>
                    <div className="flex items-center gap-1">
                      {needsConfirmation && (
                        <button
                          onClick={() => onConfirmRelationship(rel.id)}
                          className="p-1 bg-emerald-950 hover:bg-emerald-900 text-emerald-400 border border-emerald-800 rounded"
                          title="Confirm as investigator-verified link"
                        >
                          <CheckCircle2 className="w-3 h-3" />
                        </button>
                      )}
                      <button
                        onClick={() => onDeleteRelationship(rel.id)}
                        className="p-1 bg-noir-800 hover:bg-crimson/20 text-noir-400 hover:text-crimson border border-noir-700 rounded"
                        title="Sever connection"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
        {connectedRels.some((r) => r.status === 'ai_inferred' || r.status === 'predicted') && (
          <div className="text-[9px] text-amber-accent/80 flex items-center gap-1">
            <Undo2 className="w-3 h-3" /> AI-inferred / predicted links require confirmation before they count as verified.
          </div>
        )}
      </div>

      {/* Notes */}
      <div className="space-y-1.5">
        <label className="text-[10px] uppercase text-noir-400">Investigator Notes</label>
        <textarea
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={handleSaveCore}
          placeholder="Add observations, forensic leads..."
          className="w-full bg-noir-900 border border-noir-700 rounded p-2 text-[11px] text-noir-200 focus:border-crimson focus:outline-none"
        />
      </div>

      {/* Danger Zone: Delete */}
      <div className="pt-2 border-t border-noir-700">
        <button
          onClick={() => {
            if (window.confirm(`Remove ${entity.label} from the investigation? All its connections will be severed.`)) {
              onDelete(entity.id);
            }
          }}
          className="w-full py-1.5 bg-crimson/10 hover:bg-crimson/20 text-crimson border border-crimson/40 rounded font-bold flex items-center justify-center gap-1.5 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" /> Remove from Investigation
        </button>
      </div>
    </div>
  );
};
