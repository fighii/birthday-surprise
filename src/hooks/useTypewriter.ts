import { useEffect, useRef, useState } from "react";

interface UseTypewriterOptions {
  text: string;
  speed?: number;
  startDelay?: number;
  enabled?: boolean;
  cursor?: boolean;
  onDone?: () => void;
}

export function useTypewriter({
  text,
  speed = 70,
  startDelay = 0,
  enabled = true,
  onDone,
}: UseTypewriterOptions) {
  const [display, setDisplay] = useState("");
  const [done, setDone] = useState(false);
  const timers = useRef<number[]>([]);
  const onDoneRef = useRef<(() => void) | undefined>(onDone);

  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
    setDisplay("");
    setDone(false);
    if (!enabled || !text) {
      setDisplay(text);
      setDone(true);
      return;
    }
    const startT = window.setTimeout(() => {
      const chars = Array.from(text);
      chars.forEach((_ch, i) => {
        const t = window.setTimeout(() => {
          setDisplay(text.slice(0, i + 1));
          if (i === chars.length - 1) {
            setDone(true);
            onDoneRef.current?.();
          }
        }, i * speed);
        timers.current.push(t);
      });
    }, startDelay);
    timers.current.push(startT);
    return () => {
      timers.current.forEach((t) => window.clearTimeout(t));
      timers.current = [];
    };
  }, [text, speed, startDelay, enabled]);

  return { display, done };
}
