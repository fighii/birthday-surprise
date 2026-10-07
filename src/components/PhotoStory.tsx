import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useStory } from "../context/StoryContext";
import { photos as photoFallback, photoStoryPhotos as storyPhotoList } from "../config/media.js";

const SEGMENT_DURATION = 5000;

export default function PhotoStory() {
  const { currentScene, goToScene } = useStory();
  const active = currentScene === 5;
  const photos = useMemo(() => {
    const specific = (storyPhotoList || []).filter((p: string) => typeof p === "string" && p.length > 0);
    if (specific.length > 0) return specific;
    const arr = (photoFallback || []).filter((p: string) => typeof p === "string" && p.length > 0);
    return arr.length > 0 ? arr : Array.from({ length: Math.min(5, 5) }).map((_, i) => `#fallback-${i}`);
  }, []);
  const count = photos.length;

  const [index, setIndex] = useState(0);
  const [errored, setErrored] = useState<Record<number, boolean>>({});
  const [progress, setProgress] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const progTimer = useRef<number | null>(null);
  const progStart = useRef<number>(0);

  const goNext = useCallback(() => {
    setIndex((i) => {
      if (i >= count - 1) {
        // trigger next scene
        window.setTimeout(() => goToScene(6, 300), 400);
        return i;
      }
      return i + 1;
    });
  }, [count, goToScene]);

  const goPrev = useCallback(() => {
    setIndex((i) => Math.max(0, i - 1));
  }, []);

  const onTap = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const rect = target.getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (x < rect.width * 0.32) goPrev();
    else goNext();
  };

  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStartX.current = t.clientX;
    touchStartY.current = t.clientY;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current == null || touchStartY.current == null) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStartX.current;
    const dy = t.clientY - touchStartY.current;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40) {
      if (dx < 0) goNext();
      else goPrev();
    }
    touchStartX.current = null;
    touchStartY.current = null;
  };

  useEffect(() => {
    if (!active) return;
    setIndex(0);
  }, [active]);

  useEffect(() => {
    if (!active) return;
    if (progTimer.current) window.clearInterval(progTimer.current);
    progStart.current = Date.now();
    setProgress(0);
    progTimer.current = window.setInterval(() => {
      const elapsed = Date.now() - progStart.current;
      const p = Math.min(100, (elapsed / SEGMENT_DURATION) * 100);
      setProgress(p);
      if (elapsed >= SEGMENT_DURATION) {
        if (progTimer.current) window.clearInterval(progTimer.current);
        goNext();
      }
    }, 60);
    return () => {
      if (progTimer.current) window.clearInterval(progTimer.current);
    };
  }, [index, active, goNext]);

  return (
    <section
      className={`scene-layer ${active ? "scene-active" : "scene-hidden"}`}
      aria-hidden={!active}
      style={{ padding: 0 }}
    >
      <div className="relative w-full h-[100svh]">
        <div className="story-progress-bar">
          {photos.map((_, i) => (
            <div key={i} className="story-progress-seg" aria-hidden>
              <span
                style={{
                  width:
                    i < index
                      ? "100%"
                      : i === index
                      ? `${progress}%`
                      : "0%",
                }}
              />
            </div>
          ))}
        </div>

        <div
          className="absolute inset-0 select-none"
          onClick={onTap}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          role="region"
          aria-label="Photo story, tap right side to go next"
        >
          {photos.map((src, i) => {
            const onScreen = i === index;
            const fallback = typeof src === "string" && src.startsWith("#fallback-");
            const hasError = errored[i];
            return (
              <div
                key={i}
                className="absolute inset-0 transition-opacity duration-[700ms]"
                style={{
                  opacity: onScreen ? 1 : 0,
                  pointerEvents: onScreen ? "auto" : "none",
                  zIndex: onScreen ? 2 : 0,
                }}
              >
                {fallback || hasError ? (
                  <div className="absolute inset-0 flex items-center justify-center text-romantic text-4xl text-cinematic-soft/60">
                    Memory {i + 1} ❤️
                  </div>
                ) : (
                  <>
                    <img
                      src={src as string}
                      alt=""
                      aria-hidden
                      className="absolute inset-0 w-full h-full"
                      style={{
                        objectFit: "cover",
                        filter: "blur(24px) saturate(150%) brightness(0.55)",
                        transform: "scale(1.18)",
                      }}
                    />
                    <img
                      src={src as string}
                      alt={`Story ${i + 1}`}
                      loading={i === index ? "eager" : "lazy"}
                      decoding="async"
                      onError={() =>
                        setErrored((e) => ({ ...e, [i]: true }))
                      }
                      className="absolute inset-0 w-full h-full object-contain mx-auto"
                      style={{
                        transform: onScreen ? "scale(1)" : "scale(1.05)",
                        transition: "transform 5s ease-out",
                      }}
                    />
                  </>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/30" />
                <div className="absolute bottom-[max(1.25rem,env(safe-area-inset-bottom))] left-4 right-4 text-center text-cinematic-soft/80 text-sm">
                  {count > 1 ? `${i + 1} / ${count}` : ""}
                </div>
              </div>
            );
          })}
        </div>

        <button
          className="absolute bottom-[max(3.5rem,env(safe-area-inset-bottom))] right-4 btn-secondary z-30"
          onClick={(e) => {
            e.stopPropagation();
            goToScene(6, 250);
          }}
        >
          Skip to timeline →
        </button>
      </div>
    </section>
  );
}
