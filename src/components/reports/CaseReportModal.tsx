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
    <div className="cb-modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="cb-dossier w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="cb-dossier-head flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-amber-accent flex-none" />
            <div>
              <div className="cb-eyebrow">Case File Documentation</div>
              <h2 className="text-sm font-bold text-noir-100 uppercase tracking-wider">
                Investigative Reports & FIR Drafting Assistance
              </h2>
              <p className="text-[11px] cb-dim mt-0.5">
                Generate structured case briefs, network intelligence reports, and statutory FIR drafting aids.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="cb-btn cb-btn-ghost cb-btn-icon flex-none" title="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Report Type Tabs */}
        <div className="px-6 py-3 border-b border-noir-700">
          <div className="cb-tabs">
            <button
              onClick={() => setReportType('dossier')}
              className={`cb-tab ${reportType === 'dossier' ? 'active' : ''}`}
            >
              Comprehensive Case Dossier
            </button>
            <button
              onClick={() => setReportType('fir')}
              className={`cb-tab ${reportType === 'fir' ? 'active' : ''}`}
            >
              FIR Draft Assistance
            </button>
            <button
              onClick={() => setReportType('network')}
              className={`cb-tab ${reportType === 'network' ? 'active' : ''}`}
            >
              Network Analysis Summary
            </button>
          </div>
        </div>

        {/* Report Preview — typed case-file on aged paper */}
        <div className="cb-dossier-body cb-scroll flex-1 overflow-y-auto p-6">
          <pre className="cb-paper-sheet p-5 text-[11px] font-mono leading-relaxed whitespace-pre-wrap selection:bg-crimson selection:text-white">
            {reportText}
          </pre>
        </div>

        {/* Footer Actions */}
        <div className="cb-dossier-foot flex items-center justify-between px-6 py-4">
          <span className="cb-faint cb-mono text-[10px] uppercase tracking-wider">
            Export format: Standard Markdown / Printable Text
          </span>
          <div className="flex items-center gap-2.5">
            <button onClick={handleCopy} className="cb-btn cb-btn-ghost">
              {copied ? <Check className="w-3.5 h-3.5 cb-green" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied to Clipboard' : 'Copy Text'}
            </button>
            <button onClick={handleDownload} className="cb-btn cb-btn-primary">
              <Download className="w-3.5 h-3.5" /> Download .md
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
