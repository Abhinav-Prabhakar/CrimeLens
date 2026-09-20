'use client';

import React, { useState, useEffect } from 'react';
import { X, Send, ShieldCheck, Inbox, Trash2, Gauge } from 'lucide-react';
import { InvestigationEntity, PublicIntelSubmission } from '@/lib/types/investigation';
import { getAllIntelSubmissions, saveIntelSubmission, deleteIntelSubmission } from '@/lib/storage/db';
import { scoreTipCredibility } from '@/lib/intel/credibility';

interface PublicIntelModalProps {
  isOpen: boolean;
  caseEntities: InvestigationEntity[];
  onClose: () => void;
  onTriage?: (action: 'intel_triaged', details: string) => void;
  onPromoteToCase?: (tipContent: string) => void;
}

export const PublicIntelModal: React.FC<PublicIntelModalProps> = ({
  isOpen,
  caseEntities,
  onClose,
  onTriage,
  onPromoteToCase,
}) => {
  const [submissions, setSubmissions] = useState<PublicIntelSubmission[]>([]);
  const [newTip, setNewTip] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [sourceCategory, setSourceCategory] = useState<PublicIntelSubmission['sourceCategory']>('anonymous_tip');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      getAllIntelSubmissions()
        .then((all) =>
          all.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
        )
        .then(setSubmissions)
        .catch(() => setSubmissions([]));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const persist = async (updated: PublicIntelSubmission) => {
    setSubmissions((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    await saveIntelSubmission(updated).catch(() => {});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTip.trim()) return;

    setIsSubmitting(true);
    // Transparent heuristic triage — displayed to the investigator, never a verdict
    const assessment = scoreTipCredibility(newTip, {
      sourceCategory,
      locationMentioned: newLocation,
      knownEntities: caseEntities,
    });

    const sub: PublicIntelSubmission = {
      id: `tip_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      submittedAt: new Date().toISOString(),
      sourceCategory,
      content: newTip.trim(),
      locationMentioned: newLocation.trim() || undefined,
      credibilityScore: assessment.score,
      status: 'pending_review',
    };

    await saveIntelSubmission(sub).catch(() => {});
    setSubmissions((prev) => [sub, ...prev]);
    setNewTip('');
    setNewLocation('');
    setIsSubmitting(false);
  };

  const handleTriage = async (sub: PublicIntelSubmission, status: PublicIntelSubmission['status']) => {
    await persist({ ...sub, status });
    onTriage?.('intel_triaged', `Tip ${sub.id} marked ${status} (credibility ${(sub.credibilityScore * 100).toFixed(0)}%)`);
  };

  const handleDelete = async (id: string) => {
    setSubmissions((prev) => prev.filter((s) => s.id !== id));
    await deleteIntelSubmission(id).catch(() => {});
  };

  return (
    <div className="cb-modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="cb-dossier w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="cb-dossier-head flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Inbox className="w-5 h-5 text-amber-accent flex-none" />
            <div>
              <div className="cb-eyebrow">Citizen Tip Intake</div>
              <h2 className="text-sm font-bold text-noir-100 uppercase tracking-wider">
                Public Intelligence & Anonymous Tip Intake
              </h2>
              <p className="text-[11px] cb-dim mt-0.5">
                Citizen tips, witness submissions, and credibility triage. Tips do not enter the graph without
                investigator triage. Persisted locally in IndexedDB.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="cb-btn cb-btn-ghost cb-btn-icon flex-none" title="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="cb-dossier-body cb-scroll flex-1 overflow-y-auto p-6 space-y-6">
          {/* Submit a New Tip Form */}
          <form onSubmit={handleSubmit} className="cb-card cb-card-pad space-y-3">
            <h3 className="cb-eyebrow">Submit Intelligence Tip</h3>
            <textarea
              rows={3}
              value={newTip}
              onChange={(e) => setNewTip(e.target.value)}
              placeholder="Describe observation, suspect sighting, vehicle movement, or overheard conversation..."
              className="cb-textarea"
            />
            <div className="flex items-center gap-2.5 flex-wrap">
              <input
                type="text"
                value={newLocation}
                onChange={(e) => setNewLocation(e.target.value)}
                placeholder="Specific Location / Landmark"
                className="cb-input flex-1 min-w-[180px]"
              />
              <div className="w-56 flex-none">
                <select
                  value={sourceCategory}
                  onChange={(e: any) => setSourceCategory(e.target.value)}
                  className="cb-select"
                >
                  <option value="anonymous_tip">Anonymous Tip</option>
                  <option value="witness_portal">Witness Portal (semi-identified)</option>
                  <option value="hotline">Hotline Call</option>
                </select>
              </div>
              <button
                type="submit"
                disabled={isSubmitting || !newTip.trim()}
                className="cb-btn cb-btn-primary cb-btn-sm flex-none"
              >
                <Send className="w-3.5 h-3.5" />
                {isSubmitting ? 'Recording...' : 'Submit Lead'}
              </button>
            </div>
          </form>

          {/* Pending Submissions Queue */}
          <div className="space-y-3">
            <h3 className="cb-eyebrow">Tip Queue ({submissions.length})</h3>
            {submissions.length === 0 ? (
              <div className="cb-empty border border-dashed border-noir-700 rounded-md">
                No intelligence submissions recorded yet.
              </div>
            ) : (
              <div className="cb-list">
                {submissions.map((sub) => {
                  const assessment = scoreTipCredibility(sub.content, {
                    sourceCategory: sub.sourceCategory,
                    locationMentioned: sub.locationMentioned,
                    knownEntities: caseEntities,
                  });
                  return (
                    <div key={sub.id} className="cb-card cb-card-pad space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="cb-faint cb-mono text-[10px]">
                          {new Date(sub.submittedAt).toLocaleString()} • {sub.sourceCategory.replace('_', ' ').toUpperCase()}
                        </span>
                        <div className="flex items-center gap-2">
                          <span
                            className={`cb-badge ${
                              sub.status === 'verified_lead'
                                ? 'cb-badge-green'
                                : sub.status === 'dismissed_spam'
                                ? 'line-through'
                                : 'cb-badge-amber'
                            }`}
                          >
                            {(sub.credibilityScore * 100).toFixed(0)}% Credibility • {sub.status.replace(/_/g, ' ')}
                          </span>
                          <button
                            onClick={() => handleDelete(sub.id)}
                            className="cb-btn cb-btn-ghost cb-btn-icon cb-btn-sm"
                            title="Delete submission"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      <p className="text-noir-200 text-[12px] leading-relaxed">&ldquo;{sub.content}&rdquo;</p>
                      {sub.locationMentioned && (
                        <div className="text-[10px] cb-faint cb-mono uppercase tracking-wider">
                          Mentioned Location: <strong className="text-noir-200">{sub.locationMentioned}</strong>
                        </div>
                      )}

                      {/* Transparent credibility factor breakdown */}
                      <details className="group">
                        <summary className="text-[10px] text-noir-500 hover:text-noir-300 cursor-pointer flex items-center gap-1 list-none cb-mono uppercase tracking-wider">
                          <Gauge className="w-3 h-3" /> Credibility factors ({assessment.factors.length})
                        </summary>
                        <ul className="mt-1 space-y-0.5 pl-4">
                          {assessment.factors.map((f, i) => (
                            <li key={i} className="text-[10px] cb-dim cb-mono">
                              {f.points > 0 ? '+' : '•'} {f.label}
                              {f.points > 0 && <span className="cb-green"> (+{f.points.toFixed(2)})</span>}
                            </li>
                          ))}
                        </ul>
                      </details>

                      {sub.investigatorNotes && (
                        <div className="text-[10px] cb-dim italic border-l-2 border-noir-700 pl-2">
                          {sub.investigatorNotes}
                        </div>
                      )}

                      {/* Triage actions */}
                      <div className="pt-2.5 border-t border-noir-700 flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex gap-1.5">
                          {sub.status !== 'verified_lead' && (
                            <button
                              onClick={() => handleTriage(sub, 'verified_lead')}
                              className="cb-btn cb-btn-ghost cb-btn-sm cb-green"
                            >
                              ✓ Verify Lead
                            </button>
                          )}
                          {sub.status !== 'dismissed_spam' && (
                            <button
                              onClick={() => handleTriage(sub, 'dismissed_spam')}
                              className="cb-btn cb-btn-ghost cb-btn-sm"
                            >
                              Dismiss
                            </button>
                          )}
                        </div>
                        {onPromoteToCase && sub.status !== 'dismissed_spam' && (
                          <button
                            onClick={() => {
                              onPromoteToCase(sub.content);
                              onClose();
                            }}
                            className="cb-btn cb-btn-ghost cb-btn-sm cb-amber"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" /> Send to AI Extraction Staging
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
