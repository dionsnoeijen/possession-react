"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface UseSpeechInputOptions {
  /** BCP 47 language tag, e.g. "en-US", "nl-NL" */
  lang?: string;
  /** If true, keeps listening after a pause instead of stopping */
  continuous?: boolean;
  /** Fires when a final transcript is available */
  onResult?: (transcript: string) => void;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  [index: number]: { transcript: string };
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
    SpeechRecognition?: { new (): SpeechRecognition };
    webkitSpeechRecognition?: { new (): SpeechRecognition };
  }
}

export function useSpeechInput(options: UseSpeechInputOptions = {}) {
  const { lang = "en-US", continuous = false, onResult } = options;

  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [supported, setSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

  useEffect(() => {
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
      let interim = "";
      let final = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) final += r[0].transcript;
        else interim += r[0].transcript;
      }
      setTranscript(final || interim);
      if (final) onResultRef.current?.(final.trim());
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
      } catch {}
      recognitionRef.current = null;
    };
  }, [lang, continuous]);

  const start = useCallback(() => {
    if (!recognitionRef.current || listening) return;
    setTranscript("");
    try {
      recognitionRef.current.start();
      // onstart handler will call setListening(true) when recognition actually begins
    } catch (e) {
      console.warn("[useSpeechInput] start failed:", e);
      setListening(false);
    }
  }, [listening]);

  const stop = useCallback(() => {
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.stop();
    } catch {}
    setListening(false);
  }, []);

  return { listening, transcript, supported, start, stop };
}
