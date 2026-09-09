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
} from 'lucide-react';
import { InvestigationCase, InvestigationEntity, InvestigationRelationship } from '@/lib/types/investigation';

interface AssistantDrawerProps {
  isOpen: boolean;
  activeCase: InvestigationCase | null;
  entities: InvestigationEntity[];
  relationships: InvestigationRelationship[];
  onClose: () => void;
  onSelectEntity?: (id: string) => void;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

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
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init_1',
      sender: 'assistant',
      text: `### 🕵️‍♂️ CrimeLens Senior Intelligence Analyst Ready
Case indexed: **${activeCase?.title || 'Operation Blackwood'}** (${entities.length} entities, ${relationships.length} relationships).

I can assist you with:
- **Relational Shortest-Path & Evidential Weighting**
- **Multi-Hypothesis Formulation** (with supporting vs contradictory points)
- **Financial Layering & Shell Account Tracing**
- **Statutory Charge Drafting Assistance** (*Bharatiya Nyaya Sanhita / PMLA*)

Select an action chip below or type your inquiry.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const chatBottomRef = useRef<HTMLDivElement>(null);

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
      className={`fixed top-14 right-4 z-40 bg-noir-900 border border-noir-700 rounded-xl shadow-2xl flex flex-col font-mono text-xs text-noir-200 overflow-hidden transition-all duration-300 backdrop-blur-md ${
        isExpanded ? 'w-[750px] h-[88vh]' : 'w-[450px] h-[85vh]'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-noir-850 border-b border-noir-700">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded bg-amber-accent/20 border border-amber-accent/40 flex items-center justify-center text-amber-accent">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-noir-100 uppercase tracking-wider text-xs">
                AI Investigator Assistant
              </span>
              <span className="px-1.5 py-0.2 bg-emerald-950 border border-emerald-800 text-emerald-400 text-[9px] font-bold rounded">
                GPT-OSS 120B
              </span>
            </div>
            <div className="text-[10px] text-noir-400">Context: {activeCase?.title}</div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 text-noir-400 hover:text-noir-100 rounded hover:bg-noir-800 transition-colors"
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          <button
            onClick={handleExportChat}
            className="p-1.5 text-noir-400 hover:text-noir-100 rounded hover:bg-noir-800 transition-colors"
            title="Export Transcript (.md)"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={handleClearHistory}
            className="p-1.5 text-noir-400 hover:text-crimson rounded hover:bg-noir-800 transition-colors"
            title="Clear Chat History"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 text-noir-400 hover:text-noir-100 rounded hover:bg-noir-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Suggested Action Chips */}
      <div className="px-3 py-2 bg-noir-950 border-b border-noir-800 overflow-x-auto flex gap-1.5 scrollbar-none">
        {ACTION_PROMPTS.map((item, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(item.prompt)}
            className="flex-shrink-0 px-2.5 py-1 bg-noir-850 hover:bg-noir-750 text-noir-300 hover:text-amber-accent border border-noir-700 hover:border-amber-accent/50 rounded text-[10px] transition-colors whitespace-nowrap"
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Chat Messages Log */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-noir-900/60">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex flex-col ${
              m.sender === 'user' ? 'items-end' : 'items-start'
            }`}
          >
            <div className="flex items-center gap-1.5 mb-1 px-1 text-[10px] text-noir-500">
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
              <span>• {m.timestamp}</span>
            </div>

            <div
              className={`relative group rounded-xl p-4 text-[11px] leading-relaxed max-w-[95%] overflow-x-auto ${
                m.sender === 'user'
                  ? 'bg-crimson/15 border border-crimson/40 text-noir-100'
                  : 'bg-noir-850/95 border border-noir-700 text-noir-200 shadow-lg'
              }`}
            >
              {/* Copy Button */}
              <button
                onClick={() => handleCopyText(m.text, m.id)}
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 bg-noir-800 hover:bg-noir-700 rounded text-noir-400 hover:text-noir-100 transition-opacity"
                title="Copy message"
              >
                {copiedId === m.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>

              {/* Markdown Content */}
              <div className="prose prose-invert max-w-none prose-sm font-mono text-[11px] space-y-2">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    table: ({ node, ...props }) => (
                      <div className="overflow-x-auto my-3 border border-noir-700 rounded-lg">
                        <table className="w-full text-left border-collapse text-[10px]" {...props} />
                      </div>
                    ),
                    thead: ({ node, ...props }) => (
                      <thead className="bg-noir-800 text-noir-200 uppercase font-bold border-b border-noir-700" {...props} />
                    ),
                    th: ({ node, ...props }) => (
                      <th className="px-3 py-2 border-r border-noir-700 last:border-r-0" {...props} />
                    ),
                    td: ({ node, ...props }) => (
                      <td className="px-3 py-2 border-t border-noir-800 border-r border-noir-800 last:border-r-0 text-noir-300" {...props} />
                    ),
                    tr: ({ node, ...props }) => (
                      <tr className="hover:bg-noir-800/50 transition-colors" {...props} />
                    ),
                    h1: ({ node, ...props }) => <h1 className="text-sm font-bold text-noir-100 border-b border-noir-700 pb-1 mt-2 mb-1" {...props} />,
                    h2: ({ node, ...props }) => <h2 className="text-xs font-bold text-amber-accent border-b border-noir-800 pb-1 mt-2 mb-1" {...props} />,
                    h3: ({ node, ...props }) => <h3 className="text-xs font-bold text-noir-200 mt-2 mb-1" {...props} />,
                    strong: ({ node, ...props }) => <strong className="font-bold text-noir-100 text-amber-accent/90" {...props} />,
                    em: ({ node, ...props }) => <em className="italic text-noir-300" {...props} />,
                    blockquote: ({ node, ...props }) => (
                      <blockquote className="border-l-2 border-amber-accent/60 pl-3 py-1 bg-noir-900/60 my-2 italic text-noir-300 text-[10px]" {...props} />
                    ),
                    code: ({ node, ...props }) => (
                      <code className="px-1.5 py-0.5 bg-noir-950 border border-noir-700 rounded text-[10px] text-amber-accent" {...props} />
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
          <div className="p-3 bg-noir-850 border border-amber-accent/30 rounded-xl text-amber-accent flex items-center gap-3 animate-pulse">
            <Sparkles className="w-4 h-4 animate-spin" />
            <div className="space-y-0.5">
              <span className="font-bold text-[11px]">Forensic Reasoning Engine Active</span>
              <div className="text-[10px] text-noir-400">Synthesizing evidence graph & statutory legal correlates...</div>
            </div>
          </div>
        )}

        <div ref={chatBottomRef} />
      </div>

      {/* Input Field */}
      <div className="p-3 bg-noir-850 border-t border-noir-700 flex items-center gap-2">
        <input
          type="text"
          value={inputQuery}
          onChange={(e) => setInputQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Ask about connections, hypotheses, evidence, legal charges..."
          className="flex-1 bg-noir-950 border border-noir-700 rounded-lg px-3 py-2.5 text-noir-100 text-xs focus:border-crimson focus:outline-none placeholder:text-noir-500 font-mono"
        />
        <button
          onClick={() => handleSend()}
          disabled={isLoading || !inputQuery.trim()}
          className="p-2.5 bg-crimson hover:bg-crimson-bright disabled:opacity-40 text-white rounded-lg transition-colors shadow-lg shadow-crimson/20"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
