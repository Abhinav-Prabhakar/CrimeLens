'use client';

import React, { useState, useEffect } from 'react';
import { X, Upload, Sparkles, Check, AlertCircle, FileText, ArrowRight, Clock } from 'lucide-react';
import { ExtractionResult } from '@/lib/ai/extractionPrompt';

interface DocumentIngestModalProps {
  caseId: string;
  isOpen: boolean;
  prefillText?: string;
  onClose: () => void;
  onCommit: (
    entities: any[],
    relationships: any[],
    timelineEvents: any[],
    docMeta: { title: string; documentType: string; rawText: string; summary?: string }
  ) => void;
}

const SAMPLE_REPORTS = [
  {
    title: 'Interrogation Transcript — Daniel Vance',
    type: 'interrogation',
    content: `
CONFIDENTIAL INTERROGATION RECORD
Date: 2026-09-03
Subject: Daniel Vance (DOB: 1992-04-14)
Interrogator: Inspector Dev Sharma

Vance admits to meeting Julian Marlowe at the Royal Yacht Club on August 28th.
States he received an encrypted call on burner phone +91 98112-44120 with drop instructions for Pier 9.
Claims Elena Rostova handled the escrow transfer of $450,000 from Apex Maritime Holdings Ltd.
Mentions getaway driver fled south in Red Sedan MH-01-BX-4912 towards the expressway.
Left fingerprint LP-4 on the security padlock during breach.
    `,
  },
  {
    title: 'Financial Intelligence Unit STR #FIU-9921',
    type: 'financial',
    content: `
SUSPICIOUS TRANSACTION REPORT
Reporting Entity: Standard International Bank
Subject: Apex Maritime Holdings Ltd (Registration BVI-889124)
Transaction: Inward SWIFT wire of $450,000 USD to client escrow account of Elena Rostova.
Beneficial Ownership records indicate connection to antiquities trader Julian Marlowe.
Funds disbursed within 4 hours across three overseas accounts.
    `,
  },
];

export const DocumentIngestModal: React.FC<DocumentIngestModalProps> = ({
  caseId,
  isOpen,
  prefillText,
  onClose,
  onCommit,
}) => {
  const [title, setTitle] = useState('FIR #402/2026 — Pier 9 Follow-up');
  const [docType, setDocType] = useState('fir');
  const [content, setContent] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionResult, setExtractionResult] = useState<ExtractionResult | null>(null);
  const [stagingEntities, setStagingEntities] = useState<any[]>([]);
  const [stagingRelationships, setStagingRelationships] = useState<any[]>([]);
  const [stagingEvents, setStagingEvents] = useState<any[]>([]);
  const [sourceUsed, setSourceUsed] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Prefill from promoted public intel tips
  useEffect(() => {
    if (isOpen && prefillText) {
      setContent(prefillText);
      setTitle('Public Intel Tip — AI Extraction');
      setDocType('public_intel');
      setExtractionResult(null);
    }
  }, [isOpen, prefillText]);

  // Reset staging state whenever the modal closes, so reopening starts clean
  useEffect(() => {
    if (!isOpen) {
      setExtractionResult(null);
      setStagingEntities([]);
      setStagingRelationships([]);
      setStagingEvents([]);
      setErrorMsg('');
      setIsExtracting(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSelectSample = (sample: (typeof SAMPLE_REPORTS)[0]) => {
    setTitle(sample.title);
    setDocType(sample.type);
    setContent(sample.content.trim());
    setExtractionResult(null);
  };

  const handleRunExtraction = async () => {
    if (!content.trim()) return;

    setIsExtracting(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: content,
          documentType: docType,
          caseId,
        }),
      });

      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.error || 'Extraction failed');
      }

      setSourceUsed(json.source || 'ai');
      setExtractionResult(json.data);
      setStagingEntities(json.data.entities.map((e: any) => ({ ...e, checked: true })));
      setStagingRelationships(json.data.relationships.map((r: any) => ({ ...r, checked: true })));
      setStagingEvents((json.data.timelineEvents || []).map((ev: any) => ({ ...ev, checked: true })));
    } catch (err: any) {
      console.error('Extraction error:', err);
      setErrorMsg(err.message || 'Extraction pipeline error. Please check your network or input.');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleCommit = () => {
    const confirmedEntities = stagingEntities.filter((e) => e.checked);
    const confirmedRelationships = stagingRelationships.filter((r) => r.checked);
    const confirmedEvents = stagingEvents.filter((ev) => ev.checked);
    onCommit(confirmedEntities, confirmedRelationships, confirmedEvents, {
      title,
      documentType: docType,
      rawText: content,
      summary: extractionResult?.investigativeSummary,
    });
    onClose();
  };

  return (
    <div className="cb-modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="cb-dossier w-full max-w-4xl max-h-[90vh] flex flex-col font-sans text-xs text-noir-200 overflow-hidden">
        {/* Modal Header */}
        <div className="cb-dossier-head flex items-center justify-between gap-3 px-6 py-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="cb-row-icon text-crimson">
              <Upload className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-noir-100 uppercase tracking-wider">
                Document Ingestion & AI Intelligence Extraction
              </h2>
              <p className="cb-dim text-[11px]">
                Ingest reports, FIRs, CDRs, or transcripts. Extracted entities require investigator confirmation.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="cb-btn cb-btn-ghost cb-btn-icon" title="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="cb-dossier-body cb-scroll flex-1 overflow-y-auto p-6 space-y-5">
          {!extractionResult ? (
            <>
              {/* Preloaded Samples Bar */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="cb-eyebrow">Pre-loaded Samples</span>
                {SAMPLE_REPORTS.map((s, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSelectSample(s)}
                    className="cb-btn cb-btn-ghost cb-btn-sm"
                  >
                    {s.title}
                  </button>
                ))}
              </div>

              {/* Title & Document Type */}
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <label className="cb-field-label">Document Designation / Source Title</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="cb-input"
                  />
                </div>
                <div>
                  <label className="cb-field-label">Document Type</label>
                  <select
                    value={docType}
                    onChange={(e) => setDocType(e.target.value)}
                    className="cb-select"
                  >
                    <option value="fir">FIR / Police Incident Report</option>
                    <option value="interrogation">Interrogation Transcript</option>
                    <option value="cdr">Call Detail Record (CDR)</option>
                    <option value="financial">Financial Transaction Sheet</option>
                    <option value="surveillance">Surveillance / Intelligence Dossier</option>
                    <option value="public_intel">Public Intel / Anonymous Tip</option>
                  </select>
                </div>
              </div>

              {/* Raw Text Input */}
              <div>
                <label className="cb-field-label">Raw Document Text / Transcribed Content</label>
                <textarea
                  rows={9}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Paste FIR text, seized chat logs, phone numbers, vehicle numbers, or bank transfers..."
                  className="cb-textarea cb-mono text-[11px] leading-relaxed"
                />
              </div>

              {errorMsg && (
                <div className="cb-alert cb-alert-red">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 text-crimson" />
                  <span>{errorMsg}</span>
                </div>
              )}
            </>
          ) : (
            /* Extraction Staging Area */
            <div className="space-y-5">
              <div className="cb-card cb-card-pad space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <span className="cb-amber cb-mono font-bold text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4" /> AI Extraction Summary
                  </span>
                  <span className="cb-badge flex-shrink-0">Engine: {sourceUsed}</span>
                </div>
                <p className="text-noir-300 text-[12px] leading-relaxed">{extractionResult.investigativeSummary}</p>
              </div>

              {/* Proposed Entities Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="cb-eyebrow">Proposed Entities ({stagingEntities.length})</h3>
                  <span className="cb-faint text-[10px]">Uncheck any false leads before committing</span>
                </div>

                <div className="cb-card cb-scroll max-h-56 overflow-y-auto p-1.5">
                  <div className="cb-list">
                    {stagingEntities.map((ent, idx) => (
                      <div key={idx} className="cb-row">
                        <input
                          type="checkbox"
                          checked={ent.checked}
                          onChange={(e) => {
                            const copy = [...stagingEntities];
                            copy[idx].checked = e.target.checked;
                            setStagingEntities(copy);
                          }}
                          className="accent-crimson rounded flex-shrink-0"
                        />
                        <div className="cb-row-main">
                          <span className="cb-row-title">{ent.label}</span>
                          <span className="cb-row-sub">Card: {ent.visualType}</span>
                        </div>
                        <span className="cb-badge cb-badge-cobalt flex-shrink-0">{ent.type}</span>
                        <span className="cb-badge cb-badge-amber flex-shrink-0">
                          {(ent.confidence * 100).toFixed(0)}% conf
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Proposed Relationships */}
              {stagingRelationships.length > 0 && (
                <div className="space-y-2">
                  <h3 className="cb-eyebrow">
                    Proposed Connections ({stagingRelationships.length})
                  </h3>
                  <div className="cb-card cb-scroll max-h-44 overflow-y-auto p-1.5">
                    <div className="cb-list">
                      {stagingRelationships.map((rel, idx) => (
                        <div key={idx} className="cb-row">
                          <input
                            type="checkbox"
                            checked={rel.checked}
                            onChange={(e) => {
                              const copy = [...stagingRelationships];
                              copy[idx].checked = e.target.checked;
                              setStagingRelationships(copy);
                            }}
                            className="accent-crimson rounded flex-shrink-0"
                          />
                          <div className="cb-row-main text-[12px] text-noir-200">
                            <strong>{rel.sourceLabel}</strong> ──[<span className="text-crimson font-bold">{rel.predicate}</span>]──►{' '}
                            <strong>{rel.targetLabel}</strong>
                          </div>
                          <span className="cb-badge flex-shrink-0">{(rel.confidence * 100).toFixed(0)}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Proposed Timeline Events */}
              {stagingEvents.length > 0 && (
                <div className="space-y-2">
                  <h3 className="cb-eyebrow flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-accent" />
                    Proposed Chronology Events ({stagingEvents.length})
                  </h3>
                  <div className="cb-card cb-scroll max-h-40 overflow-y-auto p-1.5">
                    <div className="cb-list">
                      {stagingEvents.map((ev, idx) => (
                        <div key={idx} className="cb-row items-start">
                          <input
                            type="checkbox"
                            checked={ev.checked}
                            onChange={(e) => {
                              const copy = [...stagingEvents];
                              copy[idx].checked = e.target.checked;
                              setStagingEvents(copy);
                            }}
                            className="accent-crimson rounded mt-1 flex-shrink-0"
                          />
                          <div className="cb-row-main">
                            <div className="text-[12px] text-noir-200">{ev.description}</div>
                            {ev.entitiesInvolved?.length > 0 && (
                              <span className="cb-row-sub">Actors: {ev.entitiesInvolved.join(', ')}</span>
                            )}
                          </div>
                          <span className="cb-badge cb-badge-amber flex-shrink-0 whitespace-nowrap">
                            {ev.timestamp && !Number.isNaN(new Date(ev.timestamp).getTime())
                              ? new Date(ev.timestamp).toLocaleString()
                              : 'undated'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <p className="cb-faint text-[10px] italic">
                    Committed events join the case chronology and power the temporal scrubber. Undated events are
                    anchored to ingestion time and explicitly flagged.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="cb-dossier-foot flex items-center justify-between px-6 py-4">
          {!extractionResult ? (
            <>
              <button onClick={onClose} className="cb-btn cb-btn-ghost">
                Cancel
              </button>
              <button
                onClick={handleRunExtraction}
                disabled={isExtracting || !content.trim()}
                className="cb-btn cb-btn-primary"
              >
                {isExtracting ? (
                  <>
                    <Sparkles className="w-4 h-4 animate-spin" /> Extracting with CrimeLens AI...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" /> Extract Intelligence
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setExtractionResult(null)}
                className="cb-btn cb-btn-ghost"
              >
                ← Back to Raw Text
              </button>
              <button
                onClick={handleCommit}
                className="cb-btn cb-btn-primary"
              >
                <Check className="w-4 h-4" /> Commit Confirmed to Investigation Graph
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
