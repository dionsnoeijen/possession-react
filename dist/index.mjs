var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __spreadValues = (a, b) => {
  for (var prop in b || (b = {}))
    if (__hasOwnProp.call(b, prop))
      __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    }
  return a;
};
var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));

// src/hooks/useWebSocket.ts
import { useCallback, useEffect, useRef, useState } from "react";
function buildUrl(url, token) {
  if (!token) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}token=${encodeURIComponent(token)}`;
}
function useWebSocket(url, options) {
  const wsRef = useRef(null);
  const reconnectRef = useRef(null);
  const streamingRef = useRef(false);
  const urlRef = useRef(buildUrl(url, options == null ? void 0 : options.token));
  const unauthorizedRef = useRef(false);
  urlRef.current = buildUrl(url, options == null ? void 0 : options.token);
  const [connected, setConnected] = useState(false);
  const [chat, setChat] = useState([]);
  const [streaming, setStreaming] = useState(false);
  const [components, setComponents] = useState(/* @__PURE__ */ new Map());
  const [pendingNavigate, setPendingNavigate] = useState(null);
  const [viewData, setViewData] = useState(null);
  const [formFillQueue, setFormFillQueue] = useState([]);
  const [highlightItemId, setHighlightItemId] = useState(null);
  const handleMessageRef = useRef((event) => {
    var _a;
    const message = JSON.parse(event.data);
    switch (message.type) {
      case "chat": {
        const wasStreaming = streamingRef.current;
        setStreaming(true);
        streamingRef.current = true;
        setChat((prev) => {
          const last = prev[prev.length - 1];
          if ((last == null ? void 0 : last.role) === "assistant" && wasStreaming) {
            return [...prev.slice(0, -1), __spreadProps(__spreadValues({}, last), { content: last.content + message.content })];
          }
          return [...prev, { role: "assistant", content: message.content }];
        });
        break;
      }
      case "chat_end":
        setStreaming(false);
        streamingRef.current = false;
        setChat((prev) => {
          const last = prev[prev.length - 1];
          if ((last == null ? void 0 : last.role) === "assistant") {
            return [
              ...prev.slice(0, -1),
              __spreadProps(__spreadValues({}, last), { content: message.content })
            ];
          }
          return prev;
        });
        break;
      case "tool_call":
        if (message.status !== "completed") break;
        setChat((prev) => {
          var _a2;
          const last = prev[prev.length - 1];
          const toolCall = {
            name: message.name,
            label: message.label,
            icon: message.icon,
            status: "completed"
          };
          if ((last == null ? void 0 : last.role) === "assistant") {
            return [
              ...prev.slice(0, -1),
              __spreadProps(__spreadValues({}, last), { toolCalls: [...(_a2 = last.toolCalls) != null ? _a2 : [], toolCall] })
            ];
          }
          return [
            ...prev,
            { role: "assistant", content: "", toolCalls: [toolCall] }
          ];
        });
        break;
      case "ui_action":
        if (message.action === "navigate") {
          setPendingNavigate({ view: message.view, params: message.params });
          break;
        }
        setComponents((prev) => {
          var _a2, _b;
          const next = new Map(prev);
          switch (message.action) {
            case "render":
              next.set(message.component_id, {
                id: message.component_id,
                type: message.component_type,
                zone: (_a2 = message.zone) != null ? _a2 : "default",
                props: (_b = message.props) != null ? _b : {}
              });
              break;
            case "update": {
              const existing = next.get(message.component_id);
              if (existing) {
                next.set(message.component_id, __spreadProps(__spreadValues({}, existing), {
                  props: __spreadValues(__spreadValues({}, existing.props), message.props)
                }));
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
        (_a = options == null ? void 0 : options.onCustomMessage) == null ? void 0 : _a.call(options, message);
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
    ws.onerror = () => {
    };
    ws.onclose = (e) => {
      var _a;
      wsRef.current = null;
      setConnected(false);
      setStreaming(false);
      streamingRef.current = false;
      if (e.code === 4401) {
        unauthorizedRef.current = true;
        (_a = options == null ? void 0 : options.onUnauthorized) == null ? void 0 : _a.call(options);
        return;
      }
      reconnectRef.current = setTimeout(doConnect, 3e3);
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
  const sendMessage = useCallback((message) => {
    var _a;
    if (((_a = wsRef.current) == null ? void 0 : _a.readyState) === WebSocket.OPEN) {
      setChat((prev) => [...prev, { role: "user", content: message }]);
      wsRef.current.send(JSON.stringify({ message }));
    }
  }, []);
  const sendTypedMessage = useCallback((data) => {
    var _a;
    if (((_a = wsRef.current) == null ? void 0 : _a.readyState) === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);
  const sendNavigation = useCallback(
    (view, params) => {
      var _a;
      if (((_a = wsRef.current) == null ? void 0 : _a.readyState) === WebSocket.OPEN) {
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
    sendNavigation
  };
}

// src/hooks/usePossession.ts
import { useCallback as useCallback2, useRef as useRef2, useState as useState2 } from "react";
function usePossession(duration = 1500) {
  const [state, setState] = useState2({
    sidebarView: null,
    formPage: null
  });
  const timers = useRef2({});
  const trigger = useCallback2(
    (type, value) => {
      if (timers.current[type]) clearTimeout(timers.current[type]);
      setState((prev) => __spreadProps(__spreadValues({}, prev), { [type]: value }));
      timers.current[type] = setTimeout(() => {
        setState((prev) => __spreadProps(__spreadValues({}, prev), { [type]: null }));
      }, duration);
    },
    [duration]
  );
  return { possession: state, triggerPossession: trigger };
}

// src/hooks/useFormFill.ts
import { useCallback as useCallback3, useEffect as useEffect2, useRef as useRef3, useState as useState3 } from "react";
function useFormFill({
  formFillQueue,
  shiftFormFill,
  onBeforeFill,
  instantFields = /* @__PURE__ */ new Set()
}) {
  const [values, setValues] = useState3({});
  const [animatingField, setAnimatingField] = useState3(null);
  const [animatingValue, setAnimatingValue] = useState3("");
  const [aiFilledFields, setAiFilledFields] = useState3(/* @__PURE__ */ new Set());
  const processing = useRef3(false);
  const processNext = useCallback3(() => {
    if (formFillQueue.length === 0) {
      processing.current = false;
      return;
    }
    processing.current = true;
    const item = formFillQueue[0];
    const isInstant = instantFields.has(item.field);
    onBeforeFill == null ? void 0 : onBeforeFill(item.field);
    setTimeout(() => {
      setAnimatingField(item.field);
      setAnimatingValue(item.value);
      if (isInstant) {
        setValues((prev) => __spreadProps(__spreadValues({}, prev), { [item.field]: item.value }));
        setAiFilledFields((prev) => new Set(prev).add(item.field));
      }
      const duration = isInstant ? 600 : item.value.length * 30 + 400;
      setTimeout(() => {
        if (!isInstant) {
          setValues((prev) => __spreadProps(__spreadValues({}, prev), { [item.field]: item.value }));
          setAiFilledFields((prev) => new Set(prev).add(item.field));
        }
        setAnimatingField(null);
        setAnimatingValue("");
        processing.current = false;
        shiftFormFill();
      }, duration);
    }, 300);
  }, [formFillQueue, shiftFormFill, onBeforeFill, instantFields]);
  useEffect2(() => {
    if (formFillQueue.length === 0 || processing.current) return;
    processNext();
  }, [formFillQueue, processNext]);
  const setField = useCallback3((name, value) => {
    setValues((prev) => __spreadProps(__spreadValues({}, prev), { [name]: value }));
  }, []);
  const reset = useCallback3(() => {
    setValues({});
    setAiFilledFields(/* @__PURE__ */ new Set());
    setAnimatingField(null);
    setAnimatingValue("");
  }, []);
  return {
    values,
    setField,
    setValues,
    animatingField,
    animatingValue,
    aiFilledFields,
    reset
  };
}

// src/hooks/useSpeechInput.ts
import { useCallback as useCallback4, useEffect as useEffect3, useRef as useRef4, useState as useState4 } from "react";
function useSpeechInput(options = {}) {
  const { lang = "en-US", continuous = false, onResult } = options;
  const [listening, setListening] = useState4(false);
  const [transcript, setTranscript] = useState4("");
  const [supported, setSupported] = useState4(false);
  const recognitionRef = useRef4(null);
  const onResultRef = useRef4(onResult);
  onResultRef.current = onResult;
  useEffect3(() => {
    if (typeof window === "undefined") return;
    const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Ctor) return;
    setSupported(true);
    const recognition = new Ctor();
    recognition.lang = lang;
    recognition.continuous = continuous;
    recognition.interimResults = true;
    recognitionRef.current = recognition;
    recognition.onresult = (e) => {
      var _a;
      let interim = "";
      let final = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) final += r[0].transcript;
        else interim += r[0].transcript;
      }
      setTranscript(final || interim);
      if (final) (_a = onResultRef.current) == null ? void 0 : _a.call(onResultRef, final.trim());
    };
    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onerror = (e) => {
      console.warn("[useSpeechInput] recognition error:", e);
      setListening(false);
    };
    return () => {
      recognition.onresult = null;
      recognition.onstart = null;
      recognition.onend = null;
      recognition.onerror = null;
      try {
        recognition.abort();
      } catch (e) {
      }
      recognitionRef.current = null;
    };
  }, [lang, continuous]);
  const start = useCallback4(() => {
    if (!recognitionRef.current || listening) return;
    setTranscript("");
    try {
      recognitionRef.current.start();
    } catch (e) {
      console.warn("[useSpeechInput] start failed:", e);
      setListening(false);
    }
  }, [listening]);
  const stop = useCallback4(() => {
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.stop();
    } catch (e) {
    }
    setListening(false);
  }, []);
  return { listening, transcript, supported, start, stop };
}

// src/hooks/useSpeechOutput.ts
import { useCallback as useCallback5, useEffect as useEffect4, useRef as useRef5, useState as useState5 } from "react";
function useSpeechOutput(options = {}) {
  const { lang = "en-US", voice, rate = 1, pitch = 1, volume = 1 } = options;
  const [speaking, setSpeaking] = useState5(false);
  const [supported, setSupported] = useState5(false);
  const settingsRef = useRef5({ lang, voice, rate, pitch, volume });
  settingsRef.current = { lang, voice, rate, pitch, volume };
  useEffect4(() => {
    if (typeof window === "undefined") return;
    setSupported("speechSynthesis" in window);
  }, []);
  const speak = useCallback5((text) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const s = settingsRef.current;
    const plain = stripMarkdown(text);
    if (!plain.trim()) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(plain);
    utter.lang = s.lang;
    utter.rate = s.rate;
    utter.pitch = s.pitch;
    utter.volume = s.volume;
    if (s.voice) {
      const voices = window.speechSynthesis.getVoices();
      const match = voices.find((v) => v.name === s.voice);
      if (match) utter.voice = match;
    }
    utter.onstart = () => setSpeaking(true);
    utter.onend = () => setSpeaking(false);
    utter.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utter);
  }, []);
  const stop = useCallback5(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }, []);
  return { speak, stop, speaking, supported };
}
function stripMarkdown(text) {
  var _a;
  const lines = text.split("\n");
  const filtered = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const isTableRow = /\|/.test(line);
    const next = (_a = lines[i + 1]) != null ? _a : "";
    const isTableStart = isTableRow && /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)+\|?\s*$/.test(next);
    if (isTableStart) {
      while (i < lines.length && /\|/.test(lines[i])) i++;
      continue;
    }
    filtered.push(line);
    i++;
  }
  return filtered.join("\n").replace(/```[\s\S]*?```/g, "").replace(/`([^`]+)`/g, "$1").replace(/\*\*([^*]+)\*\*/g, "$1").replace(/\*([^*]+)\*/g, "$1").replace(/__([^_]+)__/g, "$1").replace(/_([^_]+)_/g, "$1").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/^#{1,6}\s+/gm, "").replace(/\w[\w_]*\(.*?\)\s*completed\s+in\s+[\d.]+s\.?/g, "").replace(/\n{3,}/g, "\n\n").trim();
}

// src/components/Chat.tsx
import { useState as useState6, useRef as useRef6, useEffect as useEffect5 } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { jsx, jsxs } from "react/jsx-runtime";
var DEFAULT_TOOL_LABELS = {
  render_component: "Component rendered",
  update_component: "Component updated",
  remove_component: "Component removed"
};
var THEMES = {
  light: {
    container: "bg-white",
    statusBar: "border-zinc-200 hover:bg-zinc-50",
    statusText: "text-zinc-500",
    emptyText: "text-zinc-400",
    userBubble: "bg-blue-600 text-white",
    assistantBubble: "bg-zinc-100 text-zinc-800 border border-zinc-200",
    assistantProse: "prose prose-zinc prose-sm max-w-none [&_p]:my-1 [&_p]:text-base [&_p]:leading-relaxed [&_ul]:my-2 [&_ol]:my-2 [&_li]:text-base [&_li]:my-0.5 [&_strong]:text-zinc-900",
    toolBadge: "text-zinc-500 bg-zinc-50 border border-zinc-200",
    streamingDots: "bg-zinc-100 border border-zinc-200",
    streamingDot: "bg-zinc-400",
    inputBorder: "border-t border-zinc-200 bg-white",
    input: "bg-white border border-zinc-300 text-zinc-800 placeholder-zinc-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100",
    micIdle: "bg-white hover:bg-zinc-50 text-zinc-600 border border-zinc-300",
    micActive: "bg-red-600 hover:bg-red-500 text-white animate-pulse border border-red-600",
    sendButton: "bg-blue-600 hover:bg-blue-500 text-white border border-blue-600",
    speakingBadge: "text-cyan-700 bg-cyan-100 hover:bg-cyan-200"
  },
  dark: {
    container: "bg-zinc-950",
    statusBar: "border-zinc-800 hover:bg-zinc-800/30",
    statusText: "text-zinc-400",
    emptyText: "text-zinc-500",
    userBubble: "bg-blue-600 text-white",
    assistantBubble: "bg-zinc-800 text-zinc-200",
    assistantProse: "prose prose-invert prose-sm max-w-none [&_p]:my-1 [&_p]:text-base [&_p]:leading-relaxed [&_ul]:my-2 [&_ol]:my-2 [&_li]:text-base [&_li]:my-0.5",
    toolBadge: "text-zinc-500 bg-zinc-800/50 border border-zinc-800",
    streamingDots: "bg-zinc-800",
    streamingDot: "bg-zinc-400",
    inputBorder: "border-t border-zinc-800 bg-zinc-950",
    input: "bg-zinc-800 border border-zinc-700 text-zinc-200 placeholder-zinc-500 focus:border-blue-500",
    micIdle: "bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700",
    micActive: "bg-red-600 hover:bg-red-500 text-white animate-pulse border border-red-600",
    sendButton: "bg-blue-600 hover:bg-blue-500 text-white border border-blue-600",
    speakingBadge: "text-cyan-300 bg-cyan-900/30 hover:bg-cyan-900/50"
  }
};
function Chat({
  messages,
  streaming,
  connected,
  onSend,
  onReconnect,
  toolLabels = {},
  placeholder = "Type a message...",
  emptyMessage = "Start a conversation...",
  sendLabel = "Send",
  disconnectedMessage = "Disconnected \xB7 click to connect",
  voice,
  showStatus = true,
  theme = "dark",
  iconMap
}) {
  var _a;
  const [input, setInput] = useState6("");
  const messagesEndRef = useRef6(null);
  const allToolLabels = __spreadValues(__spreadValues({}, DEFAULT_TOOL_LABELS), toolLabels);
  const t = THEMES[theme];
  const voiceOpts = typeof voice === "object" ? voice : voice ? {} : {};
  const inputEnabled = typeof voice === "object" ? voice.input !== false : !!voice;
  const outputEnabled = typeof voice === "object" ? voice.output !== false : !!voice;
  const voiceLang = (_a = voiceOpts.lang) != null ? _a : "en-US";
  const speech = useSpeechInput({
    lang: voiceLang,
    onResult: (transcript) => {
      if (transcript.trim() && !streaming && connected) {
        onSend(transcript.trim());
        setInput("");
      }
    }
  });
  const tts = useSpeechOutput({
    lang: voiceLang,
    rate: voiceOpts.rate,
    voice: voiceOpts.voice
  });
  useEffect5(() => {
    if (speech.listening && speech.transcript) {
      setInput(speech.transcript);
    }
  }, [speech.listening, speech.transcript]);
  const lastSpokenRef = useRef6(null);
  useEffect5(() => {
    if (!outputEnabled) return;
    if (streaming) return;
    const last = messages[messages.length - 1];
    if (!last || last.role !== "assistant") return;
    const signature = `${messages.length}:${last.content.slice(0, 40)}`;
    if (lastSpokenRef.current === signature) return;
    lastSpokenRef.current = signature;
    tts.speak(last.content);
  }, [messages, streaming, outputEnabled, tts]);
  useEffect5(() => {
    var _a2;
    (_a2 = messagesEndRef.current) == null ? void 0 : _a2.scrollIntoView({ behavior: "smooth" });
  }, [messages]);
  const handleSubmit = (e) => {
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
  return /* @__PURE__ */ jsxs("div", { className: `flex flex-col h-full ${t.container}`, children: [
    showStatus && /* @__PURE__ */ jsxs(
      "button",
      {
        onClick: connected ? void 0 : onReconnect,
        className: `p-3 border-b flex items-center gap-2 w-full text-left transition-colors ${t.statusBar}`,
        children: [
          /* @__PURE__ */ jsx("div", { className: `w-2 h-2 rounded-full ${connected ? "bg-emerald-500" : "bg-red-500 animate-pulse"}` }),
          /* @__PURE__ */ jsx("span", { className: `text-sm flex-1 ${t.statusText}`, children: connected ? "Connected" : disconnectedMessage }),
          outputEnabled && tts.speaking && /* @__PURE__ */ jsx(
            "span",
            {
              onClick: (e) => {
                e.stopPropagation();
                tts.stop();
              },
              className: `text-xs px-2 py-0.5 rounded-full cursor-pointer transition-colors ${t.speakingBadge}`,
              title: "Stop speaking",
              children: "Speaking..."
            }
          )
        ]
      }
    ),
    /* @__PURE__ */ jsxs("div", { className: "flex-1 overflow-y-auto px-4 py-4 space-y-3", children: [
      messages.length === 0 && /* @__PURE__ */ jsx("div", { className: "flex items-center justify-center h-full", children: /* @__PURE__ */ jsx("p", { className: `text-base ${t.emptyText}`, children: emptyMessage }) }),
      messages.map((msg, i) => {
        var _a2;
        if (msg.role === "user") {
          return /* @__PURE__ */ jsx("div", { className: "flex justify-end", children: /* @__PURE__ */ jsx("div", { className: `max-w-[90%] rounded-2xl px-4 py-3 text-base shadow-sm ${t.userBubble}`, children: msg.content }) }, i);
        }
        return /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-1.5 items-start", children: [
          ((_a2 = msg.toolCalls) != null ? _a2 : []).map((tc, k) => {
            var _a3, _b;
            const label = (_b = (_a3 = allToolLabels[tc.name]) != null ? _a3 : tc.label) != null ? _b : tc.name;
            const icon = tc.icon && (iconMap == null ? void 0 : iconMap[tc.icon]);
            return /* @__PURE__ */ jsxs(
              "div",
              {
                className: `flex items-center gap-2 text-xs rounded-lg px-2.5 py-1 ${t.toolBadge}`,
                children: [
                  icon ? /* @__PURE__ */ jsx("span", { className: "inline-flex w-3.5 h-3.5 items-center justify-center", children: icon }) : /* @__PURE__ */ jsx("span", { className: "w-1.5 h-1.5 rounded-full bg-emerald-500" }),
                  label
                ]
              },
              `tc-${k}`
            );
          }),
          msg.content.trim() && /* @__PURE__ */ jsx("div", { className: `max-w-[95%] rounded-2xl px-4 py-3 ${t.assistantBubble}`, children: /* @__PURE__ */ jsx("div", { className: t.assistantProse, children: /* @__PURE__ */ jsx(ReactMarkdown, { remarkPlugins: [remarkGfm], children: msg.content }) }) })
        ] }, i);
      }),
      streaming && /* @__PURE__ */ jsx("div", { className: "flex justify-start", children: /* @__PURE__ */ jsx("div", { className: `rounded-2xl px-4 py-3 ${t.streamingDots}`, children: /* @__PURE__ */ jsxs("div", { className: "flex gap-1.5", children: [
        /* @__PURE__ */ jsx("span", { className: `w-2 h-2 rounded-full animate-bounce [animation-delay:0ms] ${t.streamingDot}` }),
        /* @__PURE__ */ jsx("span", { className: `w-2 h-2 rounded-full animate-bounce [animation-delay:150ms] ${t.streamingDot}` }),
        /* @__PURE__ */ jsx("span", { className: `w-2 h-2 rounded-full animate-bounce [animation-delay:300ms] ${t.streamingDot}` })
      ] }) }) }),
      /* @__PURE__ */ jsx("div", { ref: messagesEndRef })
    ] }),
    /* @__PURE__ */ jsx("form", { onSubmit: handleSubmit, className: `p-5 ${t.inputBorder}`, children: /* @__PURE__ */ jsxs("div", { className: "flex gap-2 items-stretch", children: [
      inputEnabled && /* @__PURE__ */ jsx(
        "button",
        {
          type: "button",
          onClick: handleMicClick,
          disabled: !connected || streaming || !speech.supported,
          title: !speech.supported ? "Speech recognition not supported in this browser" : speech.listening ? "Stop listening" : "Start voice input",
          className: `px-4 py-4 rounded-lg font-medium transition-all flex-shrink-0 flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed ${speech.listening ? t.micActive : t.micIdle}`,
          children: /* @__PURE__ */ jsxs("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", className: "w-5 h-5", children: [
            /* @__PURE__ */ jsx("rect", { x: "9", y: "3", width: "6", height: "12", rx: "3" }),
            /* @__PURE__ */ jsx("path", { d: "M5 10a7 7 0 0014 0M12 17v4M8 21h8", strokeLinecap: "round" })
          ] })
        }
      ),
      /* @__PURE__ */ jsx(
        "input",
        {
          type: "text",
          value: input,
          onChange: (e) => setInput(e.target.value),
          placeholder: speech.listening ? "Listening..." : connected ? placeholder : "Connecting...",
          disabled: !connected,
          style: { paddingLeft: "1.25rem", paddingRight: "1.25rem" },
          className: `flex-1 min-w-0 rounded-lg py-4 text-base focus:outline-none disabled:opacity-50 transition-shadow ${t.input}`
        }
      ),
      /* @__PURE__ */ jsx(
        "button",
        {
          type: "submit",
          disabled: !connected || streaming || !input.trim(),
          className: `px-5 py-4 rounded-lg text-base font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0 ${t.sendButton}`,
          children: sendLabel
        }
      )
    ] }) })
  ] });
}

// src/components/UIRenderer.tsx
import { useState as useState7, useEffect as useEffect6 } from "react";
import { jsx as jsx2, jsxs as jsxs2 } from "react/jsx-runtime";
function Table({ props }) {
  return /* @__PURE__ */ jsx2("div", { className: "overflow-x-auto", children: /* @__PURE__ */ jsxs2("table", { className: "w-full text-sm", children: [
    /* @__PURE__ */ jsx2("thead", { children: /* @__PURE__ */ jsx2("tr", { className: "border-b border-zinc-200", children: props.headers.map((h, i) => /* @__PURE__ */ jsx2("th", { className: "text-left p-3 text-zinc-600 font-medium", children: h }, i)) }) }),
    /* @__PURE__ */ jsx2("tbody", { children: props.rows.map((row, i) => /* @__PURE__ */ jsx2("tr", { className: "border-b border-zinc-100 hover:bg-zinc-50", children: row.map((cell, j) => /* @__PURE__ */ jsx2("td", { className: "p-3 text-zinc-700", children: cell }, j)) }, i)) })
  ] }) });
}
function Card({ props }) {
  return /* @__PURE__ */ jsxs2("div", { children: [
    /* @__PURE__ */ jsx2("h3", { className: "text-lg font-semibold text-zinc-900 mb-2", children: props.title }),
    /* @__PURE__ */ jsx2("p", { className: "text-zinc-600 text-sm", children: props.content }),
    props.footer && /* @__PURE__ */ jsx2("p", { className: "text-zinc-400 text-xs mt-3 pt-3 border-t border-zinc-200", children: props.footer })
  ] });
}
function Metric({ props }) {
  const trendColor = props.trend === "up" ? "text-emerald-600" : props.trend === "down" ? "text-red-600" : "text-zinc-500";
  return /* @__PURE__ */ jsxs2("div", { className: "text-center", children: [
    /* @__PURE__ */ jsx2("p", { className: "text-zinc-500 text-sm mb-1", children: props.label }),
    /* @__PURE__ */ jsx2("p", { className: "text-3xl font-bold text-zinc-900", children: props.value }),
    props.trend && /* @__PURE__ */ jsx2("span", { className: `text-sm ${trendColor}`, children: props.trend === "up" ? "^" : props.trend === "down" ? "v" : "-" })
  ] });
}
function List({ props }) {
  return /* @__PURE__ */ jsx2("ul", { className: "space-y-2", children: props.items.map((item, i) => /* @__PURE__ */ jsxs2("li", { className: "p-3 bg-zinc-50 border border-zinc-200 rounded-lg", children: [
    /* @__PURE__ */ jsx2("p", { className: "text-zinc-900 font-medium", children: item.title }),
    item.description && /* @__PURE__ */ jsx2("p", { className: "text-zinc-600 text-sm mt-1", children: item.description })
  ] }, i)) });
}
function Form({ props, componentId, onSubmit }) {
  var _a;
  const [formData, setFormData] = useState7({});
  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(componentId, formData);
  };
  return /* @__PURE__ */ jsxs2("form", { onSubmit: handleSubmit, className: "space-y-4", children: [
    props.fields.map((field) => {
      var _a2, _b, _c;
      return /* @__PURE__ */ jsxs2("div", { children: [
        /* @__PURE__ */ jsx2("label", { className: "block text-sm text-zinc-700 mb-1", children: field.label }),
        field.type === "select" ? /* @__PURE__ */ jsxs2(
          "select",
          {
            className: "w-full bg-white border border-zinc-300 rounded-lg p-2 text-zinc-800 focus:border-blue-500 focus:outline-none",
            value: (_a2 = formData[field.name]) != null ? _a2 : "",
            onChange: (e) => setFormData(__spreadProps(__spreadValues({}, formData), { [field.name]: e.target.value })),
            children: [
              /* @__PURE__ */ jsx2("option", { value: "", children: "Select..." }),
              (_b = field.options) == null ? void 0 : _b.map((opt) => /* @__PURE__ */ jsx2("option", { value: opt, children: opt }, opt))
            ]
          }
        ) : /* @__PURE__ */ jsx2(
          "input",
          {
            type: field.type,
            className: "w-full bg-white border border-zinc-300 rounded-lg p-2 text-zinc-800 focus:border-blue-500 focus:outline-none",
            placeholder: field.placeholder,
            value: (_c = formData[field.name]) != null ? _c : "",
            onChange: (e) => setFormData(__spreadProps(__spreadValues({}, formData), { [field.name]: e.target.value }))
          }
        )
      ] }, field.name);
    }),
    /* @__PURE__ */ jsx2("button", { type: "submit", className: "w-full bg-blue-600 hover:bg-blue-500 text-white rounded-lg p-2 font-medium transition-colors", children: (_a = props.submit_label) != null ? _a : "Submit" })
  ] });
}
function Chart({ props }) {
  const maxVal = Math.max(...props.values, 1);
  if (props.chart_type === "bar") {
    return /* @__PURE__ */ jsxs2("div", { children: [
      props.title && /* @__PURE__ */ jsx2("p", { className: "text-zinc-700 text-sm mb-3 font-medium", children: props.title }),
      /* @__PURE__ */ jsx2("div", { className: "flex items-end gap-2 h-40", children: props.values.map((val, i) => /* @__PURE__ */ jsxs2("div", { className: "flex-1 flex flex-col items-center gap-1", children: [
        /* @__PURE__ */ jsx2("span", { className: "text-xs text-zinc-500", children: val }),
        /* @__PURE__ */ jsx2("div", { className: "w-full bg-blue-500 rounded-t", style: { height: `${val / maxVal * 100}%` } }),
        /* @__PURE__ */ jsx2("span", { className: "text-xs text-zinc-400 truncate w-full text-center", children: props.labels[i] })
      ] }, i)) })
    ] });
  }
  return /* @__PURE__ */ jsxs2("div", { children: [
    props.title && /* @__PURE__ */ jsx2("p", { className: "text-zinc-700 text-sm mb-2 font-medium", children: props.title }),
    /* @__PURE__ */ jsx2("div", { className: "space-y-1", children: props.labels.map((label, i) => /* @__PURE__ */ jsxs2("div", { className: "flex justify-between text-sm", children: [
      /* @__PURE__ */ jsx2("span", { className: "text-zinc-500", children: label }),
      /* @__PURE__ */ jsx2("span", { className: "text-zinc-800", children: props.values[i] })
    ] }, i)) })
  ] });
}
function NotificationDraft({ props }) {
  const [expanded, setExpanded] = useState7(false);
  const p = props;
  return /* @__PURE__ */ jsxs2("div", { children: [
    /* @__PURE__ */ jsxs2("button", { onClick: () => setExpanded(!expanded), className: "w-full flex items-center gap-2 text-left", children: [
      /* @__PURE__ */ jsx2("div", { className: "w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0", children: p.recipient_name.charAt(0) }),
      /* @__PURE__ */ jsx2("p", { className: "text-sm text-zinc-800 truncate flex-1", children: p.subject }),
      /* @__PURE__ */ jsx2("span", { className: "w-2 h-2 rounded-full bg-amber-400 animate-pulse flex-shrink-0" }),
      /* @__PURE__ */ jsx2("span", { className: "text-xs text-zinc-400 flex-shrink-0", children: expanded ? "\u25B2" : "\u25BC" })
    ] }),
    expanded && /* @__PURE__ */ jsxs2("div", { className: "mt-2 ml-8 space-y-2", children: [
      /* @__PURE__ */ jsxs2("p", { className: "text-xs text-zinc-500", children: [
        "To: ",
        p.recipient_name,
        " (",
        p.recipient_email,
        ")"
      ] }),
      /* @__PURE__ */ jsx2("div", { className: "bg-zinc-50 border border-zinc-200 rounded-lg p-2", children: /* @__PURE__ */ jsx2("p", { className: "text-zinc-700 text-xs whitespace-pre-line", children: p.message }) }),
      /* @__PURE__ */ jsx2("p", { className: "text-xs text-amber-600", children: "Awaiting confirmation..." })
    ] })
  ] });
}
function NotificationSent({ props }) {
  const [expanded, setExpanded] = useState7(false);
  const p = props;
  return /* @__PURE__ */ jsxs2("div", { children: [
    /* @__PURE__ */ jsxs2("button", { onClick: () => setExpanded(!expanded), className: "w-full flex items-center gap-2 text-left", children: [
      /* @__PURE__ */ jsx2("div", { className: "w-6 h-6 rounded-full bg-emerald-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0", children: "\u2713" }),
      /* @__PURE__ */ jsx2("p", { className: "text-sm text-zinc-800 truncate flex-1", children: p.subject }),
      /* @__PURE__ */ jsx2("span", { className: "text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full flex-shrink-0", children: "Sent" }),
      /* @__PURE__ */ jsx2("span", { className: "text-xs text-zinc-400 flex-shrink-0", children: expanded ? "\u25B2" : "\u25BC" })
    ] }),
    expanded && /* @__PURE__ */ jsx2("div", { className: "mt-2 ml-8", children: /* @__PURE__ */ jsxs2("p", { className: "text-xs text-zinc-500", children: [
      "To: ",
      p.recipient_name,
      " (",
      p.recipient_email,
      ")"
    ] }) })
  ] });
}
function NotificationSending({ props }) {
  const [sent, setSent] = useState7(false);
  const p = props;
  useEffect6(() => {
    const timer = setTimeout(() => setSent(true), 2500);
    return () => clearTimeout(timer);
  }, []);
  if (sent) {
    return /* @__PURE__ */ jsxs2("div", { className: "flex items-center gap-2", children: [
      /* @__PURE__ */ jsx2("div", { className: "w-6 h-6 rounded-full bg-emerald-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0", children: "\u2713" }),
      /* @__PURE__ */ jsx2("p", { className: "text-sm text-zinc-800 truncate flex-1", children: p.subject }),
      /* @__PURE__ */ jsx2("span", { className: "text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full flex-shrink-0", children: "Sent" })
    ] });
  }
  return /* @__PURE__ */ jsxs2("div", { className: "space-y-2", children: [
    /* @__PURE__ */ jsxs2("div", { className: "flex items-center gap-2", children: [
      /* @__PURE__ */ jsx2("div", { className: "w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0", children: p.recipient_name.charAt(0) }),
      /* @__PURE__ */ jsx2("p", { className: "text-sm text-zinc-800 truncate flex-1", children: p.subject }),
      /* @__PURE__ */ jsx2("span", { className: "text-xs text-cyan-700 flex-shrink-0", children: "Sending..." })
    ] }),
    /* @__PURE__ */ jsx2("div", { className: "h-1 bg-zinc-200 rounded-full overflow-hidden", children: /* @__PURE__ */ jsx2("div", { className: "h-full bg-gradient-to-r from-blue-500 via-cyan-400 to-blue-500 rounded-full animate-sending" }) })
  ] });
}
var BUILT_IN_RENDERERS = {
  table: ({ props }) => /* @__PURE__ */ jsx2(Table, { props }),
  card: ({ props }) => /* @__PURE__ */ jsx2(Card, { props }),
  metric: ({ props }) => /* @__PURE__ */ jsx2(Metric, { props }),
  list: ({ props }) => /* @__PURE__ */ jsx2(List, { props }),
  chart: ({ props }) => /* @__PURE__ */ jsx2(Chart, { props }),
  html: ({ props }) => /* @__PURE__ */ jsx2("div", { className: "text-zinc-700 text-sm", dangerouslySetInnerHTML: { __html: props.content } }),
  notification_draft: NotificationDraft,
  notification_sent: NotificationSent,
  notification_sending: NotificationSending
};
function UIRenderer({ component, onFormSubmit, customRenderers = {} }) {
  const allRenderers = __spreadValues(__spreadValues({}, BUILT_IN_RENDERERS), customRenderers);
  const Renderer = allRenderers[component.type];
  const isNotification = component.type.startsWith("notification_");
  const wrapper = isNotification ? "bg-white border border-zinc-200 rounded-lg px-3 py-2 shadow-sm" : "bg-white border border-zinc-200 rounded-xl p-4 shadow-sm";
  return /* @__PURE__ */ jsx2("div", { className: wrapper, children: component.type === "form" ? /* @__PURE__ */ jsx2(Form, { props: component.props, componentId: component.id, onSubmit: onFormSubmit }) : Renderer ? /* @__PURE__ */ jsx2(Renderer, { props: component.props }) : /* @__PURE__ */ jsxs2("p", { className: "text-zinc-500 text-sm", children: [
    "Unknown component: ",
    component.type
  ] }) });
}

// src/components/PossessionZone.tsx
import { jsx as jsx3 } from "react/jsx-runtime";
function PossessionZone({
  name,
  components,
  onFormSubmit,
  customRenderers,
  empty,
  className
}) {
  const mine = components.filter((c) => c.zone === name);
  if (mine.length === 0) {
    if (!empty) return null;
    return /* @__PURE__ */ jsx3("div", { className, children: empty });
  }
  return /* @__PURE__ */ jsx3("div", { className, children: mine.map((component) => /* @__PURE__ */ jsx3(
    UIRenderer,
    {
      component,
      onFormSubmit: onFormSubmit != null ? onFormSubmit : (() => {
      }),
      customRenderers
    },
    component.id
  )) });
}

// src/components/Possession.tsx
import { useEffect as useEffect8, useRef as useRef8, useState as useState9 } from "react";

// src/components/TypewriterValue.tsx
import { useState as useState8, useEffect as useEffect7, useRef as useRef7 } from "react";
import { Fragment, jsx as jsx4, jsxs as jsxs3 } from "react/jsx-runtime";
function TypewriterValue({ value, speed = 30, onComplete }) {
  const [displayed, setDisplayed] = useState8("");
  const indexRef = useRef7(0);
  useEffect7(() => {
    setDisplayed("");
    indexRef.current = 0;
    const interval = setInterval(() => {
      indexRef.current++;
      if (indexRef.current <= value.length) {
        setDisplayed(value.slice(0, indexRef.current));
      } else {
        clearInterval(interval);
        onComplete == null ? void 0 : onComplete();
      }
    }, speed);
    return () => clearInterval(interval);
  }, [value, speed, onComplete]);
  return /* @__PURE__ */ jsxs3(Fragment, { children: [
    displayed,
    displayed.length < value.length && /* @__PURE__ */ jsx4("span", { className: "inline-block w-0.5 h-4 bg-blue-400 animate-pulse ml-0.5 align-middle" })
  ] });
}

// src/components/Possession.tsx
import { jsx as jsx5, jsxs as jsxs4 } from "react/jsx-runtime";
function Possession({
  animatingField,
  animatingValue,
  aiFilledFields,
  onFieldChange,
  children
}) {
  const containerRef = useRef8(null);
  const [overlay, setOverlay] = useState9(null);
  const [flashField, setFlashField] = useState9(null);
  const prevAnimating = useRef8(null);
  useEffect8(() => {
    if (!containerRef.current) return;
    if (animatingField) {
      const el = containerRef.current.querySelector(
        `[name="${animatingField}"]`
      );
      if (!el) return;
      const isSelect = el.tagName === "SELECT";
      const isTextarea = el.tagName === "TEXTAREA";
      el.style.borderColor = "#3b82f6";
      el.style.boxShadow = "0 0 0 1px rgba(59,130,246,0.3)";
      el.style.transition = "all 300ms";
      if (isSelect) {
        const selectEl = el;
        setNativeValue(selectEl, animatingValue);
        onFieldChange == null ? void 0 : onFieldChange(animatingField, animatingValue);
        setOverlay(null);
      } else {
        const inputEl = el;
        inputEl.style.color = "transparent";
        const rect = el.getBoundingClientRect();
        const containerRect = containerRef.current.getBoundingClientRect();
        setOverlay({
          field: animatingField,
          value: animatingValue,
          rect: new DOMRect(
            rect.left - containerRect.left,
            rect.top - containerRect.top,
            rect.width,
            rect.height
          ),
          isTextarea
        });
      }
    }
    if (prevAnimating.current && prevAnimating.current !== animatingField) {
      const prevField = prevAnimating.current;
      const el = containerRef.current.querySelector(
        `[name="${prevField}"]`
      );
      if (el) {
        el.style.color = "";
        el.style.borderColor = "";
        el.style.boxShadow = "";
        setFlashField(prevField);
        el.style.borderColor = "#34d399";
        el.style.boxShadow = "0 0 12px rgba(16,185,129,0.2), 0 0 0 2px rgba(16,185,129,0.4)";
        setTimeout(() => {
          setFlashField(null);
          if (el) {
            el.style.borderColor = "";
            el.style.boxShadow = "";
          }
        }, 1500);
      }
      setOverlay(null);
    }
    prevAnimating.current = animatingField;
  }, [animatingField, animatingValue, onFieldChange]);
  useEffect8(() => {
    if (!containerRef.current) return;
    aiFilledFields.forEach((fieldName) => {
      var _a;
      if (fieldName === animatingField || fieldName === flashField) return;
      const el = (_a = containerRef.current) == null ? void 0 : _a.querySelector(
        `[name="${fieldName}"]`
      );
      if (el && !el.style.boxShadow) {
        el.style.borderColor = "rgba(16,185,129,0.3)";
      }
    });
  }, [aiFilledFields, animatingField, flashField]);
  return /* @__PURE__ */ jsxs4("div", { ref: containerRef, style: { position: "relative" }, children: [
    children,
    overlay && /* @__PURE__ */ jsx5(
      "div",
      {
        style: {
          position: "absolute",
          left: overlay.rect.left,
          top: overlay.rect.top,
          width: overlay.rect.width,
          height: overlay.rect.height,
          display: "flex",
          alignItems: overlay.isTextarea ? "flex-start" : "center",
          paddingLeft: 10,
          paddingTop: overlay.isTextarea ? 10 : 0,
          pointerEvents: "none",
          zIndex: 10
        },
        children: /* @__PURE__ */ jsx5("span", { style: { fontSize: "1rem", color: "#27272a" }, children: /* @__PURE__ */ jsx5(
          TypewriterValue,
          {
            value: overlay.value,
            onComplete: () => {
              if (containerRef.current) {
                const el = containerRef.current.querySelector(`[name="${overlay.field}"]`);
                if (el) {
                  setNativeValue(el, overlay.value);
                  onFieldChange == null ? void 0 : onFieldChange(overlay.field, overlay.value);
                }
              }
            }
          }
        ) })
      }
    )
  ] });
}
function setNativeValue(el, value) {
  var _a;
  const nativeInputValueSetter = (_a = Object.getOwnPropertyDescriptor(
    el.tagName === "SELECT" ? HTMLSelectElement.prototype : el.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype,
    "value"
  )) == null ? void 0 : _a.set;
  if (nativeInputValueSetter) {
    nativeInputValueSetter.call(el, value);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }
}

// src/context/PossessionProvider.tsx
import { createContext, useContext } from "react";
import { jsx as jsx6 } from "react/jsx-runtime";
var PossessionContext = createContext(null);
function PossessionProvider({
  children,
  duration = 1500
}) {
  const { possession, triggerPossession } = usePossession(duration);
  return /* @__PURE__ */ jsx6(PossessionContext.Provider, { value: { possession, triggerPossession }, children });
}
function usePossessionContext() {
  const ctx = useContext(PossessionContext);
  if (!ctx) throw new Error("usePossessionContext must be used within PossessionProvider");
  return ctx;
}
export {
  Chat,
  Possession,
  PossessionProvider,
  PossessionZone,
  TypewriterValue,
  UIRenderer,
  useFormFill,
  usePossession,
  usePossessionContext,
  useSpeechInput,
  useSpeechOutput,
  useWebSocket
};
//# sourceMappingURL=index.mjs.map