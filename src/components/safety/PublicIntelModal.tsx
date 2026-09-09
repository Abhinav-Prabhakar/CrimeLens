'use client';

import React, { useState } from 'react';
import { X, Send, Eye, ShieldCheck, Inbox, ArrowRight } from 'lucide-react';
import { PublicIntelSubmission } from '@/lib/types/investigation';

interface PublicIntelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPromoteToCase?: (tipContent: string) => void;
}

export const PublicIntelModal: React.FC<PublicIntelModalProps> = ({
  isOpen,
  onClose,
  onPromoteToCase,
}) => {
  const [submissions, setSubmissions] = useState<PublicIntelSubmission[]>([
    {
      id: 'tip_1',
      submittedAt: new Date(Date.now() - 3600000 * 4).toISOString(),
      sourceCategory: 'anonymous_tip',
      content: 'Saw a red sedan matching MH-01-BX-4912 parked near an abandoned warehouse in Sector 14 around 22:00.',
      locationMentioned: 'Sector 14 Warehouse',
      credibilityScore: 0.84,
      status: 'verified_lead',
      investigatorNotes: 'Coordinates correlate with surveillance camera ping.',
    },
    {
      id: 'tip_2',
      submittedAt: new Date(Date.now() - 3600000 * 18).toISOString(),
      sourceCategory: 'witness_portal',
      content: 'Man matching description of Daniel Vance seen buying fuel canisters at BP highway station.',
      locationMentioned: 'Highway Fuel Station',
      credibilityScore: 0.72,
      status: 'pending_review',
    },
  ]);

  const [newTip, setNewTip] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTip.trim()) return;

    setIsSubmitting(true);
    setTimeout(() => {
      setSubmissions((prev) => [
        {
          id: `tip_${Date.now()}`,
          submittedAt: new Date().toISOString(),
          sourceCategory: 'anonymous_tip',
          content: newTip,
          locationMentioned: newLocation || 'Unspecified',
          credibilityScore: 0.75,
          status: 'pending_review',
        },
        ...prev,
      ]);
      setNewTip('');
      setNewLocation('');
      setIsSubmitting(false);
    }, 400);
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
                Citizen tips, witness submissions, and credibility screening. Tips do not enter the graph without investigator triage.
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
            <h3 className="font-bold text-noir-100 uppercase text-[11px]">Submit Intelligence Tip (Anonymous Encrypted)</h3>
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
              <button
                type="submit"
                disabled={isSubmitting || !newTip.trim()}
                className="px-4 py-1.5 bg-crimson hover:bg-crimson-bright text-white rounded font-bold transition-colors"
              >
                {isSubmitting ? 'Transmitting...' : 'Submit Lead'}
              </button>
            </div>
          </form>

          {/* Pending Submissions Queue */}
          <div className="space-y-3">
            <h3 className="font-bold text-noir-100 uppercase">Incoming Tip Queue ({submissions.length})</h3>
            <div className="space-y-2.5">
              {submissions.map((sub) => (
                <div key={sub.id} className="p-3 bg-noir-950 rounded-lg border border-noir-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-noir-400">
                      {new Date(sub.submittedAt).toLocaleString()} • {sub.sourceCategory.toUpperCase()}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        sub.status === 'verified_lead'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          : 'bg-amber-accent/20 text-amber-accent'
                      }`}
                    >
                      {(sub.credibilityScore * 100).toFixed(0)}% CREDIBILITY • {sub.status.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-noir-200 text-[11px] leading-relaxed">&ldquo;{sub.content}&rdquo;</p>
                  {sub.locationMentioned && (
                    <div className="text-[10px] text-noir-400">
                      Mentioned Location: <strong className="text-noir-200">{sub.locationMentioned}</strong>
                    </div>
                  )}
                  {onPromoteToCase && (
                    <div className="pt-2 border-t border-noir-800 flex justify-end">
                      <button
                        onClick={() => {
                          onPromoteToCase(sub.content);
                          onClose();
                        }}
                        className="px-2.5 py-1 bg-noir-800 hover:bg-noir-700 text-amber-accent rounded text-[10px] font-bold flex items-center gap-1.5 transition-colors"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" /> Send to AI Extraction Staging
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
