'use client';

import React from 'react';
import {
  Shield,
  Upload,
  Users,
  Sparkles,
  FileText,
  HeartHandshake,
  Inbox,
  Share2,
  LayoutGrid,
  ShieldAlert,
  Clock,
  RotateCcw,
  Download,
  Upload as ImportIcon,
  MousePointer,
  GitBranch,
  Move,
  Lasso,
  Search,
  Camera,
  History,
  FolderOpen,
  Undo2,
  Redo2,
} from 'lucide-react';
import { InvestigationCase } from '@/lib/types/investigation';

interface ToolbarProps {
  activeCase: InvestigationCase | null;
  activeView: 'board' | 'graph' | 'patterns' | 'timeline';
  activeTool: 'select' | 'connect' | 'lasso' | 'pan';
  threadColor: 'crimson' | 'twine' | 'cobalt' | 'shadow';
  filterTypes: Record<string, boolean>;
  canUndo: boolean;
  canRedo: boolean;
  onSelectView: (view: 'board' | 'graph' | 'patterns' | 'timeline') => void;
  onSelectTool: (tool: 'select' | 'connect' | 'lasso' | 'pan') => void;
  onSelectThreadColor: (color: 'crimson' | 'twine' | 'cobalt' | 'shadow') => void;
  onToggleFilter: (type: string) => void;
  onOpenIngest: () => void;
  onOpenResolution: () => void;
  onOpenAssistant: () => void;
  onOpenReports: () => void;
  onOpenSafety: () => void;
  onOpenIntel: () => void;
  onOpenSearch: () => void;
  onOpenCases: () => void;
  onOpenImageAnalysis: () => void;
  onOpenAuditLogs: () => void;
  onResetSeed: () => void;
  onExport: () => void;
  onImport: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onAddQuickCard: (type: string) => void;
}

const THREAD_COLORS = [
  { id: 'crimson', label: 'Crimson', hex: '#b01722' },
  { id: 'twine', label: 'Twine', hex: '#c9a76a' },
  { id: 'cobalt', label: 'Cobalt', hex: '#2f5f9e' },
  { id: 'shadow', label: 'Shadow', hex: '#22201d' },
] as const;

export const CorkboardToolbar: React.FC<ToolbarProps> = ({
  activeCase,
  activeView,
  activeTool,
  threadColor,
  filterTypes,
  canUndo,
  canRedo,
  onSelectView,
  onSelectTool,
  onSelectThreadColor,
  onToggleFilter,
  onOpenIngest,
  onOpenResolution,
  onOpenAssistant,
  onOpenReports,
  onOpenSafety,
  onOpenIntel,
  onOpenSearch,
  onOpenCases,
  onOpenImageAnalysis,
  onOpenAuditLogs,
  onResetSeed,
  onExport,
  onImport,
  onUndo,
  onRedo,
  onAddQuickCard,
}) => {
  return (
    <>
      {/* ===================== TOP BAR ===================== */}
      <header className="fixed top-0 left-0 right-0 z-30 h-14 bg-noir-900/95 border-b border-noir-700 backdrop-blur-md px-4 flex items-center justify-between font-mono text-xs text-noir-200 select-none">
        {/* Brand & Case Info */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-crimson flex items-center justify-center text-white font-black shadow-lg shadow-crimson/30">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm tracking-wider text-noir-100">CRIMELENS</span>
                <span className="px-1.5 py-0.2 bg-crimson/20 border border-crimson/40 text-crimson text-[9px] font-bold rounded">
                  v2.0 PRO
                </span>
              </div>
              <div className="text-[10px] text-noir-400">AI Criminal Network Analysis System</div>
            </div>
          </div>

          <div className="h-6 w-px bg-noir-700 hidden md:block" />

          {/* Active Case Tag / Switcher */}
          <button
            onClick={onOpenCases}
            className="hidden md:flex items-center gap-2 bg-noir-850 hover:bg-noir-800 px-2.5 py-1 rounded border border-noir-700 text-[11px] transition-colors"
            title="Switch or Create Cases"
          >
            <FolderOpen className="w-3.5 h-3.5 text-amber-accent" />
            <span className="text-noir-100 font-bold max-w-[160px] truncate">
              {activeCase?.title || 'Active Case'}
            </span>
            <span className="text-noir-500">[{activeCase?.caseNumber || 'CR-001'}]</span>
          </button>
        </div>

        {/* Center View Selector */}
        <div className="flex items-center bg-noir-950 p-1 rounded-lg border border-noir-700">
          <button
            onClick={() => onSelectView('board')}
            className={`px-3 py-1 rounded flex items-center gap-1.5 transition-colors ${
              activeView === 'board' ? 'bg-crimson text-white font-bold' : 'text-noir-400 hover:text-noir-200'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" /> 3D Corkboard
          </button>
          <button
            onClick={() => onSelectView('graph')}
            className={`px-3 py-1 rounded flex items-center gap-1.5 transition-colors ${
              activeView === 'graph' ? 'bg-crimson text-white font-bold' : 'text-noir-400 hover:text-noir-200'
            }`}
          >
            <Share2 className="w-3.5 h-3.5" /> Knowledge Graph
          </button>
          <button
            onClick={() => onSelectView('timeline')}
            className={`px-3 py-1 rounded flex items-center gap-1.5 transition-colors ${
              activeView === 'timeline' ? 'bg-crimson text-white font-bold' : 'text-noir-400 hover:text-noir-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" /> Timeline
          </button>
          <button
            onClick={() => onSelectView('patterns')}
            className={`px-3 py-1 rounded flex items-center gap-1.5 transition-colors ${
              activeView === 'patterns' ? 'bg-crimson text-white font-bold' : 'text-noir-400 hover:text-noir-200'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" /> Anomalies
          </button>
        </div>

        {/* Right Action Modals Bar */}
        <div className="flex items-center gap-2">
          {/* Global Search Button */}
          <button
            onClick={onOpenSearch}
            className="px-2.5 py-1.5 bg-noir-800 hover:bg-noir-700 text-noir-200 rounded border border-noir-700 flex items-center gap-1.5 transition-colors"
            title="Search Entities (Cmd+K)"
          >
            <Search className="w-3.5 h-3.5 text-noir-400" />
            <span className="hidden xl:inline text-noir-400">Search</span>
            <kbd className="hidden xl:inline px-1 bg-noir-900 border border-noir-700 rounded text-[9px]">⌘K</kbd>
          </button>

          <button
            onClick={onOpenIngest}
            className="px-2.5 py-1.5 bg-noir-800 hover:bg-noir-700 text-noir-200 rounded border border-noir-700 flex items-center gap-1.5 transition-colors"
            title="Ingest FIR / CDR / Documents"
          >
            <Upload className="w-3.5 h-3.5 text-crimson" />
            <span className="hidden lg:inline">Ingest</span>
          </button>

          <button
            onClick={onOpenResolution}
            className="px-2.5 py-1.5 bg-noir-800 hover:bg-noir-700 text-noir-200 rounded border border-noir-700 flex items-center gap-1.5 transition-colors"
            title="Entity Resolution & Identity Matching"
          >
            <Users className="w-3.5 h-3.5 text-amber-accent" />
            <span className="hidden lg:inline">Resolution</span>
          </button>

          <button
            onClick={onOpenAssistant}
            className="px-2.5 py-1.5 bg-amber-accent/15 hover:bg-amber-accent/25 text-amber-accent border border-amber-accent/40 rounded flex items-center gap-1.5 transition-colors font-bold"
            title="AI Investigator Assistant"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">AI Assistant</span>
          </button>

          <button
            onClick={onOpenReports}
            className="px-2.5 py-1.5 bg-noir-800 hover:bg-noir-700 text-noir-200 rounded border border-noir-700 flex items-center gap-1.5 transition-colors"
            title="Generate Dossier / FIR Reports"
          >
            <FileText className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">Reports</span>
          </button>

          <button
            onClick={onOpenImageAnalysis}
            className="p-1.5 bg-noir-800 hover:bg-noir-700 text-noir-300 rounded border border-noir-700"
            title="Forensic Image & Object Analysis"
          >
            <Camera className="w-4 h-4" />
          </button>

          <button
            onClick={onOpenAuditLogs}
            className="p-1.5 bg-noir-800 hover:bg-noir-700 text-noir-300 rounded border border-noir-700"
            title="Audit Trail & Chain of Custody"
          >
            <History className="w-4 h-4" />
          </button>

          <button
            onClick={onOpenSafety}
            className="p-1.5 bg-noir-800 hover:bg-noir-700 text-crimson rounded border border-noir-700"
            title="Women Safety Network"
          >
            <HeartHandshake className="w-4 h-4" />
          </button>

          <button
            onClick={onOpenIntel}
            className="p-1.5 bg-noir-800 hover:bg-noir-700 text-amber-accent rounded border border-noir-700"
            title="Public Intel Intake"
          >
            <Inbox className="w-4 h-4" />
          </button>

          <div className="h-5 w-px bg-noir-700" />

          <button
            onClick={onUndo}
            disabled={!canUndo}
            className="p-1.5 bg-noir-800 hover:bg-noir-700 disabled:opacity-30 text-noir-300 rounded border border-noir-700 transition-colors"
            title="Undo (⌘Z)"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className="p-1.5 bg-noir-800 hover:bg-noir-700 disabled:opacity-30 text-noir-300 rounded border border-noir-700 transition-colors"
            title="Redo (⌘⇧Z)"
          >
            <Redo2 className="w-4 h-4" />
          </button>

          <button
            onClick={onExport}
            className="p-1.5 bg-noir-800 hover:bg-noir-700 text-noir-300 rounded border border-noir-700"
            title="Export Case Bundle (.crimelens.json)"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={onImport}
            className="p-1.5 bg-noir-800 hover:bg-noir-700 text-noir-300 rounded border border-noir-700"
            title="Import Case Bundle (.crimelens.json)"
          >
            <ImportIcon className="w-4 h-4" />
          </button>
          <button
            onClick={onResetSeed}
            className="p-1.5 bg-noir-800 hover:bg-noir-700 text-noir-400 hover:text-crimson rounded border border-noir-700"
            title="Reset to Blackwood Syndicate Seed"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ===================== LEFT TOOL RAIL ===================== */}
      {activeView === 'board' && (
        <aside className="fixed top-20 left-4 z-20 flex flex-col gap-3 font-mono text-xs select-none">
          {/* Main Interaction Tools */}
          <div className="bg-noir-900/90 border border-noir-700 rounded-xl p-1.5 shadow-2xl backdrop-blur-md flex flex-col gap-1.5">
            <button
              onClick={() => onSelectTool('select')}
              className={`p-2.5 rounded-lg flex items-center justify-center transition-colors ${
                activeTool === 'select' ? 'bg-crimson text-white shadow' : 'text-noir-400 hover:text-noir-200 hover:bg-noir-800'
              }`}
              title="Select / Move Card (V)"
            >
              <MousePointer className="w-4 h-4" />
            </button>
            <button
              onClick={() => onSelectTool('connect')}
              className={`p-2.5 rounded-lg flex items-center justify-center transition-colors ${
                activeTool === 'connect' ? 'bg-crimson text-white shadow' : 'text-noir-400 hover:text-noir-200 hover:bg-noir-800'
              }`}
              title="Spool Connecting Thread (C)"
            >
              <GitBranch className="w-4 h-4" />
            </button>
            <button
              onClick={() => onSelectTool('lasso')}
              className={`p-2.5 rounded-lg flex items-center justify-center transition-colors ${
                activeTool === 'lasso' ? 'bg-crimson text-white shadow' : 'text-noir-400 hover:text-noir-200 hover:bg-noir-800'
              }`}
              title="Lasso Multi-Select (L)"
            >
              <Lasso className="w-4 h-4" />
            </button>
            <button
              onClick={() => onSelectTool('pan')}
              className={`p-2.5 rounded-lg flex items-center justify-center transition-colors ${
                activeTool === 'pan' ? 'bg-crimson text-white shadow' : 'text-noir-400 hover:text-noir-200 hover:bg-noir-800'
              }`}
              title="Pan Stage (Space)"
            >
              <Move className="w-4 h-4" />
            </button>
          </div>

          {/* Thread Color Picker */}
          <div className="bg-noir-900/90 border border-noir-700 rounded-xl p-2 shadow-2xl backdrop-blur-md flex flex-col items-center gap-2">
            <span className="text-[9px] text-noir-500 font-bold uppercase">YARN</span>
            {THREAD_COLORS.map((tc) => (
              <button
                key={tc.id}
                onClick={() => onSelectThreadColor(tc.id)}
                className={`w-5 h-5 rounded-full border-2 transition-transform ${
                  threadColor === tc.id ? 'scale-125 border-white shadow-lg' : 'border-transparent opacity-60 hover:opacity-100'
                }`}
                style={{ backgroundColor: tc.hex }}
                title={`${tc.label} Thread`}
              />
            ))}
          </div>

          {/* Quick Add Pin/Card */}
          <div className="bg-noir-900/90 border border-noir-700 rounded-xl p-1.5 shadow-2xl backdrop-blur-md flex flex-col gap-1 text-[10px]">
            <span className="text-[9px] text-noir-500 font-bold text-center uppercase pb-1">+ PIN</span>
            <button
              onClick={() => onAddQuickCard('suspect')}
              className="px-2 py-1 bg-noir-800 hover:bg-noir-700 text-noir-300 hover:text-noir-100 rounded text-left"
            >
              Suspect
            </button>
            <button
              onClick={() => onAddQuickCard('sticky')}
              className="px-2 py-1 bg-noir-800 hover:bg-noir-700 text-amber-accent rounded text-left"
            >
              Sticky
            </button>
            <button
              onClick={() => onAddQuickCard('doc')}
              className="px-2 py-1 bg-noir-800 hover:bg-noir-700 text-noir-300 hover:text-noir-100 rounded text-left"
            >
              Document
            </button>
            <button
              onClick={() => onAddQuickCard('bag')}
              className="px-2 py-1 bg-noir-800 hover:bg-noir-700 text-noir-300 hover:text-noir-100 rounded text-left"
            >
              Evidence
            </button>
          </div>
        </aside>
      )}

      {/* ===================== BOTTOM FILTER BAR ===================== */}
      <footer className="fixed bottom-0 left-0 right-0 z-20 h-10 bg-noir-900/95 border-t border-noir-800 px-4 flex items-center justify-between font-mono text-[11px] text-noir-400 select-none">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
          <span className="text-[10px] uppercase text-noir-500 font-bold">FILTERS:</span>
          {Object.entries(filterTypes).map(([type, enabled]) => (
            <button
              key={type}
              onClick={() => onToggleFilter(type)}
              className={`px-2 py-0.5 rounded border text-[10px] uppercase transition-colors ${
                enabled
                  ? 'bg-noir-800 border-noir-600 text-noir-200'
                  : 'bg-transparent border-noir-850 text-noir-600 line-through'
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4 text-[10px] text-noir-500">
          <span className="text-emerald-500 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            INDEXEDDB OFFLINE-READY
          </span>
          <span>Tip: Drag empty cork to pan • Scroll to zoom</span>
        </div>
      </footer>
    </>
  );
};
