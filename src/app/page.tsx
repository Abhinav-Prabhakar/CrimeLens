'use client';

import React, { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { AlertTriangle, X } from 'lucide-react';
import { useInvestigationStore } from '@/lib/store/useInvestigationStore';
import { CorkboardToolbar } from '@/components/board/CorkboardToolbar';
import { InspectorDrawer } from '@/components/board/InspectorDrawer';
import { DocumentIngestModal } from '@/components/ingestion/DocumentIngestModal';
import { EntityResolutionModal } from '@/components/resolution/EntityResolutionModal';
import { InvestigatorAssistantDrawer } from '@/components/assistant/InvestigatorAssistantDrawer';
import { CaseReportModal } from '@/components/reports/CaseReportModal';
import { WomenSafetyModal } from '@/components/safety/WomenSafetyModal';
import { PublicIntelModal } from '@/components/safety/PublicIntelModal';
import { AnomalyPanel } from '@/components/temporal/AnomalyPanel';
import { InvestigationTimelineView } from '@/components/temporal/InvestigationTimelineView';
import { CaseSwitcherModal } from '@/components/board/CaseSwitcherModal';
import { GlobalSearchModal } from '@/components/ui/GlobalSearchModal';
import { AuditLogModal } from '@/components/ui/AuditLogModal';
import { ImageAnalysisModal } from '@/components/board/ImageAnalysisModal';

// Dynamically import Three.js Corkboard and 2D Canvas Graph to ensure pure client-side execution
const InvestigationCorkboard = dynamic(
  () => import('@/components/board/InvestigationCorkboard').then((mod) => mod.InvestigationCorkboard),
  { ssr: false, loading: () => <div className="w-full h-full flex items-center justify-center font-mono text-noir-400">Loading 3D Corkboard Rig...</div> }
);

const KnowledgeGraphView = dynamic(
  () => import('@/components/graph/KnowledgeGraphView').then((mod) => mod.KnowledgeGraphView),
  { ssr: false, loading: () => <div className="w-full h-full flex items-center justify-center font-mono text-noir-400">Loading Knowledge Graph...</div> }
);

export default function CrimeLensMainPage() {
  const {
    activeCase,
    entities,
    relationships,
    documents,
    timelineEvents,
    selectedEntityId,
    selectedEntityIds,
    activeTool,
    threadColor,
    activeView,
    loading,
    dbError,
    graphStatus,
    caseSummaries,
    filterTypes,
    canUndo,
    canRedo,
    setActiveView,
    setActiveTool,
    setThreadColor,
    setSelectedEntityId,
    setSelectedEntityIds,
    setFilterTypes,
    switchCase,
    createCase,
    deleteCase,
    addEntity,
    updateEntity,
    deleteEntity,
    addRelationship,
    deleteRelationship,
    confirmRelationship,
    mergeEntities,
    commitExtraction,
    undo,
    redo,
    importBundle,
    resetToSeed,
    logCaseEvent,
    exportData,
  } = useInvestigationStore();

  // Modal Open States
  const [isIngestOpen, setIsIngestOpen] = useState(false);
  const [ingestPrefill, setIngestPrefill] = useState<string | undefined>(undefined);
  const [isResolutionOpen, setIsResolutionOpen] = useState(false);
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [isReportsOpen, setIsReportsOpen] = useState(false);
  const [isSafetyOpen, setIsSafetyOpen] = useState(false);
  const [isIntelOpen, setIsIntelOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isCasesOpen, setIsCasesOpen] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [isAuditLogsOpen, setIsAuditLogsOpen] = useState(false);

  const importFileRef = useRef<HTMLInputElement>(null);

  // Global Keyboard Shortcuts (Cmd+K search, V/C/L tools, Space pan, Cmd+Z undo, ESC close)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || (e.target as HTMLElement)?.isContentEditable;

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if (e.key === 'Escape') {
        // Close the topmost open modal (fixed priority order)
        const modalStack: [boolean, () => void][] = [
          [isSearchOpen, () => setIsSearchOpen(false)],
          [isCasesOpen, () => setIsCasesOpen(false)],
          [isAuditLogsOpen, () => setIsAuditLogsOpen(false)],
          [isImageModalOpen, () => setIsImageModalOpen(false)],
          [isIngestOpen, () => setIsIngestOpen(false)],
          [isResolutionOpen, () => setIsResolutionOpen(false)],
          [isIntelOpen, () => setIsIntelOpen(false)],
          [isSafetyOpen, () => setIsSafetyOpen(false)],
          [isReportsOpen, () => setIsReportsOpen(false)],
          [isAssistantOpen, () => setIsAssistantOpen(false)],
        ];
        for (let i = modalStack.length - 1; i >= 0; i--) {
          if (modalStack[i][0]) {
            modalStack[i][1]();
            return;
          }
        }
        setSelectedEntityId(null);
        return;
      }
      if (typing) return;

      if (e.key === 'v' || e.key === 'V') setActiveTool('select');
      if (e.key === 'c' || e.key === 'C') setActiveTool('connect');
      if (e.key === 'l' || e.key === 'L') setActiveTool('lasso');
      if (e.key === ' ') {
        e.preventDefault();
        setActiveTool('pan');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setActiveTool, undo, redo, isSearchOpen, isCasesOpen, isAuditLogsOpen, isImageModalOpen, isIngestOpen, isResolutionOpen, isIntelOpen, isSafetyOpen, isReportsOpen, isAssistantOpen, setSelectedEntityId]);

  // Selected Entity
  const selectedEntity = entities.find((e) => e.id === selectedEntityId) || null;

  // Position update from board drag
  const handleUpdatePosition = (id: string, x: number, y: number) => {
    updateEntity(id, { boardPosition: { x, y } });
  };

  // Connect from board thread tool
  const handleConnect = (sourceId: string, targetId: string) => {
    addRelationship({
      sourceId,
      targetId,
      predicate: 'ASSOCIATED_WITH',
      label: 'Investigator Thread',
      threadColor,
    });
  };

  // Lasso multi-select from board
  const handleLassoSelect = (ids: string[]) => {
    setSelectedEntityIds(ids);
    if (ids.length === 1) setSelectedEntityId(ids[0]);
  };

  // Add Quick Pin/Card
  const handleAddQuickCard = (type: string) => {
    addEntity({
      label: `New ${type.toUpperCase()}`,
      visualType: type as any,
      type: type === 'suspect' ? 'person' : type === 'doc' ? 'document' : 'evidence_item',
    });
  };

  // Export Case Bundle (documented .crimelens.json extension)
  const handleExport = async () => {
    const data = await exportData();
    if (!data || !activeCase) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeCase.caseNumber || 'case'}.crimelens.json`;
    a.click();
    URL.revokeObjectURL(url);
    logCaseEvent(
      'bundle_exported',
      'case',
      activeCase.id,
      `Exported case bundle (${entities.length} entities, ${relationships.length} relationships, ${documents.length} documents)`
    );
  };

  // Import Case Bundle
  const handleImportFile = async (file: File) => {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const result = await importBundle(parsed);
      if (result.ok) {
        window.alert(`✓ ${result.message}`);
      } else {
        window.alert(`Import failed: ${result.message}`);
      }
    } catch (err: any) {
      window.alert(`Import failed: file is not valid JSON (${err?.message || 'parse error'})`);
    }
  };

  // Reset seed with explicit confirmation
  const handleResetSeed = () => {
    if (
      window.confirm(
        'Restore the demo Blackwood Syndicate case data?\n\nThis re-seeds the demo case and switches to it. Other cases are not affected.'
      )
    ) {
      resetToSeed();
    }
  };

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-noir-950">
      {/* Storage health banner */}
      {dbError && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-50 max-w-2xl px-3 py-2 bg-crimson/15 border border-crimson/50 rounded-lg font-mono text-[11px] text-crimson flex items-center gap-2 backdrop-blur-md">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span className="flex-1">Storage: {dbError}</span>
        </div>
      )}

      {/* Boot overlay */}
      {loading && (
        <div className="absolute inset-0 z-50 bg-noir-950/90 flex items-center justify-center font-mono text-noir-400 text-xs">
          <span className="animate-pulse">LOADING INVESTIGATION DATABASE...</span>
        </div>
      )}

      {/* Top Toolbar, View Switcher & Left Tool Rail */}
      <CorkboardToolbar
        activeCase={activeCase}
        activeView={activeView}
        activeTool={activeTool}
        threadColor={threadColor}
        filterTypes={filterTypes}
        graphStatus={graphStatus}
        canUndo={canUndo}
        canRedo={canRedo}
        onSelectView={setActiveView}
        onSelectTool={setActiveTool}
        onSelectThreadColor={setThreadColor}
        onToggleFilter={(t) => setFilterTypes((prev) => ({ ...prev, [t]: !prev[t] }))}
        onOpenIngest={() => {
          setIngestPrefill(undefined);
          setIsIngestOpen(true);
        }}
        onOpenResolution={() => setIsResolutionOpen(true)}
        onOpenAssistant={() => setIsAssistantOpen(true)}
        onOpenReports={() => setIsReportsOpen(true)}
        onOpenSafety={() => setIsSafetyOpen(true)}
        onOpenIntel={() => setIsIntelOpen(true)}
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenCases={() => setIsCasesOpen(true)}
        onOpenImageAnalysis={() => setIsImageModalOpen(true)}
        onOpenAuditLogs={() => setIsAuditLogsOpen(true)}
        onResetSeed={handleResetSeed}
        onExport={handleExport}
        onImport={() => importFileRef.current?.click()}
        onUndo={undo}
        onRedo={redo}
        onAddQuickCard={handleAddQuickCard}
      />

      <input
        ref={importFileRef}
        type="file"
        accept=".json,.crimelens.json,application/json"
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.[0]) handleImportFile(e.target.files[0]);
          e.target.value = '';
        }}
      />

      {/* Main View Area */}
      <div className="absolute inset-0 pt-14 pb-10">
        {activeView === 'board' && (
          <InvestigationCorkboard
            entities={entities}
            relationships={relationships}
            selectedEntityId={selectedEntityId}
            selectedEntityIds={selectedEntityIds}
            activeTool={activeTool}
            threadColor={threadColor}
            filterTypes={filterTypes}
            onSelectEntity={setSelectedEntityId}
            onUpdatePosition={handleUpdatePosition}
            onConnect={handleConnect}
            onLassoSelect={handleLassoSelect}
          />
        )}

        {activeView === 'graph' && (
          <KnowledgeGraphView
            entities={entities}
            relationships={relationships}
            selectedEntityId={selectedEntityId}
            filterTypes={filterTypes}
            onSelectEntity={setSelectedEntityId}
            onAddPredictedLink={(pl) => {
              addRelationship({
                sourceId: pl.sourceId,
                targetId: pl.targetId,
                predicate: pl.predictedPredicate as any,
                label: `Predicted (${(pl.score * 100).toFixed(0)}%)`,
                confidence: pl.score,
                threadColor: 'twine',
                status: 'predicted',
                manuallyConfirmed: false,
                notes: `Topological Link Prediction: ${pl.reasons.join('; ')}`,
              }).then(() => {
                logCaseEvent(
                  'link_prediction_confirmed',
                  'relationship',
                  `${pl.sourceId}->${pl.targetId}`,
                  `Investigator staged predicted link ${pl.sourceLabel} — ${pl.targetLabel} (${(pl.score * 100).toFixed(0)}%); confirm in Inspector`
                );
              });
            }}
          />
        )}

        {activeView === 'timeline' && (
          <InvestigationTimelineView
            activeCase={activeCase}
            entities={entities}
            relationships={relationships}
            documents={documents}
            timelineEvents={timelineEvents}
            onSelectEntity={(id) => {
              setSelectedEntityId(id);
              setActiveView('board');
            }}
          />
        )}

        {activeView === 'patterns' && (
          <AnomalyPanel
            activeCase={activeCase}
            entities={entities}
            relationships={relationships}
            onSelectEntity={(id) => {
              setSelectedEntityId(id);
              setActiveView('board');
            }}
          />
        )}
      </div>

      {/* Multi-selection floating actions */}
      {selectedEntityIds.length > 1 && activeView === 'board' && (
        <div className="absolute bottom-14 left-1/2 -translate-x-1/2 z-30 px-3 py-2 bg-noir-900/95 border border-noir-700 rounded-lg font-mono text-[11px] flex items-center gap-3 shadow-xl backdrop-blur-md">
          <span className="text-amber-accent font-bold">{selectedEntityIds.length} SELECTED</span>
          <button
            onClick={() => {
              selectedEntityIds.forEach((id) => deleteEntity(id));
              setSelectedEntityIds([]);
            }}
            className="px-2 py-1 bg-crimson/15 hover:bg-crimson/25 text-crimson border border-crimson/40 rounded font-bold"
          >
            Delete All
          </button>
          <button
            onClick={() => setSelectedEntityIds([])}
            className="p-1 text-noir-400 hover:text-noir-100"
            title="Clear selection"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Inspector Drawer (When Entity is Selected) — remounts per entity so state can never go stale */}
      {selectedEntity && (
        <InspectorDrawer
          key={selectedEntity.id}
          entity={selectedEntity}
          relationships={relationships}
          allEntities={entities}
          onClose={() => setSelectedEntityId(null)}
          onUpdate={updateEntity}
          onDelete={deleteEntity}
          onConfirmRelationship={confirmRelationship}
          onDeleteRelationship={deleteRelationship}
        />
      )}

      {/* Global Search Modal (Cmd+K) */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        entities={entities}
        relationships={relationships}
        documents={documents}
        onClose={() => setIsSearchOpen(false)}
        onSelectEntity={(id) => {
          setSelectedEntityId(id);
        }}
      />

      {/* Case Switcher & Case Prioritization Modal */}
      <CaseSwitcherModal
        isOpen={isCasesOpen}
        activeCaseId={activeCase?.id || null}
        summaries={caseSummaries}
        onClose={() => setIsCasesOpen(false)}
        onSelectCase={(caseId) => switchCase(caseId)}
        onCreateCase={async (data) => {
          await createCase(data);
        }}
        onDeleteCase={async (caseId) => {
          await deleteCase(caseId);
        }}
      />

      {/* Forensic Image & Object Analysis Modal */}
      <ImageAnalysisModal
        isOpen={isImageModalOpen}
        caseContextNote={activeCase ? `${activeCase.title} (${activeCase.caseNumber})` : undefined}
        onClose={() => setIsImageModalOpen(false)}
        onAddEvidence={(evData) => {
          addEntity({
            label: evData.label,
            type: evData.type,
            visualType: evData.visualType,
            confidence: evData.confidence,
            notes: evData.notes,
            status: 'ai_inferred',
            provenance: {
              sourceId: 'vision_analysis',
              sourceType: 'forensic',
              sourceTitle: 'Forensic Vision Analysis (Groq multimodal)',
              confidence: evData.confidence,
            },
            tags: ['vision_analyzed'],
          });
        }}
      />

      {/* Audit Log Trail Modal */}
      <AuditLogModal
        isOpen={isAuditLogsOpen}
        caseId={activeCase?.id || ''}
        onClose={() => setIsAuditLogsOpen(false)}
      />

      {/* AI Document Ingestion & Staging Modal */}
      <DocumentIngestModal
        caseId={activeCase?.id || 'case_default'}
        isOpen={isIngestOpen}
        prefillText={ingestPrefill}
        onClose={() => {
          setIsIngestOpen(false);
          setIngestPrefill(undefined);
        }}
        onCommit={(newEnts, newRels, newEvents, docMeta) => {
          commitExtraction(newEnts, newRels, newEvents, docMeta);
        }}
      />

      {/* Entity Resolution Modal */}
      <EntityResolutionModal
        isOpen={isResolutionOpen}
        entities={entities}
        onClose={() => setIsResolutionOpen(false)}
        onMerge={mergeEntities}
      />

      {/* AI Investigator Assistant Drawer */}
      <InvestigatorAssistantDrawer
        isOpen={isAssistantOpen}
        activeCase={activeCase}
        entities={entities}
        relationships={relationships}
        onClose={() => setIsAssistantOpen(false)}
      />

      {/* Case Reports & FIR Drafting Modal */}
      <CaseReportModal
        isOpen={isReportsOpen}
        activeCase={activeCase}
        entities={entities}
        relationships={relationships}
        onClose={() => setIsReportsOpen(false)}
        onReportGenerated={(reportType) => {
          logCaseEvent('report_generated', 'case', activeCase?.id || 'case', `Generated ${reportType} report for ${activeCase?.caseNumber}`);
        }}
      />

      {/* Women Safety Modal */}
      <WomenSafetyModal
        isOpen={isSafetyOpen}
        onClose={() => setIsSafetyOpen(false)}
        onSosDispatched={(details) => {
          logCaseEvent('sos_dispatched', 'case', activeCase?.id || 'case', details);
        }}
      />

      {/* Public Intelligence Intake Modal */}
      <PublicIntelModal
        isOpen={isIntelOpen}
        caseEntities={entities}
        onClose={() => setIsIntelOpen(false)}
        onTriage={(action, details) => logCaseEvent(action, 'intel', 'tip', details)}
        onPromoteToCase={(tipText) => {
          logCaseEvent('intel_promoted', 'intel', 'tip', 'Tip promoted to AI extraction staging');
          setIngestPrefill(tipText);
          setIsIngestOpen(true);
        }}
      />
    </main>
  );
}
