'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, X, User, Phone, MapPin, Building, Car, FileText, ArrowRight } from 'lucide-react';
import { InvestigationEntity } from '@/lib/types/investigation';

interface GlobalSearchModalProps {
  isOpen: boolean;
  entities: InvestigationEntity[];
  onClose: () => void;
  onSelectEntity: (id: string) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  entities,
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

  if (!isOpen) return null;

  const filtered = query.trim()
    ? entities.filter((e) => {
        const q = query.toLowerCase();
        return (
          e.label.toLowerCase().includes(q) ||
          e.type.toLowerCase().includes(q) ||
          e.aliases.some((a) => a.toLowerCase().includes(q)) ||
          e.notes?.toLowerCase().includes(q) ||
          JSON.stringify(e.attributes).toLowerCase().includes(q)
        );
      })
    : entities;

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
            placeholder="Search suspects, burner phones, license plates, accounts, locations..."
            className="w-full bg-transparent text-sm text-noir-100 placeholder:text-noir-500 focus:outline-none"
          />
          <button onClick={onClose} className="text-noir-400 hover:text-noir-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto divide-y divide-noir-800 p-2">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-noir-400">
              No investigative entities match &ldquo;{query}&rdquo;.
            </div>
          ) : (
            filtered.map((e) => (
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
                    {e.type === 'document' && <FileText className="w-4 h-4" />}
                    {e.type !== 'person' &&
                      e.type !== 'phone' &&
                      e.type !== 'location' &&
                      e.type !== 'organization' &&
                      e.type !== 'vehicle' &&
                      e.type !== 'document' && <FileText className="w-4 h-4" />}
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

                <div className="flex items-center gap-2.5">
                  <span
                    className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                      e.status === 'verified_source'
                        ? 'bg-cobalt/20 text-cobalt'
                        : e.status === 'investigator_confirmed'
                        ? 'bg-emerald-950 text-emerald-400'
                        : 'bg-crimson/20 text-crimson'
                    }`}
                  >
                    {(e.confidence * 100).toFixed(0)}% • {e.status.toUpperCase()}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-noir-600 group-hover:text-noir-200" />
                </div>
              </div>
            ))
          )}
        </div>

        <div className="px-4 py-2 bg-noir-950 border-t border-noir-800 text-[10px] text-noir-500 flex justify-between">
          <span>{filtered.length} entities indexed in local knowledge graph</span>
          <span>Press ESC to close</span>
        </div>
      </div>
    </div>
  );
};
