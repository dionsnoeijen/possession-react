"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RenderedComponent, ChatEntry, NavigateEvent, ViewDataEvent, FormFillItem } from "../types";

export interface UseWebSocketOptions {
  /** JWT or any token. Appended to the URL as ?token=... */
  token?: string;
  /** Called when the backend rejects the connection (close code 4401). */
  onUnauthorized?: () => void;
  /** Fallback handler for unknown message types. */
  onCustomMessage?: (message: Record<string, unknown>) => void;
}

function buildUrl(url: string, token?: string): string {
  if (!token) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}token=${encodeURIComponent(token)}`;
}

export function useWebSocket(url: string, options?: UseWebSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const streamingRef = useRef(false);
  const urlRef = useRef(buildUrl(url, options?.token));
  const unauthorizedRef = useRef(false);
  urlRef.current = buildUrl(url, options?.token);

  const [connected, setConnected] = useState(false);
  const [chat, setChat] = useState<ChatEntry[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [components, setComponents] = useState<Map<string, RenderedComponent>>(new Map());
  const [pendingNavigate, setPendingNavigate] = useState<NavigateEvent | null>(null);
  const [viewData, setViewData] = useState<ViewDataEvent | null>(null);
  const [formFillQueue, setFormFillQueue] = useState<FormFillItem[]>([]);
  const [highlightItemId, setHighlightItemId] = useState<string | null>(null);

  const handleMessageRef = useRef((event: MessageEvent) => {
    const message = JSON.parse(event.data);

    switch (message.type) {
      case "chat": {
        // Capture previous streaming state BEFORE updating
        const wasStreaming = streamingRef.current;
        setStreaming(true);
        streamingRef.current = true;
        setChat((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant" && wasStreaming) {
            // Continue appending to the current streaming message
            return [...prev.slice(0, -1), { ...last, content: last.content + message.content }];
          }
          // Start a new assistant message
          return [...prev, { role: "assistant", content: message.content }];
        });
        break;
      }

      case "chat_end":
        setStreaming(false);
        streamingRef.current = false;
        setChat((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant") {
            return [
              ...prev.slice(0, -1),
              { ...last, content: message.content },
            ];
          }
          return prev;
        });
        break;

      case "tool_call":
        // Only show completed tool calls as badges.
        if (message.status !== "completed") break;
        setChat((prev) => {
          const last = prev[prev.length - 1];
          const toolCall = {
            name: message.name,
            label: message.label,
            icon: message.icon as string | undefined,
            status: "completed" as const,
          };
          // Attach to the current assistant message, or create a placeholder
          // one if tools fire before any text content arrives.
          if (last?.role === "assistant") {
            return [
              ...prev.slice(0, -1),
              { ...last, toolCalls: [...(last.toolCalls ?? []), toolCall] },
            ];
          }
          return [
            ...prev,
            { role: "assistant", content: "", toolCalls: [toolCall] },
          ];
        });
        break;

      case "ui_action":
        if (message.action === "navigate") {
          setPendingNavigate({ view: message.view, params: message.params });
          break;
        }
        setComponents((prev) => {
          const next = new Map(prev);
          switch (message.action) {
            case "render":
              next.set(message.component_id, {
                id: message.component_id,
                type: message.component_type,
                zone: message.zone ?? "default",
                props: message.props ?? {},
              });
              break;
            case "update": {
              const existing = next.get(message.component_id);
              if (existing) {
                next.set(message.component_id, {
                  ...existing,
                  props: { ...existing.props, ...message.props },
                });
              }
              break;
            }
            case "remove":
              next.delete(message.component_id);
              break;
          }
          return next;
        });
        break;

      case "view_data":
        setViewData({ view: message.view, data: message.data });
        break;

      case "form_fill":
        setFormFillQueue((prev) => [...prev, { field: message.field, value: message.value }]);
        break;

      case "highlight_item":
        setHighlightItemId(message.item_id);
        break;

      case "ping":
        setConnected(true);
        break;

      case "error":
        setChat((prev) => [...prev, { role: "assistant", content: `Error: ${message.content}` }]);
        setStreaming(false);
        streamingRef.current = false;
        break;

      default:
        options?.onCustomMessage?.(message);
        break;
    }
  });

  const doConnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.onopen = null;
      wsRef.current.onclose = null;
      wsRef.current.onmessage = null;
      wsRef.current.onerror = null;
      wsRef.current.close();
      wsRef.current = null;
    }

    const ws = new WebSocket(urlRef.current);
    wsRef.current = ws;
    ws.onopen = () => setConnected(true);
    ws.onmessage = (e) => handleMessageRef.current(e);
    ws.onerror = () => {};
    ws.onclose = (e) => {
      wsRef.current = null;
      setConnected(false);
      setStreaming(false);
      streamingRef.current = false;

      // 4401 = unauthorized (possession backend rejected the token)
      if (e.code === 4401) {
        unauthorizedRef.current = true;
        options?.onUnauthorized?.();
        return;
      }

      reconnectRef.current = setTimeout(doConnect, 3000);
    };
  }, [options]);

  useEffect(() => {
    doConnect();
    return () => {
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [doConnect]);

  const sendMessage = useCallback((message: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      setChat((prev) => [...prev, { role: "user", content: message }]);
      wsRef.current.send(JSON.stringify({ message }));
    }
  }, []);

  const sendTypedMessage = useCallback((data: Record<string, unknown>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  const sendNavigation = useCallback(
    (view: string, params?: Record<string, string>) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "navigate", view, params }));
      }
    },
    []
  );

  return {
    connected,
    chat,
    streaming,
    components: Array.from(components.values()),
    pendingNavigate,
    clearPendingNavigate: useCallback(() => setPendingNavigate(null), []),
    viewData,
    clearViewData: useCallback(() => setViewData(null), []),
    formFillQueue,
    shiftFormFill: useCallback(() => setFormFillQueue((prev) => prev.slice(1)), []),
    highlightItemId,
    clearHighlightItem: useCallback(() => setHighlightItemId(null), []),
    reconnect: doConnect,
    sendMessage,
    sendTypedMessage,
    sendNavigation,
  };
}
