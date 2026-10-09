import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, MouseEvent as RMouseEvent } from "react";
import { useStory } from "../context/StoryContext";
import { birthdayConfig } from "../config/birthdayConfig.js";
import { polaroidPhotos, finalHeartPhotos, easterEggPhotos, easterEggPhotoOptions } from "../config/media.js";
import AssetImage from "./AssetImage";
import StarryBackdrop from "./StarryBackdrop";
import type { StarryBackdropHandle } from "./StarryBackdrop";
import SceneLabel from "./SceneLabel";
import { THEME, WISH_PALETTE } from "../config/sceneTheme";
import { CutoutText, PaperNote, TornPhoto, PaperSticker, hash01 } from "./PaperCutout";
import { usePrefersReducedMotion } from "./PaperExtras";

// Hati pixel-art 9 x 8 (gaya LED seperti teks kembang api)
const HEART = [
  [0, 1, 1, 0, 0, 0, 1, 1, 0],
  [1, 1, 1, 1, 0, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1],
  [0, 1, 1, 1, 1, 1, 1, 1, 0],
  [0, 0, 1, 1, 1, 1, 1, 0, 0],
  [0, 0, 0, 1, 1, 1, 0, 0, 0],
  [0, 0, 0, 0, 1, 0, 0, 0, 0],
];
const ROW_COLORS = ["#ff9cc2", "#ff7fae", "#ff5d98", "#ff5d98", "#f04a88", "#e23d7c", "#d93a78", "#d93a78"];
const GOLD_COLORS = ["#fff0a0", "#ffe46b", "#FFD84A", "#FFD84A", "#ffc933", "#ffb81f", "#ffb81f", "#ffb81f"];

const TAPS_NEEDED = 5;
const EGG_VISIBLE_MS = 7000;
// Nomor scene Final Surprise (BuildUp = 9 -> goToScene(10)). Sesuaikan jika urutan scene kamu berbeda.
const FINAL_SCENE = 10;

// posisi kipas foto di belakang hati (maks 5)
const FAN = [
  { x: -78, y: 22, r: -14, d: 0 },
  { x: 78, y: 18, r: 13, d: 140 },
  { x: 0, y: -26, r: 3, d: 280 },
  { x: -124, y: -30, r: -22, d: 420 },
  { x: 124, y: -28, r: 20, d: 560 },
];
const EGG_ROT = [-10, 8, 7, -9];
const EGG_DY = [-4, 8, 6, -6];

const cleanList = (a: unknown): string[] =>
  (Array.isArray(a) ? a : []).filter((p): p is string => typeof p === "string" && p.length > 0);

function EggCluster({
  photos,
  startIndex,
  side,
  show,
  reduce,
  filter,
  onFail,
}: {
  photos: string[];
  startIndex: number;
  side: "top" | "bottom";
  show: boolean;
  reduce: boolean;
  filter: string;
  onFail: (src: string) => void;
}) {
  if (!photos.length) return null;
  const W = "clamp(104px, 34vw, 150px)";
  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
      {photos.map((src, i) => {
        const g = startIndex + i;
        return (
          <div
            key={src}
            style={
              {
                position: "relative",
                width: W,
                marginLeft: i ? `calc(${W} * -0.24)` : 0,
                zIndex: i ? 2 : 1,
                ["--er" as any]: `${EGG_ROT[g % 4]}deg`,
                ["--ey" as any]: `${EGG_DY[g % 4]}px`,
                ["--ef" as any]: side === "top" ? "-36px" : "36px",
                transform: `translateY(${EGG_DY[g % 4]}px) rotate(${EGG_ROT[g % 4]}deg)`,
                animation: show && !reduce ? `fsEggPhoto 700ms cubic-bezier(0.34,1.45,0.5,1) ${200 + g * 140}ms both` : undefined,
                willChange: "transform",
              } as CSSProperties
            }
          >
            <AssetImage
              src={src}
              alt=""
              draggable={false}
              onFail={() => onFail(src)}
              style={{ display: "block", width: "100%", height: "auto", maxHeight: "clamp(110px, 19svh, 170px)", objectFit: "contain", filter }}
            />
          </div>
        );
      })}
    </div>
  );
}

export default function FinalSurprise() {
  const { currentScene } = useStory();
  const active = currentScene === FINAL_SCENE;
  const reduce = usePrefersReducedMotion();

  const [phase, setPhase] = useState(0);
  const [heartClicks, setHeartClicks] = useState(0);
  const [eggVisible, setEggVisible] = useState(false);

  const bgRef = useRef<StarryBackdropHandle | null>(null);
  const clicksRef = useRef(0);
  const resetTimer = useRef<number | null>(null);
  const timers = useRef<number[]>([]);

  const [bad, setBad] = useState<Record<string, boolean>>({});
  const markBad = useCallback((src: string) => setBad((b) => ({ ...b, [src]: true })), []);

  // foto di belakang hati: finalHeartPhotos, kalau kosong pakai 3 foto pertama polaroidPhotos
  const photos = useMemo(() => {
    const own = cleanList(finalHeartPhotos);
    return (own.length ? own : cleanList(polaroidPhotos)).slice(0, own.length ? FAN.length : 3);
  }, []);
  const heartPhotos = photos.filter((p) => !bad[p]);

  // foto easter egg (cut-out PNG): setengah di atas teks, setengah di bawah
  const eggPhotos = useMemo(() => cleanList(easterEggPhotos).slice(0, 4), []).filter((p) => !bad[p]);
  const eggTop = eggPhotos.slice(0, Math.ceil(eggPhotos.length / 2));
  const eggBottom = eggPhotos.slice(Math.ceil(eggPhotos.length / 2));
  const eggOpt = (easterEggPhotoOptions as any) || {};
  const edge = Number(eggOpt.edgePx) || 3;
  const eggFilter =
    (eggOpt.whiteEdge === false
      ? ""
      : `drop-shadow(${edge}px 0 0 #fff) drop-shadow(-${edge}px 0 0 #fff) drop-shadow(0 ${edge}px 0 #fff) drop-shadow(0 -${edge}px 0 #fff) `) +
    "drop-shadow(0 6px 10px rgba(0,0,0,0.45))";

  const later = useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms);
    timers.current.push(id);
    return id;
  }, []);

  const clearAll = useCallback(() => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
    if (resetTimer.current) window.clearTimeout(resetTimer.current);
    resetTimer.current = null;
  }, []);

  // Ledakan "besar" = beberapa percikan bertumpuk, warna palet wish
  const bigBurst = useCallback((x: number, y: number) => {
    const bg = bgRef.current;
    if (!bg) return;
    const pal = WISH_PALETTE[(Math.random() * WISH_PALETTE.length) | 0];
    bg.burst(x, y, pal);
    bg.burst(x + 16, y - 10, pal);
    bg.burst(x - 14, y + 12, WISH_PALETTE[(Math.random() * WISH_PALETTE.length) | 0]);
  }, []);

  // ---------- timeline scene ----------
  useEffect(() => {
    if (!active) {
      clearAll();
      return;
    }
    setPhase(0);
    setHeartClicks(0);
    setEggVisible(false);
    clicksRef.current = 0;

    later(() => setPhase(1), 700);
    later(() => setPhase(2), 2000);
    later(() => setPhase(3), 3500);
    later(() => setPhase(4), 5000);

    // kembang api pembuka + sesekali percikan lembut selama scene aktif
    if (!reduce) {
      const W = window.innerWidth;
      const H = window.innerHeight;
      later(() => bigBurst(W * 0.24, H * 0.26), 650);
      later(() => bigBurst(W * 0.78, H * 0.22), 1050);
      later(() => bigBurst(W * 0.5, H * 0.14), 1500);
      const ambient = window.setInterval(() => {
        bigBurst(W * (0.15 + Math.random() * 0.7), H * (0.12 + Math.random() * 0.3));
      }, 4200);
      timers.current.push(ambient as unknown as number);
      return () => {
        window.clearInterval(ambient);
        clearAll();
      };
    }
    return clearAll;
  }, [active, reduce, later, clearAll, bigBurst]);

  // ---------- tap hati ----------
  const onHeartClick = useCallback(
    (e: RMouseEvent<HTMLButtonElement>) => {
      if (eggVisible) return;
      const nx = clicksRef.current + 1;
      clicksRef.current = nx;
      setHeartClicks(nx);
      if (resetTimer.current) window.clearTimeout(resetTimer.current);

      if (nx >= TAPS_NEEDED) {
        setEggVisible(true);
        const W = window.innerWidth;
        const H = window.innerHeight;
        for (let i = 0; i < 8; i++) {
          later(() => bigBurst(W * (0.12 + Math.random() * 0.76), H * (0.1 + Math.random() * 0.55)), i * 230);
        }
        resetTimer.current = window.setTimeout(() => {
          clicksRef.current = 0;
          setHeartClicks(0);
          setEggVisible(false);
        }, EGG_VISIBLE_MS);
      } else {
        bgRef.current?.burst(e.clientX, e.clientY, WISH_PALETTE[nx % WISH_PALETTE.length]);
        resetTimer.current = window.setTimeout(() => {
          clicksRef.current = 0;
          setHeartClicks(0);
        }, 2400);
      }
    },
    [eggVisible, later, bigBurst],
  );

  const heartCols = HEART[0].length;
  const cell = 12; // px (diskalakan lewat CSS var pada layar lebar)
  const palette = eggVisible ? GOLD_COLORS : ROW_COLORS;
  const name = (birthdayConfig as any).name;


  return (
    <section
      className={`scene-layer ${active ? "scene-active" : "scene-hidden"}`}
      aria-hidden={!active}
      style={{ overflow: "hidden" }}
    >
      <StarryBackdrop ref={bgRef} active={active} variant="romance" />

      {/* cahaya rose lembut di belakang konten */}
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse at 50% 62%, rgba(255,111,170,0.26) 0%, rgba(255,216,74,0.08) 38%, transparent 70%)",
          opacity: phase >= 1 ? 1 : 0,
          transition: "opacity 1600ms ease-out",
          filter: "blur(20px)",
          zIndex: 1,
        }}
      />

      <style>{`
        @keyframes fsBeat {
          0%, 100% { transform: scale(1); }
          14% { transform: scale(1.08); }
          28% { transform: scale(1); }
          42% { transform: scale(1.05); }
          70% { transform: scale(1); }
        }
        @keyframes fsBob {
          0%, 100% { translate: 0 0; }
          50% { translate: 0 -6px; }
        }
        @keyframes fsPop {
          0% { transform: scale(1); }
          40% { transform: scale(1.16); }
          100% { transform: scale(1); }
        }
        @keyframes fsEggIn {
          0% { opacity: 0; transform: scale(0.7) translateY(24px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes fsEggPhoto {
          from { opacity: 0; transform: translateY(calc(var(--ey) + var(--ef))) rotate(calc(var(--er) + 20deg)) scale(0.6); }
          to   { opacity: 1; transform: translateY(var(--ey)) rotate(var(--er)) scale(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          .fs-beat { animation: none !important; }
        }
      `}</style>

      <div className="relative w-full max-w-xl mx-auto flex flex-col items-center text-center gap-4 px-4" style={{ zIndex: 10 }}>
        <SceneLabel visible={phase >= 1}>Untuk kamu</SceneLabel>

        {/* stiker kertas dekoratif */}
        <div className="relative w-full" style={{ height: 0 }} aria-hidden>
          <PaperSticker kind="star" color="#FFD84A" size={38} rotate={-14}
            style={{ left: "3%", top: -34, opacity: phase >= 1 ? 1 : 0, transition: "opacity 900ms ease 500ms", animation: reduce ? undefined : "fsBob 4.2s ease-in-out infinite" }} />
          <PaperSticker kind="heart" color="#ff7fae" size={34} rotate={12}
            style={{ right: "4%", top: -26, opacity: phase >= 1 ? 1 : 0, transition: "opacity 900ms ease 700ms", animation: reduce ? undefined : "fsBob 5s ease-in-out 1s infinite" }} />
        </div>

        <h1 className="flex flex-col items-center" style={{ gap: 10, margin: 0 }}>
          <CutoutText text="Happy Birthday," fontSize="clamp(24px, 7.4vw, 36px)" seed={3} show={phase >= 1} reduce={reduce} />
          <CutoutText text={String(name ?? "")} fontSize="clamp(34px, 11vw, 52px)" seed={7} show={phase >= 1} delay={650} stagger={80} reduce={reduce} />
        </h1>

        <div
          className={`transition-all duration-[1200ms] ease-out ${
            phase >= 2 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"
          }`}
          style={{ maxWidth: 330 }}
        >
          <PaperNote rotate={-1.6} tone="cream" tapeColor="pink" seed={2}>
            <p className="text-serif italic text-base sm:text-lg" style={{ margin: 0, lineHeight: 1.45 }}>
              {birthdayConfig.finalMessage}
            </p>
          </PaperNote>
        </div>

        <div style={{ marginTop: 2 }}>
          <CutoutText
            text={String(birthdayConfig.finalLove ?? "")}
            fontSize="clamp(18px, 5.4vw, 26px)"
            seed={5}
            show={phase >= 3}
            stagger={40}
            reduce={reduce}
          />
        </div>

        {/* hati LED + kipas polaroid kenangan */}
        <div className="relative mt-2" style={{ width: 230, height: 160 }}>
          {heartPhotos.map((src: string, i: number) => {
            const f = FAN[i];
            const shown = phase >= 3;
            return (
              <TornPhoto
                key={i}
                src={src}
                width={70}
                seed={i + 2}
                tapeColor={i === 1 ? "gold" : "pink"}
                onFail={() => markBad(src)}
                style={{
                  position: "absolute",
                  left: "50%",
                  top: "50%",
                  marginLeft: -35,
                  marginTop: -38,
                  opacity: shown ? 1 : 0,
                  transform: shown
                    ? `translate(${f.x}px, ${f.y}px) rotate(${f.r}deg)`
                    : `translate(${f.x}px, ${f.y - 70}px) rotate(${f.r + 24}deg)`,
                  transition: `transform 900ms cubic-bezier(0.34,1.45,0.5,1) ${f.d}ms, opacity 500ms ease ${f.d}ms`,
                  zIndex: i === 2 ? 1 : 2,
                }}
              />
            );
          })}

          <button
            aria-label={`Final heart, clicked ${heartClicks} times`}
            onClick={onHeartClick}
            className="absolute"
            style={
              {
                left: "50%",
                top: "50%",
                transform: "translate(-50%, -50%)",
                background: "transparent",
                border: 0,
                padding: 12,
                cursor: "pointer",
                zIndex: 5,
                WebkitTapHighlightColor: "transparent",
                touchAction: "manipulation",
              } as CSSProperties
            }
          >
            <div
              key={heartClicks}
              className="fs-beat"
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(${heartCols}, ${cell}px)`,
                gridAutoRows: `${cell}px`,
                gap: 2,
                animation:
                  phase >= 4 && !reduce
                    ? heartClicks > 0
                      ? "fsPop 420ms ease-out, fsBeat 1.6s ease-in-out 420ms infinite"
                      : "fsBeat 1.6s ease-in-out infinite"
                    : undefined,
                filter: eggVisible ? "drop-shadow(0 0 14px rgba(255,216,74,0.7))" : "drop-shadow(0 0 14px rgba(255,107,157,0.55))",
                transition: "filter 400ms ease",
              }}
            >
              {HEART.flatMap((row, r) =>
                row.map((on, c) => {
                  if (!on) return <div key={`${r}-${c}`} />;
                  const seed = r * heartCols + c + 1;
                  const dx = (hash01(seed) - 0.5) * 220;
                  const dy = (hash01(seed + 50) - 0.5) * 220;
                  const delay = reduce ? 0 : Math.round(hash01(seed + 9) * 900);
                  const shown = phase >= 4;
                  const highlight = r <= 2 && c <= 2;
                  const color = highlight ? (eggVisible ? "#fff6c2" : "#ffd1e3") : palette[r];
                  return (
                    <div
                      key={`${r}-${c}`}
                      style={{
                        borderRadius: 2,
                        background: color,
                        boxShadow: `0 0 6px ${color}`,
                        opacity: shown ? 1 : 0,
                        transform: shown ? "translate(0,0) scale(1)" : `translate(${dx}px, ${dy}px) scale(0.3)`,
                        transition: `transform 1100ms cubic-bezier(0.22,0.8,0.3,1) ${delay}ms, opacity 500ms ease ${delay}ms, background 400ms ease, box-shadow 400ms ease`,
                      }}
                    />
                  );
                }),
              )}
            </div>
          </button>
        </div>

        {/* progres tap: titik LED */}
        <div
          className="flex items-center gap-2"
          style={{ opacity: phase >= 4 ? 1 : 0, transition: "opacity 1000ms ease 600ms", marginTop: -4 }}
          aria-hidden
        >
          {Array.from({ length: TAPS_NEEDED }).map((_, i) => {
            const on = i < heartClicks;
            return (
              <span
                key={i}
                style={{
                  width: 7,
                  height: 7,
                  background: on ? (eggVisible ? THEME.gold : THEME.rose) : "rgba(255,200,222,0.2)",
                  boxShadow: on ? `0 0 8px ${eggVisible ? THEME.gold : THEME.rose}` : "none",
                  transition: "all 300ms ease",
                }}
              />
            );
          })}
        </div>
        <SceneLabel visible={phase >= 4 && !eggVisible} style={{ marginTop: -6 }}>
          Tap hati {TAPS_NEEDED}× untuk kejutan
        </SceneLabel>

      </div>

      {/* easter egg: overlay di depan semua elemen, latar di-blur. Foto di atas & bawah teks agar tidak menutupi tulisan */}
      <div
        className="absolute inset-0 flex items-center justify-center px-5"
        aria-hidden={!eggVisible}
        style={{
          zIndex: 40,
          pointerEvents: "none",
          opacity: eggVisible ? 1 : 0,
          visibility: eggVisible ? "visible" : "hidden",
          transition: `opacity 600ms ease, visibility 0s linear ${eggVisible ? "0s" : "600ms"}`,
        }}
      >
        <div
          className="absolute inset-0"
          style={{
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
            background: "radial-gradient(ellipse at 50% 50%, rgba(255,216,74,0.14) 0%, rgba(12,4,24,0.55) 70%)",
          }}
        />
        <div
          className="relative flex flex-col items-center"
          style={{ width: "100%", maxWidth: 380, gap: "clamp(6px, 1.6svh, 16px)" }}
        >
          <EggCluster photos={eggTop} startIndex={0} side="top" show={eggVisible} reduce={reduce} filter={eggFilter} onFail={markBad} />

          <div
            style={{
              position: "relative",
              zIndex: 3,
              maxWidth: 340,
              width: "100%",
              animation: eggVisible && !reduce ? "fsEggIn 700ms cubic-bezier(0.34,1.45,0.5,1) both" : undefined,
              filter: "drop-shadow(0 0 28px rgba(255,216,74,0.55))",
            }}
          >
            <PaperNote rotate={1.4} tone="cream" tapeColor="gold" seed={4} style={{ margin: "0 auto" }}>
              <p className="text-base sm:text-lg" style={{ margin: 0, textAlign: "center", lineHeight: 1.45, fontWeight: 600 }}>
                <span style={{ color: "#e0701a" }}>✦</span> {birthdayConfig.easterEgg}{" "}
                <span style={{ color: "#e0701a" }}>✦</span>
              </p>
            </PaperNote>
          </div>

          <EggCluster photos={eggBottom} startIndex={eggTop.length} side="bottom" show={eggVisible} reduce={reduce} filter={eggFilter} onFail={markBad} />
        </div>
      </div>

      <div className="vignette" />
    </section>
  );
}