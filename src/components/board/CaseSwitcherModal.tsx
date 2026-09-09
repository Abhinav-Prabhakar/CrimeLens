'use client';

import React, { useState, useEffect } from 'react';
import { X, FolderOpen, Plus, Shield, Check, Star, AlertCircle, BarChart3 } from 'lucide-react';
import { InvestigationCase } from '@/lib/types/investigation';
import { getAllCases, saveCase } from '@/lib/storage/db';

interface CaseSwitcherModalProps {
  isOpen: boolean;
  activeCaseId: string | null;
  onClose: () => void;
  onSelectCase: (caseItem: InvestigationCase) => void;
}

export const CaseSwitcherModal: React.FC<CaseSwitcherModalProps> = ({
  isOpen,
  activeCaseId,
  onClose,
  onSelectCase,
}) => {
  const [cases, setCases] = useState<InvestigationCase[]>([]);
  const [isCreating, setIsCreating] = useState(false);

  // New Case Form
  const [title, setTitle] = useState('');
  const [caseNumber, setCaseNumber] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'critical'>('high');
  const [jurisdiction, setJurisdiction] = useState('CID Central Forensics');
  const [leadInvestigator, setLeadInvestigator] = useState('Inspector Dev Sharma');

  useEffect(() => {
    if (isOpen) {
      getAllCases().then((all) => setCases(all));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCreateCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const newCase: InvestigationCase = {
      id: `case_${Date.now()}`,
      title,
      caseNumber: caseNumber || `CR-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      description,
      status: 'active',
      priority,
      leadInvestigator,
      jurisdiction,
      incidentDate: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags: ['active_inquiry'],
    };

    await saveCase(newCase);
    setCases((prev) => [...prev, newCase]);
    onSelectCase(newCase);
    setIsCreating(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl bg-noir-900 border border-noir-700 rounded-xl shadow-2xl flex flex-col font-mono text-xs text-noir-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-noir-850 border-b border-noir-700">
          <div className="flex items-center gap-2.5">
            <FolderOpen className="w-5 h-5 text-crimson" />
            <div>
              <h2 className="text-sm font-bold text-noir-100 uppercase tracking-wider">
                Investigation Cases & Case Prioritization
              </h2>
              <p className="text-[11px] text-noir-400">
                Switch active inquiry dossiers or initialize a new forensic investigation.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-noir-400 hover:text-noir-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
          {!isCreating ? (
            <>
              {/* Existing Cases List */}
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-noir-300 uppercase">Available Cases ({cases.length})</span>
                <button
                  onClick={() => setIsCreating(true)}
                  className="px-3 py-1.5 bg-crimson hover:bg-crimson-bright text-white rounded font-bold flex items-center gap-1.5 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Initialize New Case
                </button>
              </div>

              <div className="space-y-3">
                {cases.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => {
                      onSelectCase(c);
                      onClose();
                    }}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      activeCaseId === c.id
                        ? 'bg-crimson/15 border-crimson shadow-md'
                        : 'bg-noir-850 border-noir-700 hover:border-noir-500'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-sm text-noir-100">{c.title}</h3>
                          {activeCaseId === c.id && (
                            <span className="px-2 py-0.5 bg-crimson text-white rounded text-[9px] font-bold">
                              ACTIVE
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-noir-400 mt-0.5">
                          {c.caseNumber} • Lead: {c.leadInvestigator} • {c.jurisdiction}
                        </div>
                      </div>

                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          c.priority === 'critical'
                            ? 'bg-crimson text-white'
                            : c.priority === 'high'
                            ? 'bg-crimson/20 text-crimson border border-crimson/40'
                            : 'bg-amber-accent/20 text-amber-accent'
                        }`}
                      >
                        {c.priority} PRIORITY
                      </span>
                    </div>

                    <p className="text-[11px] text-noir-300 mt-2 line-clamp-2">{c.description}</p>
                  </div>
                ))}
              </div>
            </>
          ) : (
            /* New Case Form */
            <form onSubmit={handleCreateCase} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] uppercase text-noir-400">Investigation Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Operation Nightfall: Cyber Syndicate"
                  className="w-full bg-noir-950 border border-noir-700 rounded px-3 py-2 text-noir-100 text-xs focus:border-crimson focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase text-noir-400">Case Reference Number</label>
                  <input
                    type="text"
                    value={caseNumber}
                    onChange={(e) => setCaseNumber(e.target.value)}
                    placeholder="CR-2026-XXXX"
                    className="w-full bg-noir-950 border border-noir-700 rounded px-3 py-2 text-noir-100 text-xs focus:border-crimson focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase text-noir-400">Case Priority Ranking</label>
                  <select
                    value={priority}
                    onChange={(e: any) => setPriority(e.target.value)}
                    className="w-full bg-noir-950 border border-noir-700 rounded px-3 py-2 text-noir-100 text-xs focus:border-crimson focus:outline-none"
                  >
                    <option value="critical">CRITICAL (Immediate Public Risk)</option>
                    <option value="high">HIGH (Active Organized Syndicate)</option>
                    <option value="medium">MEDIUM (Standard Forensic Inquiry)</option>
                    <option value="low">LOW (Cold / Preliminary)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase text-noir-400">Lead Officer / Team</label>
                  <input
                    type="text"
                    value={leadInvestigator}
                    onChange={(e) => setLeadInvestigator(e.target.value)}
                    className="w-full bg-noir-950 border border-noir-700 rounded px-3 py-2 text-noir-100 text-xs focus:border-crimson focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase text-noir-400">Jurisdiction / Agency</label>
                  <input
                    type="text"
                    value={jurisdiction}
                    onChange={(e) => setJurisdiction(e.target.value)}
                    className="w-full bg-noir-950 border border-noir-700 rounded px-3 py-2 text-noir-100 text-xs focus:border-crimson focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase text-noir-400">Investigation Brief / Scope</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Outline key allegations, incident overview, and intelligence goals..."
                  className="w-full bg-noir-950 border border-noir-700 rounded p-2.5 text-noir-100 text-xs focus:border-crimson focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-noir-800">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-4 py-2 text-noir-400 hover:text-noir-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-crimson hover:bg-crimson-bright text-white rounded font-bold transition-colors"
                >
                  Create Investigation
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
