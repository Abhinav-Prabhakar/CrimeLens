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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-3xl max-h-[85vh] bg-noir-900 border border-noir-700 rounded-xl shadow-2xl flex flex-col font-mono text-xs text-noir-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-noir-850 border-b border-noir-700">
          <div className="flex items-center gap-2.5">
            <Inbox className="w-5 h-5 text-amber-accent" />
            <div>
              <h2 className="text-sm font-bold text-noir-100 uppercase tracking-wider">
                Public Intelligence & Anonymous Tip Intake
              </h2>
              <p className="text-[11px] text-noir-400">
                Citizen tips, witness submissions, and credibility triage. Tips do not enter the graph without
                investigator triage. Persisted locally in IndexedDB.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-noir-400 hover:text-noir-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Submit a New Tip Form */}
          <form onSubmit={handleSubmit} className="p-4 bg-noir-850 rounded-xl border border-noir-700 space-y-3">
            <h3 className="font-bold text-noir-100 uppercase text-[11px]">Submit Intelligence Tip</h3>
            <textarea
              rows={3}
              value={newTip}
              onChange={(e) => setNewTip(e.target.value)}
              placeholder="Describe observation, suspect sighting, vehicle movement, or overheard conversation..."
              className="w-full bg-noir-950 border border-noir-700 rounded p-2.5 text-noir-100 text-[11px] focus:border-crimson focus:outline-none"
            />
            <div className="flex items-center justify-between gap-3">
              <input
                type="text"
                value={newLocation}
                onChange={(e) => setNewLocation(e.target.value)}
                placeholder="Specific Location / Landmark"
                className="flex-1 bg-noir-950 border border-noir-700 rounded px-2.5 py-1.5 text-noir-100 text-[11px] focus:border-crimson focus:outline-none"
              />
              <select
                value={sourceCategory}
                onChange={(e: any) => setSourceCategory(e.target.value)}
                className="bg-noir-950 border border-noir-700 rounded px-2.5 py-1.5 text-noir-100 text-[11px] focus:outline-none"
              >
                <option value="anonymous_tip">Anonymous Tip</option>
                <option value="witness_portal">Witness Portal (semi-identified)</option>
                <option value="hotline">Hotline Call</option>
              </select>
              <button
                type="submit"
                disabled={isSubmitting || !newTip.trim()}
                className="px-4 py-1.5 bg-crimson hover:bg-crimson-bright disabled:opacity-40 text-white rounded font-bold transition-colors"
              >
                {isSubmitting ? 'Recording...' : 'Submit Lead'}
              </button>
            </div>
          </form>

          {/* Pending Submissions Queue */}
          <div className="space-y-3">
            <h3 className="font-bold text-noir-100 uppercase">Tip Queue ({submissions.length})</h3>
            {submissions.length === 0 ? (
              <div className="py-8 text-center text-noir-500 text-[11px]">
                No intelligence submissions recorded yet.
              </div>
            ) : (
              <div className="space-y-2.5">
                {submissions.map((sub) => {
                  const assessment = scoreTipCredibility(sub.content, {
                    sourceCategory: sub.sourceCategory,
                    locationMentioned: sub.locationMentioned,
                    knownEntities: caseEntities,
                  });
                  return (
                    <div key={sub.id} className="p-3 bg-noir-950 rounded-lg border border-noir-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-noir-400">
                          {new Date(sub.submittedAt).toLocaleString()} • {sub.sourceCategory.replace('_', ' ').toUpperCase()}
                        </span>
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              sub.status === 'verified_lead'
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                : sub.status === 'dismissed_spam'
                                ? 'bg-noir-800 text-noir-500 border border-noir-700 line-through'
                                : 'bg-amber-accent/20 text-amber-accent'
                            }`}
                          >
                            {(sub.credibilityScore * 100).toFixed(0)}% CREDIBILITY • {sub.status.toUpperCase()}
                          </span>
                          <button
                            onClick={() => handleDelete(sub.id)}
                            className="p-1 text-noir-600 hover:text-crimson transition-colors"
                            title="Delete submission"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      <p className="text-noir-200 text-[11px] leading-relaxed">&ldquo;{sub.content}&rdquo;</p>
                      {sub.locationMentioned && (
                        <div className="text-[10px] text-noir-400">
                          Mentioned Location: <strong className="text-noir-200">{sub.locationMentioned}</strong>
                        </div>
                      )}

                      {/* Transparent credibility factor breakdown */}
                      <details className="group">
                        <summary className="text-[10px] text-noir-500 hover:text-noir-300 cursor-pointer flex items-center gap-1 list-none">
                          <Gauge className="w-3 h-3" /> Credibility factors ({assessment.factors.length})
                        </summary>
                        <ul className="mt-1 space-y-0.5 pl-4">
                          {assessment.factors.map((f, i) => (
                            <li key={i} className="text-[10px] text-noir-400">
                              {f.points > 0 ? '+' : '•'} {f.label}
                              {f.points > 0 && <span className="text-emerald-500"> (+{f.points.toFixed(2)})</span>}
                            </li>
                          ))}
                        </ul>
                      </details>

                      {sub.investigatorNotes && (
                        <div className="text-[10px] text-noir-400 italic border-l-2 border-noir-700 pl-2">
                          {sub.investigatorNotes}
                        </div>
                      )}

                      {/* Triage actions */}
                      <div className="pt-2 border-t border-noir-800 flex items-center justify-between">
                        <div className="flex gap-1.5">
                          {sub.status !== 'verified_lead' && (
                            <button
                              onClick={() => handleTriage(sub, 'verified_lead')}
                              className="px-2.5 py-1 bg-emerald-950 hover:bg-emerald-900 text-emerald-400 border border-emerald-800 rounded text-[10px] font-bold transition-colors"
                            >
                              ✓ Verify Lead
                            </button>
                          )}
                          {sub.status !== 'dismissed_spam' && (
                            <button
                              onClick={() => handleTriage(sub, 'dismissed_spam')}
                              className="px-2.5 py-1 bg-noir-800 hover:bg-noir-700 text-noir-400 rounded text-[10px] font-bold transition-colors"
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
                            className="px-2.5 py-1 bg-noir-800 hover:bg-noir-700 text-amber-accent rounded text-[10px] font-bold flex items-center gap-1.5 transition-colors"
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
