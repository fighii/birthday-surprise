import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MouseEvent as RMouseEvent } from "react";
import { useStory } from "../context/StoryContext";
import { birthdayConfig, noButtonMessages } from "../config/birthdayConfig.js";
import { music as musicCfg } from "../config/media.js";
import { useTypewriter } from "../hooks/useTypewriter";
import { FONT_HAND, FONT_LED, THEME } from "../config/sceneTheme";
import { PaperNote, PaperSticker, hash01 } from "./PaperCutout";
import { PaperButton, PixelBurstLayer, usePrefersReducedMotion } from "./PaperExtras";
import type { PixelBurstHandle } from "./PaperExtras";
import SceneLabel from "./SceneLabel";

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

// Teks diketik di atas teks "hantu" agar ukuran kertas tidak loncat-loncat
function TypedLine({ full, display, cursor }: { full: string; display: string; cursor: boolean }) {
  return (
    <span style={{ position: "relative", display: "inline-block" }}>
      <span aria-hidden style={{ visibility: "hidden" }}>
        {full}
      </span>
      <span aria-live="polite" style={{ position: "absolute", left: 0, top: 0, right: 0 }}>
        {display}
        {cursor && (
          <span
            aria-hidden
            style={{
              display: "inline-block",
              width: 2,
              height: "1em",
              marginLeft: 3,
              verticalAlign: "-0.15em",
              background: "currentColor",
              animation: "twBlink 1s steps(2, start) infinite",
            }}
          />
        )}
      </span>
    </span>
  );
}

export default function OpeningScene() {
  const { goToScene, currentScene, audioRef, toggleMusic } = useStory();
  const active = currentScene === 1;
  const reduce = usePrefersReducedMotion();

  const [started, setStarted] = useState(false);
  const [line1Done, setLine1Done] = useState(false);
  const [line2Done, setLine2Done] = useState(false);
  const [line3Done, setLine3Done] = useState(false);
  const [buttonsReady, setButtonsReady] = useState(false);
  const [noClicks, setNoClicks] = useState(0);
  const [noPos, setNoPos] = useState(0);
  const [noScale, setNoScale] = useState(true);

  const noBtnRef = useRef<HTMLButtonElement | null>(null);
  const burstRef = useRef<PixelBurstHandle | null>(null);

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

  const handleOpen = async (e: RMouseEvent<HTMLButtonElement>) => {
    if (!reduce) {
      const r = e.currentTarget.getBoundingClientRect();
      const x = r.left + r.width / 2;
      const y = r.top + r.height / 2;
      burstRef.current?.burst(x, y, ["#FFD84A", "#FFF0A0"], 1.5);
      burstRef.current?.burst(x - 60, y - 40, ["#FF7BD5", "#FFB3EA"], 1);
      burstRef.current?.burst(x + 60, y - 30, ["#40F0D0", "#A0FFEA"], 1);
    }
    await tryMusic();
    goToScene(2, 300);
  };

  const onNoAttempt = useCallback(() => {
    setNoScale(false);
    window.setTimeout(() => setNoScale(true), 80);
    const b = noBtnRef.current?.getBoundingClientRect();
    if (b && !reduce) {
      burstRef.current?.burst(b.left + b.width / 2, b.top + b.height / 2, ["#ff9cc2", "#ffd1e3"], 0.5);
    }
    setNoClicks((c) => {
      const next = c + 1;
      if (next >= 10) {
        setNoPos((p) => (p + 1) % NO_POSITIONS.length);
      } else {
        setNoPos(next % NO_POSITIONS.length);
      }
      return next;
    });
  }, [reduce]);

  const raw = NO_POSITIONS[noPos] ?? NO_POSITIONS[0];
  const pos = {
    x: clampPX(raw.x, 70),
    y: clampPX(raw.y, 70),
  };
  const crazyScale = noClicks >= 10 ? 0.88 + hash01(noClicks) * 0.12 : 1;

  const lineBase = (shown: boolean, dy: number) => ({
    opacity: shown ? 1 : 0,
    transform: shown ? "translateY(0)" : `translateY(${dy}px)`,
    transition: "opacity 700ms ease, transform 700ms ease",
  });

  return (
    <section className={`scene-layer ${active ? "scene-active" : "scene-hidden"}`} aria-hidden={!active}>
      <style>{`
        @keyframes twBlink { 0%, 100% { opacity: 0.2; } 50% { opacity: 1; } }
        @keyframes opBob { 0%,100% { translate: 0 0; } 50% { translate: 0 -6px; } }
      `}</style>

      {active && <PixelBurstLayer ref={burstRef} />}

      <div className="relative z-10 w-full max-w-md mx-auto flex flex-col items-center justify-center text-center gap-5 px-2">
        {/* stiker kertas dekoratif */}
        <div className="relative w-full" style={{ height: 0 }} aria-hidden>
          <PaperSticker
            kind="star"
            color="#FFD84A"
            size={38}
            rotate={-14}
            style={{ left: "2%", top: -46, opacity: started ? 1 : 0, transition: "opacity 900ms ease 400ms", animation: reduce ? undefined : "opBob 4.2s ease-in-out infinite" }}
          />
          <PaperSticker
            kind="heart"
            color="#ff7fae"
            size={34}
            rotate={12}
            style={{ right: "4%", top: -36, opacity: started ? 1 : 0, transition: "opacity 900ms ease 700ms", animation: reduce ? undefined : "opBob 5s ease-in-out 1s infinite" }}
          />
        </div>

        <SceneLabel visible={started}>Sebuah kejutan kecil</SceneLabel>

        <div className="flex flex-col gap-4 min-h-[170px] items-center justify-center" style={{ maxWidth: "100%" }}>
          <div style={lineBase(started, 16)}>
            <PaperNote rotate={-2.2} tone="cream" tapeColor="pink" seed={1} innerStyle={{ padding: "10px 18px 8px" }}>
              <p style={{ margin: 0, fontFamily: FONT_HAND, fontSize: "clamp(20px, 6vw, 26px)", lineHeight: 1.25 }}>
                <TypedLine full={birthdayConfig.introLine1} display={tw1.display} cursor={started && !tw1.done} />
              </p>
            </PaperNote>
          </div>
          <div style={lineBase(line1Done, 16)}>
            <PaperNote rotate={1.8} tone="kraft" tapeColor="gold" seed={2} innerStyle={{ padding: "8px 18px 7px" }}>
              <p style={{ margin: 0, fontFamily: FONT_HAND, fontSize: "clamp(18px, 5.4vw, 24px)", lineHeight: 1.25 }}>
                <TypedLine full={birthdayConfig.introLine2} display={tw2.display} cursor={line1Done && !tw2.done} />
              </p>
            </PaperNote>
          </div>
          <div style={lineBase(line2Done, 22)}>
            <PaperNote rotate={-1} tone="navy" tapeColor="blue" seed={3} innerStyle={{ padding: "12px 20px 10px" }}>
              <p style={{ margin: 0, fontFamily: FONT_HAND, fontSize: "clamp(22px, 6.8vw, 30px)", lineHeight: 1.25 }}>
                <TypedLine full={birthdayConfig.introLine3} display={tw3.display} cursor={line2Done && !tw3.done} />
              </p>
            </PaperNote>
          </div>
        </div>

        <div
          className="relative w-full h-[240px] sm:h-[260px] transition-opacity duration-700"
          style={{ opacity: buttonsVisible ? 1 : 0, pointerEvents: buttonsVisible ? "auto" : "none" }}
        >
          <div className="absolute top-0 left-0 right-0 flex flex-col items-center gap-3">
            <PaperButton variant="primary" seed={2} onClick={handleOpen} aria-label="Open your birthday surprise gift">
              OPEN YOUR SURPRISE 🎁
            </PaperButton>

            <div className="h-10 flex items-center justify-center">
              <p
                className="animate-fade-in"
                style={{ margin: 0, fontFamily: FONT_LED, fontSize: 12, letterSpacing: "0.08em", color: THEME.gold }}
              >
                {playfulMessage}
              </p>
            </div>
          </div>

          <div
            className="absolute left-1/2 top-[120px] transition-transform duration-[420ms]"
            style={{
              transform: `translateX(calc(-50% + ${pos.x}px)) translateY(${pos.y}px) scale(${noScale ? crazyScale : crazyScale * 0.9})`,
              transitionTimingFunction: "cubic-bezier(0.34, 1.56, 0.64, 1)",
            }}
          >
            <PaperButton
              ref={noBtnRef}
              variant="secondary"
              seed={5}
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
            </PaperButton>
          </div>
        </div>
      </div>

      <div className="vignette" />
    </section>
  );
}