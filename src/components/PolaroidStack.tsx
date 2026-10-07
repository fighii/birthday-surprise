import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { polaroidPhotos as photoFallback, polaroidPhotos as polaroidPhotoList } from "../config/media.js";
import { birthdayConfig } from "../config/birthdayConfig.js";

interface PolaroidStackProps {
  onComplete?: () => void;
  active?: boolean;
  /** Dipanggil saat sebuah kartu mendarat. x/y = koordinat layar (clientX/clientY) pusat kartu. */
  onLand?: (info: { x: number; y: number; index: number }) => void;
}

const TOTAL_TARGET = 30;
const FINAL_LAST_COUNT = 3; // 3 foto terakhir rapi di tengah (finale)
const FIRST_DELAY_MS = 1100;
const CARD_RATIO = 1.22; // tinggi kartu = lebar * 1.22 (rasio polaroid)
const EDGE_MARGIN = 10; // jarak aman kartu ke tepi area stack (px)

// Caption tulisan tangan. Bisa di-override lewat birthdayConfig.polaroidCaptions
const DEFAULT_CAPTIONS = [
  "Selalu kamu ♡",
  "Momen favoritku",
  "Kamu, rumahku",
  "Sayang banget",
  "Bahagia itu kamu",
  "Cinta kita",
  "Aku & kamu",
  "Hari-hari indah",
  "Forever & always",
  "Rindu kamu ♡",
  "Terima kasih, sayang",
  "Setiap hari bersamamu",
];

// urutan jenis jatuh (0 lurus, 1 dari kiri-atas, 2 dari kanan-atas, 3 berputar)
const FALL_ORDER = [0, 2, 1, 3, 2, 0, 3, 1];

const HEART_PUFF = [
  { dx: -22, size: 11, color: "#ff8fb8" },
  { dx: 4, size: 15, color: "#ff6aa2" },
  { dx: 26, size: 10, color: "#ffc2d9" },
];

const BG_HEARTS = [
  { left: 8, size: 12, delay: 0, dur: 9 },
  { left: 22, size: 9, delay: 3.2, dur: 11 },
  { left: 38, size: 14, delay: 6.1, dur: 10 },
  { left: 55, size: 10, delay: 1.4, dur: 12 },
  { left: 70, size: 13, delay: 4.6, dur: 9.5 },
  { left: 84, size: 9, delay: 7.7, dur: 11.5 },
  { left: 15, size: 11, delay: 8.9, dur: 10.5 },
  { left: 62, size: 8, delay: 2.3, dur: 13 },
];

// ---------- util deterministik ----------
const halton = (index: number, base: number) => {
  let f = 1;
  let r = 0;
  let i = index;
  while (i > 0) {
    f /= base;
    r += f * (i % base);
    i = Math.floor(i / base);
  }
  return r;
};
const hash01 = (n: number) => {
  const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
};

type SlotItem = {
  index: number;
  key: string;
  photoSrc: string | null;
  caption: string;
  // layout dinormalisasi: ox/oy dalam [-1, 1] dari ruang bebas -> responsif
  ox: number;
  oy: number;
  rot: number;
  scale: number;
  fall: 0 | 1 | 2 | 3;
  tape: boolean;
  tapeRot: number;
  wob: number;
};

function makeLayout(c: number): Pick<SlotItem, "ox" | "oy" | "rot" | "scale" | "fall" | "tape" | "tapeRot" | "wob"> {
  const isFinal = c >= TOTAL_TARGET - FINAL_LAST_COUNT;
  if (isFinal) {
    const f = c - (TOTAL_TARGET - FINAL_LAST_COUNT);
    const offs = [[-0.08, 0.05], [0.07, -0.04], [0, 0]][f % 3];
    const rots = [-2.6, 1.9, -0.8];
    return {
      ox: offs[0],
      oy: offs[1],
      rot: rots[f % 3],
      scale: 1.1 + f * 0.015,
      fall: 0,
      tape: f === 2,
      tapeRot: -3,
      wob: 2,
    };
  }
  const ox = halton(c + 3, 2) * 2 - 1;
  const oy = halton(c + 3, 3) * 2 - 1;
  const sign = hash01(c + 1) > 0.5 ? 1 : -1;
  const mag = 4 + hash01(c + 7) * 11; // 4..15 derajat
  const scales = [1.0, 0.86, 0.94, 0.8, 0.9, 0.84, 0.97, 0.82];
  return {
    ox,
    oy,
    rot: sign * mag,
    scale: scales[c % scales.length],
    fall: FALL_ORDER[c % FALL_ORDER.length] as 0 | 1 | 2 | 3,
    tape: c % 2 === 0,
    tapeRot: (hash01(c + 3) - 0.5) * 14,
    wob: (hash01(c + 11) > 0.5 ? 1 : -1) * (2 + hash01(c + 5) * 3),
  };
}

// Ukuran + posisi kartu (px, relatif ke pusat area) - selalu di dalam area stack
function placeIn(it: SlotItem, W: number, H: number) {
  const baseW = Math.max(0, Math.min(W * 0.52, H * 0.46));
  const cw = baseW * it.scale;
  const ch = cw * CARD_RATIO;
  const rad = (Math.abs(it.rot) * Math.PI) / 180;
  const bbW = cw * Math.cos(rad) + ch * Math.sin(rad);
  const bbH = cw * Math.sin(rad) + ch * Math.cos(rad);
  const freeX = Math.max(0, (W - bbW) / 2 - EDGE_MARGIN);
  const freeY = Math.max(0, (H - bbH) / 2 - EDGE_MARGIN);
  return { cw, ch, x: it.ox * freeX, y: it.oy * freeY };
}

const fallDuration = (fall: number) => (fall === 3 ? 1250 : fall === 0 ? 1050 : 1100);

export default function PolaroidStack({ onComplete, active = true, onLand }: PolaroidStackProps) {
  const availablePhotos = useMemo(() => {
    const specific = (polaroidPhotoList || []).filter((p: string) => typeof p === "string" && p.length > 0);
    if (specific.length > 0) return specific;
    return (photoFallback || []).filter((p: string) => typeof p === "string" && p.length > 0);
  }, []);

  const captions = useMemo<string[]>(() => {
    const custom = (birthdayConfig as any)?.polaroidCaptions;
    return Array.isArray(custom) && custom.length > 0 ? custom.map(String) : DEFAULT_CAPTIONS;
  }, []);

  const [visible, setVisible] = useState<SlotItem[]>([]);
  const [cursor, setCursor] = useState(0);
  const cursorRef = useRef(0);
  const [errorMap, setErrorMap] = useState<Record<string, boolean>>({});
  const [size, setSize] = useState({ w: 0, h: 0 });
  const stageRef = useRef<HTMLDivElement | null>(null);
  const onLandRef = useRef(onLand);
  onLandRef.current = onLand;
  const landTimers = useRef<number[]>([]);

  useEffect(() => () => {
    landTimers.current.forEach((t) => window.clearTimeout(t));
    landTimers.current = [];
  }, []);

  // ---------- ukur area stack (responsif, aman untuk Safari iPhone) ----------
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      setSize({ w: r.width, h: r.height });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [availablePhotos.length]);

  const addNext = useCallback(() => {
    const c = cursorRef.current;
    if (c >= TOTAL_TARGET || availablePhotos.length === 0) return;
    cursorRef.current = c + 1;
    setCursor(c + 1);
    const item: SlotItem = {
      index: c,
      key: `p-${c}`,
      photoSrc: availablePhotos[c % availablePhotos.length] ?? null,
      caption: captions[c % captions.length],
      ...makeLayout(c),
    };
    setVisible((prev) => [...prev, item]);

    // beri tahu parent saat kartu mendarat (untuk percikan di backdrop)
    const t = window.setTimeout(() => {
      const el = stageRef.current;
      if (!el || !onLandRef.current) return;
      const r = el.getBoundingClientRect();
      const pl = placeIn(item, r.width, r.height);
      onLandRef.current({ x: r.left + r.width / 2 + pl.x, y: r.top + r.height / 2 + pl.y, index: c });
    }, Math.round(fallDuration(item.fall) * 0.58));
    landTimers.current.push(t);
  }, [availablePhotos, captions]);

  // ---------- jadwal foto berikutnya ----------
  useEffect(() => {
    if (!active || availablePhotos.length === 0) return;
    if (cursor >= TOTAL_TARGET) return;
    const photoDuration = birthdayConfig.photoDuration ?? 3500;
    const t = window.setTimeout(addNext, cursor === 0 ? FIRST_DELAY_MS : photoDuration);
    return () => window.clearTimeout(t);
  }, [cursor, active, addNext, availablePhotos.length]);

  // ---------- selesai ----------
  useEffect(() => {
    if (!active) return;
    if (availablePhotos.length === 0 || cursor >= TOTAL_TARGET) {
      const t = window.setTimeout(() => onComplete?.(), 1800);
      return () => window.clearTimeout(t);
    }
  }, [cursor, active, onComplete, availablePhotos.length]);

  // preload foto berikutnya agar jatuhnya mulus
  useEffect(() => {
    if (availablePhotos.length === 0) return;
    const nxt = availablePhotos[cursor % availablePhotos.length];
    if (nxt) {
      const im = new Image();
      im.src = nxt;
    }
  }, [cursor, availablePhotos]);

  const handleImgError = (key: string) => setErrorMap((m) => ({ ...m, [key]: true }));

  const place = (it: SlotItem) => placeIn(it, size.w, size.h);

  const counterLabel = availablePhotos.length === 0 ? null : `${Math.min(cursor, TOTAL_TARGET)} / ${TOTAL_TARGET}`;
  const progress = Math.min(1, cursor / TOTAL_TARGET);

  return (
    <div className="relative w-full max-w-sm mx-auto flex flex-col items-center gap-3 py-2">
      <style>{`
        @keyframes pl-fall {
          0%   { transform: translate(var(--sx), var(--sy)) rotate(var(--sr)) scale(1.12); opacity: 0;
                 animation-timing-function: cubic-bezier(.45,0,.85,.55); }
          9%   { opacity: 1; }
          58%  { transform: translate(var(--x), var(--y)) rotate(var(--r)) scale(1);
                 animation-timing-function: cubic-bezier(.2,.7,.3,1); }
          73%  { transform: translate(var(--x), calc(var(--y) - 15px)) rotate(calc(var(--r) + var(--wob))) scale(1.01);
                 animation-timing-function: cubic-bezier(.5,0,.8,.6); }
          88%  { transform: translate(var(--x), calc(var(--y) + 3px)) rotate(calc(var(--r) - var(--wob) * .4)) scale(1);
                 animation-timing-function: ease-out; }
          100% { transform: translate(var(--x), var(--y)) rotate(var(--r)) scale(1); opacity: 1; }
        }
        @keyframes pl-puff {
          0%   { opacity: 0; transform: translate(0, 0) scale(.4); }
          22%  { opacity: 1; }
          100% { opacity: 0; transform: translate(var(--dx), -54px) scale(1.05); }
        }
        @keyframes pl-float {
          0%   { opacity: 0; transform: translateY(0) scale(.8); }
          20%  { opacity: .32; }
          100% { opacity: 0; transform: translateY(-360px) scale(1.1); }
        }
        @keyframes pl-glow {
          0%, 100% { opacity: .55; }
          50% { opacity: .95; }
        }
        @media (prefers-reduced-motion: reduce) {
          .pl-card { animation: none !important; }
          .pl-puff, .pl-bgheart { display: none !important; }
        }
      `}</style>

      {availablePhotos.length === 0 ? (
        <div className="glass px-6 py-10 text-center">
          <p className="text-romantic text-3xl text-cinematic-gold mb-2">Your memories</p>
          <p className="text-cinematic-soft/80">will appear here ❤️</p>
        </div>
      ) : (
        <div
          ref={stageRef}
          aria-label="Polaroid photo stack"
          style={{
            position: "relative",
            // Ukuran aman iPhone 17 Safari (402pt lebar): pakai svh agar stabil saat toolbar Safari berubah
            width: "min(92vw, 380px)",
            height: "min(112vw, 54svh, 470px)",
            isolation: "isolate", // z-index kartu TIDAK bocor menutupi teks di atasnya
            // Potong hanya sisi ATAS: kartu yang jatuh muncul dari tepi atas area ini, tidak menimpa teks.
            clipPath: "inset(0 -40px -40px -40px)",
            // Tanpa background/border/bayangan: tidak ada lagi "bingkai" transparan di belakang stack
            // yang menimpa tulisan di atasnya. Beri jarak kecil agar tidak menempel ke teks.
            marginTop: 14,
          }}
        >
          {/* cahaya lembut */}
          <div
            aria-hidden
            style={{
              position: "absolute",
              inset: "8% 6%",
              borderRadius: "50%",
              background: "radial-gradient(closest-side, rgba(255,150,190,0.22), rgba(255,150,190,0))",
              filter: "blur(14px)",
              animation: "pl-glow 5s ease-in-out infinite",
              zIndex: 0,
            }}
          />

          {/* hati melayang di belakang kartu */}
          {BG_HEARTS.map((h, i) => (
            <span
              key={i}
              aria-hidden
              className="pl-bgheart"
              style={{
                position: "absolute",
                bottom: -10,
                left: `${h.left}%`,
                fontSize: h.size,
                color: i % 2 ? "#ffb3d1" : "#ff7fae",
                opacity: 0,
                zIndex: 1,
                animation: `pl-float ${h.dur}s ease-in ${h.delay}s infinite`,
                pointerEvents: "none",
              }}
            >
              ♥
            </span>
          ))}

          {size.w > 0 &&
            visible.map((it) => {
              const { cw, ch, x, y } = place(it);
              const errored = errorMap[it.key];
              const depth = Math.max(0, cursor - 1 - it.index);
              const dim = Math.min(depth, 8) * 0.045; // kartu lama sedikit lebih gelap -> fokus ke yang terbaru

              // titik awal jatuh: selalu dari ATAS area stack
              const topY = -(size.h / 2 + ch * 0.95);
              let sx = x;
              let sr = it.rot;
              let dur = fallDuration(it.fall);
              if (it.fall === 0) { sx = x * 0.6; sr = it.rot + (it.rot >= 0 ? 22 : -22); }
              if (it.fall === 1) { sx = x - size.w * 0.38; sr = it.rot - 38; }
              if (it.fall === 2) { sx = x + size.w * 0.38; sr = it.rot + 40; }
              if (it.fall === 3) { sx = x; sr = it.rot + (it.rot >= 0 ? 150 : -150); }

              const pad = cw * 0.06;
              const photoH = cw * 0.88;

              const style = {
                position: "absolute",
                left: "50%",
                top: "50%",
                width: cw,
                height: ch,
                marginLeft: -cw / 2,
                marginTop: -ch / 2,
                zIndex: 10 + it.index,
                transform: `translate(${x}px, ${y}px) rotate(${it.rot}deg)`,
                animation: `pl-fall ${dur}ms linear backwards`,
                willChange: "transform",
                ["--x" as any]: `${x}px`,
                ["--y" as any]: `${y}px`,
                ["--r" as any]: `${it.rot}deg`,
                ["--sx" as any]: `${sx}px`,
                ["--sy" as any]: `${topY}px`,
                ["--sr" as any]: `${sr}deg`,
                ["--wob" as any]: `${it.wob}deg`,
              } as CSSProperties;

              return (
                <div key={it.key} className="pl-card" style={style}>
                  {/* bingkai polaroid krem-pink */}
                  <div
                    style={{
                      position: "relative",
                      width: "100%",
                      height: "100%",
                      boxSizing: "border-box",
                      padding: `${pad}px ${pad}px 0`,
                      borderRadius: 4,
                      background: "linear-gradient(160deg, #fffaf6 0%, #fdeef1 100%)",
                      boxShadow:
                        "0 12px 24px rgba(40,6,34,0.50), 0 3px 7px rgba(255,120,170,0.28), inset 0 0 0 1px rgba(255,255,255,0.7)",
                    }}
                  >
                    {/* foto */}
                    <div
                      style={{
                        position: "relative",
                        width: "100%",
                        height: photoH,
                        overflow: "hidden",
                        borderRadius: 2,
                        background: "#2a1428",
                        boxShadow: "inset 0 0 8px rgba(0,0,0,0.35)",
                      }}
                    >
                      {it.photoSrc && !errored ? (
                        <img
                          src={it.photoSrc}
                          alt={`Memory ${it.index + 1}`}
                          decoding="async"
                          draggable={false}
                          onError={() => handleImgError(it.key)}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            display: "block",
                            filter: "saturate(1.06) contrast(1.02) sepia(0.07)",
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: "100%",
                            height: "100%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "rgba(255,220,235,0.5)",
                            fontSize: 13,
                          }}
                        >
                          Memory {it.index + 1}
                        </div>
                      )}
                      {/* nuansa rose / light leak */}
                      <div
                        aria-hidden
                        style={{
                          position: "absolute",
                          inset: 0,
                          background:
                            "linear-gradient(135deg, rgba(255,160,200,0.20) 0%, rgba(255,160,200,0) 42%, rgba(255,214,150,0.14) 100%)",
                          mixBlendMode: "soft-light",
                          pointerEvents: "none",
                        }}
                      />
                    </div>

                    {/* caption tulisan tangan */}
                    <div
                      style={{
                        height: ch - pad - photoH,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        textAlign: "center",
                        fontFamily: '"Dancing Script","Snell Roundhand","Segoe Script","Brush Script MT",cursive',
                        fontSize: Math.max(12, cw * 0.088),
                        lineHeight: 1.1,
                        color: "#8c3d5f",
                        padding: "0 4px",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                      }}
                    >
                      {it.caption}
                    </div>

                    {/* washi tape atau stiker hati */}
                    {it.tape ? (
                      <div
                        aria-hidden
                        style={{
                          position: "absolute",
                          top: -9,
                          left: "50%",
                          width: cw * 0.36,
                          height: 17,
                          marginLeft: -(cw * 0.18),
                          transform: `rotate(${it.tapeRot}deg)`,
                          background:
                            "repeating-linear-gradient(45deg, rgba(255,176,208,0.78) 0 6px, rgba(255,214,230,0.78) 6px 12px)",
                          boxShadow: "0 1px 3px rgba(60,10,40,0.25)",
                          opacity: 0.92,
                        }}
                      />
                    ) : (
                      <span
                        aria-hidden
                        style={{
                          position: "absolute",
                          right: -6,
                          top: -8,
                          fontSize: Math.max(14, cw * 0.14),
                          color: "#ff5d98",
                          textShadow: "0 1px 4px rgba(120,10,60,0.45)",
                          transform: `rotate(${it.tapeRot}deg)`,
                        }}
                      >
                        ♥
                      </span>
                    )}

                    {/* peredup kartu lama */}
                    <div
                      aria-hidden
                      style={{
                        position: "absolute",
                        inset: 0,
                        borderRadius: 4,
                        background: "rgb(40,8,40)",
                        opacity: dim,
                        transition: "opacity 700ms ease",
                        pointerEvents: "none",
                      }}
                    />
                  </div>

                  {/* percikan hati saat mendarat */}
                  {HEART_PUFF.map((h, i) => (
                    <span
                      key={i}
                      aria-hidden
                      className="pl-puff"
                      style={{
                        position: "absolute",
                        left: "50%",
                        bottom: "10%",
                        fontSize: h.size,
                        color: h.color,
                        opacity: 0,
                        pointerEvents: "none",
                        animation: `pl-puff 1200ms ease-out ${Math.round(dur * 0.58) + i * 90}ms both`,
                        ["--dx" as any]: `${h.dx}px`,
                      } as CSSProperties}
                    >
                      ♥
                    </span>
                  ))}
                </div>
              );
            })}
        </div>
      )}

      {counterLabel && (
        <div className="flex flex-col items-center gap-1.5" style={{ width: "min(60vw, 220px)" }}>
          <p className="text-xs tracking-widest" style={{ color: "rgba(255,200,222,0.75)" }}>
            <span style={{ color: "#ff7fae" }}>♥</span> {counterLabel}
          </p>
          <div style={{ width: "100%", height: 2, borderRadius: 2, background: "rgba(255,200,222,0.15)" }}>
            <div
              style={{
                width: `${progress * 100}%`,
                height: "100%",
                borderRadius: 2,
                background: "linear-gradient(90deg, #ff8fb8, #ffd1e3)",
                transition: "width 600ms ease",
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}