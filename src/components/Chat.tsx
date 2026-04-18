"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ChatEntry } from "../types";
import { useSpeechInput } from "../hooks/useSpeechInput";
import { useSpeechOutput } from "../hooks/useSpeechOutput";

export interface ChatVoiceOptions {
  input?: boolean;
  output?: boolean;
  lang?: string;
  rate?: number;
  voice?: string;
}

export type ChatTheme = "light" | "dark";

export interface ChatActiveTool {
  key: string;
  name: string;
  label: string;
  icon?: string;
}

export interface ChatProps {
  messages: ChatEntry[];
  streaming: boolean;
  connected: boolean;
  onSend: (message: string) => void;
  onReconnect?: () => void;
  toolLabels?: Record<string, string>;
  placeholder?: string;
  emptyMessage?: string;
  sendLabel?: string;
  disconnectedMessage?: string;
  voice?: boolean | ChatVoiceOptions;
  showStatus?: boolean;
  theme?: ChatTheme;
  /** Map icon names (from @possession_tool(icon=...)) to ReactNodes. */
  iconMap?: Record<string, React.ReactNode>;
  /** Tools currently running (from useWebSocket.activeTools). */
  activeTools?: ChatActiveTool[];
  /** Waiting for agent response (user sent, nothing back yet). */
  waiting?: boolean;
  /** Hide inline completed-tool badges on assistant messages. */
  hideToolBadges?: boolean;
}

const DEFAULT_TOOL_LABELS: Record<string, string> = {
  render_component: "Component rendered",
  update_component: "Component updated",
  remove_component: "Component removed",
};

const THEMES = {
  light: {
    container: "bg-white",
    statusBar: "border-zinc-200 hover:bg-zinc-50",
    statusText: "text-zinc-500",
    emptyText: "text-zinc-400",
    userBubble: "bg-blue-600 text-white",
    assistantBubble: "bg-zinc-100 text-zinc-800 border border-zinc-200",
    assistantProse:
      "prose prose-zinc prose-sm max-w-none [&_p]:my-1 [&_p]:text-base [&_p]:leading-relaxed [&_ul]:my-2 [&_ol]:my-2 [&_li]:text-base [&_li]:my-0.5 [&_strong]:text-zinc-900",
    toolBadge: "text-zinc-500 bg-zinc-50 border border-zinc-200",
    streamingDots: "bg-zinc-100 border border-zinc-200",
    streamingDot: "bg-zinc-400",
    inputBorder: "border-t border-zinc-200 bg-white",
    input: "bg-white border border-zinc-300 text-zinc-800 placeholder-zinc-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100",
    micIdle: "bg-white hover:bg-zinc-50 text-zinc-600 border border-zinc-300",
    micActive: "bg-red-600 hover:bg-red-500 text-white animate-pulse border border-red-600",
    sendButton: "bg-blue-600 hover:bg-blue-500 text-white border border-blue-600",
    speakingBadge: "text-cyan-700 bg-cyan-100 hover:bg-cyan-200",
  },
  dark: {
    container: "bg-zinc-950",
    statusBar: "border-zinc-800 hover:bg-zinc-800/30",
    statusText: "text-zinc-400",
    emptyText: "text-zinc-500",
    userBubble: "bg-blue-600 text-white",
    assistantBubble: "bg-zinc-800 text-zinc-200",
    assistantProse:
      "prose prose-invert prose-sm max-w-none [&_p]:my-1 [&_p]:text-base [&_p]:leading-relaxed [&_ul]:my-2 [&_ol]:my-2 [&_li]:text-base [&_li]:my-0.5",
    toolBadge: "text-zinc-500 bg-zinc-800/50 border border-zinc-800",
    streamingDots: "bg-zinc-800",
    streamingDot: "bg-zinc-400",
    inputBorder: "border-t border-zinc-800 bg-zinc-950",
    input: "bg-zinc-800 border border-zinc-700 text-zinc-200 placeholder-zinc-500 focus:border-blue-500",
    micIdle: "bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700",
    micActive: "bg-red-600 hover:bg-red-500 text-white animate-pulse border border-red-600",
    sendButton: "bg-blue-600 hover:bg-blue-500 text-white border border-blue-600",
    speakingBadge: "text-cyan-300 bg-cyan-900/30 hover:bg-cyan-900/50",
  },
} as const;

export function Chat({
  messages,
  streaming,
  connected,
  onSend,
  onReconnect,
  toolLabels = {},
  placeholder = "Type a message...",
  emptyMessage = "Start a conversation...",
  sendLabel = "Send",
  disconnectedMessage = "Disconnected · click to connect",
  voice,
  showStatus = true,
  theme = "dark",
  iconMap,
  activeTools = [],
  waiting = false,
  hideToolBadges = false,
}: ChatProps) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const allToolLabels = { ...DEFAULT_TOOL_LABELS, ...toolLabels };
  const t = THEMES[theme];

  const voiceOpts: ChatVoiceOptions =
    typeof voice === "object" ? voice : voice ? {} : {};
  const inputEnabled = typeof voice === "object" ? voice.input !== false : !!voice;
  const outputEnabled = typeof voice === "object" ? voice.output !== false : !!voice;
  const voiceLang = voiceOpts.lang ?? "en-US";

  const speech = useSpeechInput({
    lang: voiceLang,
    onResult: (transcript) => {
      if (transcript.trim() && !streaming && connected) {
        onSend(transcript.trim());
        setInput("");
      }
    },
  });

  const tts = useSpeechOutput({
    lang: voiceLang,
    rate: voiceOpts.rate,
    voice: voiceOpts.voice,
  });

  useEffect(() => {
    if (speech.listening && speech.transcript) {
      setInput(speech.transcript);
    }
  }, [speech.listening, speech.transcript]);

  const lastSpokenRef = useRef<string | null>(null);
  useEffect(() => {
    if (!outputEnabled) return;
    if (streaming) return;
    const last = messages[messages.length - 1];
    if (!last || last.role !== "assistant") return;
    const signature = `${messages.length}:${last.content.slice(0, 40)}`;
    if (lastSpokenRef.current === signature) return;
    lastSpokenRef.current = signature;
    tts.speak(last.content);
  }, [messages, streaming, outputEnabled, tts]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || streaming) return;
    onSend(input.trim());
    setInput("");
  };

  const handleMicClick = () => {
    if (tts.speaking) tts.stop();
    if (speech.listening) {
      speech.stop();
    } else {
      speech.start();
    }
  };

  return (
    <div className={`flex flex-col h-full ${t.container}`}>
      {showStatus && (
        <button
          onClick={connected ? undefined : onReconnect}
          className={`p-3 border-b flex items-center gap-2 w-full text-left transition-colors ${t.statusBar}`}
        >
          <div className={`w-2 h-2 rounded-full ${connected ? "bg-emerald-500" : "bg-red-500 animate-pulse"}`} />
          <span className={`text-sm flex-1 ${t.statusText}`}>
            {connected ? "Connected" : disconnectedMessage}
          </span>
          {outputEnabled && tts.speaking && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                tts.stop();
              }}
              className={`text-xs px-2 py-0.5 rounded-full cursor-pointer transition-colors ${t.speakingBadge}`}
              title="Stop speaking"
            >
              Speaking...
            </span>
          )}
        </button>
      )}

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <p className={`text-base ${t.emptyText}`}>{emptyMessage}</p>
          </div>
        )}
        {messages.map((msg, i) => {
          if (msg.role === "user") {
            return (
              <div key={i} className="flex justify-end">
                <div className={`max-w-[90%] rounded-2xl px-4 py-3 text-base shadow-sm ${t.userBubble}`}>
                  {msg.content}
                </div>
              </div>
            );
          }

          return (
            <div key={i} className="flex flex-col gap-1.5 items-start">
              {!hideToolBadges && (msg.toolCalls ?? []).map((tc, k) => {
                const label = allToolLabels[tc.name] ?? tc.label ?? tc.name;
                const icon = tc.icon && iconMap?.[tc.icon];
                return (
                  <div
                    key={`tc-${k}`}
                    className={`flex items-center gap-2 text-xs rounded-lg px-2.5 py-1 ${t.toolBadge}`}
                  >
                    {icon ? (
                      <span className="inline-flex w-3.5 h-3.5 items-center justify-center">
                        {icon}
                      </span>
                    ) : (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    )}
                    {label}
                  </div>
                );
              })}
              {msg.content.trim() && (
                <div className={`max-w-[95%] rounded-2xl px-4 py-3 ${t.assistantBubble}`}>
                  <div className={t.assistantProse}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {!hideToolBadges && activeTools.length > 0 && (
          <div className="flex flex-col gap-1.5 items-start">
            {activeTools.map((tool) => {
              const icon = tool.icon && iconMap?.[tool.icon];
              return (
                <div
                  key={tool.key}
                  className={`flex items-center gap-2 text-xs rounded-lg px-2.5 py-1 ${t.toolBadge}`}
                >
                  {icon ? (
                    <span className="inline-flex w-3.5 h-3.5 items-center justify-center">
                      {icon}
                    </span>
                  ) : (
                    <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
                      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                    </svg>
                  )}
                  {tool.label}
                </div>
              );
            })}
          </div>
        )}
        {(streaming || waiting || activeTools.length > 0) && (
          <div className="flex justify-start">
            <div className={`rounded-2xl px-4 py-3 ${t.streamingDots}`}>
              <div className="flex gap-1.5">
                <span className={`w-2 h-2 rounded-full animate-bounce [animation-delay:0ms] ${t.streamingDot}`} />
                <span className={`w-2 h-2 rounded-full animate-bounce [animation-delay:150ms] ${t.streamingDot}`} />
                <span className={`w-2 h-2 rounded-full animate-bounce [animation-delay:300ms] ${t.streamingDot}`} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className={`p-5 ${t.inputBorder}`}>
        <div className="flex gap-2 items-stretch">
          {inputEnabled && (
            <button
              type="button"
              onClick={handleMicClick}
              disabled={!connected || streaming || !speech.supported}
              title={
                !speech.supported
                  ? "Speech recognition not supported in this browser"
                  : speech.listening
                    ? "Stop listening"
                    : "Start voice input"
              }
              className={`px-4 py-4 rounded-lg font-medium transition-all flex-shrink-0 flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed ${
                speech.listening ? t.micActive : t.micIdle
              }`}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                <rect x="9" y="3" width="6" height="12" rx="3" />
                <path d="M5 10a7 7 0 0014 0M12 17v4M8 21h8" strokeLinecap="round" />
              </svg>
            </button>
          )}
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              speech.listening
                ? "Listening..."
                : connected
                  ? placeholder
                  : "Connecting..."
            }
            disabled={!connected}
            style={{ paddingLeft: "1.25rem", paddingRight: "1.25rem" }}
            className={`flex-1 min-w-0 rounded-lg py-4 text-base focus:outline-none disabled:opacity-50 transition-shadow ${t.input}`}
          />
          <button
            type="submit"
            disabled={!connected || streaming || !input.trim()}
            className={`px-5 py-4 rounded-lg text-base font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0 ${t.sendButton}`}
          >
            {sendLabel}
          </button>
        </div>
      </form>
    </div>
  );
}
