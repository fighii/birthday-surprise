import { useEffect, useState } from "react";
import { useStory } from "../context/StoryContext";
import { birthdayConfig } from "../config/birthdayConfig.js";

export default function BuildUp() {
  const { currentScene, goToScene } = useStory();
  const active = currentScene === 8;
  const [phase, setPhase] = useState(0);
  const [glow, setGlow] = useState(false);
  const lines = birthdayConfig.buildUpLines;

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
    };
  }, [active]);

  const onYes = () => {
    setGlow(true);
    // build up cinematic pause
    window.setTimeout(() => goToScene(9, 250), 900);
  };

  return (
    <section
      className={`scene-layer ${active ? "scene-active" : "scene-hidden"}`}
      aria-hidden={!active}
    >
      <div
        className="fixed inset-0 pointer-events-none z-0 transition-all duration-[900ms]"
        style={{
          background: glow
            ? "radial-gradient(circle at 50% 55%, rgba(255,138,168,0.28) 0%, transparent 60%)"
            : "transparent",
          opacity: glow ? 1 : 0,
        }}
        aria-hidden
      />

      <div className="relative z-10 w-full max-w-md mx-auto flex flex-col items-center text-center gap-6 px-4">
        {lines.map((line, i) => (
          <p
            key={i}
            className={`text-romantic text-4xl sm:text-5xl text-cinematic-gold transition-all duration-[1000ms] ease-out ${
              phase >= i + 1 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
            }`}
            style={{ transitionDelay: `${i * 60}ms` }}
          >
            {line}
          </p>
        ))}

        <div className="h-4" aria-hidden />

        <button
          className={`btn-primary transition-all duration-[900ms] ${
            phase >= 3
              ? "opacity-100 translate-y-0 scale-100"
              : "opacity-0 translate-y-8 scale-90 pointer-events-none"
          }`}
          onClick={onYes}
          aria-label="Yes, reveal the final surprise"
        >
          {birthdayConfig.buildUpButton}
        </button>
      </div>

      <div className="vignette" />
    </section>
  );
}
