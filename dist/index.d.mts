import * as react from 'react';
import { ReactNode } from 'react';
import * as react_jsx_runtime from 'react/jsx-runtime';

type UIActionType = "render" | "update" | "remove";
type ComponentType = "table" | "card" | "metric" | "list" | "form" | "chart" | "html" | "notification_draft" | "notification_sent" | "notification_sending" | (string & {});
interface RenderedComponent {
    id: string;
    type: ComponentType;
    zone: string;
    props: Record<string, unknown>;
}
interface ToolCall {
    name: string;
    label: string;
    status: "started" | "completed";
    icon?: string;
}
interface ChatEntry {
    role: "user" | "assistant";
    content: string;
    toolCalls?: ToolCall[];
}
interface NavigateEvent {
    view: string;
    params?: Record<string, string>;
}
interface ViewDataEvent {
    view: string;
    data: unknown;
}
interface FormFillItem {
    field: string;
    value: string;
}
interface TableProps {
    headers: string[];
    rows: (string | number)[][];
}
interface CardProps {
    title: string;
    content: string;
    footer?: string;
}
interface MetricProps {
    label: string;
    value: string | number;
    trend?: "up" | "down" | "neutral";
}
interface ListProps {
    items: {
        title: string;
        description?: string;
    }[];
}
interface FormField {
    name: string;
    type: "text" | "number" | "select" | "textarea";
    label: string;
    options?: string[];
    placeholder?: string;
}
interface FormProps {
    fields: FormField[];
    submit_label?: string;
}
interface ChartProps {
    chart_type: "bar" | "line" | "pie";
    labels: string[];
    values: number[];
    title?: string;
}
interface PossessionState {
    [key: string]: unknown;
}

interface UseWebSocketOptions {
    /** JWT or any token. Appended to the URL as ?token=... */
    token?: string;
    /** Called when the backend rejects the connection (close code 4401). */
    onUnauthorized?: () => void;
    /** Fallback handler for unknown message types. */
    onCustomMessage?: (message: Record<string, unknown>) => void;
}
declare function useWebSocket(url: string, options?: UseWebSocketOptions): {
    connected: boolean;
    chat: ChatEntry[];
    streaming: boolean;
    waiting: boolean;
    activeTools: {
        key: string;
        name: string;
        label: string;
        icon?: string;
    }[];
    reasoning: string;
    components: RenderedComponent[];
    pendingNavigate: NavigateEvent | null;
    clearPendingNavigate: () => void;
    viewData: ViewDataEvent | null;
    clearViewData: () => void;
    formFillQueue: FormFillItem[];
    shiftFormFill: () => void;
    highlightItemId: string | null;
    clearHighlightItem: () => void;
    reconnect: () => void;
    sendMessage: (message: string) => void;
    sendTypedMessage: (data: Record<string, unknown>) => void;
    sendNavigation: (view: string, params?: Record<string, string>) => void;
};

declare function usePossession(duration?: number): {
    possession: PossessionState;
    triggerPossession: (type: string, value: unknown) => void;
};

interface UseFormFillOptions {
    formFillQueue: FormFillItem[];
    shiftFormFill: () => void;
    /** Called before a field is filled — use to navigate/scroll/switch tabs */
    onBeforeFill?: (field: string) => void;
    /** Fields that should be set instantly (no typewriter), e.g. selects */
    instantFields?: Set<string>;
}
declare function useFormFill({ formFillQueue, shiftFormFill, onBeforeFill, instantFields, }: UseFormFillOptions): {
    values: Record<string, string>;
    setField: (name: string, value: string) => void;
    setValues: react.Dispatch<react.SetStateAction<Record<string, string>>>;
    animatingField: string | null;
    animatingValue: string;
    aiFilledFields: Set<string>;
    reset: () => void;
};

interface UseSpeechInputOptions {
    /** BCP 47 language tag, e.g. "en-US", "nl-NL" */
    lang?: string;
    /** If true, keeps listening after a pause instead of stopping */
    continuous?: boolean;
    /** Fires when a final transcript is available */
    onResult?: (transcript: string) => void;
}
interface SpeechRecognitionResult {
    isFinal: boolean;
    [index: number]: {
        transcript: string;
    };
}
interface SpeechRecognitionEvent extends Event {
    resultIndex: number;
    results: {
        length: number;
        [index: number]: SpeechRecognitionResult;
    };
}
interface SpeechRecognition extends EventTarget {
    lang: string;
    continuous: boolean;
    interimResults: boolean;
    start(): void;
    stop(): void;
    abort(): void;
    onresult: ((e: SpeechRecognitionEvent) => void) | null;
    onstart: (() => void) | null;
    onend: (() => void) | null;
    onerror: ((e: Event) => void) | null;
}
declare global {
    interface Window {
        SpeechRecognition?: {
            new (): SpeechRecognition;
        };
        webkitSpeechRecognition?: {
            new (): SpeechRecognition;
        };
    }
}
declare function useSpeechInput(options?: UseSpeechInputOptions): {
    listening: boolean;
    transcript: string;
    supported: boolean;
    start: () => void;
    stop: () => void;
};

interface UseSpeechOutputOptions {
    /** BCP 47 language tag, e.g. "en-US", "nl-NL" */
    lang?: string;
    /** Voice name, must match SpeechSynthesisVoice.name */
    voice?: string;
    /** 0.1 to 10, default 1 */
    rate?: number;
    /** 0 to 2, default 1 */
    pitch?: number;
    /** 0 to 1, default 1 */
    volume?: number;
}
declare function useSpeechOutput(options?: UseSpeechOutputOptions): {
    speak: (text: string) => void;
    stop: () => void;
    speaking: boolean;
    supported: boolean;
};

interface ChatVoiceOptions {
    input?: boolean;
    output?: boolean;
    lang?: string;
    rate?: number;
    voice?: string;
}
type ChatTheme = "light" | "dark";
interface ChatActiveTool {
    key: string;
    name: string;
    label: string;
    icon?: string;
}
interface ChatProps {
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
declare function Chat({ messages, streaming, connected, onSend, onReconnect, toolLabels, placeholder, emptyMessage, sendLabel, disconnectedMessage, voice, showStatus, theme, iconMap, activeTools, waiting, hideToolBadges, }: ChatProps): react_jsx_runtime.JSX.Element;

interface UIRendererProps {
    component: RenderedComponent;
    onFormSubmit: (componentId: string, data: Record<string, string>) => void;
    customRenderers?: Record<string, React.ComponentType<{
        props: Record<string, unknown>;
    }>>;
    theme?: "light" | "dark";
}
declare function UIRenderer({ component, onFormSubmit, customRenderers }: UIRendererProps): react_jsx_runtime.JSX.Element;

interface PossessionZoneProps {
    /** Unique name for this zone. Agent targets this to render here. */
    name: string;
    /** All AI-rendered components (from useWebSocket) */
    components: RenderedComponent[];
    /** Form submit handler for agent-rendered forms */
    onFormSubmit?: (componentId: string, data: Record<string, string>) => void;
    /** Custom component renderers for domain-specific types */
    customRenderers?: Record<string, React.ComponentType<{
        props: Record<string, unknown>;
    }>>;
    /** Shown when the zone is empty. Omit to render nothing. */
    empty?: ReactNode;
    /** CSS class for the zone container */
    className?: string;
}
/**
 * A named drop zone where the AI can render components.
 *
 * Define zones anywhere in your app. The agent targets zones by name.
 */
declare function PossessionZone({ name, components, onFormSubmit, customRenderers, empty, className, }: PossessionZoneProps): react_jsx_runtime.JSX.Element | null;

interface PossessionProps {
    /** The form fill state from useFormFill */
    animatingField: string | null;
    animatingValue: string;
    aiFilledFields: Set<string>;
    /** Callback when possession sets a value on a field */
    onFieldChange?: (name: string, value: string) => void;
    children: ReactNode;
}
/**
 * Possession — wraps any form and takes control of its fields.
 *
 * Scans children for input/select/textarea elements by `name` attribute.
 * When the AI fills a field, Possession overlays a typewriter animation
 * and applies glow effects directly on the existing DOM elements.
 *
 * Your form stays exactly as it is. Possession just possesses it.
 */
declare function Possession({ animatingField, animatingValue, aiFilledFields, onFieldChange, children, }: PossessionProps): react_jsx_runtime.JSX.Element;

interface TypewriterValueProps {
    value: string;
    speed?: number;
    onComplete?: () => void;
}
declare function TypewriterValue({ value, speed, onComplete }: TypewriterValueProps): react_jsx_runtime.JSX.Element;

interface PossessionContextValue {
    possession: PossessionState;
    triggerPossession: (type: string, value: unknown) => void;
}
declare function PossessionProvider({ children, duration, }: {
    children: ReactNode;
    duration?: number;
}): react_jsx_runtime.JSX.Element;
declare function usePossessionContext(): PossessionContextValue;

export { type CardProps, type ChartProps, Chat, type ChatEntry, type ChatProps, type ChatVoiceOptions, type ComponentType, type FormField, type FormFillItem, type FormProps, type ListProps, type MetricProps, type NavigateEvent, Possession, PossessionProvider, type PossessionState, PossessionZone, type PossessionZoneProps, type RenderedComponent, type TableProps, TypewriterValue, type UIActionType, UIRenderer, type UseFormFillOptions, type UseSpeechInputOptions, type UseSpeechOutputOptions, type UseWebSocketOptions, type ViewDataEvent, useFormFill, usePossession, usePossessionContext, useSpeechInput, useSpeechOutput, useWebSocket };
