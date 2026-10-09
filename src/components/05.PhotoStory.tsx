import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useStory } from "../context/StoryContext";
import { photos as photoFallback, photoStoryPhotos as storyPhotoList } from "../config/media.js";
import { FONT_LED, THEME } from "../config/sceneTheme";
import { PaperNote, hash01 } from "./PaperCutout";
import { PaperButton, PaperFrame } from "./PaperExtras";
import AssetImage from "./AssetImage";

const SEGMENT_DURATION = 2000;
const PROGRESS_STEPS = 20; // progres bergerak per kotak (pixel), bukan mulus

export default function PhotoStory() {
  const { currentScene, goToScene } = useStory();
  const active = currentScene === 5;
  const photos = useMemo(() => {
    const specific = (storyPhotoList || []).filter((p: string) => typeof p === "string" && p.length > 0);
    if (specific.length > 0) return specific;
    const arr = (photoFallback || []).filter((p: string) => typeof p === "string" && p.length > 0);
    return arr.length > 0 ? arr : Array.from({ length: 5 }).map((_, i) => `#fallback-${i}`);
  }, []);
  const count = photos.length;

  const [index, setIndex] = useState(0);
  const [errored, setErrored] = useState<Record<number, boolean>>({});
  const [progress, setProgress] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const progTimer = useRef<number | null>(null);
  const progStart = useRef<number>(0);

  const indexRef = useRef(0);
  const leavingRef = useRef(false);

  const goNext = useCallback(() => {
    if (indexRef.current >= count - 1) {
      if (!leavingRef.current) {
        leavingRef.current = true;
        window.setTimeout(() => goToScene(6, 300), 400);
      }
      return;
    }
    indexRef.current += 1;
    setIndex(indexRef.current);
  }, [count, goToScene]);

  const goPrev = useCallback(() => {
    indexRef.current = Math.max(0, indexRef.current - 1);
    setIndex(indexRef.current);
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
    indexRef.current = 0;
    leavingRef.current = false;
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
      setProgress((prev) => (p < 100 && Math.floor(prev / PROGRESS_STEPS) === Math.floor(p / PROGRESS_STEPS) ? prev : p));
      if (elapsed >= SEGMENT_DURATION) {
        if (progTimer.current) window.clearInterval(progTimer.current);
        goNext();
      }
    }, 60);
    return () => {
      if (progTimer.current) window.clearInterval(progTimer.current);
    };
  }, [index, active, goNext]);

  const quantized = Math.floor((progress / 100) * PROGRESS_STEPS) * (100 / PROGRESS_STEPS);

  return (
    <section
      className={`scene-layer ${active ? "scene-active" : "scene-hidden"}`}
      aria-hidden={!active}
      style={{ padding: 0 }}
    >
      <div className="relative w-full h-[100svh]">
        {/* progres story: segmen LED kotak */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            top: "max(0.75rem, env(safe-area-inset-top))",
            left: 12,
            right: 12,
            display: "flex",
            gap: 4,
            zIndex: 30,
          }}
        >
          {photos.map((_, i) => {
            const w = i < index ? 100 : i === index ? quantized : 0;
            return (
              <div key={i} style={{ flex: 1, height: 5, background: "rgba(255,200,222,0.2)" }}>
                <div
                  style={{
                    width: `${w}%`,
                    height: "100%",
                    background: THEME.rose,
                    boxShadow: w > 0 ? `0 0 6px ${THEME.rose}` : "none",
                    transition: "width 120ms steps(2, end)",
                  }}
                />
              </div>
            );
          })}
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
            // hemat memori iPhone: hanya render foto aktif + tetangganya
            if (Math.abs(i - index) > 1) return null;
            const onScreen = i === index;
            const fallback = typeof src === "string" && src.startsWith("#fallback-");
            const hasError = errored[i];
            const rot = (hash01(i * 7 + 3) - 0.5) * 7;
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
                {/* latar buram dari foto itu sendiri */}
                {!(fallback || hasError) && (
                  <AssetImage
                    src={src as string}
                    alt=""
                    aria-hidden
                    className="absolute inset-0 w-full h-full"
                    style={{
                      objectFit: "cover",
                      filter: "blur(26px) saturate(150%) brightness(0.42)",
                      transform: "scale(1.18)",
                    }}
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/30" />

                <div
                  className="absolute inset-0 flex items-center justify-center"
                  style={{
                    padding: "4.2rem 1rem 6.5rem",
                    transform: onScreen ? "scale(1)" : "scale(1.06)",
                    transition: "transform 700ms ease-out",
                  }}
                >
                  {fallback || hasError ? (
                    <PaperNote rotate={rot} tone="cream" tapeColor="pink" seed={i + 2} innerStyle={{ padding: "26px 34px" }}>
                      <p className="text-romantic" style={{ margin: 0, fontSize: 30 }}>
                        Memory {i + 1} ❤️
                      </p>
                    </PaperNote>
                  ) : (
                    <PaperFrame seed={i + 3} rotate={rot} tapeColor={(["pink", "gold", "blue"] as const)[i % 3]} caption={`♥ ${i + 1} ♥`}>
                      <AssetImage
                        src={src as string}
                        alt={`Story ${i + 1}`}
                        loading={i === index ? "eager" : "lazy"}
                        decoding="async"
                        onFail={() => setErrored((e) => ({ ...e, [i]: true }))}
                        draggable={false}
                        style={{
                          display: "block",
                          width: "auto",
                          height: "auto",
                          maxWidth: "calc(min(86vw, 440px) - 20px)",
                          maxHeight: "calc(100svh - 14rem)",
                          margin: "0 auto",
                          filter: "saturate(1.05) contrast(1.02) sepia(0.05)",
                        }}
                      />
                    </PaperFrame>
                  )}
                </div>

                <div
                  className="absolute left-4 right-4 text-center"
                  style={{
                    bottom: "max(1.25rem, env(safe-area-inset-bottom))",
                    fontFamily: FONT_LED,
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: "0.16em",
                    color: THEME.labelText,
                  }}
                >
                  {count > 1 ? (
                    <>
                      <span style={{ color: THEME.spark }}>✦</span> {i + 1} / {count} <span style={{ color: THEME.spark }}>✦</span>
                    </>
                  ) : (
                    ""
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="absolute right-4 z-30" style={{ bottom: "max(3.5rem, env(safe-area-inset-bottom))" }}>
          <PaperButton
            variant="secondary"
            seed={4}
            onClick={(e) => {
              e.stopPropagation();
              goToScene(6, 250);
            }}
            style={{ transform: "scale(0.85)", transformOrigin: "bottom right" }}
          >
            Skip to timeline →
          </PaperButton>
        </div>
      </div>
    </section>
  );
}