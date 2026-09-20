'use client';

import React, { useState, useMemo } from 'react';
import { X, FolderOpen, Plus, Trash2, BarChart3, TrendingUp } from 'lucide-react';
import { InvestigationCase } from '@/lib/types/investigation';
import { CaseSummary } from '@/lib/graph/graphApi';
import { rankCaseSummaries } from '@/lib/cases/prioritization';

interface CaseSwitcherModalProps {
  isOpen: boolean;
  activeCaseId: string | null;
  summaries: CaseSummary[];
  onClose: () => void;
  onSelectCase: (caseId: string) => void;
  onCreateCase: (data: Partial<InvestigationCase>) => Promise<void>;
  onDeleteCase: (caseId: string) => Promise<void>;
}

const NEW_CASE_FORM_ID = 'cb-new-case-form';

export const CaseSwitcherModal: React.FC<CaseSwitcherModalProps> = ({
  isOpen,
  activeCaseId,
  summaries,
  onClose,
  onSelectCase,
  onCreateCase,
  onDeleteCase,
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [expandedCaseId, setExpandedCaseId] = useState<string | null>(null);

  // New Case Form
  const [title, setTitle] = useState('');
  const [caseNumber, setCaseNumber] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'critical'>('high');
  const [jurisdiction, setJurisdiction] = useState('CID Central Forensics');
  const [leadInvestigator, setLeadInvestigator] = useState('Inspector Dev Sharma');
  const [incidentDate, setIncidentDate] = useState('');

  // Portfolio ranking computed from Neo4j-side graph summaries
  const ranked = useMemo(() => rankCaseSummaries(summaries), [summaries]);

  if (!isOpen) return null;

  const handleCreateCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    await onCreateCase({
      title,
      caseNumber,
      description,
      priority,
      jurisdiction,
      leadInvestigator,
      incidentDate: incidentDate ? new Date(incidentDate).toISOString() : undefined,
    });
    setTitle('');
    setCaseNumber('');
    setDescription('');
    setIncidentDate('');
    setIsCreating(false);
    onClose();
  };

  return (
    <div className="cb-modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="cb-dossier cb-case-dossier w-full max-w-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="cb-dossier-head flex items-center justify-between px-5 py-4">
          <div className="flex items-center gap-2.5">
            <FolderOpen className="w-5 h-5 text-crimson flex-shrink-0" />
            <div>
              <h2 className="text-sm font-bold">Investigation Cases & Prioritization Ranking</h2>
              <p className="text-[11px] cb-dim">
                Portfolio ranked live from the Neo4j graph by risk severity, network density, anomaly load and urgency.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="cb-btn cb-btn-ghost cb-btn-icon" title="Close case switcher">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="cb-dossier-body cb-scroll flex-1 p-5 space-y-5 overflow-y-auto max-h-[75vh]">
          {!isCreating ? (
            <>
              {/* Existing Cases List */}
              <div className="flex items-center justify-between">
                <span className="cb-eyebrow">
                  Available Cases ({ranked.length})
                </span>
                <button
                  onClick={() => setIsCreating(true)}
                  className="cb-btn cb-btn-primary cb-btn-sm"
                >
                  <Plus className="w-3.5 h-3.5" /> Initialize New Case
                </button>
              </div>

              <div className="cb-list">
                {ranked.map(({ caseItem: c, priority: score }) => (
                  <div
                    key={c.id}
                    className="cb-card cb-card-pad"
                    style={
                      activeCaseId === c.id
                        ? {
                            borderColor: '#6e231c',
                            background:
                              'linear-gradient(145deg, rgba(70, 26, 20, 0.6), rgba(18, 12, 10, 0.92))',
                          }
                        : undefined
                    }
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div
                        className="flex-1 cursor-pointer"
                        onClick={() => {
                          onSelectCase(c.id);
                          onClose();
                        }}
                      >
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-sm text-noir-100">{c.title}</h3>
                          {activeCaseId === c.id && (
                            <span className="cb-badge cb-badge-red">Active</span>
                          )}
                          <span className="cb-badge cb-badge-amber">
                            <TrendingUp className="w-3 h-3" /> Priority {(score.score * 100).toFixed(0)}
                          </span>
                        </div>
                        <div className="cb-mono text-[10px] cb-dim mt-1">
                          {c.caseNumber} · Lead: {c.leadInvestigator} · {c.jurisdiction}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span
                          className={
                            c.priority === 'critical' || c.priority === 'high'
                              ? 'cb-badge cb-badge-red'
                              : 'cb-badge cb-badge-amber'
                          }
                        >
                          {c.priority}
                        </span>
                        <button
                          onClick={() => setExpandedCaseId(expandedCaseId === c.id ? null : c.id)}
                          className="cb-btn cb-btn-ghost cb-btn-icon cb-btn-sm"
                          title="Prioritization breakdown"
                        >
                          <BarChart3 className="w-3.5 h-3.5" />
                        </button>
                        {activeCaseId !== c.id && (
                          <button
                            onClick={() => {
                              if (
                                window.confirm(
                                  `Permanently delete case "${c.title}" with ALL its entities, connections, documents and audit records from the Neo4j graph?`
                                )
                              ) {
                                onDeleteCase(c.id);
                              }
                            }}
                            className="cb-btn cb-btn-danger cb-btn-icon cb-btn-sm"
                            title="Delete case"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <p className="text-[11px] cb-dim mt-2 line-clamp-2">{c.description}</p>

                    {/* Graph summary chips */}
                    <div className="flex items-center gap-3 mt-2 cb-mono text-[10px] cb-faint">
                      <span>{summaries.find((s) => s.caseItem.id === c.id)?.entityCount ?? 0} entities</span>
                      <span>{summaries.find((s) => s.caseItem.id === c.id)?.relationshipCount ?? 0} links</span>
                      <span className="cb-amber">
                        {summaries.find((s) => s.caseItem.id === c.id)?.anomalyCount ?? 0} open anomalies
                      </span>
                    </div>

                    {/* Prioritization factor breakdown */}
                    {expandedCaseId === c.id && (
                      <>
                        <div className="cb-divider" />
                        <div className="space-y-1.5">
                          {score.factors.map((f) => (
                            <div key={f.label} className="flex items-center gap-2">
                              <span className="w-32 cb-mono text-[9px] uppercase cb-dim flex-shrink-0">{f.label}</span>
                              <div className="cb-progress flex-1">
                                <span
                                  style={{
                                    width: `${Math.round(f.value * 100)}%`,
                                    background:
                                      f.value > 0.6 ? '#e13c32' : f.value > 0.3 ? '#d9a520' : '#2f5f9e',
                                  }}
                                />
                              </div>
                              <span className="cb-mono text-[9px] cb-faint w-44 truncate text-right" title={f.detail}>
                                {f.detail}
                              </span>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-4 gap-3 pt-1">
                <div className="cb-metric p-3">
                  <div className="cb-eyebrow">Cases</div>
                  <div className="text-xl font-bold text-noir-100 mt-1">{summaries.length}</div>
                </div>
                <div className="cb-metric p-3">
                  <div className="cb-eyebrow">Entities</div>
                  <div className="text-xl font-bold text-noir-100 mt-1">
                    {summaries.reduce((sum, item) => sum + item.entityCount, 0)}
                  </div>
                </div>
                <div className="cb-metric p-3">
                  <div className="cb-eyebrow">Links</div>
                  <div className="text-xl font-bold text-noir-100 mt-1">
                    {summaries.reduce((sum, item) => sum + item.relationshipCount, 0)}
                  </div>
                </div>
                <div className="cb-metric p-3">
                  <div className="cb-eyebrow">Open alerts</div>
                  <div className="text-xl font-bold cb-red mt-1">
                    {summaries.reduce((sum, item) => sum + item.anomalyCount, 0)}
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* New Case Form */
            <form id={NEW_CASE_FORM_ID} onSubmit={handleCreateCase} className="space-y-4">
              <div>
                <label className="cb-field-label">Investigation Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Operation Nightfall: Cyber Syndicate"
                  className="cb-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="cb-field-label">Case Reference Number</label>
                  <input
                    type="text"
                    value={caseNumber}
                    onChange={(e) => setCaseNumber(e.target.value)}
                    placeholder="CR-2026-XXXX (auto if blank)"
                    className="cb-input"
                  />
                </div>
                <div>
                  <label className="cb-field-label">Case Priority Ranking</label>
                  <select
                    value={priority}
                    onChange={(e: any) => setPriority(e.target.value)}
                    className="cb-select"
                  >
                    <option value="critical">CRITICAL (Immediate Public Risk)</option>
                    <option value="high">HIGH (Active Organized Syndicate)</option>
                    <option value="medium">MEDIUM (Standard Forensic Inquiry)</option>
                    <option value="low">LOW (Cold / Preliminary)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="cb-field-label">Lead Officer / Team</label>
                  <input
                    type="text"
                    value={leadInvestigator}
                    onChange={(e) => setLeadInvestigator(e.target.value)}
                    className="cb-input"
                  />
                </div>
                <div>
                  <label className="cb-field-label">Jurisdiction / Agency</label>
                  <input
                    type="text"
                    value={jurisdiction}
                    onChange={(e) => setJurisdiction(e.target.value)}
                    className="cb-input"
                  />
                </div>
              </div>

              <div>
                <label className="cb-field-label">
                  Incident Date (anchors anomaly windows & timeline)
                </label>
                <input
                  type="date"
                  value={incidentDate}
                  onChange={(e) => setIncidentDate(e.target.value)}
                  className="cb-input"
                />
              </div>

              <div>
                <label className="cb-field-label">Investigation Brief / Scope</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Outline key allegations, incident overview, and intelligence goals..."
                  className="cb-textarea"
                />
              </div>
            </form>
          )}
        </div>

        {/* Sticky action footer */}
        {isCreating ? (
          <div className="cb-dossier-foot flex items-center justify-end gap-3 px-5 py-3">
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="cb-btn cb-btn-ghost"
            >
              Cancel
            </button>
            <button
              type="submit"
              form={NEW_CASE_FORM_ID}
              className="cb-btn cb-btn-primary"
            >
              Create Investigation
            </button>
          </div>
        ) : (
          <div className="cb-dossier-foot flex items-center justify-between px-5 py-2.5 cb-mono text-[10px] cb-faint">
            <span>
              {ranked.length} case dossier{ranked.length === 1 ? '' : 's'} ranked by composite priority
            </span>
            <span>Select a dossier to open it on the board</span>
          </div>
        )}
      </div>
    </div>
  );
};
