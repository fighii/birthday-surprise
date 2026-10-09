import { useEffect, useMemo, useRef, useState } from "react";
import { useStory } from "../context/StoryContext";
import { birthdayConfig } from "../config/birthdayConfig.js";
import { photos as photoFallback, firstMemoryPhoto as firstMemoryList } from "../config/media.js";
import { WISH_PALETTE } from "../config/sceneTheme";
import { CutoutText, PaperNote, PaperSticker } from "./PaperCutout";
import { PaperButton, PaperFrame, PixelBurstLayer, usePrefersReducedMotion } from "./PaperExtras";
import type { PixelBurstHandle } from "./PaperExtras";
import SceneLabel from "./SceneLabel";
import AssetImage from "./AssetImage";

export default function FirstMemoryScene() {
  const { currentScene, goToScene } = useStory();
  const active = currentScene === 4;
  const reduce = usePrefersReducedMotion();
  const [phase, setPhase] = useState(0);
  const [errored, setErrored] = useState(false);
  const burstRef = useRef<PixelBurstHandle | null>(null);

  const photo = useMemo(() => {
    const specific = (firstMemoryList || []).filter((p: string) => typeof p === "string" && p.length > 0);
    if (specific.length > 0) return specific[0];
    const fallback = (photoFallback || []).filter((p: string) => typeof p === "string" && p.length > 0);
    return fallback.length > 0 ? fallback[0] : null;
  }, []);

  useEffect(() => {
    if (!active) return;
    setPhase(0);
    setErrored(false);
    const t1 = window.setTimeout(() => setPhase(1), 500);
    const t2 = window.setTimeout(() => setPhase(2), 1500);
    const t3 = window.setTimeout(() => setPhase(3), 5500);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
    };
  }, [active]);

  // foto muncul -> kembang api pixel kecil di sekitar bingkai
  useEffect(() => {
    if (!active || phase !== 2 || reduce) return;
    const W = window.innerWidth;
    const H = window.innerHeight;
    const spots = [
      [W * 0.2, H * 0.3],
      [W * 0.82, H * 0.34],
      [W * 0.5, H * 0.18],
    ];
    const ids = spots.map(([x, y], i) =>
      window.setTimeout(() => burstRef.current?.burst(x, y, WISH_PALETTE[(i * 2 + 1) % WISH_PALETTE.length], 0.9), i * 260),
    );
    return () => ids.forEach((t) => window.clearTimeout(t));
  }, [active, phase, reduce]);

  // Scene ini TIDAK pindah otomatis: hanya lewat tombol Continue.

  return (
    <section className={`scene-layer ${active ? "scene-active" : "scene-hidden"}`} aria-hidden={!active}>
      <style>{`@keyframes fmZoom{from{transform:scale(1)}to{transform:scale(1.07)}}`}</style>
      {active && <PixelBurstLayer ref={burstRef} />}

      <div className="relative z-10 w-full max-w-xl mx-auto flex flex-col items-center text-center gap-4 px-4">
        <SceneLabel visible={phase >= 1}>Kenangan pertama</SceneLabel>

        <h2 style={{ margin: 0 }}>
          <CutoutText
            text={birthdayConfig.firstMemoryTitle}
            fontSize="clamp(24px, 7.4vw, 36px)"
            seed={5}
            show={phase >= 1}
            reduce={reduce}
          />
        </h2>

        <div
          className="relative transition-all duration-[1400ms] ease-out"
          style={{
            width: "min(82vw, 340px)",
            opacity: phase >= 2 ? 1 : 0,
            transform: phase >= 2 ? "scale(1)" : "scale(1.08)",
            filter: phase >= 2 ? "blur(0)" : "blur(6px)",
          }}
        >
          <PaperSticker
            kind="star"
            color="#FFD84A"
            size={40}
            rotate={-14}
            style={{ left: -16, bottom: 30, zIndex: 3 }}
          />
          <PaperSticker
            kind="heart"
            color="#ff7fae"
            size={36}
            rotate={14}
            style={{ right: -14, bottom: 52, zIndex: 3 }}
          />
          <PaperFrame width="100%" seed={4} rotate={-2} tapeColor="pink" caption="♥ the first one ♥">
            <div style={{ position: "relative", width: "100%", aspectRatio: "3 / 4", overflow: "hidden" }}>
              {photo && !errored ? (
                <>
                  <AssetImage
                    src={photo}
                    alt=""
                    aria-hidden
                    className="absolute inset-0 w-full h-full"
                    style={{
                      objectFit: "cover",
                      filter: "blur(18px) saturate(140%) brightness(0.7)",
                      transform: "scale(1.15)",
                    }}
                  />
                  <AssetImage
                    src={photo}
                    alt="First memory"
                    loading="eager"
                    decoding="async"
                    onFail={() => setErrored(true)}
                    className="absolute inset-0 w-full h-full object-contain"
                    style={{ animation: reduce ? undefined : "fmZoom 9s ease-in-out infinite alternate" }}
                  />
                </>
              ) : (
                <div
                  className="absolute inset-0 flex items-center justify-center"
                  style={{ color: "rgba(255,220,235,0.6)", fontSize: 22 }}
                >
                  {photo ? (
                    <span style={{ fontSize: 12, textAlign: "center", padding: 12, wordBreak: "break-all" }}>
                      Foto tidak ditemukan:
                      <br />
                      {photo}
                    </span>
                  ) : (
                    "Your special memory"
                  )}
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-black/10" />
            </div>
          </PaperFrame>
        </div>

        <div
          className="transition-all duration-[900ms]"
          style={{
            maxWidth: 300,
            opacity: phase >= 2 ? 1 : 0,
            transform: phase >= 2 ? "translateY(0)" : "translateY(12px)",
          }}
        >
          <PaperNote rotate={1.4} tone="cream" tapeColor="gold" seed={7} innerStyle={{ padding: "10px 16px 9px" }}>
            <p className="text-serif italic" style={{ margin: 0, fontSize: 15, lineHeight: 1.4 }}>
              {birthdayConfig.firstMemorySubtext}
            </p>
          </PaperNote>
        </div>

        <div
          className="transition-all duration-700"
          style={{
            opacity: phase >= 3 ? 1 : 0,
            transform: phase >= 3 ? "translateY(0)" : "translateY(12px)",
            pointerEvents: phase >= 3 ? "auto" : "none",
          }}
        >
          <PaperButton variant="secondary" seed={3} onClick={() => goToScene(5, 250)} aria-label="Continue to story">
            Continue →
          </PaperButton>
        </div>
      </div>

      <div className="vignette" />
    </section>
  );
}
