"use client";

import { useState, useEffect, useRef } from "react";

interface TypewriterValueProps {
  value: string;
  speed?: number;
  onComplete?: () => void;
}

export function TypewriterValue({ value, speed = 30, onComplete }: TypewriterValueProps) {
  const [displayed, setDisplayed] = useState("");
  const indexRef = useRef(0);

  useEffect(() => {
    setDisplayed("");
    indexRef.current = 0;

    const interval = setInterval(() => {
      indexRef.current++;
      if (indexRef.current <= value.length) {
        setDisplayed(value.slice(0, indexRef.current));
      } else {
        clearInterval(interval);
        onComplete?.();
      }
    }, speed);

    return () => clearInterval(interval);
  }, [value, speed, onComplete]);

  return (
    <>
      {displayed}
      {displayed.length < value.length && (
        <span className="inline-block w-0.5 h-4 bg-blue-400 animate-pulse ml-0.5 align-middle" />
      )}
    </>
  );
}
