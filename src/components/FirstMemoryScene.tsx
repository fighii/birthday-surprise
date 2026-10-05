import { useEffect, useMemo, useState } from "react";
import { useStory } from "../context/StoryContext";
import { birthdayConfig } from "../config/birthdayConfig.js";
import { photos as photoFallback, firstMemoryPhoto as firstMemoryList } from "../config/media.js";

export default function FirstMemoryScene() {
  const { currentScene, goToScene } = useStory();
  const active = currentScene === 3;
  const [phase, setPhase] = useState(0);
  const [errored, setErrored] = useState(false);

  const photo = useMemo(() => {
    const specific = (firstMemoryList || []).filter((p: string) => typeof p === "string" && p.length > 0);
    if (specific.length > 0) return specific[0];
    const fallback = (photoFallback || []).filter((p: string) => typeof p === "string" && p.length > 0);
    return fallback.length > 0 ? fallback[0] : null;
  }, []);

  useEffect(() => {
    if (!active) return;
    setPhase(0);
    const t1 = window.setTimeout(() => setPhase(1), 500);
    const t2 = window.setTimeout(() => setPhase(2), 1500);
    const t3 = window.setTimeout(() => setPhase(3), 5500);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
    };
  }, [active]);

  useEffect(() => {
    if (!active || phase < 3) return;
    const t = window.setTimeout(() => goToScene(4, 300), 1500);
    return () => window.clearTimeout(t);
  }, [active, phase, goToScene]);

  const hasPhoto = photo && !errored;

  return (
    <section
      className={`scene-layer ${active ? "scene-active" : "scene-hidden"}`}
      aria-hidden={!active}
    >
      <div className="relative z-10 w-full max-w-xl mx-auto flex flex-col items-center text-center gap-4 px-4">
        <p
          className={`text-romantic text-3xl sm:text-4xl text-cinematic-gold transition-all duration-[900ms] ${
            phase >= 1 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          {birthdayConfig.firstMemoryTitle}
        </p>

        <div
          className={`relative transition-all duration-[1400ms] ease-out ${
            phase >= 2 ? "opacity-100 scale-100 blur-0" : "opacity-0 scale-[1.08] blur-sm"
          }`}
          style={{
            width: "min(82vw, 360px)",
            aspectRatio: "3 / 4",
            borderRadius: 16,
            overflow: "hidden",
            boxShadow:
              "0 30px 80px -20px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.06)",
          }}
        >
          {photo && !errored ? (
            <>
              <img
                src={photo}
                alt=""
                aria-hidden
                className="absolute inset-0 w-full h-full"
                style={{
                  objectFit: "cover",
                  filter: "blur(18px) saturate(140%) brightness(0.7)",
                  transform: "scale(1.15)",
                }}
                onError={() => setErrored(true)}
              />
              <img
                src={photo}
                alt="First memory"
                loading="eager"
                decoding="async"
                onError={() => setErrored(true)}
                className="absolute inset-0 w-full h-full object-contain"
                style={{
                  transform: "scale(1)",
                  animation: "zoomSlow 9s ease-in-out infinite alternate",
                }}
              />
            </>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-cinematic-soft/60 text-romantic text-3xl bg-white/3">
              Your special memory
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/20" />
        </div>

        <p
          className={`text-cinematic-soft/80 max-w-sm transition-all duration-[900ms] ${
            phase >= 2 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
          }`}
        >
          {birthdayConfig.firstMemorySubtext}
        </p>

        <button
          className={`btn-secondary transition-all duration-700 ${
            phase >= 3 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3 pointer-events-none"
          }`}
          onClick={() => goToScene(4, 250)}
          aria-label="Continue to story"
        >
          Continue →
        </button>
      </div>

      <div className="vignette" />
    </section>
  );
}
