import { useCallback, useEffect, useRef, useState } from "react";
import { useStory } from "../context/StoryContext";
import { birthdayConfig } from "../config/birthdayConfig.js";
import { WISH_PALETTE } from "../config/sceneTheme";
import PolaroidStack from "./PolaroidStack";
import { CutoutText, PaperNote, PaperSticker } from "./PaperCutout";
import { PixelBurstLayer, usePrefersReducedMotion } from "./PaperExtras";
import type { PixelBurstHandle } from "./PaperExtras";

export default function BirthdayScene() {
  const { currentScene, goToScene } = useStory();
  const active = currentScene === 3;
  const reduce = usePrefersReducedMotion();
  const [phase, setPhase] = useState(0);
  const [isAutoAdvanceReady, setIsAutoAdvanceReady] = useState(false);
  const burstRef = useRef<PixelBurstHandle | null>(null);

  useEffect(() => {
    if (!active) return;
    setPhase(0);
    setIsAutoAdvanceReady(false);
    const t1 = window.setTimeout(() => setPhase(1), 500);
    const t2 = window.setTimeout(() => setPhase(2), 1400);
    const t3 = window.setTimeout(() => setPhase(3), 2300);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
    };
  }, [active]);

  const onPolaroidComplete = () => {
    setIsAutoAdvanceReady(true);
  };

  useEffect(() => {
    if (!active || !isAutoAdvanceReady) return;
    const t = window.setTimeout(() => goToScene(4, 400), 900);
    return () => window.clearTimeout(t);
  }, [active, isAutoAdvanceReady, goToScene]);

  // setiap kartu mendarat -> percikan kembang api pixel kecil
  const onLand = useCallback(
    (info: { x: number; y: number; index: number }) => {
      if (reduce) return;
      burstRef.current?.burst(info.x, info.y, WISH_PALETTE[info.index % WISH_PALETTE.length], 0.7);
    },
    [reduce],
  );

  const fade = (on: boolean, dy: number) => ({
    opacity: on ? 1 : 0,
    transform: on ? "translateY(0)" : `translateY(${dy}px)`,
    transition: "opacity 900ms ease, transform 900ms ease",
  });

  return (
    <section
      className={`scene-layer ${active ? "scene-active" : "scene-hidden"}`}
      aria-hidden={!active}
      style={{ justifyContent: "flex-start", paddingTop: "max(3rem, env(safe-area-inset-top))" }}
    >
      {active && <PixelBurstLayer ref={burstRef} zIndex={30} />}

      <div
        className="relative w-full max-w-xl mx-auto flex flex-col items-center text-center gap-3 px-3 pt-4 pointer-events-none select-none"
        style={{
          zIndex: 1,
          position: "relative",
          paddingBottom: "0.5rem",
        }}
      >
        <PaperSticker
          kind="star"
          color="#FFD84A"
          size={30}
          rotate={-14}
          style={{ left: "3%", top: 0, opacity: phase >= 1 ? 1 : 0, transition: "opacity 900ms ease 400ms" }}
        />
        <PaperSticker
          kind="heart"
          color="#ff7fae"
          size={28}
          rotate={12}
          style={{ right: "4%", top: 4, opacity: phase >= 1 ? 1 : 0, transition: "opacity 900ms ease 600ms" }}
        />

        <h1 style={{ margin: 0 }}>
          <CutoutText
            text={birthdayConfig.birthdayMessage}
            fontSize="clamp(28px, 8.6vw, 40px)"
            seed={11}
            show={phase >= 1}
            stagger={45}
            reduce={reduce}
          />
        </h1>

        <div style={fade(phase >= 2, 16)}>
          <PaperNote rotate={-1.2} tone="cream" tape={false} seed={6} innerStyle={{ padding: "6px 16px 5px" }}>
            <p className="text-serif italic" style={{ margin: 0, fontSize: 14, lineHeight: 1.3 }}>
              {birthdayConfig.birthdaySubtext}
            </p>
          </PaperNote>
        </div>

        <CutoutText
          text={birthdayConfig.polaroidLine}
          fontSize="clamp(15px, 4.4vw, 20px)"
          seed={4}
          show={phase >= 3}
          stagger={22}
          reduce={reduce}
        />
      </div>

      <div className="w-full flex-1 flex items-center justify-center" style={{ marginTop: "0.25rem", zIndex: 2, position: "relative" }}>
        <PolaroidStack onComplete={onPolaroidComplete} active={active} onLand={onLand} />
      </div>

      <div className="vignette" />
    </section>
  );
}