'use client';

import React, { useState } from 'react';
import { X, FileText, Download, Copy, Check, Printer, Shield } from 'lucide-react';
import { InvestigationCase, InvestigationEntity, InvestigationRelationship } from '@/lib/types/investigation';

interface CaseReportModalProps {
  isOpen: boolean;
  activeCase: InvestigationCase | null;
  entities: InvestigationEntity[];
  relationships: InvestigationRelationship[];
  onClose: () => void;
  onReportGenerated?: (reportType: string) => void;
}

export const CaseReportModal: React.FC<CaseReportModalProps> = ({
  isOpen,
  activeCase,
  entities,
  relationships,
  onClose,
  onReportGenerated,
}) => {
  const [reportType, setReportType] = useState<'dossier' | 'fir' | 'network'>('dossier');
  const [copied, setCopied] = useState(false);

  if (!isOpen || !activeCase) return null;

  const generateMarkdownReport = () => {
    const dateStr = new Date().toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    if (reportType === 'fir') {
      return `
# FIRST INFORMATION REPORT (FIR) DRAFT ASSISTANCE
**Report Date:** ${dateStr}
**Investigation Case:** ${activeCase.title} (${activeCase.caseNumber})
**Investigating Unit:** ${activeCase.jurisdiction}
**Lead Officer:** ${activeCase.leadInvestigator}
**Incident Date:** ${activeCase.incidentDate || 'Recent'}

---

### 1. SUMMARY OF OCCURRENCE & OBSERVED FACTS
On or about the stated date, an orchestrated breach occurred at ${entities.find((e) => e.type === 'location')?.label || 'Pier 9 Warehouse'}. 
Evidence collected at the scene includes forensic items and financial traces connecting multiple individuals across jurisdictions.

### 2. ACCUSED PERSONS & PERSONS OF INTEREST
${entities
  .filter((e) => e.type === 'person')
  .map(
    (p) =>
      `- **${p.label}** (${p.visualType.toUpperCase()}): Confidence ${(p.confidence * 100).toFixed(0)}%. Notes: ${
        p.notes || 'Identified person of interest'
      }`
  )
  .join('\n')}

### 3. PHYSICAL & DIGITAL EVIDENCE PROVENANCE
${entities
  .filter((e) => e.type !== 'person')
  .map(
    (item) =>
      `- **${item.label}** [${item.type.toUpperCase()}]: Sourced from ${item.provenance.sourceTitle} (Status: ${
        item.status
      })`
  )
  .join('\n')}

### 4. RELEVANT STATUTORY SECTIONS (RECOMMENDED FOR PROSECUTOR REVIEW)
- Section 303 / Section 305 BNS (Theft in building / dwelling)
- Section 318 BNS (Cheating & fraudulent property transfer)
- Section 61 BNS (Criminal Conspiracy)
- Prevention of Money Laundering Act (PMLA) Section 3/4 (Structured escrow movement)

*DISCLAIMER: AI-generated investigative draft. Requires statutory review by the Public Prosecutor.*
`;
    }

    if (reportType === 'network') {
      return `
# CRIMELENS NETWORK ANALYSIS REPORT
**Case:** ${activeCase.title} (${activeCase.caseNumber})
**Generated:** ${dateStr}

### Network Metrics:
- Total Graph Nodes: ${entities.length}
- Total Active Relationships: ${relationships.length}
- Verified Sourced Links: ${relationships.filter((r) => r.status === 'verified_source').length}

### Intermediaries & High Centrality Nodes:
${entities
  .slice(0, 5)
  .map((e) => `- **${e.label}** (${e.type}): Status: ${e.status}, Confidence: ${(e.confidence * 100).toFixed(0)}%`)
  .join('\n')}

### Documented Relational Connections:
${relationships
  .map((r) => {
    const src = entities.find((e) => e.id === r.sourceId)?.label || r.sourceId;
    const tgt = entities.find((e) => e.id === r.targetId)?.label || r.targetId;
    return `- ${src} ──[${r.predicate} (${r.label || ''})]──► ${tgt} (Confidence: ${(r.confidence * 100).toFixed(0)}%)`;
  })
  .join('\n')}
`;
    }

    // Default: Full Case Dossier
    return `
# CONFIDENTIAL INVESTIGATIVE DOSSIER
## ${activeCase.title} — Case #${activeCase.caseNumber}
**Date of Dossier:** ${dateStr}
**Lead Investigator:** ${activeCase.leadInvestigator}
**Jurisdiction:** ${activeCase.jurisdiction}
**Status:** ${activeCase.status.toUpperCase()} | Priority: ${activeCase.priority.toUpperCase()}

---

### Executive Overview
${activeCase.description}

### Complete Entity Registry (${entities.length} items)
${entities
  .map(
    (e) => `#### ${e.label} [${e.type.toUpperCase()}]
- **Status:** ${e.status} (Confidence: ${(e.confidence * 100).toFixed(0)}%)
- **Card Type:** ${e.visualType}
- **Source:** ${e.provenance.sourceTitle} (${e.provenance.sourceType})
- **Notes:** ${e.notes || 'No remarks recorded.'}
`
  )
  .join('\n')}

### Relational Graph Connections (${relationships.length} links)
${relationships
  .map((r) => {
    const src = entities.find((e) => e.id === r.sourceId)?.label || r.sourceId;
    const tgt = entities.find((e) => e.id === r.targetId)?.label || r.targetId;
    return `- **${src}** connected to **${tgt}** via predicate \`${r.predicate}\` (${r.notes || r.label || 'Observed'})`;
  })
  .join('\n')}
`;
  };

  const reportText = generateMarkdownReport().trim();

  const handleCopy = () => {
    navigator.clipboard.writeText(reportText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([reportText], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeCase.caseNumber}_${reportType}_report.md`;
    a.click();
    URL.revokeObjectURL(url);
    onReportGenerated?.(reportType);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-4xl max-h-[90vh] bg-noir-900 border border-noir-700 rounded-xl shadow-2xl flex flex-col font-mono text-xs text-noir-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-noir-850 border-b border-noir-700">
          <div className="flex items-center gap-2.5">
            <FileText className="w-5 h-5 text-amber-accent" />
            <div>
              <h2 className="text-sm font-bold text-noir-100 uppercase tracking-wider">
                Investigative Reports & FIR Drafting Assistance
              </h2>
              <p className="text-[11px] text-noir-400">
                Generate structured case briefs, network intelligence reports, and statutory FIR drafting aids.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-noir-400 hover:text-noir-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs Bar */}
        <div className="flex items-center gap-2 px-6 py-2.5 bg-noir-950/80 border-b border-noir-800">
          <button
            onClick={() => setReportType('dossier')}
            className={`px-3 py-1.5 rounded font-bold transition-colors ${
              reportType === 'dossier'
                ? 'bg-crimson text-white'
                : 'bg-noir-800 text-noir-400 hover:text-noir-200'
            }`}
          >
            Comprehensive Case Dossier
          </button>
          <button
            onClick={() => setReportType('fir')}
            className={`px-3 py-1.5 rounded font-bold transition-colors ${
              reportType === 'fir'
                ? 'bg-crimson text-white'
                : 'bg-noir-800 text-noir-400 hover:text-noir-200'
            }`}
          >
            FIR Draft Assistance
          </button>
          <button
            onClick={() => setReportType('network')}
            className={`px-3 py-1.5 rounded font-bold transition-colors ${
              reportType === 'network'
                ? 'bg-crimson text-white'
                : 'bg-noir-800 text-noir-400 hover:text-noir-200'
            }`}
          >
            Network Analysis Summary
          </button>
        </div>

        {/* Report Preview */}
        <div className="flex-1 overflow-y-auto p-6 bg-noir-950">
          <pre className="p-4 bg-noir-900 border border-noir-800 rounded-lg text-noir-200 text-[11px] font-mono leading-relaxed whitespace-pre-wrap selection:bg-crimson selection:text-white">
            {reportText}
          </pre>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 bg-noir-850 border-t border-noir-700">
          <span className="text-noir-500 text-[10px]">
            Export format: Standard Markdown / Printable Text
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={handleCopy}
              className="px-4 py-2 bg-noir-800 hover:bg-noir-700 text-noir-200 rounded font-bold flex items-center gap-2 transition-colors"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied to Clipboard' : 'Copy Text'}
            </button>
            <button
              onClick={handleDownload}
              className="px-4 py-2 bg-crimson hover:bg-crimson-bright text-white rounded font-bold flex items-center gap-2 transition-colors"
            >
              <Download className="w-4 h-4" /> Download .md
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
