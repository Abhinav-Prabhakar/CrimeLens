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
    <div className="cb-modal-backdrop fixed inset-0 z-50 flex items-start justify-center pt-20 p-4">
      <div className="cb-dossier cb-search-dossier w-full max-w-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="cb-dossier-head flex items-center justify-between px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <Search className="w-5 h-5 text-crimson flex-shrink-0" />
            <div>
              <h2 className="text-sm font-bold">Global Search</h2>
              <p className="text-[11px] cb-dim">
                Query entities, connections and ingested documents across the active case file.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="cb-btn cb-btn-ghost cb-btn-icon" title="Close search">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Query strip */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-noir-700">
          <Search className="w-4 h-4 cb-faint flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search suspects, connections, phone numbers, plates, documents..."
            className="cb-input"
          />
        </div>

        {/* Results List */}
        <div className="cb-dossier-body cb-scroll flex-1 max-h-96 overflow-y-auto p-3">
          {!q ? (
            <div className="p-4 space-y-5">
              <div className="text-center space-y-1">
                <div className="cb-eyebrow">Search the current dossier</div>
                <p className="text-[11px] cb-dim">
                  Find evidence by designation, alias, phone, plate, predicate, document text, or investigator note.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="cb-metric p-3 text-center">
                  <User className="w-4 h-4 mx-auto mb-2 text-crimson" />
                  <div className="text-lg font-bold text-noir-100">{entities.length}</div>
                  <div className="cb-eyebrow mt-1">Entities</div>
                </div>
                <div className="cb-metric p-3 text-center">
                  <LinkIcon className="w-4 h-4 mx-auto mb-2 text-amber-accent" />
                  <div className="text-lg font-bold text-noir-100">{relationships.length}</div>
                  <div className="cb-eyebrow mt-1">Connections</div>
                </div>
                <div className="cb-metric p-3 text-center">
                  <FileText className="w-4 h-4 mx-auto mb-2 text-cobalt" />
                  <div className="text-lg font-bold text-noir-100">{documents.length}</div>
                  <div className="cb-eyebrow mt-1">Documents</div>
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2">
                {['Pier 9', 'financial', 'forensic', 'vehicle'].map((term) => (
                  <button
                    key={term}
                    onClick={() => setQuery(term)}
                    className="cb-btn cb-btn-ghost cb-btn-sm"
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>
          ) : totalResults === 0 ? (
            <div className="cb-empty">
              <div className="cb-empty-icon">
                <Search className="w-5 h-5" />
              </div>
              <p className="text-xs cb-dim">
                No investigative records match &ldquo;{query}&rdquo;.
              </p>
            </div>
          ) : (
            <>
              {entityMatches.length > 0 && (
                <div className="pb-2">
                  <div className="cb-eyebrow px-1.5 py-1.5">Entities ({entityMatches.length})</div>
                  <div className="cb-list">
                    {entityMatches.map((e) => (
                      <div
                        key={e.id}
                        onClick={() => {
                          onSelectEntity(e.id);
                          onClose();
                        }}
                        className="cb-row group"
                      >
                        <div className="cb-row-icon group-hover:text-crimson group-hover:border-crimson-dim">
                          {e.type === 'person' && <User className="w-4 h-4" />}
                          {e.type === 'phone' && <Phone className="w-4 h-4" />}
                          {e.type === 'location' && <MapPin className="w-4 h-4" />}
                          {e.type === 'organization' && <Building className="w-4 h-4" />}
                          {e.type === 'vehicle' && <Car className="w-4 h-4" />}
                          {(e.type === 'document' || e.type === 'account' || e.type === 'event' || e.type === 'evidence_item') && (
                            <FileText className="w-4 h-4" />
                          )}
                        </div>
                        <div className="cb-row-main">
                          <span className="cb-row-title">{e.label}</span>
                          <span className="cb-row-sub">
                            Type: <span className="uppercase cb-dim">{e.type}</span> · Card:{' '}
                            <span className="uppercase cb-dim">{e.visualType}</span>
                            {e.aliases.length > 0 && ` · Aka: ${e.aliases.join(', ')}`}
                          </span>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 cb-faint group-hover:text-noir-200 flex-shrink-0" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {relMatches.length > 0 && (
                <div className="pb-2">
                  <div className="cb-eyebrow px-1.5 py-1.5">
                    Connections ({relMatches.length})
                  </div>
                  <div className="cb-list">
                    {relMatches.slice(0, 12).map((r) => (
                      <div
                        key={r.id}
                        onClick={() => {
                          onSelectEntity(r.sourceId);
                          onClose();
                        }}
                        className="cb-row group"
                      >
                        <div className="cb-row-icon group-hover:text-crimson group-hover:border-crimson-dim">
                          <LinkIcon className="w-3.5 h-3.5" />
                        </div>
                        <div className="cb-row-main">
                          <span className="cb-row-title">
                            {labelById.get(r.sourceId) || r.sourceId} ──[
                            <span className="cb-red font-bold">{r.predicate}</span>]──►{' '}
                            {labelById.get(r.targetId) || r.targetId}
                          </span>
                          <span className="cb-row-sub">
                            {(r.confidence * 100).toFixed(0)}% confidence · {r.status}
                          </span>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 cb-faint group-hover:text-noir-200 flex-shrink-0" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {docMatches.length > 0 && (
                <div className="pb-2">
                  <div className="cb-eyebrow px-1.5 py-1.5">
                    Ingested Documents ({docMatches.length})
                  </div>
                  <div className="cb-list">
                    {docMatches.slice(0, 8).map((d) => (
                      <div
                        key={d.id}
                        className="cb-row group"
                        onClick={() => {
                          // Documents have no board card; surface the first entity it produced if any
                          onClose();
                        }}
                      >
                        <div className="cb-row-icon group-hover:text-amber-accent">
                          <FileText className="w-3.5 h-3.5" />
                        </div>
                        <div className="cb-row-main">
                          <span className="cb-row-title">{d.title}</span>
                          <span className="cb-row-sub flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(d.importedAt).toLocaleString()} · {d.documentType.toUpperCase()} ·{' '}
                            {d.extractedEntitiesCount || 0} entities staged
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="cb-dossier-foot flex items-center justify-between px-4 py-2.5 cb-mono text-[10px] cb-faint">
          <span>
            {q
              ? `${totalResults} records matched across entities, connections and documents`
              : `${entities.length} entities · ${relationships.length} connections · ${documents.length} documents indexed`}
          </span>
          <span>
            Press <span className="cb-kbd">ESC</span> to close
          </span>
        </div>
      </div>
    </div>
  );
};
