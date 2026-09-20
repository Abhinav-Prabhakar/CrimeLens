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
    <div className="cb-modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="cb-dossier w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="cb-dossier-head flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-amber-accent flex-none" />
            <div>
              <div className="cb-eyebrow">Identity Verification Queue</div>
              <h2 className="text-sm font-bold text-noir-100 uppercase tracking-wider">
                Entity Resolution & Identity Matching
              </h2>
              <p className="text-[11px] cb-dim mt-0.5">
                Identify duplicate persons, aliases, and matching phone/plate records across disparate reports.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="cb-btn cb-btn-ghost cb-btn-icon flex-none" title="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="cb-dossier-body cb-scroll flex-1 overflow-y-auto p-6 space-y-4">
          {activeCandidates.length === 0 ? (
            <div className="cb-empty">
              <div className="cb-empty-icon">
                <ShieldCheck className="w-5 h-5 cb-green" />
              </div>
              <p className="text-sm font-bold text-noir-200">No unresolved identity duplicates detected.</p>
              <p className="text-[11px]">All entity records have been disambiguated.</p>
            </div>
          ) : (
            activeCandidates.map((cand) => (
              <div key={cand.id} className="cb-card cb-card-pad space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-bold text-noir-100 text-sm truncate">{cand.entityA.label}</span>
                    <span className="cb-faint cb-mono text-[10px] uppercase flex-none">vs</span>
                    <span className="font-bold text-noir-100 text-sm truncate">{cand.entityB.label}</span>
                  </div>
                  <span className="cb-badge cb-badge-amber flex-none">
                    {(cand.similarityScore * 100).toFixed(0)}% Match
                  </span>
                </div>

                {/* Confidence meter */}
                <div className="cb-progress">
                  <span style={{ width: `${(cand.similarityScore * 100).toFixed(0)}%` }} />
                </div>

                {/* Reasons / Matching Attributes */}
                <div className="space-y-1 text-[11px] cb-mono">
                  <div className="cb-green">
                    ✓ {cand.matchingAttributes.join(' • ')}
                  </div>
                  {cand.conflictingAttributes.length > 0 && (
                    <div className="cb-red">
                      ✗ {cand.conflictingAttributes.join(' • ')}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-noir-700">
                  <button
                    onClick={() => handleResolve(cand, 'reject')}
                    className="cb-btn cb-btn-ghost cb-btn-sm"
                  >
                    <Ban className="w-3.5 h-3.5" /> Keep Separate (Different Entities)
                  </button>
                  <button
                    onClick={() => handleResolve(cand, 'merge')}
                    className="cb-btn cb-btn-primary cb-btn-sm"
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
