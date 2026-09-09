'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, X, User, Phone, MapPin, Building, Car, FileText, ArrowRight, Link as LinkIcon, Clock } from 'lucide-react';
import {
  InvestigationEntity,
  InvestigationRelationship,
  IngestedDocument,
} from '@/lib/types/investigation';

interface GlobalSearchModalProps {
  isOpen: boolean;
  entities: InvestigationEntity[];
  relationships: InvestigationRelationship[];
  documents: IngestedDocument[];
  onClose: () => void;
  onSelectEntity: (id: string) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  entities,
  relationships,
  documents,
  onClose,
  onSelectEntity,
}) => {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  // ESC closes — the footer promise, now kept
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const q = query.trim().toLowerCase();
  const entityMatches = q
    ? entities.filter(
        (e) =>
          e.label.toLowerCase().includes(q) ||
          e.type.toLowerCase().includes(q) ||
          e.aliases.some((a) => a.toLowerCase().includes(q)) ||
          e.notes?.toLowerCase().includes(q) ||
          JSON.stringify(e.attributes).toLowerCase().includes(q)
      )
    : [];
  const labelById = new Map(entities.map((e) => [e.id, e.label]));
  const relMatches = q
    ? relationships.filter(
        (r) =>
          r.predicate.toLowerCase().includes(q) ||
          (r.label || '').toLowerCase().includes(q) ||
          (r.notes || '').toLowerCase().includes(q) ||
          labelById.get(r.sourceId)?.toLowerCase().includes(q) ||
          labelById.get(r.targetId)?.toLowerCase().includes(q)
      )
    : [];
  const docMatches = q
    ? documents.filter(
        (d) =>
          d.title.toLowerCase().includes(q) ||
          d.rawText.toLowerCase().includes(q) ||
          (d.summary || '').toLowerCase().includes(q)
      )
    : [];
  const totalResults = entityMatches.length + relMatches.length + docMatches.length;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/80 backdrop-blur-sm pt-20 p-4">
      <div className="w-full max-w-2xl bg-noir-900 border border-noir-700 rounded-xl shadow-2xl flex flex-col font-mono text-xs text-noir-200 overflow-hidden">
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3 bg-noir-850 border-b border-noir-700 gap-3">
          <Search className="w-5 h-5 text-crimson flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search suspects, connections, phone numbers, plates, documents..."
            className="w-full bg-transparent text-sm text-noir-100 placeholder:text-noir-500 focus:outline-none"
          />
          <button onClick={onClose} className="text-noir-400 hover:text-noir-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto divide-y divide-noir-800 p-2">
          {!q ? (
            <div className="p-8 text-center text-noir-500">
              Type to search the entire case knowledge graph — entities, connections and ingested documents.
            </div>
          ) : totalResults === 0 ? (
            <div className="p-8 text-center text-noir-400">
              No investigative records match &ldquo;{query}&rdquo;.
            </div>
          ) : (
            <>
              {entityMatches.length > 0 && (
                <div className="pb-1">
                  <div className="px-2 py-1 text-[9px] uppercase text-noir-500 font-bold">Entities ({entityMatches.length})</div>
                  {entityMatches.map((e) => (
                    <div
                      key={e.id}
                      onClick={() => {
                        onSelectEntity(e.id);
                        onClose();
                      }}
                      className="p-3 hover:bg-noir-850 rounded-lg cursor-pointer flex items-center justify-between transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-noir-800 flex items-center justify-center text-noir-300 group-hover:text-crimson">
                          {e.type === 'person' && <User className="w-4 h-4" />}
                          {e.type === 'phone' && <Phone className="w-4 h-4" />}
                          {e.type === 'location' && <MapPin className="w-4 h-4" />}
                          {e.type === 'organization' && <Building className="w-4 h-4" />}
                          {e.type === 'vehicle' && <Car className="w-4 h-4" />}
                          {(e.type === 'document' || e.type === 'account' || e.type === 'event' || e.type === 'evidence_item') && (
                            <FileText className="w-4 h-4" />
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-noir-100 text-sm">{e.label}</div>
                          <div className="text-[10px] text-noir-400">
                            Type: <span className="uppercase text-noir-300">{e.type}</span> • Card:{' '}
                            <span className="uppercase text-noir-300">{e.visualType}</span>
                            {e.aliases.length > 0 && ` • Aka: ${e.aliases.join(', ')}`}
                          </div>
                        </div>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-noir-600 group-hover:text-noir-200" />
                    </div>
                  ))}
                </div>
              )}

              {relMatches.length > 0 && (
                <div className="pb-1">
                  <div className="px-2 py-1 text-[9px] uppercase text-noir-500 font-bold">
                    Connections ({relMatches.length})
                  </div>
                  {relMatches.slice(0, 12).map((r) => (
                    <div
                      key={r.id}
                      onClick={() => {
                        onSelectEntity(r.sourceId);
                        onClose();
                      }}
                      className="p-2.5 hover:bg-noir-850 rounded-lg cursor-pointer flex items-center justify-between transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded bg-noir-800 flex items-center justify-center text-noir-300 group-hover:text-crimson">
                          <LinkIcon className="w-3.5 h-3.5" />
                        </div>
                        <div className="text-[11px] text-noir-200">
                          <strong>{labelById.get(r.sourceId) || r.sourceId}</strong> ──[
                          <span className="text-crimson font-bold">{r.predicate}</span>]──►{' '}
                          <strong>{labelById.get(r.targetId) || r.targetId}</strong>
                          <span className="text-noir-500"> · {(r.confidence * 100).toFixed(0)}% · {r.status}</span>
                        </div>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-noir-600 group-hover:text-noir-200" />
                    </div>
                  ))}
                </div>
              )}

              {docMatches.length > 0 && (
                <div className="pb-1">
                  <div className="px-2 py-1 text-[9px] uppercase text-noir-500 font-bold">
                    Ingested Documents ({docMatches.length})
                  </div>
                  {docMatches.slice(0, 8).map((d) => (
                    <div
                      key={d.id}
                      className="p-2.5 hover:bg-noir-850 rounded-lg cursor-pointer flex items-center justify-between transition-colors group"
                      onClick={() => {
                        // Documents have no board card; surface the first entity it produced if any
                        onClose();
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded bg-noir-800 flex items-center justify-center text-noir-300 group-hover:text-amber-accent">
                          <FileText className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="font-bold text-noir-100 text-[11px]">{d.title}</div>
                          <div className="text-[10px] text-noir-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(d.importedAt).toLocaleString()} • {d.documentType.toUpperCase()} •{' '}
                            {d.extractedEntitiesCount || 0} entities staged
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <div className="px-4 py-2 bg-noir-950 border-t border-noir-800 text-[10px] text-noir-500 flex justify-between">
          <span>
            {q
              ? `${totalResults} records matched across entities, connections and documents`
              : `${entities.length} entities · ${relationships.length} connections · ${documents.length} documents indexed`}
          </span>
          <span>Press ESC to close</span>
        </div>
      </div>
    </div>
  );
};
