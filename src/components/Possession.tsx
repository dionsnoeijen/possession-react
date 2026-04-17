"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { TypewriterValue } from "./TypewriterValue";

interface PossessionProps {
  /** The form fill state from useFormFill */
  animatingField: string | null;
  animatingValue: string;
  aiFilledFields: Set<string>;
  /** Callback when possession sets a value on a field */
  onFieldChange?: (name: string, value: string) => void;
  children: ReactNode;
}

interface OverlayState {
  field: string;
  value: string;
  rect: DOMRect;
  isTextarea: boolean;
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
export function Possession({
  animatingField,
  animatingValue,
  aiFilledFields,
  onFieldChange,
  children,
}: PossessionProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [overlay, setOverlay] = useState<OverlayState | null>(null);
  const [flashField, setFlashField] = useState<string | null>(null);
  const prevAnimating = useRef<string | null>(null);

  // Find the target element and apply possession effects
  useEffect(() => {
    if (!containerRef.current) return;

    if (animatingField) {
      const el = containerRef.current.querySelector<HTMLElement>(
        `[name="${animatingField}"]`
      );
      if (!el) return;

      const isSelect = el.tagName === "SELECT";
      const isTextarea = el.tagName === "TEXTAREA";

      // Add glow border
      el.style.borderColor = "#3b82f6";
      el.style.boxShadow = "0 0 0 1px rgba(59,130,246,0.3)";
      el.style.transition = "all 300ms";

      if (isSelect) {
        // For selects: set value directly, no typewriter
        const selectEl = el as HTMLSelectElement;
        setNativeValue(selectEl, animatingValue);
        onFieldChange?.(animatingField, animatingValue);
        setOverlay(null);
      } else {
        // For text inputs: make text transparent and show typewriter overlay
        const inputEl = el as HTMLInputElement | HTMLTextAreaElement;
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
          isTextarea,
        });
      }
    }

    // When animation ends — commit value, remove overlay, flash green
    if (prevAnimating.current && prevAnimating.current !== animatingField) {
      const prevField = prevAnimating.current;
      const el = containerRef.current.querySelector<HTMLElement>(
        `[name="${prevField}"]`
      );
      if (el) {
        el.style.color = "";
        el.style.borderColor = "";
        el.style.boxShadow = "";

        // Flash green
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

  // Apply subtle persistent border to AI-filled fields
  useEffect(() => {
    if (!containerRef.current) return;

    aiFilledFields.forEach((fieldName) => {
      // Don't override active animation or flash
      if (fieldName === animatingField || fieldName === flashField) return;

      const el = containerRef.current?.querySelector<HTMLElement>(
        `[name="${fieldName}"]`
      );
      if (el && !el.style.boxShadow) {
        el.style.borderColor = "rgba(16,185,129,0.3)";
      }
    });
  }, [aiFilledFields, animatingField, flashField]);

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      {children}

      {/* Typewriter overlay */}
      {overlay && (
        <div
          style={{
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
            zIndex: 10,
          }}
        >
          <span style={{ fontSize: "1rem", color: "#27272a" }}>
            <TypewriterValue
              value={overlay.value}
              onComplete={() => {
                // Set the actual value on the input when typewriter finishes
                if (containerRef.current) {
                  const el = containerRef.current.querySelector<
                    HTMLInputElement | HTMLTextAreaElement
                  >(`[name="${overlay.field}"]`);
                  if (el) {
                    setNativeValue(el, overlay.value);
                    onFieldChange?.(overlay.field, overlay.value);
                  }
                }
              }}
            />
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * Set a value on an input/select element and trigger React's onChange.
 * This works with both controlled and uncontrolled inputs.
 */
function setNativeValue(
  el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
  value: string
) {
  const nativeInputValueSetter =
    Object.getOwnPropertyDescriptor(
      el.tagName === "SELECT"
        ? HTMLSelectElement.prototype
        : el.tagName === "TEXTAREA"
          ? HTMLTextAreaElement.prototype
          : HTMLInputElement.prototype,
      "value"
    )?.set;

  if (nativeInputValueSetter) {
    nativeInputValueSetter.call(el, value);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }
}
