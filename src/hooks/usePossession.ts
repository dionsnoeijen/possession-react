"use client";

import { useCallback, useRef, useState } from "react";
import type { PossessionState } from "../types";

export function usePossession(duration = 1500) {
  const [state, setState] = useState<PossessionState>({
    sidebarView: null,
    formPage: null,
  });

  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const trigger = useCallback(
    (type: string, value: unknown) => {
      if (timers.current[type]) clearTimeout(timers.current[type]);

      setState((prev) => ({ ...prev, [type]: value }));

      timers.current[type] = setTimeout(() => {
        setState((prev) => ({ ...prev, [type]: null }));
      }, duration);
    },
    [duration]
  );

  return { possession: state, triggerPossession: trigger };
}
