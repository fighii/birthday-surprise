import { useEffect, useMemo, useRef, useState } from "react";
import { useStory } from "../context/StoryContext";
import { birthdayConfig } from "../config/birthdayConfig.js";
import { photos as photoFallback, timelinePhotos as timelineList } from "../config/media.js";

export default function TimelineScene() {
  const { currentScene, goToScene } = useStory();
  const active = currentScene === 6;
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const [titleShown, setTitleShown] = useState(false);
  const items = birthdayConfig.timeline;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
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
      }, 900 + i * 520);
      timers.push(t);
    });
    return () => {
      window.clearTimeout(t1);
      timers.forEach((x) => window.clearTimeout(x));
    };
  }, [active, items.length]);

  // auto advance after last item
  useEffect(() => {
    if (!active) return;
    if (revealed.size < items.length) return;
    const t = window.setTimeout(() => goToScene(7, 300), 2400);
    return () => window.clearTimeout(t);
  }, [active, revealed.size, items.length, goToScene]);

  const thumbnailFor = (i: number) => {
    if (photos.length === 0) return null;
    return photos[i % photos.length];
  };

  return (
    <section
      className={`scene-layer scene-scrollable ${active ? "scene-active" : "scene-hidden"}`}
      aria-hidden={!active}
      style={{
        justifyContent: "flex-start",
        paddingTop: "max(4.5rem, calc(env(safe-area-inset-top) + 1.25rem))",
        paddingBottom: "max(5rem, calc(env(safe-area-inset-bottom) + 3rem))",
      }}
    >
      <div
        ref={containerRef}
        className="relative z-10 w-full max-w-xl mx-auto px-4 flex flex-col items-center"
      >
        <h2
          className={`text-romantic text-[clamp(2.2rem,10vw,3.2rem)] sm:text-5xl text-cinematic-gold text-center transition-all duration-[900ms] leading-tight ${
            titleShown ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          {birthdayConfig.timelineTitle}
        </h2>

        <div className="relative w-full mt-6 mb-10">
          <div className="timeline-line" aria-hidden />
          <div className="flex flex-col gap-5">
            {items.map((it, i) => {
              const isOpen = revealed.has(i);
              const thumb = thumbnailFor(i);
              return (
                <div
                    key={i}
                    ref={(el) => { itemRefs.current[i] = el; }}
                    className={`relative pl-16 transition-all duration-[900ms] ${
                      isOpen ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
                    }`}
                  >
                  <div
                    className="absolute left-[24px] top-5 -translate-x-1/2 w-4 h-4 rounded-full z-10"
                    style={{
                      background:
                        "linear-gradient(135deg, #ff8aa8 0%, #f7c97e 100%)",
                      boxShadow: "0 0 14px rgba(255, 138, 168, 0.6)",
                    }}
                    aria-hidden
                  />
                  <div className="glass p-4">
                    <div className="flex items-start gap-3">
                      {thumb ? (
                        <div
                          className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0"
                          style={{ boxShadow: "0 6px 16px -6px rgba(0,0,0,0.4)" }}
                        >
                          <img
                            src={thumb}
                            alt=""
                            loading="lazy"
                            decoding="async"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-14 h-14 rounded-lg flex-shrink-0 bg-white/5 flex items-center justify-center text-cinematic-love text-xl">
                          ❤
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <h3 className="text-white text-lg font-medium">{it.title}</h3>
                        <p className="text-cinematic-soft/80 text-sm mt-1 leading-relaxed">
                          {it.description}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <button
          className="btn-secondary"
          onClick={() => goToScene(7, 250)}
        >
          Continue →
        </button>
      </div>

      <div className="vignette" />
    </section>
  );
}
