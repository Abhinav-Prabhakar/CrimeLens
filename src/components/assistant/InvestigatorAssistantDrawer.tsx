'use client';

import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  X,
  Sparkles,
  Send,
  Shield,
  Copy,
  Check,
  RotateCcw,
  Download,
  Maximize2,
  Minimize2,
  Terminal,
  Bot,
  User,
  Scale,
  GitFork,
  HelpCircle,
  FileUp,
  Camera,
} from 'lucide-react';
import { InvestigationCase, InvestigationEntity, InvestigationRelationship } from '@/lib/types/investigation';

interface AssistantDrawerProps {
  isOpen: boolean;
  activeCase: InvestigationCase | null;
  entities: InvestigationEntity[];
  relationships: InvestigationRelationship[];
  onClose: () => void;
  onSelectEntity?: (id: string) => void;
  onOpenIngest?: () => void;
  onOpenImageAnalysis?: () => void;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

const introMessage = (
  activeCase: InvestigationCase | null,
  entities: InvestigationEntity[],
  relationships: InvestigationRelationship[],
): ChatMessage => ({
  id: 'init_1',
  sender: 'assistant',
  text: `### CrimeLens Senior Intelligence Analyst Ready
Case indexed: **${activeCase?.title || 'Operation Blackwood'}** (${entities.length} entities, ${relationships.length} relationships).

I can assist you with:
- **Relational Shortest-Path & Evidential Weighting**
- **Multi-Hypothesis Formulation** (with supporting vs contradictory points)
- **Financial Layering & Shell Account Tracing**
- **Statutory Charge Drafting Assistance** (*Bharatiya Nyaya Sanhita / PMLA*)

Select an action chip below or type your inquiry.

Attach a document or evidence image with the buttons beside the composer — extraction results stage for your review.`,
  timestamp: new Date().toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  }),
});

const ACTION_PROMPTS = [
  { label: '🔗 Trace Marlowe ↔ Vance', prompt: 'Show me the complete evidential connection between Daniel Vance and Julian Marlowe.' },
  { label: '🧠 Multi-Hypothesis Analysis', prompt: 'Generate 3 distinct alternative hypotheses for the Pier 9 warehouse breach with supporting and contradictory evidence.' },
  { label: '💰 Trace Money Flow', prompt: 'Analyze the $450,000 financial layering route from Apex Maritime to Elena Rostova. What are the key anomalies?' },
  { label: '⚖️ BNS / Legal Charges', prompt: 'Based on the current verified facts, what legal sections under the Bharatiya Nyaya Sanhita (BNS) and PMLA should investigators consider?' },
  { label: '❓ Missing Information', prompt: 'What critical evidence is currently missing from this investigation, and what questions should investigators ask next?' },
];

export const InvestigatorAssistantDrawer: React.FC<AssistantDrawerProps> = ({
  isOpen,
  activeCase,
  entities,
  relationships,
  onClose,
  onSelectEntity,
  onOpenIngest,
  onOpenImageAnalysis,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    introMessage(activeCase, entities, relationships),
  ]);

  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages((current) =>
      current.length === 1 && current[0]?.id === 'init_1'
        ? [introMessage(activeCase, entities, relationships)]
        : current,
    );
  }, [activeCase, entities, relationships]);

  // Auto-scroll on new messages
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  if (!isOpen) return null;

  const handleSend = async (queryText?: string) => {
    const q = (queryText || inputQuery).trim();
    if (!q || isLoading) return;

    const userMsg: ChatMessage = {
      id: `msg_${Date.now()}_u`,
      sender: 'user',
      text: q,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: q,
          history: messages
            .filter((m) => m.sender === 'user' || m.sender === 'assistant')
            .slice(-8)
            .map((m) => ({ role: m.sender, text: m.text })),
          caseContext: {
            title: activeCase?.title,
            caseNumber: activeCase?.caseNumber,
            leadInvestigator: activeCase?.leadInvestigator,
            jurisdiction: activeCase?.jurisdiction,
            incidentDate: activeCase?.incidentDate,
            entities,
            relationships,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to generate intelligence reasoning');
      }

      const botMsg: ChatMessage = {
        id: `msg_${Date.now()}_a`,
        sender: 'assistant',
        text: data.response || 'No response generated.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `msg_${Date.now()}_err`,
          sender: 'assistant',
          text: `> ⚠️ **Analysis Error**\n${err.message || 'Unable to reach intelligence gateway.'}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExportChat = () => {
    const transcript = messages
      .map((m) => `### ${m.sender.toUpperCase()} [${m.timestamp}]\n\n${m.text}\n\n---\n`)
      .join('\n');
    const blob = new Blob([transcript], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeCase?.caseNumber || 'case'}_assistant_transcript.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClearHistory = () => {
    setMessages([
      {
        id: 'init_cleared',
        sender: 'assistant',
        text: `### 🧹 Transcript Cleared\nReady for new inquiry on case **${activeCase?.title}**.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  return (
    <div
      className={`cb-dossier cb-drawer z-40 flex flex-col overflow-hidden font-sans text-xs text-noir-200 max-w-[calc(100vw-24px)] transition-all duration-300 ${
        isExpanded ? 'w-[750px]' : 'w-[440px]'
      }`}
    >
      {/* Header */}
      <div className="cb-dossier-head flex items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="cb-row-icon text-amber-accent">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-noir-100 uppercase tracking-wider text-xs truncate">
                AI Investigator Assistant
              </h2>
              <span className="cb-badge cb-badge-amber flex-shrink-0">GPT-OSS 120B</span>
            </div>
            <div className="cb-faint text-[10px] mt-0.5 truncate cb-mono">
              Context: {activeCase?.title}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="cb-btn cb-btn-ghost cb-btn-icon"
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          <button
            onClick={handleExportChat}
            className="cb-btn cb-btn-ghost cb-btn-icon"
            title="Export Transcript (.md)"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={handleClearHistory}
            className="cb-btn cb-btn-ghost cb-btn-icon"
            title="Clear Chat History"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button onClick={onClose} className="cb-btn cb-btn-ghost cb-btn-icon" title="Close">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Suggested Action Chips */}
      <div className="cb-scroll px-3 py-2 border-b border-noir-700 overflow-x-auto flex gap-1.5">
        {ACTION_PROMPTS.map((item, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(item.prompt)}
            className="cb-btn cb-btn-ghost cb-btn-sm flex-shrink-0 whitespace-nowrap"
          >
            {item.label}
          </button>
        ))}
        {(onOpenIngest || onOpenImageAnalysis) && (
          <span className="flex-shrink-0 self-center h-4 border-l border-noir-700 mx-0.5" aria-hidden="true" />
        )}
        {onOpenIngest && (
          <button
            onClick={onOpenIngest}
            className="cb-btn cb-btn-ghost cb-btn-sm flex-shrink-0 whitespace-nowrap"
            title="Attach document for extraction"
          >
            <FileUp className="w-3.5 h-3.5" />
            Ingest document
          </button>
        )}
        {onOpenImageAnalysis && (
          <button
            onClick={onOpenImageAnalysis}
            className="cb-btn cb-btn-ghost cb-btn-sm flex-shrink-0 whitespace-nowrap"
            title="Attach evidence image for forensic analysis"
          >
            <Camera className="w-3.5 h-3.5" />
            Analyze image
          </button>
        )}
      </div>

      {/* Chat Messages Log */}
      <div className="cb-dossier-body cb-scroll flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex flex-col ${
              m.sender === 'user' ? 'items-end' : 'items-start'
            }`}
          >
            <div className="cb-eyebrow flex items-center gap-1.5 mb-1 px-1">
              {m.sender === 'user' ? (
                <>
                  <span>Investigator</span>
                  <User className="w-3 h-3 text-crimson" />
                </>
              ) : (
                <>
                  <Bot className="w-3 h-3 text-amber-accent" />
                  <span>CrimeLens AI</span>
                </>
              )}
              <span className="cb-faint">· {m.timestamp}</span>
            </div>

            <div
              className="cb-card cb-card-pad relative group max-w-[95%] overflow-x-auto text-[12px] leading-relaxed"
              style={
                m.sender === 'user'
                  ? { borderRight: '2px solid #4a3b34' }
                  : { borderLeft: '2px solid #8c2620' }
              }
            >
              {/* Copy Button */}
              <button
                onClick={() => handleCopyText(m.text, m.id)}
                className="cb-btn cb-btn-ghost cb-btn-icon absolute top-2 right-2 opacity-0 group-hover:opacity-100"
                title="Copy message"
              >
                {copiedId === m.id ? <Check className="w-3.5 h-3.5 cb-green" /> : <Copy className="w-3.5 h-3.5" />}
              </button>

              {/* Markdown Content */}
              <div className="max-w-none text-[12px] space-y-2">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    table: ({ node, ...props }) => (
                      <div className="cb-scroll overflow-x-auto my-3 border border-noir-700 rounded-md">
                        <table className="w-full text-left border-collapse text-[11px]" {...props} />
                      </div>
                    ),
                    thead: ({ node, ...props }) => (
                      <thead className="bg-noir-800 text-noir-200 uppercase font-bold border-b border-noir-700 cb-mono text-[10px] tracking-wider" {...props} />
                    ),
                    th: ({ node, ...props }) => (
                      <th className="px-3 py-2 border-r border-noir-700 last:border-r-0" {...props} />
                    ),
                    td: ({ node, ...props }) => (
                      <td className="px-3 py-2 border-t border-noir-700 border-r last:border-r-0 text-noir-300" {...props} />
                    ),
                    tr: ({ node, ...props }) => (
                      <tr className="hover:bg-noir-800/50 transition-colors" {...props} />
                    ),
                    h1: ({ node, ...props }) => <h1 className="cb-mono text-sm font-bold text-noir-100 uppercase tracking-wider border-b border-noir-700 pb-1 mt-2 mb-1" {...props} />,
                    h2: ({ node, ...props }) => <h2 className="cb-mono text-xs font-bold text-amber-accent uppercase tracking-wider border-b border-noir-700 pb-1 mt-2 mb-1" {...props} />,
                    h3: ({ node, ...props }) => <h3 className="text-xs font-bold text-noir-100 mt-2 mb-1" {...props} />,
                    strong: ({ node, ...props }) => <strong className="font-bold text-amber-accent/90" {...props} />,
                    em: ({ node, ...props }) => <em className="italic text-noir-300" {...props} />,
                    blockquote: ({ node, ...props }) => (
                      <blockquote className="border-l-2 border-amber-dim pl-3 py-1 bg-noir-800/60 my-2 italic text-noir-300 text-[11px]" {...props} />
                    ),
                    code: ({ node, ...props }) => (
                      <code className="cb-mono px-1.5 py-0.5 bg-noir-950 border border-noir-700 rounded text-[10px] text-amber-accent" {...props} />
                    ),
                    ul: ({ node, ...props }) => <ul className="list-disc pl-4 space-y-1 my-1" {...props} />,
                    ol: ({ node, ...props }) => <ol className="list-decimal pl-4 space-y-1 my-1" {...props} />,
                    li: ({ node, ...props }) => <li className="text-noir-300" {...props} />,
                    hr: ({ node, ...props }) => <hr className="border-noir-700 my-2" {...props} />,
                  }}
                >
                  {m.text}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="cb-alert cb-alert-amber items-center animate-pulse">
            <Sparkles className="w-4 h-4 animate-spin text-amber-accent flex-shrink-0" />
            <div className="space-y-0.5">
              <strong className="cb-mono text-[11px] uppercase tracking-wider">Forensic Reasoning Engine Active</strong>
              <div className="cb-faint text-[10px]">Synthesizing evidence graph & statutory legal correlates...</div>
            </div>
          </div>
        )}

        <div ref={chatBottomRef} />
      </div>

      {/* Input Field */}
      <div className="cb-dossier-foot p-3 flex items-center gap-2">
        {onOpenIngest && (
          <button
            onClick={onOpenIngest}
            className="cb-btn cb-btn-ghost cb-btn-icon flex-shrink-0"
            title="Attach document for extraction"
          >
            <FileUp className="w-[18px] h-[18px]" />
          </button>
        )}
        {onOpenImageAnalysis && (
          <button
            onClick={onOpenImageAnalysis}
            className="cb-btn cb-btn-ghost cb-btn-icon flex-shrink-0"
            title="Attach evidence image for forensic analysis"
          >
            <Camera className="w-[18px] h-[18px]" />
          </button>
        )}
        <input
          type="text"
          value={inputQuery}
          onChange={(e) => setInputQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Ask about connections, hypotheses, evidence, legal charges..."
          className="cb-input flex-1 cb-mono text-[11px]"
        />
        <button
          onClick={() => handleSend()}
          disabled={isLoading || !inputQuery.trim()}
          className="cb-btn cb-btn-primary cb-btn-icon"
          title="Send inquiry"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
