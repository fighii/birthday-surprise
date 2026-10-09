import { useEffect, useRef, useState } from "react";
import { useStory } from "../context/StoryContext";
import { birthdayConfig } from "../config/birthdayConfig.js";
import { WISH_PALETTE } from "../config/sceneTheme";
import { CutoutText, PaperSticker } from "./PaperCutout";
import { PaperButton, PixelBurstLayer, PixelHeart, usePrefersReducedMotion } from "./PaperExtras";
import type { PixelBurstHandle } from "./PaperExtras";
import SceneLabel from "./SceneLabel";

// ukuran huruf per baris: pembuka & penutup besar, baris tengah lebih kecil
const LINE_SIZES = ["clamp(40px, 13vw, 64px)", "clamp(26px, 8.4vw, 40px)", "clamp(40px, 13vw, 64px)"];

export default function BuildUp() {
  const { currentScene, goToScene } = useStory();
  const active = currentScene === 9;
  const reduce = usePrefersReducedMotion();
  const [phase, setPhase] = useState(0);
  const [glow, setGlow] = useState(false);
  const lines = birthdayConfig.buildUpLines;
  const burstRef = useRef<PixelBurstHandle | null>(null);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    if (!active) return;
    setPhase(0);
    setGlow(false);
    const t1 = window.setTimeout(() => setPhase(1), 500);
    const t2 = window.setTimeout(() => setPhase(2), 1900);
    const t3 = window.setTimeout(() => setPhase(3), 3300);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
      timers.current.forEach((t) => window.clearTimeout(t));
      timers.current = [];
    };
  }, [active]);

  const onYes = () => {
    if (glow) return;
    setGlow(true);
    if (!reduce) {
      const W = window.innerWidth;
      const H = window.innerHeight;
      const spots: [number, number][] = [
        [0.5, 0.5],
        [0.22, 0.3],
        [0.78, 0.28],
        [0.3, 0.72],
        [0.72, 0.7],
        [0.5, 0.18],
      ];
      spots.forEach(([fx, fy], i) => {
        timers.current.push(
          window.setTimeout(() => burstRef.current?.burst(W * fx, H * fy, WISH_PALETTE[i % WISH_PALETTE.length], 1.3), i * 130),
        );
      });
    }
    timers.current.push(window.setTimeout(() => goToScene(10, 250), 900));
  };

  return (
    <section className={`scene-layer ${active ? "scene-active" : "scene-hidden"}`} aria-hidden={!active}>
      {active && <PixelBurstLayer ref={burstRef} />}

      {/* cahaya rose + hati pixel besar yang muncul saat YES */}
      <div
        className="fixed inset-0 pointer-events-none z-0 transition-all duration-[900ms]"
        style={{
          background: "radial-gradient(circle at 50% 55%, rgba(255,111,170,0.30) 0%, transparent 60%)",
          opacity: glow ? 1 : 0,
        }}
        aria-hidden
      />
      <div
        className="fixed inset-0 pointer-events-none z-0 flex items-center justify-center transition-all duration-[900ms]"
        style={{ opacity: glow ? 0.4 : 0, transform: glow ? "scale(1)" : "scale(0.6)" }}
        aria-hidden
      >
        <PixelHeart size={220} />
      </div>

      <div className="relative z-10 w-full max-w-md mx-auto flex flex-col items-center text-center gap-6 px-4">
        <div className="relative w-full" style={{ height: 0 }} aria-hidden>
          <PaperSticker
            kind="star"
            color="#FFD84A"
            size={34}
            rotate={-14}
            style={{ left: "2%", top: -44, opacity: phase >= 1 ? 1 : 0, transition: "opacity 900ms ease" }}
          />
          <PaperSticker
            kind="heart"
            color="#ff7fae"
            size={30}
            rotate={12}
            style={{ right: "4%", top: -34, opacity: phase >= 2 ? 1 : 0, transition: "opacity 900ms ease" }}
          />
        </div>

        {lines.map((line: string, i: number) => (
          <CutoutText
            key={i}
            text={line}
            fontSize={LINE_SIZES[i % LINE_SIZES.length]}
            seed={i * 3 + 2}
            show={phase >= i + 1}
            stagger={50}
            reduce={reduce}
          />
        ))}

        <div className="h-2" aria-hidden />

        <div
          className="transition-all duration-[900ms]"
          style={{
            opacity: phase >= 3 ? 1 : 0,
            transform: phase >= 3 ? "translateY(0) scale(1)" : "translateY(32px) scale(0.9)",
            pointerEvents: phase >= 3 ? "auto" : "none",
          }}
        >
          <PaperButton variant="primary" seed={2} onClick={onYes} aria-label="Yes, reveal the final surprise">
            {birthdayConfig.buildUpButton}
          </PaperButton>
        </div>

        <SceneLabel visible={phase >= 3 && !glow}>Siap?</SceneLabel>
      </div>

      <div className="vignette" />
    </section>
  );
}
