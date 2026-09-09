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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-4xl max-h-[90vh] bg-noir-900 border border-noir-700 rounded-xl shadow-2xl flex flex-col font-mono text-xs text-noir-200 overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-noir-850 border-b border-noir-700">
          <div className="flex items-center gap-2.5">
            <Upload className="w-5 h-5 text-crimson" />
            <div>
              <h2 className="text-sm font-bold text-noir-100 uppercase tracking-wider">
                Document Ingestion & AI Intelligence Extraction
              </h2>
              <p className="text-[11px] text-noir-400">
                Ingest reports, FIRs, CDRs, or transcripts. Extracted entities require investigator confirmation.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-noir-400 hover:text-noir-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {!extractionResult ? (
            <>
              {/* Preloaded Samples Bar */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-noir-400 uppercase">Pre-loaded Samples:</span>
                {SAMPLE_REPORTS.map((s, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSelectSample(s)}
                    className="px-2.5 py-1 bg-noir-800 hover:bg-noir-700 text-noir-300 hover:text-noir-100 rounded border border-noir-700 text-[11px] transition-colors"
                  >
                    {s.title}
                  </button>
                ))}
              </div>

              {/* Title & Document Type */}
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2 space-y-1">
                  <label className="text-[10px] uppercase text-noir-400">Document Designation / Source Title</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-noir-800 border border-noir-700 rounded px-3 py-2 text-noir-100 focus:border-crimson focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase text-noir-400">Document Type</label>
                  <select
                    value={docType}
                    onChange={(e) => setDocType(e.target.value)}
                    className="w-full bg-noir-800 border border-noir-700 rounded px-3 py-2 text-noir-100 focus:border-crimson focus:outline-none"
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
              <div className="space-y-1">
                <label className="text-[10px] uppercase text-noir-400">Raw Document Text / Transcribed Content</label>
                <textarea
                  rows={9}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Paste FIR text, seized chat logs, phone numbers, vehicle numbers, or bank transfers..."
                  className="w-full bg-noir-950 border border-noir-700 rounded-lg p-3 text-[11px] text-noir-100 font-mono leading-relaxed focus:border-crimson focus:outline-none"
                />
              </div>

              {errorMsg && (
                <div className="p-3 bg-crimson/10 border border-crimson/40 rounded text-crimson flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}
            </>
          ) : (
            /* Extraction Staging Area */
            <div className="space-y-4">
              <div className="p-3 bg-noir-850 border border-noir-700 rounded-lg space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-accent flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4" /> AI EXTRACTION SUMMARY
                  </span>
                  <span className="text-[10px] text-noir-400 uppercase">Engine: {sourceUsed}</span>
                </div>
                <p className="text-noir-300 text-[11px]">{extractionResult.investigativeSummary}</p>
              </div>

              {/* Proposed Entities Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-noir-100 uppercase">Proposed Entities ({stagingEntities.length})</h3>
                  <span className="text-[10px] text-noir-400">Uncheck any false leads before committing</span>
                </div>

                <div className="max-h-52 overflow-y-auto border border-noir-700 rounded-lg divide-y divide-noir-800">
                  {stagingEntities.map((ent, idx) => (
                    <div key={idx} className="p-2.5 bg-noir-950/60 flex items-center justify-between gap-3 hover:bg-noir-900">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={ent.checked}
                          onChange={(e) => {
                            const copy = [...stagingEntities];
                            copy[idx].checked = e.target.checked;
                            setStagingEntities(copy);
                          }}
                          className="accent-crimson rounded"
                        />
                        <div>
                          <div className="font-bold text-noir-100">{ent.label}</div>
                          <div className="text-[10px] text-noir-400">
                            Type: <span className="uppercase text-noir-300">{ent.type}</span> • Card:{' '}
                            <span className="uppercase text-noir-300">{ent.visualType}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="px-2 py-0.5 bg-noir-800 rounded text-amber-accent font-bold">
                          {(ent.confidence * 100).toFixed(0)}% Conf
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Proposed Relationships */}
              {stagingRelationships.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-bold text-noir-100 uppercase">
                    Proposed Connections ({stagingRelationships.length})
                  </h3>
                  <div className="max-h-40 overflow-y-auto border border-noir-700 rounded-lg divide-y divide-noir-800">
                    {stagingRelationships.map((rel, idx) => (
                      <div key={idx} className="p-2 bg-noir-950/60 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <input
                            type="checkbox"
                            checked={rel.checked}
                            onChange={(e) => {
                              const copy = [...stagingRelationships];
                              copy[idx].checked = e.target.checked;
                              setStagingRelationships(copy);
                            }}
                            className="accent-crimson rounded"
                          />
                          <span className="text-noir-200">
                            <strong>{rel.sourceLabel}</strong> ──[<span className="text-crimson font-bold">{rel.predicate}</span>]──►{' '}
                            <strong>{rel.targetLabel}</strong>
                          </span>
                        </div>
                        <span className="text-[10px] text-noir-400 font-mono">{(rel.confidence * 100).toFixed(0)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Proposed Timeline Events */}
              {stagingEvents.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-bold text-noir-100 uppercase flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-accent" />
                    Proposed Chronology Events ({stagingEvents.length})
                  </h3>
                  <div className="max-h-36 overflow-y-auto border border-noir-700 rounded-lg divide-y divide-noir-800">
                    {stagingEvents.map((ev, idx) => (
                      <div key={idx} className="p-2 bg-noir-950/60 flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2.5">
                          <input
                            type="checkbox"
                            checked={ev.checked}
                            onChange={(e) => {
                              const copy = [...stagingEvents];
                              copy[idx].checked = e.target.checked;
                              setStagingEvents(copy);
                            }}
                            className="accent-crimson rounded mt-0.5"
                          />
                          <div>
                            <div className="text-noir-200">{ev.description}</div>
                            {ev.entitiesInvolved?.length > 0 && (
                              <div className="text-[10px] text-noir-500">Actors: {ev.entitiesInvolved.join(', ')}</div>
                            )}
                          </div>
                        </div>
                        <span className="text-[10px] text-amber-accent font-mono whitespace-nowrap">
                          {ev.timestamp && !Number.isNaN(new Date(ev.timestamp).getTime())
                            ? new Date(ev.timestamp).toLocaleString()
                            : 'undated'}
                        </span>
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-noir-500 italic">
                    Committed events join the case chronology and power the temporal scrubber. Undated events are
                    anchored to ingestion time and explicitly flagged.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 bg-noir-850 border-t border-noir-700">
          {!extractionResult ? (
            <>
              <button onClick={onClose} className="px-4 py-2 text-noir-400 hover:text-noir-200">
                Cancel
              </button>
              <button
                onClick={handleRunExtraction}
                disabled={isExtracting || !content.trim()}
                className="px-5 py-2 bg-crimson hover:bg-crimson-bright disabled:opacity-40 text-white rounded font-bold flex items-center gap-2 transition-colors"
              >
                {isExtracting ? (
                  <>
                    <span className="animate-spin">⚙</span> Extracting with CrimeLens AI...
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
                className="px-4 py-2 text-noir-400 hover:text-noir-200"
              >
                ← Back to Raw Text
              </button>
              <button
                onClick={handleCommit}
                className="px-5 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded font-bold flex items-center gap-2 transition-colors"
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
