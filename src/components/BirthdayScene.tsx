import { useEffect, useRef, useState } from "react";
import { useStory } from "../context/StoryContext";
import { birthdayConfig } from "../config/birthdayConfig.js";
import PolaroidStack from "./PolaroidStack";

export default function BirthdayScene() {
  const { currentScene, goToScene, markPolaroidDone, tryAutoStartScene2 } = useStory();
  const active = currentScene === 2;
  const [phase, setPhase] = useState(0);
  const [isAutoAdvanceReady, setIsAutoAdvanceReady] = useState(false);
  const startedRef = useRef(false);

  useEffect(() => {
    if (!active) return;
    setPhase(0);
    setIsAutoAdvanceReady(false);
    const t1 = window.setTimeout(() => setPhase(1), 500);
    const t2 = window.setTimeout(() => setPhase(2), 1400);
    const t3 = window.setTimeout(() => setPhase(3), 2300);
    if (!startedRef.current) {
      startedRef.current = true;
      void tryAutoStartScene2();
    }
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
    };
  }, [active, tryAutoStartScene2]);

  const onPolaroidComplete = () => {
    markPolaroidDone();
    setIsAutoAdvanceReady(true);
  };

  useEffect(() => {
    if (!active || !isAutoAdvanceReady) return;
    const t = window.setTimeout(() => goToScene(3, 400), 900);
    return () => window.clearTimeout(t);
  }, [active, isAutoAdvanceReady, goToScene]);

  return (
    <section
      className={`scene-layer ${active ? "scene-active" : "scene-hidden"}`}
      aria-hidden={!active}
      style={{ justifyContent: "flex-start", paddingTop: "max(3rem, env(safe-area-inset-top))" }}
    >
      <div className="relative z-10 w-full max-w-xl mx-auto flex flex-col items-center text-center gap-3 px-3 pt-4">
        <h1
          className={`text-3xl sm:text-4xl md:text-5xl text-white transition-all duration-[900ms] ${
            phase >= 1 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"
          }`}
        >
          <span className="text-romantic text-cinematic-gold" style={{ fontSize: "1.3em" }}>
            {birthdayConfig.birthdayMessage}
          </span>
        </h1>
        <p
          className={`text-cinematic-soft/80 text-base sm:text-lg transition-all duration-[900ms] ${
            phase >= 2 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          {birthdayConfig.birthdaySubtext}
        </p>
        <p
          className={`text-romantic text-2xl sm:text-3xl text-cinematic-love transition-all duration-[900ms] ${
            phase >= 3 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"
          }`}
        >
          {birthdayConfig.polaroidLine}
        </p>
      </div>

      <div className="w-full flex-1 flex items-center justify-center py-4">
        <PolaroidStack onComplete={onPolaroidComplete} active={active} />
      </div>

      <div className="vignette" />
    </section>
  );
}
