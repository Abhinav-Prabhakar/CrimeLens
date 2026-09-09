'use client';

import React, { useState } from 'react';
import { X, Sparkles, Send, ShieldAlert, BookOpen, Layers, MessageSquare } from 'lucide-react';
import { InvestigationCase, InvestigationEntity, InvestigationRelationship } from '@/lib/types/investigation';

interface AssistantDrawerProps {
  isOpen: boolean;
  activeCase: InvestigationCase | null;
  entities: InvestigationEntity[];
  relationships: InvestigationRelationship[];
  onClose: () => void;
}

interface ChatMessage {
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

const SUGGESTED_QUERIES = [
  'Show me the connection between Daniel Vance and Julian Marlowe',
  'What rapid financial movement occurred and who is the beneficiary?',
  'Generate 3 alternative hypotheses for the Pier 9 warehouse breach',
  'What legal sections under BNS/IPC apply to the evidence so far?',
];

export const InvestigatorAssistantDrawer: React.FC<AssistantDrawerProps> = ({
  isOpen,
  activeCase,
  entities,
  relationships,
  onClose,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      sender: 'assistant',
      text: `Hello Inspector. I am CrimeLens AI Assistant. I have indexed the current case (${activeCase?.title || 'Blackwood'}). Ask me about connections between suspects, timeline anomalies, or legal charge suggestions.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSend = async (queryText?: string) => {
    const q = (queryText || inputQuery).trim();
    if (!q || isLoading) return;

    const userMsg: ChatMessage = {
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
            leadInvestigator: activeCase?.leadInvestigator,
            entities,
            relationships,
          },
        }),
      });

      const data = await res.json();
      const botMsg: ChatMessage = {
        sender: 'assistant',
        text: data.response || 'No response generated.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'assistant',
          text: `Error contacting analysis gateway: ${err.message}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed top-14 right-4 z-40 w-[420px] h-[85vh] bg-noir-900 border border-noir-700 rounded-xl shadow-2xl flex flex-col font-mono text-xs text-noir-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-noir-850 border-b border-noir-700">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-accent" />
          <span className="font-bold text-noir-100 uppercase tracking-wider">
            AI Investigator Assistant
          </span>
        </div>
        <button onClick={onClose} className="text-noir-400 hover:text-noir-100">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Suggested Prompts Pill Bar */}
      <div className="px-3 py-2 bg-noir-950/80 border-b border-noir-800 overflow-x-auto flex gap-1.5 scrollbar-none">
        {SUGGESTED_QUERIES.map((sq, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(sq)}
            className="flex-shrink-0 px-2 py-1 bg-noir-800 hover:bg-noir-700 text-[10px] text-noir-300 hover:text-noir-100 rounded border border-noir-700 transition-colors whitespace-nowrap"
          >
            {sq}
          </button>
        ))}
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`flex flex-col ${
              m.sender === 'user' ? 'items-end' : 'items-start'
            }`}
          >
            <div
              className={`max-w-[88%] rounded-lg p-3 text-[11px] leading-relaxed whitespace-pre-line ${
                m.sender === 'user'
                  ? 'bg-crimson/20 border border-crimson/40 text-noir-100'
                  : 'bg-noir-850 border border-noir-700 text-noir-200'
              }`}
            >
              {m.text}
            </div>
            <span className="text-[9px] text-noir-500 mt-0.5 px-1">{m.timestamp}</span>
          </div>
        ))}
        {isLoading && (
          <div className="p-3 bg-noir-850 border border-noir-700 rounded-lg text-amber-accent flex items-center gap-2">
            <span className="animate-spin">⚙</span> Consulting knowledge graph & evidence files...
          </div>
        )}
      </div>

      {/* Input Field */}
      <div className="p-3 bg-noir-850 border-t border-noir-700 flex items-center gap-2">
        <input
          type="text"
          value={inputQuery}
          onChange={(e) => setInputQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Ask about connections, hypotheses, evidence..."
          className="flex-1 bg-noir-900 border border-noir-700 rounded px-3 py-2 text-noir-100 text-[11px] focus:border-crimson focus:outline-none"
        />
        <button
          onClick={() => handleSend()}
          disabled={isLoading || !inputQuery.trim()}
          className="p-2 bg-crimson hover:bg-crimson-bright disabled:opacity-40 text-white rounded transition-colors"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
