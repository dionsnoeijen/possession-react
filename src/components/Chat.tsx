"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ChatEntry } from "../types";

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
}

const DEFAULT_TOOL_LABELS: Record<string, string> = {
  render_component: "Component rendered",
  update_component: "Component updated",
  remove_component: "Component removed",
};

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
  disconnectedMessage = "Disconnected — click to connect",
}: ChatProps) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const allToolLabels = { ...DEFAULT_TOOL_LABELS, ...toolLabels };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || streaming) return;
    onSend(input.trim());
    setInput("");
  };

  const toolCallPattern = /(\w[\w_]*\(.*?\)\s*completed\s+in\s+[\d.]+s\.?)/g;

  return (
    <div className="flex flex-col h-full">
      {/* Connection status */}
      <button
        onClick={connected ? undefined : onReconnect}
        className="p-3 border-b border-zinc-800 flex items-center gap-2 w-full text-left hover:bg-zinc-800/30 transition-colors"
      >
        <div
          className={`w-2 h-2 rounded-full ${connected ? "bg-emerald-400" : "bg-red-400 animate-pulse"}`}
        />
        <span className="text-sm text-zinc-400">
          {connected ? "Connected" : disconnectedMessage}
        </span>
      </button>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <p className="text-zinc-500 text-base">{emptyMessage}</p>
          </div>
        )}
        {messages.map((msg, i) => {
          if (msg.role === "user") {
            return (
              <div key={i} className="flex justify-end">
                <div className="max-w-[90%] rounded-2xl px-5 py-3 bg-blue-600 text-white text-base">
                  {msg.content}
                </div>
              </div>
            );
          }

          const parts = msg.content.split(toolCallPattern);

          return (
            <div key={i} className="flex flex-col gap-1.5 items-start">
              {parts.map((part, j) => {
                const trimmed = part.trim();
                if (!trimmed) return null;

                if (toolCallPattern.test(part)) {
                  toolCallPattern.lastIndex = 0;
                  const funcName = trimmed.match(/^(\w[\w_]*)\(/)?.[1] ?? "action";
                  const label = allToolLabels[funcName] ?? funcName;

                  return (
                    <div
                      key={j}
                      className="flex items-center gap-2 text-xs text-zinc-500 bg-zinc-800/50 rounded-lg px-3 py-1.5 border border-zinc-800"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      {label}
                    </div>
                  );
                }

                toolCallPattern.lastIndex = 0;
                return (
                  <div key={j} className="max-w-[90%] rounded-2xl px-5 py-3 bg-zinc-800 text-zinc-200">
                    <div className="prose prose-invert prose-base max-w-none [&>p]:text-base [&>p]:leading-relaxed [&>ul]:text-base [&>ol]:text-base">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{trimmed}</ReactMarkdown>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
        {streaming && (
          <div className="flex justify-start">
            <div className="bg-zinc-800 rounded-2xl px-5 py-3">
              <div className="flex gap-1.5">
                <span className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-zinc-800">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={connected ? placeholder : "Connecting..."}
            disabled={!connected}
            className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-lg text-zinc-200 placeholder-zinc-500 focus:border-blue-500 focus:outline-none disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!connected || streaming || !input.trim()}
            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600 text-white rounded-xl px-6 py-3 text-base font-medium transition-colors"
          >
            {sendLabel}
          </button>
        </div>
      </form>
    </div>
  );
}
