export type UIActionType = "render" | "update" | "remove";

export type ComponentType =
  | "table"
  | "card"
  | "metric"
  | "list"
  | "form"
  | "chart"
  | "html"
  | "notification_draft"
  | "notification_sent"
  | "notification_sending"
  | (string & {});

export interface RenderedComponent {
  id: string;
  type: ComponentType;
  zone: string;
  props: Record<string, unknown>;
}

export interface ChatEntry {
  role: "user" | "assistant";
  content: string;
}

export interface NavigateEvent {
  view: string;
  params?: Record<string, string>;
}

export interface ViewDataEvent {
  view: string;
  data: unknown;
}

export interface FormFillItem {
  field: string;
  value: string;
}

// Component prop types
export interface TableProps {
  headers: string[];
  rows: (string | number)[][];
}

export interface CardProps {
  title: string;
  content: string;
  footer?: string;
}

export interface MetricProps {
  label: string;
  value: string | number;
  trend?: "up" | "down" | "neutral";
}

export interface ListProps {
  items: { title: string; description?: string }[];
}

export interface FormField {
  name: string;
  type: "text" | "number" | "select" | "textarea";
  label: string;
  options?: string[];
  placeholder?: string;
}

export interface FormProps {
  fields: FormField[];
  submit_label?: string;
}

export interface ChartProps {
  chart_type: "bar" | "line" | "pie";
  labels: string[];
  values: number[];
  title?: string;
}

export interface PossessionState {
  [key: string]: unknown;
}
