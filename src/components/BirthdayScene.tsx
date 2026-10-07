import { useEffect, useRef, useState } from "react";
import { useStory } from "../context/StoryContext";
import { birthdayConfig } from "../config/birthdayConfig.js";
import PolaroidStack from "./PolaroidStack";

export default function BirthdayScene() {
  const { currentScene, goToScene, markPolaroidDone } = useStory();
  const active = currentScene === 3;
  const [phase, setPhase] = useState(0);
  const [isAutoAdvanceReady, setIsAutoAdvanceReady] = useState(false);

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
    markPolaroidDone();
    setIsAutoAdvanceReady(true);
  };

  useEffect(() => {
    if (!active || !isAutoAdvanceReady) return;
    const t = window.setTimeout(() => goToScene(4, 400), 900);
    return () => window.clearTimeout(t);
  }, [active, isAutoAdvanceReady, goToScene]);

  return (
    <section
      className={`scene-layer ${active ? "scene-active" : "scene-hidden"}`}
      aria-hidden={!active}
      style={{ justifyContent: "flex-start", paddingTop: "max(3rem, env(safe-area-inset-top))" }}
    >
      <div
        className="relative w-full max-w-xl mx-auto flex flex-col items-center text-center gap-3 px-3 pt-4 pointer-events-none select-none"
        style={{
          zIndex: 1,
          position: "relative",
          background:
            "linear-gradient(to bottom, rgba(10,6,18,0.0) 0%, rgba(10,6,18,0.0) 24%, rgba(10,6,18,0.9) 70%, rgba(10,6,18,0.98) 100%)",
          WebkitMaskImage:
            "linear-gradient(to bottom, #000 0%, #000 78%, rgba(0,0,0,0.2) 90%, transparent 100%)",
          maskImage:
            "linear-gradient(to bottom, #000 0%, #000 78%, rgba(0,0,0,0.2) 90%, transparent 100%)",
          paddingBottom: "2.2rem",
        }}
      >
        <h1
          className={`text-3xl sm:text-4xl md:text-5xl text-white transition-all duration-[900ms] pointer-events-auto ${
            phase >= 1 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"
          }`}
        >
          <span className="text-romantic text-cinematic-gold" style={{ fontSize: "1.3em" }}>
            {birthdayConfig.birthdayMessage}
          </span>
        </h1>
        <p
          className={`text-cinematic-soft/80 text-base sm:text-lg transition-all duration-[900ms] pointer-events-auto ${
            phase >= 2 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          {birthdayConfig.birthdaySubtext}
        </p>
        <p
          className={`text-romantic text-2xl sm:text-3xl text-cinematic-love transition-all duration-[900ms] pointer-events-auto ${
            phase >= 3 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"
          }`}
        >
          {birthdayConfig.polaroidLine}
        </p>
      </div>

      <div className="w-full flex-1 flex items-center justify-center" style={{ marginTop: "-3.5rem", zIndex: 2, position: "relative" }}>
        <PolaroidStack onComplete={onPolaroidComplete} active={active} />
      </div>

      <div className="vignette" />
    </section>
  );
}
