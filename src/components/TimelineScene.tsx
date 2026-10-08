import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useStory } from "../context/StoryContext";
import { birthdayConfig } from "../config/birthdayConfig.js";
import { photos as photoFallback, timelinePhotos as timelineList, timelineSidePhotos } from "../config/media.js";
import { FONT_HAND, FONT_LED, THEME, WISH_PALETTE } from "../config/sceneTheme";
import { CutoutText, PaperNote, TornPhoto } from "./PaperCutout";
import { PaperButton, PixelBurstLayer, PixelHeart, usePrefersReducedMotion } from "./PaperExtras";
import type { PixelBurstHandle } from "./PaperExtras";
import SceneLabel from "./SceneLabel";
import SidePhotos from "./SidePhotos";

const TONES = ["cream", "pink", "kraft", "cream"] as const;
const TAPES = ["pink", "gold", "blue"] as const;
const hasSide = (timelineSidePhotos || []).some((p: string) => typeof p === "string" && p.length > 0);

export default function TimelineScene() {
  const { currentScene, goToScene } = useStory();
  const active = currentScene === 6;
  const reduce = usePrefersReducedMotion();
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const [titleShown, setTitleShown] = useState(false);
  const items = birthdayConfig.timeline;
  const sectionRef = useRef<HTMLElement | null>(null);
  const [sc, setSc] = useState({ can: false, top: 0, size: 1, atEnd: true });
  const measure = useCallback(() => {
    const el = sectionRef.current;
    if (!el) return;
    const can = el.scrollHeight - el.clientHeight > 8;
    const size = Math.min(1, el.clientHeight / Math.max(1, el.scrollHeight));
    const top = el.scrollTop / Math.max(1, el.scrollHeight);
    const atEnd = el.scrollTop + el.clientHeight >= el.scrollHeight - 8;
    setSc((p) =>
      p.can === can && p.atEnd === atEnd && Math.abs(p.top - top) < 0.002 && Math.abs(p.size - size) < 0.002
        ? p
        : { can, top, size, atEnd },
    );
  }, []);
  useEffect(() => {
    const el = sectionRef.current;
    if (!el || !active) return;
    measure();
    el.addEventListener("scroll", measure, { passive: true });
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    if (el.firstElementChild) ro.observe(el.firstElementChild);
    const t = window.setTimeout(measure, 1200);
    return () => {
      el.removeEventListener("scroll", measure);
      ro.disconnect();
      window.clearTimeout(t);
    };
  }, [active, measure]);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const burstRef = useRef<PixelBurstHandle | null>(null);
  const photos = useMemo(() => {
    const specific = (timelineList || []).filter((p: string) => typeof p === "string" && p.length > 0);
    if (specific.length > 0) return specific;
    return (photoFallback || []).filter((p: string) => typeof p === "string" && p.length > 0);
  }, []);

  useEffect(() => {
    if (!active) return;
    setRevealed(new Set());
    setTitleShown(false);
    const t1 = window.setTimeout(() => setTitleShown(true), 500);
    const timers: number[] = [];
    items.forEach((_, i) => {
      const t = window.setTimeout(() => {
        setRevealed((prev) => {
          const nx = new Set(prev);
          nx.add(i);
          return nx;
        });
        // percikan di simpul hati bila terlihat di layar
        const el = itemRefs.current[i];
        if (el && !reduce) {
          const r = el.getBoundingClientRect();
          if (r.top > 0 && r.top < window.innerHeight - 40) {
            burstRef.current?.burst(r.left + 24, r.top + 28, WISH_PALETTE[i % WISH_PALETTE.length], 0.6);
          }
        }
      }, 900 + i * 520);
      timers.push(t);
    });
    return () => {
      window.clearTimeout(t1);
      timers.forEach((x) => window.clearTimeout(x));
    };
  }, [active, items.length, reduce]);

  // Scene ini TIDAK pindah otomatis: hanya lewat tombol Continue.

  const thumbnailFor = (i: number) => {
    if (photos.length === 0) return null;
    return photos[i % photos.length];
  };

  return (
    <section
      ref={sectionRef}
      className={`scene-layer scene-scrollable ${active ? "scene-active" : "scene-hidden"}`}
      aria-hidden={!active}
      style={{
        justifyContent: "flex-start",
        background: "transparent",
        paddingTop: "max(4.5rem, calc(env(safe-area-inset-top) + 1.25rem))",
        paddingBottom: "max(5rem, calc(env(safe-area-inset-bottom) + 3rem))",
      }}
    >
      {active && <PixelBurstLayer ref={burstRef} />}

      <div
        className="relative z-10 w-full max-w-xl mx-auto px-4 flex flex-col items-center gap-3"
        style={hasSide ? { paddingRight: "clamp(16px, 7vw, 30px)" } : undefined}
      >
        <SidePhotos photos={timelineSidePhotos} visible={titleShown} seed={6} leftPeek={0.4} rightPeek={0.62} />
        <SceneLabel visible={titleShown}>Perjalanan kita</SceneLabel>
        <h2 style={{ margin: 0 }}>
          <CutoutText
            text={birthdayConfig.timelineTitle}
            fontSize="clamp(26px, 8.4vw, 40px)"
            seed={6}
            show={titleShown}
            reduce={reduce}
          />
        </h2>

        <div className="relative w-full mt-6 mb-10">
          {/* garis waktu: titik LED yang memanjang seiring kenangan terbuka */}
          <div
            aria-hidden
            style={{
              position: "absolute",
              left: 22,
              top: 8,
              width: 4,
              height: `calc(${(revealed.size / Math.max(1, items.length)) * 100}% - 8px)`,
              background: `repeating-linear-gradient(to bottom, ${THEME.rose} 0 6px, transparent 6px 12px)`,
              filter: "drop-shadow(0 0 4px rgba(255,93,152,0.65))",
              transition: "height 700ms ease-out",
            }}
          />
          <div className="flex flex-col gap-6">
            {items.map((it, i) => {
              const isOpen = revealed.has(i);
              const thumb = thumbnailFor(i);
              const last = i === items.length - 1;
              return (
                <div
                  key={i}
                  ref={(el) => {
                    itemRefs.current[i] = el;
                  }}
                  className="relative transition-all duration-[900ms]"
                  style={{
                    paddingLeft: 64,
                    opacity: isOpen ? 1 : 0,
                    transform: isOpen ? "translateY(0)" : "translateY(24px)",
                  }}
                >
                  <div className="absolute z-10" style={{ left: 24, top: 14, transform: "translateX(-50%)" }} aria-hidden>
                    <PixelHeart size={22} color={last ? "#FFD84A" : "#ff5d98"} highlight={last ? "#fff6c2" : "#ffd1e3"} />
                  </div>

                  <PaperNote
                    rotate={i % 2 ? 1.2 : -1.2}
                    tone={last ? "navy" : TONES[i % TONES.length]}
                    tapeColor={TAPES[i % TAPES.length]}
                    seed={i + 2}
                    innerStyle={{ padding: "14px 16px 12px" }}
                  >
                    <div className="flex items-start gap-3 text-left">
                      {thumb ? (
                        <TornPhoto
                          src={thumb}
                          width={58}
                          seed={i + 3}
                          tapeColor={TAPES[(i + 1) % TAPES.length]}
                          style={{ position: "relative", flexShrink: 0, transform: `rotate(${i % 2 ? -4 : 4}deg)` }}
                        />
                      ) : (
                        <div style={{ flexShrink: 0, paddingTop: 4 }}>
                          <PixelHeart size={34} />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <h3 style={{ margin: 0, fontFamily: FONT_HAND, fontSize: 24, lineHeight: 1.05 }}>{it.title}</h3>
                        <p className="text-serif italic" style={{ margin: "5px 0 0", fontSize: 14, lineHeight: 1.4, opacity: 0.9 }}>
                          {it.description}
                        </p>
                      </div>
                    </div>
                  </PaperNote>
                </div>
              );
            })}
          </div>
        </div>

        <PaperButton variant="secondary" seed={3} onClick={() => goToScene(7, 250)}>
          Continue →
        </PaperButton>
      </div>

      {/* petunjuk scroll: menempel di bawah layar selama masih ada isi di bawah */}
      <div aria-hidden style={{ position: "sticky", bottom: 0, height: 0, width: "100%", zIndex: 60, pointerEvents: "none", flexShrink: 0 }}>
        <style>{`@keyframes tlBounce{0%,100%{transform:translate(-50%,0)}50%{transform:translate(-50%,4px)}}`}</style>
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: 90,
            background: "linear-gradient(to top, rgba(10,8,34,0.55), rgba(10,8,34,0))",
            opacity: active && sc.can && !sc.atEnd ? 1 : 0,
            transition: "opacity 300ms ease",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: "50%",
            bottom: "calc(env(safe-area-inset-bottom, 0px) + 14px)",
            padding: "6px 14px 5px",
            background: "#fff7ec",
            color: "#8c2f55",
            fontFamily: FONT_LED,
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: "0.14em",
            boxShadow: "1px 2px 0 rgba(0,0,0,0.3), 0 5px 8px rgba(0,0,0,0.35)",
            whiteSpace: "nowrap",
            opacity: active && sc.can && !sc.atEnd ? 1 : 0,
            transition: "opacity 300ms ease",
            animation: "tlBounce 1.1s ease-in-out infinite",
          }}
        >
          ▾ GESER KE BAWAH
        </div>
        {/* rel scroll di tepi kanan */}
        <div
          style={{
            position: "absolute",
            right: 3,
            bottom: "calc(env(safe-area-inset-bottom, 0px) + 70px)",
            width: 4,
            height: "34svh",
            background: "rgba(255,200,222,0.18)",
            opacity: active && sc.can ? 1 : 0,
            transition: "opacity 300ms ease",
          }}
        >
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: `${sc.top * 100}%`,
              height: `${Math.max(sc.size * 100, 10)}%`,
              background: THEME.rose,
              boxShadow: `0 0 5px ${THEME.rose}`,
            }}
          />
        </div>
      </div>
    </section>
  );
}