'use client';

import React, { useState, useMemo } from 'react';
import { X, Users, Check, Ban, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';
import { InvestigationEntity, IdentityMatchCandidate } from '@/lib/types/investigation';
import { findIdentityCandidates } from '@/lib/resolution/identityMatcher';

interface EntityResolutionModalProps {
  isOpen: boolean;
  entities: InvestigationEntity[];
  onClose: () => void;
  onMerge: (keptId: string, mergedId: string) => void;
}

export const EntityResolutionModal: React.FC<EntityResolutionModalProps> = ({
  isOpen,
  entities,
  onClose,
  onMerge,
}) => {
  const candidates = useMemo(() => findIdentityCandidates(entities), [entities]);
  const [resolvedIds, setResolvedIds] = useState<Set<string>>(new Set());

  if (!isOpen) return null;

  const handleResolve = (cand: IdentityMatchCandidate, action: 'merge' | 'reject') => {
    setResolvedIds((prev) => new Set([...prev, cand.id]));
    if (action === 'merge') {
      onMerge(cand.entityA.id, cand.entityB.id);
    }
  };

  const activeCandidates = candidates.filter((c) => !resolvedIds.has(c.id));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-3xl max-h-[85vh] bg-noir-900 border border-noir-700 rounded-xl shadow-2xl flex flex-col font-mono text-xs text-noir-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-noir-850 border-b border-noir-700">
          <div className="flex items-center gap-2.5">
            <Users className="w-5 h-5 text-amber-accent" />
            <div>
              <h2 className="text-sm font-bold text-noir-100 uppercase tracking-wider">
                Entity Resolution & Identity Matching
              </h2>
              <p className="text-[11px] text-noir-400">
                Identify duplicate persons, aliases, and matching phone/plate records across disparate reports.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-noir-400 hover:text-noir-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {activeCandidates.length === 0 ? (
            <div className="py-12 text-center text-noir-400 space-y-2">
              <ShieldCheck className="w-10 h-10 mx-auto text-emerald-500" />
              <p className="text-sm font-bold text-noir-200">No unresolved identity duplicates detected.</p>
              <p className="text-[11px]">All entity records have been disambiguated.</p>
            </div>
          ) : (
            activeCandidates.map((cand) => (
              <div key={cand.id} className="p-4 bg-noir-950/80 border border-noir-700 rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-noir-100 text-sm">{cand.entityA.label}</span>
                    <span className="text-noir-500">vs</span>
                    <span className="font-bold text-noir-100 text-sm">{cand.entityB.label}</span>
                  </div>
                  <span className="px-2.5 py-0.5 bg-amber-accent/20 border border-amber-accent/40 rounded text-amber-accent font-bold">
                    {(cand.similarityScore * 100).toFixed(0)}% MATCH
                  </span>
                </div>

                {/* Reasons / Matching Attributes */}
                <div className="space-y-1 text-[11px]">
                  <div className="text-emerald-400">
                    ✓ {cand.matchingAttributes.join(' • ')}
                  </div>
                  {cand.conflictingAttributes.length > 0 && (
                    <div className="text-crimson">
                      ✗ {cand.conflictingAttributes.join(' • ')}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-noir-800">
                  <button
                    onClick={() => handleResolve(cand, 'reject')}
                    className="px-3 py-1.5 bg-noir-800 hover:bg-noir-700 text-noir-300 rounded flex items-center gap-1.5 transition-colors"
                  >
                    <Ban className="w-3.5 h-3.5" /> Keep Separate (Different Entities)
                  </button>
                  <button
                    onClick={() => handleResolve(cand, 'merge')}
                    className="px-3.5 py-1.5 bg-amber-dim hover:bg-amber-accent text-white rounded font-bold flex items-center gap-1.5 transition-colors"
                  >
                    <Check className="w-3.5 h-3.5" /> Confirm Same Identity (Merge)
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
