"use client";

import type { ReactNode } from "react";
import type { RenderedComponent } from "../types";
import { UIRenderer } from "./UIRenderer";

export interface PossessionZoneProps {
  /** Unique name for this zone. Agent targets this to render here. */
  name: string;
  /** All AI-rendered components (from useWebSocket) */
  components: RenderedComponent[];
  /** Form submit handler for agent-rendered forms */
  onFormSubmit?: (componentId: string, data: Record<string, string>) => void;
  /** Custom component renderers for domain-specific types */
  customRenderers?: Record<string, React.ComponentType<{ props: Record<string, unknown> }>>;
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
export function PossessionZone({
  name,
  components,
  onFormSubmit,
  customRenderers,
  empty,
  className,
}: PossessionZoneProps) {
  const mine = components.filter((c) => c.zone === name);

  if (mine.length === 0) {
    if (!empty) return null;
    return <div className={className}>{empty}</div>;
  }

  return (
    <div className={className}>
      {mine.map((component) => (
        <UIRenderer
          key={component.id}
          component={component}
          onFormSubmit={onFormSubmit ?? (() => {})}
          customRenderers={customRenderers}
        />
      ))}
    </div>
  );
}
