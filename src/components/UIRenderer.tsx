"use client";

import { useState, useEffect } from "react";
import type { RenderedComponent, TableProps, CardProps, MetricProps, ListProps, FormProps, ChartProps } from "../types";

interface UIRendererProps {
  component: RenderedComponent;
  onFormSubmit: (componentId: string, data: Record<string, string>) => void;
  customRenderers?: Record<string, React.ComponentType<{ props: Record<string, unknown> }>>;
}

function Table({ props }: { props: TableProps }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-700">
            {props.headers.map((h, i) => (
              <th key={i} className="text-left p-3 text-zinc-300 font-medium">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {props.rows.map((row, i) => (
            <tr key={i} className="border-b border-zinc-800 hover:bg-zinc-800/50">
              {row.map((cell, j) => (
                <td key={j} className="p-3 text-zinc-200">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Card({ props }: { props: CardProps }) {
  return (
    <div>
      <h3 className="text-lg font-semibold text-zinc-100 mb-2">{props.title}</h3>
      <p className="text-zinc-300 text-sm">{props.content}</p>
      {props.footer && (
        <p className="text-zinc-500 text-xs mt-3 pt-3 border-t border-zinc-700">{props.footer}</p>
      )}
    </div>
  );
}

function Metric({ props }: { props: MetricProps }) {
  const trendColor = props.trend === "up" ? "text-emerald-400" : props.trend === "down" ? "text-red-400" : "text-zinc-400";
  return (
    <div className="text-center">
      <p className="text-zinc-400 text-sm mb-1">{props.label}</p>
      <p className="text-3xl font-bold text-zinc-100">{props.value}</p>
      {props.trend && <span className={`text-sm ${trendColor}`}>{props.trend === "up" ? "^" : props.trend === "down" ? "v" : "-"}</span>}
    </div>
  );
}

function List({ props }: { props: ListProps }) {
  return (
    <ul className="space-y-2">
      {props.items.map((item, i) => (
        <li key={i} className="p-3 bg-zinc-800/50 rounded-lg">
          <p className="text-zinc-100 font-medium">{item.title}</p>
          {item.description && <p className="text-zinc-400 text-sm mt-1">{item.description}</p>}
        </li>
      ))}
    </ul>
  );
}

function Form({ props, componentId, onSubmit }: { props: FormProps; componentId: string; onSubmit: (id: string, data: Record<string, string>) => void }) {
  const [formData, setFormData] = useState<Record<string, string>>({});
  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); onSubmit(componentId, formData); };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {props.fields.map((field) => (
        <div key={field.name}>
          <label className="block text-sm text-zinc-300 mb-1">{field.label}</label>
          {field.type === "select" ? (
            <select
              className="w-full bg-zinc-800 border border-zinc-600 rounded-lg p-2 text-zinc-200 focus:border-blue-500 focus:outline-none"
              value={formData[field.name] ?? ""}
              onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
            >
              <option value="">Select...</option>
              {field.options?.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          ) : (
            <input
              type={field.type}
              className="w-full bg-zinc-800 border border-zinc-600 rounded-lg p-2 text-zinc-200 focus:border-blue-500 focus:outline-none"
              placeholder={field.placeholder}
              value={formData[field.name] ?? ""}
              onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
            />
          )}
        </div>
      ))}
      <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white rounded-lg p-2 font-medium transition-colors">
        {props.submit_label ?? "Submit"}
      </button>
    </form>
  );
}

function Chart({ props }: { props: ChartProps }) {
  const maxVal = Math.max(...props.values, 1);
  if (props.chart_type === "bar") {
    return (
      <div>
        {props.title && <p className="text-zinc-300 text-sm mb-3 font-medium">{props.title}</p>}
        <div className="flex items-end gap-2 h-40">
          {props.values.map((val, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-xs text-zinc-400">{val}</span>
              <div className="w-full bg-blue-500 rounded-t" style={{ height: `${(val / maxVal) * 100}%` }} />
              <span className="text-xs text-zinc-500 truncate w-full text-center">{props.labels[i]}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return (
    <div>
      {props.title && <p className="text-zinc-300 text-sm mb-2 font-medium">{props.title}</p>}
      <div className="space-y-1">
        {props.labels.map((label, i) => (
          <div key={i} className="flex justify-between text-sm">
            <span className="text-zinc-400">{label}</span>
            <span className="text-zinc-200">{props.values[i]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function NotificationDraft({ props }: { props: Record<string, unknown> }) {
  const [expanded, setExpanded] = useState(false);
  const p = props as { notification_id: string; recipient_name: string; recipient_email: string; subject: string; message: string };
  return (
    <div>
      <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center gap-2 text-left">
        <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold flex-shrink-0">{p.recipient_name.charAt(0)}</div>
        <p className="text-sm text-zinc-200 truncate flex-1">{p.subject}</p>
        <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse flex-shrink-0" />
        <span className="text-xs text-zinc-500 flex-shrink-0">{expanded ? "▲" : "▼"}</span>
      </button>
      {expanded && (
        <div className="mt-2 ml-8 space-y-2">
          <p className="text-xs text-zinc-500">To: {p.recipient_name} ({p.recipient_email})</p>
          <div className="bg-zinc-800 rounded-lg p-2">
            <p className="text-zinc-300 text-xs whitespace-pre-line">{p.message}</p>
          </div>
          <p className="text-xs text-amber-400">Awaiting confirmation...</p>
        </div>
      )}
    </div>
  );
}

function NotificationSent({ props }: { props: Record<string, unknown> }) {
  const [expanded, setExpanded] = useState(false);
  const p = props as { recipient_name: string; recipient_email: string; subject: string };
  return (
    <div>
      <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center gap-2 text-left">
        <div className="w-6 h-6 rounded-full bg-emerald-600 flex items-center justify-center text-xs font-bold flex-shrink-0">✓</div>
        <p className="text-sm text-zinc-200 truncate flex-1">{p.subject}</p>
        <span className="text-xs bg-emerald-900/50 text-emerald-300 px-2 py-0.5 rounded-full flex-shrink-0">Sent</span>
        <span className="text-xs text-zinc-500 flex-shrink-0">{expanded ? "▲" : "▼"}</span>
      </button>
      {expanded && (
        <div className="mt-2 ml-8">
          <p className="text-xs text-zinc-500">To: {p.recipient_name} ({p.recipient_email})</p>
        </div>
      )}
    </div>
  );
}

function NotificationSending({ props }: { props: Record<string, unknown> }) {
  const [sent, setSent] = useState(false);
  const p = props as { recipient_name: string; recipient_email: string; subject: string };

  useEffect(() => {
    const timer = setTimeout(() => setSent(true), 2500);
    return () => clearTimeout(timer);
  }, []);

  if (sent) {
    return (
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-full bg-emerald-600 flex items-center justify-center text-xs font-bold flex-shrink-0">✓</div>
        <p className="text-sm text-zinc-200 truncate flex-1">{p.subject}</p>
        <span className="text-xs bg-emerald-900/50 text-emerald-300 px-2 py-0.5 rounded-full flex-shrink-0">Sent</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold flex-shrink-0">{p.recipient_name.charAt(0)}</div>
        <p className="text-sm text-zinc-200 truncate flex-1">{p.subject}</p>
        <span className="text-xs text-cyan-300 flex-shrink-0">Sending...</span>
      </div>
      <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-blue-500 via-cyan-400 to-blue-500 rounded-full animate-sending" />
      </div>
    </div>
  );
}

const BUILT_IN_RENDERERS: Record<string, React.ComponentType<{ props: Record<string, unknown> }>> = {
  table: ({ props }) => <Table props={props as unknown as TableProps} />,
  card: ({ props }) => <Card props={props as unknown as CardProps} />,
  metric: ({ props }) => <Metric props={props as unknown as MetricProps} />,
  list: ({ props }) => <List props={props as unknown as ListProps} />,
  chart: ({ props }) => <Chart props={props as unknown as ChartProps} />,
  html: ({ props }) => <div className="text-zinc-200 text-sm" dangerouslySetInnerHTML={{ __html: (props as { content: string }).content }} />,
  notification_draft: NotificationDraft,
  notification_sent: NotificationSent,
  notification_sending: NotificationSending,
};

export function UIRenderer({ component, onFormSubmit, customRenderers = {} }: UIRendererProps) {
  const allRenderers = { ...BUILT_IN_RENDERERS, ...customRenderers };
  const Renderer = allRenderers[component.type];

  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-4">
      {component.type === "form" ? (
        <Form props={component.props as unknown as FormProps} componentId={component.id} onSubmit={onFormSubmit} />
      ) : Renderer ? (
        <Renderer props={component.props as Record<string, unknown>} />
      ) : (
        <p className="text-zinc-500 text-sm">Unknown component: {component.type}</p>
      )}
    </div>
  );
}
