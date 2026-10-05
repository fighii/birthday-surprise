import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useStory } from "../context/StoryContext";
import { birthdayConfig } from "../config/birthdayConfig.js";

interface Piece {
  id: number;
  left: number;
  delay: number;
  duration: number;
  color: string;
  rot: number;
  size: number;
  drift: number;
}

function usePrefersReducedMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduce(m.matches);
    const handler = (e: MediaQueryListEvent) => setReduce(e.matches);
    m.addEventListener?.("change", handler);
    return () => m.removeEventListener?.("change", handler);
  }, []);
  return reduce;
}

const CONFETTI_COLORS = [
  "#ff8aa8",
  "#f7c97e",
  "#c084fc",
  "#ff6b9d",
  "#fef3c7",
  "#fca5a5",
  "#fbbf24",
];

function generatePieces(count: number): Piece[] {
  const arr: Piece[] = [];
  for (let i = 0; i < count; i++) {
    arr.push({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 1.2,
      duration: 3 + Math.random() * 3,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      rot: -180 + Math.random() * 360,
      size: 6 + Math.random() * 10,
      drift: -40 + Math.random() * 80,
    });
  }
  return arr;
}

export default function FinalSurprise() {
  const { currentScene, markFinalDone } = useStory();
  const active = currentScene === 9;
  const reduce = usePrefersReducedMotion();
  const [phase, setPhase] = useState(0);
  const [heartClicks, setHeartClicks] = useState(0);
  const [eggVisible, setEggVisible] = useState(false);
  const pieces = useMemo(() => generatePieces(reduce ? 28 : 90), [reduce]);
  const heartResetTimer = useRef<number | null>(null);

  useEffect(() => {
    if (!active) return;
    setPhase(0);
    markFinalDone();
    const t1 = window.setTimeout(() => setPhase(1), 700);
    const t2 = window.setTimeout(() => setPhase(2), 2000);
    const t3 = window.setTimeout(() => setPhase(3), 3500);
    const t4 = window.setTimeout(() => setPhase(4), 5000);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
      window.clearTimeout(t4);
    };
  }, [active, markFinalDone]);

  const onHeartClick = useCallback(() => {
    setHeartClicks((c) => {
      const nx = c + 1;
      if (nx >= 5) {
        setEggVisible(true);
        if (heartResetTimer.current) window.clearTimeout(heartResetTimer.current);
        heartResetTimer.current = window.setTimeout(() => {
          setHeartClicks(0);
          setEggVisible(false);
        }, 4500);
        return nx;
      }
      if (heartResetTimer.current) window.clearTimeout(heartResetTimer.current);
      heartResetTimer.current = window.setTimeout(() => setHeartClicks(0), 2200);
      return nx;
    });
  }, []);

  return (
    <section
      className={`scene-layer ${active ? "scene-active" : "scene-hidden"}`}
      aria-hidden={!active}
      style={{ overflow: "hidden" }}
    >
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse at 50% 55%, rgba(255, 138, 168, 0.30) 0%, rgba(247, 201, 126, 0.12) 35%, transparent 70%)",
          opacity: phase >= 1 ? 1 : 0,
          transition: "opacity 1600ms ease-out",
          filter: "blur(20px)",
        }}
      />

      {!reduce && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          {pieces.map((p) => (
            <span
              key={p.id}
              className="confetti-piece"
              style={{
                left: `${p.left}%`,
                top: "-10%",
                width: p.size,
                height: p.size * 1.6,
                background: p.color,
                animation: `confettiFall ${p.duration}s linear ${p.delay}s 1 forwards`,
                ["--rot" as any]: `${p.rot}deg`,
                ["--drift" as any]: `${p.drift}px`,
                borderRadius: 2,
              }}
            />
          ))}
        </div>
      )}

      <style>{`
        @keyframes confettiFall {
          0% { transform: translate3d(0, 0, 0) rotate(0deg); opacity: 0; }
          10% { opacity: 1; }
          100% { transform: translate3d(var(--drift, 0), 110vh, 0) rotate(var(--rot, 0deg)); opacity: 0.9; }
        }
      `}</style>

      <div className="relative z-10 w-full max-w-xl mx-auto flex flex-col items-center text-center gap-6 px-4">
        <h1
          className={`text-romantic text-4xl sm:text-6xl text-cinematic-gold transition-all duration-[1200ms] ease-out ${
            phase >= 1 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
          }`}
        >
          Happy Birthday,{" "}
          <span className="text-cinematic-love">{birthdayConfig.name}</span>{" "}
          <span aria-hidden>❤️</span>
        </h1>

        <p
          className={`text-serif italic text-cinematic-soft/90 text-lg sm:text-xl max-w-sm transition-all duration-[1200ms] ease-out ${
            phase >= 2 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"
          }`}
        >
          {birthdayConfig.finalMessage}
        </p>

        <p
          className={`text-romantic text-3xl sm:text-4xl text-white transition-all duration-[1200ms] ease-out ${
            phase >= 3 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"
          }`}
        >
          {birthdayConfig.finalLove}
        </p>

        <button
          aria-label={`Final heart, clicked ${heartClicks} times`}
          onClick={onHeartClick}
          className={`relative mt-6 h-28 w-28 sm:h-36 sm:w-36 rounded-full flex items-center justify-center transition-all duration-[1600ms] ease-out ${
            phase >= 4 ? "opacity-100 scale-100" : "opacity-0 scale-75"
          }`}
          style={{
            background:
              "radial-gradient(circle at 35% 30%, #ffb3c6 0%, #ff6b9d 45%, #c2395d 100%)",
            boxShadow:
              "0 0 0 1px rgba(255,255,255,0.08), 0 16px 60px -10px rgba(255, 107, 157, 0.6), 0 0 60px 4px rgba(255, 107, 157, 0.35)",
            animation: heartClicks >= 5 ? undefined : "heartBeat 1.6s ease-in-out infinite",
          }}
        >
          <span
            className="text-white drop-shadow"
            style={{ fontSize: 48 }}
            aria-hidden
          >
            ❤
          </span>
          {heartClicks > 0 && heartClicks < 5 && (
            <span className="absolute -top-2 -right-2 h-7 w-7 rounded-full bg-white/10 backdrop-blur border border-white/20 text-sm text-white flex items-center justify-center">
              {heartClicks}
            </span>
          )}
        </button>

        <div
          className={`absolute left-4 right-4 sm:left-1/2 sm:-translate-x-1/2 sm:w-max transition-all duration-700 ${
            eggVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
          }`}
          style={{ bottom: "max(2.5rem, calc(env(safe-area-inset-bottom) + 1.25rem))" }}
        >
          <div className="glass px-4 py-3 mx-auto text-center max-w-sm">
            <p className="text-cinematic-gold text-sm sm:text-base">
              {birthdayConfig.easterEgg}
            </p>
          </div>
        </div>
      </div>

      <div className="vignette" />
    </section>
  );
}
