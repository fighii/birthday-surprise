import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useStory } from "../context/StoryContext";
import { birthdayConfig, noButtonMessages } from "../config/birthdayConfig.js";
import { music as musicCfg } from "../config/media.js";
import { useTypewriter } from "../hooks/useTypewriter";

function TypewriterCursor() {
  return (
    <span
      aria-hidden
      className="inline-block w-[2px] h-[1em] align-[-0.15em] ml-1 bg-cinematic-gold/80"
      style={{ animation: "twBlink 1s steps(2, start) infinite" }}
    />
  );
}

type MusicConfigShape = { src?: string; title?: string } | null;
const musicConfig = musicCfg as MusicConfigShape;

const NO_POSITIONS = [
  { x: 0, y: 0 },
  { x: 70, y: 0 },
  { x: -70, y: 0 },
  { x: 0, y: -60 },
  { x: 0, y: 56 },
  { x: 64, y: -40 },
  { x: -64, y: 40 },
  { x: 54, y: 50 },
  { x: -54, y: -52 },
  { x: 0, y: -80 },
];

function clampPX(v: number, maxAbs: number) {
  const s = Math.sign(v);
  const a = Math.min(Math.abs(v), maxAbs);
  return s * a;
}

export default function OpeningScene() {
  const { goToScene, currentScene, audioRef, toggleMusic } = useStory();
  const active = currentScene === 1;

  const [started, setStarted] = useState(false);
  const [line1Done, setLine1Done] = useState(false);
  const [line2Done, setLine2Done] = useState(false);
  const [line3Done, setLine3Done] = useState(false);
  const [buttonsReady, setButtonsReady] = useState(false);
  const [noClicks, setNoClicks] = useState(0);
  const [noPos, setNoPos] = useState(0);
  const [noScale, setNoScale] = useState(true);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const noBtnRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!active) return;
    setStarted(false);
    setLine1Done(false);
    setLine2Done(false);
    setLine3Done(false);
    setButtonsReady(false);
    setNoClicks(0);
    setNoPos(0);
    const t = window.setTimeout(() => setStarted(true), 450);
    return () => window.clearTimeout(t);
  }, [active]);

  useEffect(() => {
    if (!line3Done || !active) return;
    const t = window.setTimeout(() => setButtonsReady(true), 650);
    return () => window.clearTimeout(t);
  }, [line3Done, active]);

  const tw1 = useTypewriter({
    text: birthdayConfig.introLine1,
    speed: 80,
    startDelay: 0,
    enabled: started && active,
    onDone: () => setLine1Done(true),
  });
  const tw2 = useTypewriter({
    text: birthdayConfig.introLine2,
    speed: 80,
    startDelay: 320,
    enabled: line1Done && active,
    onDone: () => setLine2Done(true),
  });
  const tw3 = useTypewriter({
    text: birthdayConfig.introLine3,
    speed: 70,
    startDelay: 320,
    enabled: line2Done && active,
    onDone: () => setLine3Done(true),
  });
  const buttonsVisible = buttonsReady && active;

  const playfulMessage = useMemo(() => {
    return noButtonMessages[Math.min(noClicks, noButtonMessages.length - 1)] || "";
  }, [noClicks]);

  const tryMusic = useCallback(async () => {
    if (!musicConfig || !musicConfig.src) return;
    const audio = audioRef.current;
    if (!audio) return;
    try {
      audio.volume = birthdayConfig.music?.volume ?? 0.45;
      await audio.play();
    } catch {
      toggleMusic();
    }
  }, [audioRef, toggleMusic]);

  const handleOpen = async () => {
    await tryMusic();
    goToScene(2, 300);
  };

  const onNoAttempt = useCallback(() => {
    setNoScale(false);
    window.setTimeout(() => setNoScale(true), 80);
    setNoClicks((c) => {
      const next = c + 1;
      if (next >= 10) {
        // biarkan makin liar tapi tetap dalam area
        setNoPos((p) => (p + 1) % NO_POSITIONS.length);
      } else {
        setNoPos(next % NO_POSITIONS.length);
      }
      return next;
    });
  }, []);

  const raw = NO_POSITIONS[noPos] ?? NO_POSITIONS[0];
  const pos = {
    x: clampPX(raw.x, 70),
    y: clampPX(raw.y, 70),
  };
  const crazyScale = noClicks >= 10 ? 0.88 + Math.random() * 0.12 : 1;

  return (
    <section
      className={`scene-layer ${active ? "scene-active" : "scene-hidden"}`}
      aria-hidden={!active}
      ref={containerRef}
    >
      <style>{`
        @keyframes twBlink { 0%, 100% { opacity: 0.2; } 50% { opacity: 1; } }
      `}</style>

      <div className="relative z-10 w-full max-w-md mx-auto flex flex-col items-center justify-center text-center gap-5 px-2">
        <div className="flex flex-col gap-3 min-h-[140px] justify-center">
          <p
            className={`text-xl sm:text-2xl text-cinematic-soft transition-all duration-[700ms] ${
              started ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
            style={{ minHeight: "1.8em" }}
            aria-live="polite"
          >
            <span>{tw1.display}</span>
            {started && !tw1.done && <TypewriterCursor />}
          </p>
          <p
            className={`text-xl sm:text-2xl text-cinematic-soft/80 transition-all duration-[700ms] ${
              line1Done ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
            style={{ minHeight: "1.8em" }}
            aria-live="polite"
          >
            <span>{tw2.display}</span>
            {line1Done && !tw2.done && <TypewriterCursor />}
          </p>
          <p
            className={`text-2xl sm:text-3xl text-white transition-all duration-[800ms] ${
              line2Done ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
            }`}
            style={{ minHeight: "1.8em" }}
            aria-live="polite"
          >
            <span>{tw3.display}</span>
            {line2Done && !tw3.done && <TypewriterCursor />}
          </p>
        </div>

        <div
          className={`relative w-full h-[240px] sm:h-[260px] transition-opacity duration-700 ${
            buttonsVisible ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        >
          <div className="absolute top-0 left-0 right-0 flex flex-col items-center gap-3">
            <button
              className="btn-primary"
              onClick={handleOpen}
              aria-label="Open your birthday surprise gift"
            >
              OPEN YOUR SURPRISE 🎁
            </button>

            <div className="h-10 flex items-center justify-center">
              <p className="text-sm text-cinematic-gold/90 animate-fade-in">
                {playfulMessage}
              </p>
            </div>
          </div>

          <div
            className="absolute left-1/2 top-[120px] transition-transform duration-[420ms]"
            style={{
              transform: `translateX(calc(-50% + ${pos.x}px)) translateY(${pos.y}px) scale(${
                noScale ? crazyScale : crazyScale * 0.9
              })`,
              transitionTimingFunction: "cubic-bezier(0.34, 1.56, 0.64, 1)",
            }}
          >
            <button
              ref={noBtnRef}
              className="btn-secondary"
              onPointerDown={(e) => {
                e.preventDefault();
                onNoAttempt();
              }}
              onTouchStart={(e) => {
                e.preventDefault();
                onNoAttempt();
              }}
              onMouseEnter={() => {
                if (noClicks >= 2) onNoAttempt();
              }}
              onClick={(e) => e.preventDefault()}
              aria-label="No button (will move when pressed)"
              style={{ touchAction: "none", minWidth: 120 }}
            >
              NO 💔
            </button>
          </div>
        </div>
      </div>

      <div className="vignette" />
      <div className="cinematic-bars" aria-hidden />
    </section>
  );
}
