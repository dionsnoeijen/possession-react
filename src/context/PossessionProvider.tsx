"use client";

import { createContext, useContext, type ReactNode } from "react";
import { usePossession } from "../hooks/usePossession";
import type { PossessionState } from "../types";

interface PossessionContextValue {
  possession: PossessionState;
  triggerPossession: (type: string, value: unknown) => void;
}

const PossessionContext = createContext<PossessionContextValue | null>(null);

export function PossessionProvider({
  children,
  duration = 1500,
}: {
  children: ReactNode;
  duration?: number;
}) {
  const { possession, triggerPossession } = usePossession(duration);

  return (
    <PossessionContext.Provider value={{ possession, triggerPossession }}>
      {children}
    </PossessionContext.Provider>
  );
}

export function usePossessionContext() {
  const ctx = useContext(PossessionContext);
  if (!ctx) throw new Error("usePossessionContext must be used within PossessionProvider");
  return ctx;
}
