"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { FormFillItem } from "../types";

export interface UseFormFillOptions {
  formFillQueue: FormFillItem[];
  shiftFormFill: () => void;
  /** Called before a field is filled — use to navigate/scroll/switch tabs */
  onBeforeFill?: (field: string) => void;
  /** Fields that should be set instantly (no typewriter), e.g. selects */
  instantFields?: Set<string>;
}

export function useFormFill({
  formFillQueue,
  shiftFormFill,
  onBeforeFill,
  instantFields = new Set(),
}: UseFormFillOptions) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [animatingField, setAnimatingField] = useState<string | null>(null);
  const [animatingValue, setAnimatingValue] = useState("");
  const [aiFilledFields, setAiFilledFields] = useState<Set<string>>(new Set());
  const processing = useRef(false);

  const processNext = useCallback(() => {
    if (formFillQueue.length === 0) {
      processing.current = false;
      return;
    }

    processing.current = true;
    const item = formFillQueue[0];
    const isInstant = instantFields.has(item.field);

    // Let the app prepare (navigate, scroll, switch tab, etc.)
    onBeforeFill?.(item.field);

    setTimeout(() => {
      setAnimatingField(item.field);
      setAnimatingValue(item.value);

      if (isInstant) {
        setValues((prev) => ({ ...prev, [item.field]: item.value }));
        setAiFilledFields((prev) => new Set(prev).add(item.field));
      }

      const duration = isInstant ? 600 : item.value.length * 30 + 400;

      setTimeout(() => {
        if (!isInstant) {
          setValues((prev) => ({ ...prev, [item.field]: item.value }));
          setAiFilledFields((prev) => new Set(prev).add(item.field));
        }
        setAnimatingField(null);
        setAnimatingValue("");
        processing.current = false;
        shiftFormFill();
      }, duration);
    }, 300);
  }, [formFillQueue, shiftFormFill, onBeforeFill, instantFields]);

  useEffect(() => {
    if (formFillQueue.length === 0 || processing.current) return;
    processNext();
  }, [formFillQueue, processNext]);

  const setField = useCallback((name: string, value: string) => {
    setValues((prev) => ({ ...prev, [name]: value }));
  }, []);

  const reset = useCallback(() => {
    setValues({});
    setAiFilledFields(new Set());
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
    reset,
  };
}
