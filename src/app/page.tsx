'use client';

import React, { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { AlertTriangle, X } from 'lucide-react';
import { useInvestigationStore } from '@/lib/store/useInvestigationStore';
import { CasebookChrome } from '@/components/board/casebook/CasebookChrome';
import { CasebookInspector } from '@/components/board/casebook/CasebookInspector';
import { toast } from '@/components/board/casebook/toast';
import { defaultSpecForType, type WorldApi } from '@/lib/board/casebook';
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
import type { InvestigationEntity } from '@/lib/types/investigation';
import '@/components/board/casebook/casebook.css';

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
  const [zoomPct, setZoomPct] = useState(100);

  const importFileRef = useRef<HTMLInputElement>(null);
  const photoFileRef = useRef<HTMLInputElement>(null);
  const boardApiRef = useRef<WorldApi | null>(null);

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
        setSelectedEntityIds([]);
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
  }, [setActiveTool, undo, redo, isSearchOpen, isCasesOpen, isAuditLogsOpen, isImageModalOpen, isIngestOpen, isResolutionOpen, isIntelOpen, isSafetyOpen, isReportsOpen, isAssistantOpen, setSelectedEntityId, setSelectedEntityIds]);

  // Selected Entity
  const selectedEntity = entities.find((e) => e.id === selectedEntityId) || null;

  // Selection from the board (single click, lasso, or clear)
  const handleBoardSelect = (ids: string[], primaryId: string | null) => {
    setSelectedEntityIds(ids);
    setSelectedEntityId(primaryId);
  };

  // Position commits from board drags — preserve existing rotation
  const handleCommitPositions = (moves: { id: string; x: number; y: number }[]) => {
    for (const m of moves) {
      const ent = entities.find((e) => e.id === m.id);
      updateEntity(m.id, {
        boardPosition: { x: m.x, y: m.y, rotation: ent?.boardPosition?.rotation },
      });
    }
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

  // Delete selected entities (Delete/Backspace on the board)
  const handleDeleteEntities = (ids: string[]) => {
    ids.forEach((id) => deleteEntity(id));
    setSelectedEntityIds([]);
    setSelectedEntityId(null);
  };

  // Quick-add cards from the rail (reference defaults + spawn near camera target)
  const handleAddQuickCard = (type: string) => {
    const at = boardApiRef.current?.getSpawnPoint() ?? { x: 0, y: 0 };
    const spec = defaultSpecForType(type, at);
    const text = (spec.text as string) || '';
    addEntity({
      label: (spec.title as string) || text.split('\n')[0]?.slice(0, 42) || `New ${type.toUpperCase()}`,
      notes: spec.title ? text : text,
      visualType: type as InvestigationEntity['visualType'],
      type: type === 'suspect' ? 'person' : type === 'doc' ? 'document' : 'evidence_item',
      boardPosition: { x: at.x, y: at.y, rotation: (Math.random() - 0.5) * 0.1 },
      attributes: {
        ...(spec.role ? { role: spec.role } : {}),
        ...(spec.sig !== undefined ? { sig: spec.sig } : {}),
      },
    });
  };

  // Photo card from an uploaded image (stored as dataURL attribute)
  const handlePhotoFile = (file: File) => {
    const rd = new FileReader();
    rd.onload = () => {
      const at = boardApiRef.current?.getSpawnPoint() ?? { x: 0, y: 0 };
      addEntity({
        label: file.name.replace(/\.[^.]+$/, ''),
        notes: file.name.replace(/\.[^.]+$/, ''),
        visualType: 'photo',
        type: 'evidence_item',
        boardPosition: { x: at.x, y: at.y },
        attributes: { imageDataUrl: rd.result as string },
      });
    };
    rd.readAsDataURL(file);
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
    toast('Case exported as JSON');
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
        toast(`✓ ${result.message}`);
      } else {
        toast(`Import failed: ${result.message}`);
      }
    } catch (err: any) {
      toast(`Import failed: file is not valid JSON (${err?.message || 'parse error'})`);
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

  const handleShare = () => {
    try {
      navigator.clipboard.writeText(location.href);
    } catch (_) {}
    toast('Case link copied to clipboard');
  };

  const handleJumpToItem = (id: string) => {
    setActiveView('board');
    setSelectedEntityId(id);
    setSelectedEntityIds([id]);
    boardApiRef.current?.focusItem(id);
  };

  const handleDeleteSelection = (ids: string[]) => {
    ids.forEach((id) => deleteEntity(id));
    setSelectedEntityIds([]);
  };

  // Derived props for chrome
  const typeCounts = entities.reduce<Record<string, number>>((acc, e) => {
    acc[e.visualType] = (acc[e.visualType] || 0) + 1;
    return acc;
  }, {});
  const timelineItems = entities
    .slice()
    .sort((a, b) => Date.parse(a.createdAt || '0') - Date.parse(b.createdAt || '0'))
    .map((e) => ({ id: e.id, name: e.label || e.visualType, created: Date.parse(e.createdAt || '0') || Date.now() }));

  return (
    <main className="cb-scope relative w-screen h-screen overflow-hidden bg-noir-950">
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

      {/* Casebook chrome: top bar, left rail, bottom bar */}
      <CasebookChrome
        activeCase={activeCase}
        activeView={activeView}
        activeTool={activeTool}
        threadColor={threadColor}
        filterTypes={filterTypes}
        typeCounts={typeCounts}
        timelineItems={timelineItems}
        zoomPct={zoomPct}
        canUndo={canUndo}
        canRedo={canRedo}
        showBoardTools={activeView === 'board'}
        onSelectView={setActiveView}
        onSelectTool={setActiveTool}
        onSelectThreadColor={setThreadColor}
        onToggleFilter={(t) => setFilterTypes((prev) => ({ ...prev, [t]: !prev[t] }))}
        onAddCard={handleAddQuickCard}
        onPickImageFile={() => photoFileRef.current?.click()}
        onJumpToItem={handleJumpToItem}
        onZoomIn={() => boardApiRef.current?.zoomIn()}
        onZoomOut={() => boardApiRef.current?.zoomOut()}
        onUndo={undo}
        onRedo={redo}
        onOpenCases={() => setIsCasesOpen(true)}
        onShare={handleShare}
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenAudit={() => setIsAuditLogsOpen(true)}
        onExport={handleExport}
        onImport={() => importFileRef.current?.click()}
        onCenterBoard={() => boardApiRef.current?.center()}
        onResetSeed={handleResetSeed}
        onOpenIngest={() => {
          setIngestPrefill(undefined);
          setIsIngestOpen(true);
        }}
        onOpenAssistant={() => setIsAssistantOpen(true)}
        onOpenReports={() => setIsReportsOpen(true)}
        onOpenResolution={() => setIsResolutionOpen(true)}
        onOpenImageAnalysis={() => setIsImageModalOpen(true)}
        onOpenIntel={() => setIsIntelOpen(true)}
        onOpenSafety={() => setIsSafetyOpen(true)}
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
      <input
        ref={photoFileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.[0]) handlePhotoFile(e.target.files[0]);
          e.target.value = '';
        }}
      />

      {/* Main View Area — corkboard stays mounted (paused + hidden) so board state survives view switches */}
      <div className="absolute inset-0">
        <InvestigationCorkboard
          entities={entities}
          relationships={relationships}
          selectedEntityId={selectedEntityId}
          selectedEntityIds={selectedEntityIds}
          activeTool={activeTool}
          threadColor={threadColor}
          filterTypes={filterTypes}
          paused={activeView !== 'board'}
          apiRef={boardApiRef}
          onSelect={handleBoardSelect}
          onCommitPositions={handleCommitPositions}
          onConnect={handleConnect}
          onDeleteEntities={handleDeleteEntities}
          onUpdateEntity={updateEntity}
          onZoomChange={setZoomPct}
          onToolRequest={setActiveTool}
        />

        {activeView === 'graph' && (
          <KnowledgeGraphView
            entities={entities}
            relationships={relationships}
            selectedEntityId={selectedEntityId}
            filterTypes={filterTypes}
            onSelectEntity={(id) => {
              setSelectedEntityId(id);
            }}
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
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-30 px-3 py-2 bg-noir-900/95 border border-noir-700 rounded-lg font-mono text-[11px] flex items-center gap-3 shadow-xl backdrop-blur-md">
          <span className="text-amber-accent font-bold">{selectedEntityIds.length} SELECTED</span>
          <button
            onClick={() => handleDeleteSelection(selectedEntityIds)}
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

      {/* Inspector — casebook-styled dossier panel */}
      {(selectedEntity || selectedEntityIds.length > 1) && (
        <CasebookInspector
          key={selectedEntity?.id || 'multi'}
          entity={selectedEntity}
          selectedCount={selectedEntityIds.length}
          relationships={relationships}
          allEntities={entities}
          getThumbnail={(id) => boardApiRef.current?.getItemThumbnail(id) ?? null}
          getConnections={(id) => boardApiRef.current?.getItemConnections(id) ?? []}
          onClose={() => {
            setSelectedEntityId(null);
            setSelectedEntityIds([]);
          }}
          onSelectEntity={(id) => {
            setSelectedEntityId(id);
            setSelectedEntityIds([id]);
          }}
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
