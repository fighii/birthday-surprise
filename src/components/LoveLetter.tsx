import { useEffect, useMemo, useState } from "react";
import { useStory } from "../context/StoryContext";
import { birthdayConfig } from "../config/birthdayConfig.js";

export default function LoveLetter() {
  const { currentScene, goToScene } = useStory();
  const active = currentScene === 7;
  const [open, setOpen] = useState(false);
  const [revealIdx, setRevealIdx] = useState(0);
  const [phase, setPhase] = useState(0);
  const paragraphs = useMemo(
    () => (birthdayConfig.loveLetter || "").split("\n\n").map((p) => p.trim()).filter(Boolean),
    [],
  );

  useEffect(() => {
    if (!active) return;
    setOpen(false);
    setRevealIdx(0);
    setPhase(0);
    const t1 = window.setTimeout(() => setPhase(1), 400);
    return () => window.clearTimeout(t1);
  }, [active]);

  // reveal paragraphs progressively
  useEffect(() => {
    if (!open || revealIdx >= paragraphs.length) return;
    const delay = Math.max(650, Math.min(1600, paragraphs[revealIdx]?.length * 22 || 900));
    const t = window.setTimeout(() => setRevealIdx((i) => i + 1), delay);
    return () => window.clearTimeout(t);
  }, [open, revealIdx, paragraphs]);

  useEffect(() => {
    if (!active || !open) return;
    if (revealIdx < paragraphs.length) return;
    const t = window.setTimeout(() => goToScene(8, 400), 4200);
    return () => window.clearTimeout(t);
  }, [active, open, revealIdx, paragraphs.length, goToScene]);

  return (
    <section
      className={`scene-layer ${active ? "scene-active" : "scene-hidden"}`}
      aria-hidden={!active}
    >
      <div className="relative z-10 w-full max-w-xl mx-auto flex flex-col items-center gap-6 px-4 text-center">
        <p
          className={`text-romantic text-3xl sm:text-4xl text-cinematic-gold transition-all duration-[900ms] ${
            phase >= 1 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"
          }`}
        >
          {birthdayConfig.loveLetterTitle}
        </p>

        {!open ? (
          <div
            className={`transition-all duration-[900ms] ${
              phase >= 1 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
            }`}
          >
            <div
              className={`envelope`}
              onClick={() => setOpen(true)}
              role="button"
              tabIndex={0}
              aria-label="Open the love letter envelope"
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setOpen(true);
                }
              }}
            >
              <div className="envelope-body" />
              <div className="envelope-letter">{birthdayConfig.loveLetterGreeting}</div>
              <div className="envelope-flap" />
              <div className="envelope-seal">❤</div>
            </div>
            <p className="mt-4 text-cinematic-soft/70 text-sm">Tap the envelope to open</p>
          </div>
        ) : (
          <div
            className={`w-full glass p-5 sm:p-8 text-left transition-all duration-[800ms] hide-scrollbar ${
              open ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
            }`}
            style={{
              maxWidth: 520,
              maxHeight: "calc(100svh - max(8rem, env(safe-area-inset-top)) - max(3rem, env(safe-area-inset-bottom)))",
              overflowY: "auto",
              WebkitOverflowScrolling: "touch",
            }}
          >
            <p className="text-romantic text-3xl sm:text-4xl text-cinematic-gold text-center mb-5 leading-tight">
              {birthdayConfig.loveLetterGreeting}
            </p>
            <div className="space-y-4 pr-1">
              {paragraphs.map((p, i) => (
                <p
                  key={i}
                  className="text-serif italic text-cinematic-soft/90 leading-relaxed text-[15px] sm:text-lg transition-all duration-[900ms]"
                  style={{
                    opacity: i < revealIdx ? 1 : 0,
                    transform: i < revealIdx ? "translateY(0)" : "translateY(8px)",
                  }}
                >
                  {p}
                </p>
              ))}
            </div>

            {revealIdx >= paragraphs.length && (
              <div className="mt-8 mb-4 flex justify-end sticky bottom-0">
                <button className="btn-secondary" onClick={() => goToScene(8, 300)}>
                  Continue →
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="vignette" />
    </section>
  );
}
