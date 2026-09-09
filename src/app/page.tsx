'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
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
    selectedEntityId,
    activeTool,
    threadColor,
    activeView,
    loading,
    filterTypes,
    setActiveView,
    setActiveTool,
    setThreadColor,
    setSelectedEntityId,
    setFilterTypes,
    addEntity,
    updateEntity,
    deleteEntity,
    addRelationship,
    resetToSeed,
    commitExtraction,
    exportData,
  } = useInvestigationStore();

  // Modal Open States
  const [isIngestOpen, setIsIngestOpen] = useState(false);
  const [isResolutionOpen, setIsResolutionOpen] = useState(false);
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [isReportsOpen, setIsReportsOpen] = useState(false);
  const [isSafetyOpen, setIsSafetyOpen] = useState(false);
  const [isIntelOpen, setIsIntelOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isCasesOpen, setIsCasesOpen] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [isAuditLogsOpen, setIsAuditLogsOpen] = useState(false);

  // Global Keyboard Shortcuts (Cmd+K / Ctrl+K, V, C)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === 'v' || e.key === 'V') setActiveTool('select');
      if (e.key === 'c' || e.key === 'C') setActiveTool('connect');
      if (e.key === ' ') {
        e.preventDefault();
        setActiveTool('pan');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setActiveTool]);

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

  // Add Quick Pin/Card
  const handleAddQuickCard = (type: string) => {
    addEntity({
      label: `New ${type.toUpperCase()}`,
      visualType: type as any,
      type: type === 'suspect' ? 'person' : type === 'doc' ? 'document' : 'evidence_item',
      boardPosition: {
        x: (Math.random() - 0.5) * 30,
        y: (Math.random() - 0.5) * 20,
      },
    });
  };

  // Merge from Entity Resolution
  const handleMergeEntities = (keptId: string, mergedId: string) => {
    const merged = entities.find((e) => e.id === mergedId);
    if (!merged) return;

    // Add merged label to kept entity aliases
    const kept = entities.find((e) => e.id === keptId);
    if (kept) {
      updateEntity(keptId, {
        aliases: Array.from(new Set([...kept.aliases, merged.label, ...merged.aliases])),
        notes: `${kept.notes || ''}\n[MERGED IDENTITY]: Combined records with ${merged.label}`.trim(),
      });
    }

    // Redirect relationships from merged to kept
    relationships.forEach((rel) => {
      if (rel.sourceId === mergedId) {
        addRelationship({ ...rel, sourceId: keptId });
      }
      if (rel.targetId === mergedId) {
        addRelationship({ ...rel, targetId: keptId });
      }
    });

    deleteEntity(mergedId);
  };

  // Export Case Bundle
  const handleExport = async () => {
    const data = await exportData();
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeCase?.caseNumber || 'case'}_crimelens_bundle.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-noir-950">
      {/* Top Toolbar, View Switcher & Left Tool Rail */}
      <CorkboardToolbar
        activeCase={activeCase}
        activeView={activeView}
        activeTool={activeTool}
        threadColor={threadColor}
        filterTypes={filterTypes}
        onSelectView={setActiveView}
        onSelectTool={setActiveTool}
        onSelectThreadColor={setThreadColor}
        onToggleFilter={(t) => setFilterTypes((prev) => ({ ...prev, [t]: !prev[t] }))}
        onOpenIngest={() => setIsIngestOpen(true)}
        onOpenResolution={() => setIsResolutionOpen(true)}
        onOpenAssistant={() => setIsAssistantOpen(true)}
        onOpenReports={() => setIsReportsOpen(true)}
        onOpenSafety={() => setIsSafetyOpen(true)}
        onOpenIntel={() => setIsIntelOpen(true)}
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenCases={() => setIsCasesOpen(true)}
        onOpenImageAnalysis={() => setIsImageModalOpen(true)}
        onOpenAuditLogs={() => setIsAuditLogsOpen(true)}
        onResetSeed={resetToSeed}
        onExport={handleExport}
        onAddQuickCard={handleAddQuickCard}
      />

      {/* Main View Area */}
      <div className="absolute inset-0 pt-14 pb-10">
        {activeView === 'board' && (
          <InvestigationCorkboard
            entities={entities}
            relationships={relationships}
            selectedEntityId={selectedEntityId}
            activeTool={activeTool}
            threadColor={threadColor}
            filterTypes={filterTypes}
            onSelectEntity={setSelectedEntityId}
            onUpdatePosition={handleUpdatePosition}
            onConnect={handleConnect}
          />
        )}

        {activeView === 'graph' && (
          <KnowledgeGraphView
            entities={entities}
            relationships={relationships}
            selectedEntityId={selectedEntityId}
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
                notes: `Topological Link Prediction: ${pl.reasons.join('; ')}`,
              });
            }}
          />
        )}

        {activeView === 'timeline' && (
          <InvestigationTimelineView
            activeCase={activeCase}
            entities={entities}
            relationships={relationships}
            onSelectEntity={(id) => {
              setSelectedEntityId(id);
              setActiveView('board');
            }}
          />
        )}

        {activeView === 'patterns' && (
          <AnomalyPanel
            entities={entities}
            relationships={relationships}
            onSelectEntity={(id) => {
              setSelectedEntityId(id);
              setActiveView('board');
            }}
          />
        )}
      </div>

      {/* Inspector Drawer (When Entity is Selected) */}
      {selectedEntity && (
        <InspectorDrawer
          entity={selectedEntity}
          relationships={relationships}
          allEntities={entities}
          onClose={() => setSelectedEntityId(null)}
          onUpdate={updateEntity}
          onDelete={deleteEntity}
        />
      )}

      {/* Global Search Modal (Cmd+K) */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        entities={entities}
        onClose={() => setIsSearchOpen(false)}
        onSelectEntity={(id) => {
          setSelectedEntityId(id);
        }}
      />

      {/* Case Switcher & Case Prioritization Modal */}
      <CaseSwitcherModal
        isOpen={isCasesOpen}
        activeCaseId={activeCase?.id || null}
        onClose={() => setIsCasesOpen(false)}
        onSelectCase={(newCase) => {
          window.location.reload();
        }}
      />

      {/* Forensic Image & Object Analysis Modal */}
      <ImageAnalysisModal
        isOpen={isImageModalOpen}
        onClose={() => setIsImageModalOpen(false)}
        onAddEvidence={(evData) => {
          addEntity({
            label: evData.label,
            type: evData.type,
            visualType: evData.visualType,
            confidence: evData.confidence,
            notes: evData.notes,
            boardPosition: {
              x: (Math.random() - 0.5) * 20,
              y: (Math.random() - 0.5) * 20,
            },
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
        onClose={() => setIsIngestOpen(false)}
        onCommit={(newEnts, newRels, docTitle) => {
          commitExtraction(newEnts, newRels, docTitle);
        }}
      />

      {/* Entity Resolution Modal */}
      <EntityResolutionModal
        isOpen={isResolutionOpen}
        entities={entities}
        onClose={() => setIsResolutionOpen(false)}
        onMerge={handleMergeEntities}
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
      />

      {/* Women Safety Modal */}
      <WomenSafetyModal isOpen={isSafetyOpen} onClose={() => setIsSafetyOpen(false)} />

      {/* Public Intelligence Intake Modal */}
      <PublicIntelModal
        isOpen={isIntelOpen}
        onClose={() => setIsIntelOpen(false)}
        onPromoteToCase={(tipText) => {
          setIsIngestOpen(true);
        }}
      />
    </main>
  );
}
