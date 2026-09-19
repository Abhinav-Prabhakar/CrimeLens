'use client';

import React from 'react';
import {
  Sparkles,
  Upload,
  FileText,
  Users,
  Camera,
  Inbox,
  HeartHandshake,
  History,
} from 'lucide-react';
import { CasebookTopBar, type KebabItem } from './CasebookTopBar';
import { CasebookRail, type RailAppTool } from './CasebookRail';
import { CasebookBottomBar, type AppView, type TimelineItem } from './CasebookBottomBar';
import type { BoardTool, ThreadColorId } from '@/lib/board/casebook/types';
import type { InvestigationCase } from '@/lib/types/investigation';

export interface CasebookChromeProps {
  activeCase: InvestigationCase | null;
  activeView: AppView;
  activeTool: BoardTool;
  threadColor: ThreadColorId;
  filterTypes: Record<string, boolean>;
  typeCounts: Record<string, number>;
  timelineItems: TimelineItem[];
  zoomPct: number;
  canUndo: boolean;
  canRedo: boolean;
  showBoardTools: boolean;
  onSelectView(v: AppView): void;
  onSelectTool(t: BoardTool): void;
  onSelectThreadColor(c: ThreadColorId): void;
  onToggleFilter(t: string): void;
  onAddCard(type: string): void;
  onPickImageFile(): void;
  onJumpToItem(id: string): void;
  onZoomIn(): void;
  onZoomOut(): void;
  onUndo(): void;
  onRedo(): void;
  // top bar + kebab
  onOpenCases(): void;
  onShare(): void;
  onOpenSearch(): void;
  onOpenAudit(): void;
  onExport(): void;
  onImport(): void;
  onCenterBoard(): void;
  onResetSeed(): void;
  // app tools (rail)
  onOpenIngest(): void;
  onOpenAssistant(): void;
  onOpenReports(): void;
  onOpenResolution(): void;
  onOpenImageAnalysis(): void;
  onOpenIntel(): void;
  onOpenSafety(): void;
}

const VIEW_LABELS: Record<AppView, string> = {
  board: 'Evidence board',
  graph: 'Knowledge graph',
  timeline: 'Timeline',
  patterns: 'Anomalies',
};

export const CasebookChrome: React.FC<CasebookChromeProps> = (props) => {
  const {
    activeCase,
    activeView,
    activeTool,
    threadColor,
    filterTypes,
    typeCounts,
    timelineItems,
    zoomPct,
    canUndo,
    canRedo,
    showBoardTools,
    onSelectView,
    onSelectTool,
    onSelectThreadColor,
    onToggleFilter,
    onAddCard,
    onPickImageFile,
    onJumpToItem,
    onZoomIn,
    onZoomOut,
    onUndo,
    onRedo,
    onOpenCases,
    onShare,
    onOpenSearch,
    onOpenAudit,
    onExport,
    onImport,
    onCenterBoard,
    onResetSeed,
    onOpenIngest,
    onOpenAssistant,
    onOpenReports,
    onOpenResolution,
    onOpenImageAnalysis,
    onOpenIntel,
    onOpenSafety,
  } = props;

  const kebabItems: KebabItem[] = [
    { id: 'cases', label: 'Switch case', onSelect: onOpenCases },
    { id: 'import', label: 'Import case bundle', onSelect: onImport },
    { id: 'export', label: 'Export case (JSON)', onSelect: onExport },
    { id: 'center', label: 'Center board', onSelect: onCenterBoard },
    { id: 'reset', label: 'Reset demo case data', danger: true, onSelect: onResetSeed },
  ];

  const appTools: RailAppTool[] = [
    { id: 'ingest', label: 'Ingest', icon: <Upload size={18} />, onSelect: onOpenIngest },
    { id: 'assistant', label: 'AI Assistant', icon: <Sparkles size={18} />, onSelect: onOpenAssistant },
    { id: 'reports', label: 'Reports', icon: <FileText size={18} />, onSelect: onOpenReports },
    { id: 'resolve', label: 'Resolution', icon: <Users size={18} />, onSelect: onOpenResolution },
    { id: 'analyze', label: 'Analyze', icon: <Camera size={18} />, onSelect: onOpenImageAnalysis },
    { id: 'intel', label: 'Intel', icon: <Inbox size={18} />, onSelect: onOpenIntel },
    { id: 'safety', label: 'Safety', icon: <HeartHandshake size={18} />, onSelect: onOpenSafety },
    { id: 'audit', label: 'Audit', icon: <History size={18} />, onSelect: onOpenAudit },
  ];

  return (
    <>
      <CasebookTopBar
        caseTitle={activeCase?.title || 'Active Case'}
        caseNumber={activeCase?.caseNumber || 'CR-001'}
        viewLabel={VIEW_LABELS[activeView]}
        onOpenCases={onOpenCases}
        onShare={onShare}
        onOpenSearch={onOpenSearch}
        onOpenAudit={onOpenAudit}
        kebabItems={kebabItems}
      />
      {showBoardTools && (
        <CasebookRail
          activeTool={activeTool}
          threadColor={threadColor}
          onSelectTool={onSelectTool}
          onSelectThreadColor={onSelectThreadColor}
          onAddCard={onAddCard}
          onPickImageFile={onPickImageFile}
          appTools={appTools}
          onExport={onExport}
        />
      )}
      <CasebookBottomBar
        filterTypes={filterTypes}
        typeCounts={typeCounts}
        onToggleFilter={onToggleFilter}
        activeView={activeView}
        onSelectView={onSelectView}
        timelineItems={timelineItems}
        onJumpToItem={onJumpToItem}
        activeTool={activeTool}
        onSelectTool={onSelectTool}
        zoomPct={zoomPct}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={onUndo}
        onRedo={onRedo}
        onZoomIn={onZoomIn}
        onZoomOut={onZoomOut}
      />
    </>
  );
};
