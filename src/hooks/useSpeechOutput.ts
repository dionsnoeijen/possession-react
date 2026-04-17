"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface UseSpeechOutputOptions {
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

export function useSpeechOutput(options: UseSpeechOutputOptions = {}) {
  const { lang = "en-US", voice, rate = 1, pitch = 1, volume = 1 } = options;
  const [speaking, setSpeaking] = useState(false);
  const [supported, setSupported] = useState(false);
  const settingsRef = useRef({ lang, voice, rate, pitch, volume });
  settingsRef.current = { lang, voice, rate, pitch, volume };

  useEffect(() => {
    if (typeof window === "undefined") return;
    setSupported("speechSynthesis" in window);
  }, []);

  const speak = useCallback((text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const s = settingsRef.current;
    const plain = stripMarkdown(text);
    if (!plain.trim()) return;

    // Cancel any ongoing utterance before starting a new one
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

  const stop = useCallback(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }, []);

  return { speak, stop, speaking, supported };
}

function stripMarkdown(text: string): string {
  // Skip entire tables — they don't read well aloud.
  // A table starts with a header line containing | and is followed by a separator line.
  const lines = text.split("\n");
  const filtered: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const isTableRow = /\|/.test(line);
    const next = lines[i + 1] ?? "";
    const isTableStart = isTableRow && /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)+\|?\s*$/.test(next);
    if (isTableStart) {
      // Skip all consecutive table rows
      while (i < lines.length && /\|/.test(lines[i])) i++;
      continue;
    }
    filtered.push(line);
    i++;
  }

  return filtered.join("\n")
    // code blocks
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`([^`]+)`/g, "$1")
    // bold/italic
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    // links
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    // headings
    .replace(/^#{1,6}\s+/gm, "")
    // tool-call badges like "search_contacts(...) completed in 0.001s."
    .replace(/\w[\w_]*\(.*?\)\s*completed\s+in\s+[\d.]+s\.?/g, "")
    // excessive whitespace
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
