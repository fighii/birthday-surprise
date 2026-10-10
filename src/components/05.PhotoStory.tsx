import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useStory } from "../context/StoryContext";
import { photos as photoFallback, photoStoryPhotos as storyPhotoList } from "../config/media.js";
import { FONT_LED, THEME } from "../config/sceneTheme";
import { PaperNote, hash01 } from "./PaperCutout";
import { PaperButton, PaperFrame } from "./PaperExtras";
import AssetImage from "./AssetImage";
import { assetUrl } from "../lib/assets";

const SEGMENT_DURATION = 2000;
const PROGRESS_STEPS = 10; // progres bergerak per kotak (pixel), bukan mulus
const FADE_MS = 700;

// Progres story. Segmen aktif dianimasikan murni lewat CSS (steps) -> tidak ada setState per tick,
// jadi foto + bingkai tidak ikut dirender ulang tiap 60 ms seperti sebelumnya.
const ProgressBar = memo(function ProgressBar({ count, index }: { count: number; index: number }) {
  return (
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
      {Array.from({ length: count }).map((_, i) => {
        const done = i < index;
        const current = i === index;
        return (
          <div key={i} style={{ flex: 1, height: 5, background: "rgba(255,200,222,0.2)" }}>
            <div
              key={current ? `cur-${index}` : done ? "done" : "todo"}
              style={{
                width: done ? "100%" : 0,
                height: "100%",
                background: THEME.rose,
                boxShadow: done || current ? `0 0 6px ${THEME.rose}` : "none",
                animation: current ? `psFill ${SEGMENT_DURATION}ms steps(${PROGRESS_STEPS}, end) forwards` : undefined,
              }}
            />
          </div>
        );
      })}
    </div>
  );
});

interface SlideProps {
  src: string;
  i: number;
  count: number;
  onScreen: boolean;
  failed: boolean;
  onFail: (i: number) => void;
}

// Satu slide. Memo + hanya dirender saat aktif / sedang memudar keluar (maks 2 sekaligus).
const StorySlide = memo(function StorySlide({ src, i, count, onScreen, failed, onFail }: SlideProps) {
  const fallback = src.startsWith("#fallback-");
  const broken = fallback || failed;
  const rot = (hash01(i * 7 + 3) - 0.5) * 7;
  return (
    <div
      className="absolute inset-0"
      style={{
        // slide lama tetap opaque sampai slide baru selesai fade-in (tanpa "lubang" gelap di tengah)
        opacity: 1,
        zIndex: onScreen ? 2 : 0,
        pointerEvents: onScreen ? "auto" : "none",
        animation: onScreen ? `psIn ${FADE_MS}ms ease both` : undefined,
        willChange: "opacity",
      }}
    >
      {/* latar buram dari foto itu sendiri: filter saturate/brightness diganti lapisan gelap (lebih murah) */}
      {!broken && (
        <AssetImage
          src={src}
          alt=""
          aria-hidden
          decoding="async"
          className="absolute inset-0 w-full h-full"
          style={{
            objectFit: "cover",
            filter: "blur(18px)",
            transform: "scale(1.15)",
          }}
        />
      )}
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.55)" }} />
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20" />

      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{ padding: "4.2rem 1rem 6.5rem" }}
      >
        {broken ? (
          <PaperNote rotate={rot} tone="cream" tapeColor="pink" seed={i + 2} innerStyle={{ padding: "26px 34px" }}>
            <p className="text-romantic" style={{ margin: 0, fontSize: 30 }}>
              Memory {i + 1} ❤️
            </p>
          </PaperNote>
        ) : (
          <PaperFrame seed={i + 3} rotate={rot} tapeColor={(["pink", "gold", "blue"] as const)[i % 3]} caption={`♥ ${i + 1} ♥`}>
            <AssetImage
              src={src}
              alt={`Story ${i + 1}`}
              loading="eager"
              decoding="async"
              onFail={() => onFail(i)}
              draggable={false}
              style={{
                display: "block",
                width: "auto",
                height: "auto",
                maxWidth: "calc(min(86vw, 440px) - 20px)",
                maxHeight: "calc(100svh - 14rem)",
                margin: "0 auto",
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
});

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
  const [leaving, setLeaving] = useState<number | null>(null);
  const [errored, setErrored] = useState<Record<number, boolean>>({});
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const indexRef = useRef(0);
  const lastIdxRef = useRef(0);
  const leavingRef = useRef(false);

  const markErr = useCallback((i: number) => setErrored((e) => (e[i] ? e : { ...e, [i]: true })), []);

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
    lastIdxRef.current = 0;
    leavingRef.current = false;
    setIndex(0);
    setLeaving(null);
  }, [active]);

  // slide lama dipertahankan sebentar sebagai latar saat slide baru fade-in, lalu dibuang dari DOM
  useEffect(() => {
    if (!active) return;
    if (lastIdxRef.current === index) return;
    setLeaving(lastIdxRef.current);
    lastIdxRef.current = index;
    const t = window.setTimeout(() => setLeaving(null), FADE_MS + 60);
    return () => window.clearTimeout(t);
  }, [index, active]);

  // auto-lanjut: satu setTimeout per slide (sebelumnya setInterval 60 ms + setState)
  useEffect(() => {
    if (!active) return;
    const t = window.setTimeout(goNext, SEGMENT_DURATION);
    return () => window.clearTimeout(t);
  }, [index, active, goNext]);

  // pra-muat foto berikutnya supaya fade-in tidak menunggu decode
  useEffect(() => {
    if (!active) return;
    const nxt = photos[index + 1];
    if (nxt && !nxt.startsWith("#fallback-")) {
      const im = new Image();
      im.decoding = "async";
      im.src = assetUrl(nxt);
    }
  }, [index, active, photos]);

  const shown = leaving !== null && leaving !== index ? [leaving, index] : [index];

  return (
    <section
      className={`scene-layer ${active ? "scene-active" : "scene-hidden"}`}
      aria-hidden={!active}
      style={{ padding: 0 }}
    >
      <style>{`
        @keyframes psIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes psFill { from { width: 0; } to { width: 100%; } }
      `}</style>

      <div className="relative w-full h-[100svh]">
        <ProgressBar count={count} index={index} />

        <div
          className="absolute inset-0 select-none"
          onClick={onTap}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          role="region"
          aria-label="Photo story, tap right side to go next"
        >
          {/* hemat memori iPhone: hanya slide aktif (+ slide yang sedang memudar) yang ada di DOM */}
          {active &&
            shown.map((i) => (
              <StorySlide
                key={i}
                src={photos[i] as string}
                i={i}
                count={count}
                onScreen={i === index}
                failed={!!errored[i]}
                onFail={markErr}
              />
            ))}
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