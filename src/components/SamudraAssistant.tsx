import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowUpRight,
  Compass,
  Loader2,
  MapPin,
  RotateCcw,
  Send,
  Wrench,
} from 'lucide-react';
import { ROLE_PERSONAS } from '../data/marineData';
import { ChatMessage, MapControlDirective, MapLayer, UserRole } from '../types/marine';

interface SamudraAssistantProps {
  role: UserRole;
  activeRegionId: string;
  activeLayer: MapLayer;
  externalPrompt: string | null;
  onConsumeExternalPrompt: () => void;
  onApplyMapDirective: (directive: MapControlDirective) => void;
}

function renderFormattedText(text: string): React.ReactNode {
  const lines = text.split('\n');
  return (
    <div className="space-y-1.5 text-[13.5px] leading-relaxed text-[#D8E7F2]">
      {lines.map((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={i} className="h-1" />;

        if (trimmed.startsWith('### ') || trimmed.startsWith('## ')) {
          return (
            <h4
              key={i}
              className="pt-1 font-display text-xs font-semibold uppercase tracking-wider text-[#16C7D9]"
            >
              {trimmed.replace(/^#{2,3}\s+/, '')}
            </h4>
          );
        }

        const isBullet = trimmed.startsWith('- ') || trimmed.startsWith('* ');
        const content = isBullet ? trimmed.slice(2) : trimmed;

        // Parse **bold** segments safely without raw HTML injection
        const segments = content.split(/(\*\*[^*]+\*\*)/g);
        const rendered = segments.map((seg, j) => {
          if (seg.startsWith('**') && seg.endsWith('**')) {
            return (
              <strong key={j} className="font-semibold text-[#E6F1F8]">
                {seg.slice(2, -2)}
              </strong>
            );
          }
          return <React.Fragment key={j}>{seg}</React.Fragment>;
        });

        if (isBullet) {
          return (
            <div key={i} className="flex items-start gap-2 pl-1">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[#16C7D9]" />
              <span>{rendered}</span>
            </div>
          );
        }

        return <p key={i}>{rendered}</p>;
      })}
    </div>
  );
}

export const SamudraAssistant: React.FC<SamudraAssistantProps> = ({
  role,
  activeRegionId,
  activeLayer,
  externalPrompt,
  onConsumeExternalPrompt,
  onApplyMapDirective,
}) => {
  const persona = ROLE_PERSONAS.find((p) => p.id === role) ?? ROLE_PERSONAS[0];

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      timestamp: '10:22 IST',
      content:
        'SAMUDRA AI online. Connected to EOS-06 (Oceansat-3), INSAT-3DR, and INCOIS OMNI moored buoy telemetry.\n\n**Active Basin Summary:**\n- **Kerala — Malabar Shelf:** Optimal upwelling front (SST 27.4 °C, Chl-a 3.18 mg/m³) supporting 4 active PFZ sectors.\n- **Bay of Bengal:** Severe alert — Deep Depression **BOB-04** (994 hPa) generating 3.6 m swells along Andhra–Coromandel.\n\nSelect a quick query below or ask for coordinates, species yields, or safe routing.',
    },
  ]);

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    scrollEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const sendMessage = async (textToSend: string) => {
    const trimmed = textToSend.trim();
    if (!trimmed || isLoading) return;

    const nowStr = new Date().toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestamp: `${nowStr} IST`,
    };

    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/samudra/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          role,
          activeRegionId,
          activeLayer,
          history: nextHistory
            .filter((m) => m.id !== 'welcome' && !m.error)
            .map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || `Server error (${response.status})`);
      }

      if (data.mapDirective) {
        onApplyMapDirective(data.mapDirective as MapControlDirective);
      }

      const replyTime = new Date().toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });

      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          content: data.reply,
          timestamp: `${replyTime} IST`,
          toolTraces: data.toolTraces,
          mapDirective: data.mapDirective,
        },
      ]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to reach SAMUDRA AI backend.';
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: `Request could not be completed: ${msg}`,
          timestamp: `${nowStr} IST`,
          error: true,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (externalPrompt) {
      const prompt = externalPrompt;
      onConsumeExternalPrompt();
      void sendMessage(prompt);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalPrompt]);

  const handleReset = () => {
    setMessages((prev) => [prev[0]]);
  };

  return (
    <aside
      aria-label="SAMUDRA AI Conversational Assistant"
      className="flex h-full min-h-[540px] flex-col rounded-xl border border-[#1A354F] bg-[#0D2033] overflow-hidden"
    >
      {/* Assistant Header */}
      <div className="flex items-center justify-between gap-3 border-b border-[#1A354F] px-4 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Compass className="h-4 w-4 shrink-0 text-[#16C7D9]" aria-hidden="true" />
            <h2 className="font-display text-sm font-semibold text-[#E6F1F8] truncate">
              Samudra Assistant
            </h2>
          </div>
          <p className="mt-0.5 text-[11px] text-[#9FB6C9] truncate">
            {persona.label} · {persona.focus}
          </p>
        </div>

        <button
          type="button"
          onClick={handleReset}
          title="Reset conversation"
          className="inline-flex items-center gap-1.5 rounded-md border border-[#1A354F] px-2.5 py-1 text-xs text-[#9FB6C9] hover:border-[#2A537A] hover:text-[#E6F1F8] whitespace-nowrap shrink-0"
        >
          <RotateCcw className="h-3 w-3" aria-hidden="true" />
          <span>Reset</span>
        </button>
      </div>

      {/* Scrollable Conversation History */}
      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div className="mb-1 flex items-center gap-2 text-[11px] text-[#6F8CA4] font-mono tabular-nums">
              <span>{msg.role === 'user' ? persona.label : 'SAMUDRA AI'}</span>
              <span aria-hidden="true">·</span>
              <span>{msg.timestamp}</span>
            </div>

            <div
              className={`max-w-[95%] rounded-lg px-3.5 py-2.5 ${
                msg.role === 'user'
                  ? 'bg-[#132E49] text-[#E6F1F8]'
                  : msg.error
                  ? 'border border-[#EF4444]/40 bg-[#1B1622] text-[#FCA5A5]'
                  : 'border border-[#1A354F] bg-[#071525] text-[#D8E7F2]'
              }`}
            >
              {/* Agentic Tool Execution Steps */}
              {msg.toolTraces && msg.toolTraces.length > 0 && (
                <div className="mb-2.5 space-y-1 border-b border-[#1A354F] pb-2">
                  {msg.toolTraces.map((trace, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 font-mono text-[11px] text-[#16C7D9]"
                    >
                      <Wrench className="h-3 w-3 shrink-0" aria-hidden="true" />
                      <span className="truncate">{trace.summary}</span>
                    </div>
                  ))}
                </div>
              )}

              {renderFormattedText(msg.content)}

              {msg.mapDirective && (
                <div className="mt-2.5 border-t border-[#1A354F] pt-2">
                  <button
                    type="button"
                    onClick={() => onApplyMapDirective(msg.mapDirective!)}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-[#16C7D9] hover:underline"
                  >
                    <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>
                      Focus map on {msg.mapDirective.focusRegionId ?? 'recommended zone'}
                    </span>
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-2.5 rounded-lg border border-[#1A354F] bg-[#071525] px-3.5 py-2.5 text-xs text-[#9FB6C9]">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-[#16C7D9]" aria-hidden="true" />
            <span>Querying EOS-06 telemetry &amp; INCOIS safety feeds...</span>
          </div>
        )}

        <div ref={scrollEndRef} />
      </div>

      {/* Role-Specific Suggested Queries */}
      <div className="border-t border-[#1A354F] bg-[#091A2B] px-4 py-2.5">
        <div className="mb-1.5 text-[11px] font-medium text-[#6F8CA4]">
          Suggested queries for {persona.label}
        </div>
        <div className="flex flex-col gap-1">
          {persona.starterPrompts.map((prompt) => (
            <button
              key={prompt}
              type="button"
              disabled={isLoading}
              onClick={() => void sendMessage(prompt)}
              className="group flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-xs text-[#9FB6C9] transition-colors hover:bg-[#112840] hover:text-[#E6F1F8] disabled:opacity-50"
            >
              <span className="truncate">{prompt}</span>
              <ArrowUpRight
                className="h-3.5 w-3.5 shrink-0 text-[#4B6B88] group-hover:text-[#16C7D9]"
                aria-hidden="true"
              />
            </button>
          ))}
        </div>
      </div>

      {/* Input Dock */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void sendMessage(input);
        }}
        className="border-t border-[#1A354F] bg-[#071525] p-3"
      >
        <div className="flex items-end gap-2">
          <textarea
            rows={2}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void sendMessage(input);
              }
            }}
            placeholder={`Ask about PFZ coordinates, SST fronts, or sea-state safety...`}
            className="flex-1 resize-none rounded-lg border border-[#1A354F] bg-[#0D2033] px-3 py-2 text-sm text-[#E6F1F8] placeholder-[#5E7B94] focus:border-[#16C7D9] focus:outline-none"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            aria-label="Send query to Samudra AI"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#16C7D9] text-[#071525] transition-colors hover:bg-[#3BD5E4] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Send className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </form>
    </aside>
  );
};
