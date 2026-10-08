import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { photos as photoFallback, polaroidPhotos as polaroidPhotoList } from "../config/media.js";
import { birthdayConfig } from "../config/birthdayConfig.js";
import { FONT_HAND, FONT_LED, THEME } from "../config/sceneTheme";
import { PaperNote, PaperSticker, Tape, tornPolygon, hash01 } from "./PaperCutout";
import { PixelHeart, PixelProgress, paperBg } from "./PaperExtras";
import AssetImage from "./AssetImage";
import { assetUrl } from "../lib/assets";

interface PolaroidStackProps {
  onComplete?: () => void;
  active?: boolean;
  /** Dipanggil saat sebuah kartu mendarat. x/y = koordinat layar (clientX/clientY) pusat kartu. */
  onLand?: (info: { x: number; y: number; index: number }) => void;
}

const TOTAL_TARGET = 30;
const FINAL_LAST_COUNT = 3; // 3 foto terakhir rapi di tengah (finale)
const FIRST_DELAY_MS = 1100;
const CARD_RATIO = 1.22; // tinggi kartu = lebar * 1.22
const EDGE_MARGIN = 10; // jarak aman kartu ke tepi area stack (px)

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
  { dx: -22, size: 12, color: "#ff8fb8" },
  { dx: 4, size: 16, color: "#ff5d98" },
  { dx: 26, size: 11, color: "#ffd1e3" },
];

const BG_HEARTS = [
  { left: 8, size: 14, delay: 0, dur: 9 },
  { left: 22, size: 11, delay: 3.2, dur: 11 },
  { left: 38, size: 16, delay: 6.1, dur: 10 },
  { left: 55, size: 12, delay: 1.4, dur: 12 },
  { left: 70, size: 15, delay: 4.6, dur: 9.5 },
  { left: 84, size: 11, delay: 7.7, dur: 11.5 },
  { left: 15, size: 13, delay: 8.9, dur: 10.5 },
  { left: 62, size: 10, delay: 2.3, dur: 13 },
];

const TAPE_COLORS = ["pink", "gold", "blue"] as const;

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
type SlotItem = {
  index: number;
  key: string;
  photoSrc: string | null;
  caption: string;
  ox: number;
  oy: number;
  rot: number;
  scale: number;
  fall: 0 | 1 | 2 | 3;
  tape: boolean;
  tapeRot: number;
  tapeColor: "pink" | "gold" | "blue";
  stickerKind: "star" | "heart";
  clip: string;
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
  const mag = 4 + hash01(c + 7) * 11;
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

const RISE_MS = 950; // kartu naik dari bawah
const fallDuration = (_fall: number) => RISE_MS;

// Ukuran caption otomatis: muat satu baris bila bisa, kalau tidak turun ke dua baris.
const MIN_CAPTION_PX = 11;
function captionFit(text: string, cw: number, pad: number) {
  const availW = Math.max(40, cw - pad * 2 - 10);
  const base = Math.max(13, cw * 0.1);
  const CHAR = 0.52; // lebar rata-rata huruf (em) pada font tulisan tangan
  const len = Math.max(1, text.length);
  const one = availW / (len * CHAR);
  if (one >= Math.min(base, 14)) return { fontSize: Math.min(base, one), wrap: false };
  const two = availW / (Math.ceil(len / 2) * CHAR);
  return { fontSize: Math.max(MIN_CAPTION_PX, Math.min(base, two)), wrap: true };
}

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
      tapeColor: TAPE_COLORS[c % TAPE_COLORS.length],
      stickerKind: c % 4 === 1 ? "star" : "heart",
      clip: tornPolygon(c + 11, 2, 10),
      ...makeLayout(c),
    };
    setVisible((prev) => [...prev, item]);

    const t = window.setTimeout(() => {
      const el = stageRef.current;
      if (!el || !onLandRef.current) return;
      const r = el.getBoundingClientRect();
      const pl = placeIn(item, r.width, r.height);
      onLandRef.current({ x: r.left + r.width / 2 + pl.x, y: r.top + r.height / 2 + pl.y, index: c });
    }, Math.round(fallDuration(item.fall) * 0.72));
    landTimers.current.push(t);
  }, [availablePhotos, captions]);

  useEffect(() => {
    if (!active || availablePhotos.length === 0) return;
    if (cursor >= TOTAL_TARGET) return;
    const photoDuration = birthdayConfig.photoDuration ?? 3500;
    const t = window.setTimeout(addNext, cursor === 0 ? FIRST_DELAY_MS : photoDuration);
    return () => window.clearTimeout(t);
  }, [cursor, active, addNext, availablePhotos.length]);

  useEffect(() => {
    if (!active) return;
    if (availablePhotos.length === 0 || cursor >= TOTAL_TARGET) {
      const t = window.setTimeout(() => onComplete?.(), 1800);
      return () => window.clearTimeout(t);
    }
  }, [cursor, active, onComplete, availablePhotos.length]);

  useEffect(() => {
    if (availablePhotos.length === 0) return;
    const nxt = availablePhotos[cursor % availablePhotos.length];
    if (nxt) {
      const im = new Image();
      im.src = assetUrl(nxt);
    }
  }, [cursor, availablePhotos]);

  const handleImgError = (key: string) => setErrorMap((m) => ({ ...m, [key]: true }));

  const place = (it: SlotItem) => placeIn(it, size.w, size.h);

  const counterLabel = availablePhotos.length === 0 ? null : `${Math.min(cursor, TOTAL_TARGET)} / ${TOTAL_TARGET}`;

  return (
    <div className="relative w-full max-w-sm mx-auto flex flex-col items-center gap-3 py-2">
      <style>{`
        @keyframes pl-rise {
          0%   { transform: translate(var(--sx), var(--sy)) rotate(var(--sr)) scale(.94);
                 animation-timing-function: cubic-bezier(.16,.84,.3,1); }
          74%  { transform: translate(var(--x), calc(var(--y) - 9px)) rotate(calc(var(--r) + var(--wob) * .5)) scale(1.01);
                 animation-timing-function: ease-in-out; }
          100% { transform: translate(var(--x), var(--y)) rotate(var(--r)) scale(1); }
        }
        @keyframes pl-fadein {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes pl-puff {
          0%   { opacity: 0; transform: translate(0, 0) scale(.4); }
          22%  { opacity: 1; }
          100% { opacity: 0; transform: translate(var(--dx), -54px) scale(1.05); }
        }
        @keyframes pl-float {
          0%   { opacity: 0; transform: translateY(0) scale(.8); }
          20%  { opacity: .4; }
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
        <PaperNote rotate={-1.5} tone="cream" tapeColor="pink" seed={3} innerStyle={{ padding: "22px 28px" }}>
          <p style={{ margin: 0, fontFamily: FONT_HAND, fontSize: 28, textAlign: "center" }}>Your memories</p>
          <p style={{ margin: "4px 0 0", textAlign: "center" }}>will appear here ❤️</p>
        </PaperNote>
      ) : (
        <div
          ref={stageRef}
          aria-label="Polaroid photo stack"
          style={{
            position: "relative",
            width: "min(92vw, 380px)",
            height: "min(112vw, 54svh, 470px)",
            isolation: "isolate",
            clipPath: "inset(0 -40px -100svh -40px)",
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

          {/* hati pixel melayang di belakang kartu */}
          {BG_HEARTS.map((h, i) => (
            <span
              key={i}
              aria-hidden
              className="pl-bgheart"
              style={{
                position: "absolute",
                bottom: -10,
                left: `${h.left}%`,
                opacity: 0,
                zIndex: 1,
                animation: `pl-float ${h.dur}s ease-in ${h.delay}s infinite`,
                pointerEvents: "none",
              }}
            >
              <PixelHeart size={h.size} color={i % 2 ? "#ffb3d1" : "#ff7fae"} glow={false} />
            </span>
          ))}

          {size.w > 0 &&
            visible.map((it) => {
              const { cw, ch, x, y } = place(it);
              const errored = errorMap[it.key];
              const depth = Math.max(0, cursor - 1 - it.index);
              const dim = Math.min(depth, 8) * 0.045;

              const topY = size.h / 2 + ch / 2 + 36; // mulai tepat di bawah area stack
              let sx = x;
              let sr = it.rot;
              const dur = fallDuration(it.fall);
              if (it.fall === 0) { sx = x * 0.7; sr = it.rot + (it.rot >= 0 ? 8 : -8); }
              if (it.fall === 1) { sx = x - size.w * 0.14; sr = it.rot - 16; }
              if (it.fall === 2) { sx = x + size.w * 0.14; sr = it.rot + 16; }
              if (it.fall === 3) { sx = x; sr = it.rot + (it.rot >= 0 ? 30 : -30); }

              const pad = cw * 0.07;
              const photoH = cw * 0.84;

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
                animation: `pl-rise ${dur}ms linear backwards, pl-fadein 220ms ease-out backwards`,
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
                  <div
                    style={{
                      position: "relative",
                      width: "100%",
                      height: "100%",
                      filter: "drop-shadow(0 10px 12px rgba(30,4,30,0.5)) drop-shadow(1px 2px 0 rgba(0,0,0,0.25))",
                    }}
                  >
                    {/* kertas sobek krem */}
                    <div
                      style={{
                        ...paperBg("#fff7ec"),
                        position: "relative",
                        width: "100%",
                        height: "100%",
                        boxSizing: "border-box",
                        padding: `${pad}px ${pad}px 0`,
                        clipPath: it.clip,
                      }}
                    >
                      <div
                        style={{
                          position: "relative",
                          width: "100%",
                          height: photoH,
                          overflow: "hidden",
                          background: "#2a1428",
                          boxShadow: "inset 0 0 8px rgba(0,0,0,0.35)",
                        }}
                      >
                        {it.photoSrc && !errored ? (
                          <AssetImage
                            src={it.photoSrc}
                            alt={`Memory ${it.index + 1}`}
                            decoding="async"
                            draggable={false}
                            onFail={() => handleImgError(it.key)}
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                              display: "block",
                              filter: "saturate(1.05) contrast(1.02) sepia(0.07)",
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

                      <div
                        style={{
                          height: ch - pad - photoH,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          textAlign: "center",
                          fontFamily: FONT_HAND,
                          fontSize: captionFit(it.caption, cw, pad).fontSize,
                          lineHeight: 1.08,
                          color: "#d93a78",
                          padding: "0 5px",
                          whiteSpace: captionFit(it.caption, cw, pad).wrap ? "normal" : "nowrap",
                          overflowWrap: "break-word",
                          ["textWrap" as any]: "balance",
                          overflow: "hidden",
                        }}
                      >
                        {it.caption}
                      </div>

                      {/* peredup kartu lama */}
                      <div
                        aria-hidden
                        style={{
                          position: "absolute",
                          inset: 0,
                          background: "rgb(40,8,40)",
                          opacity: dim,
                          transition: "opacity 700ms ease",
                          pointerEvents: "none",
                        }}
                      />
                    </div>

                    {/* washi tape atau stiker kertas */}
                    {it.tape ? (
                      <Tape
                        color={it.tapeColor}
                        width={cw * 0.36}
                        height={16}
                        rotate={it.tapeRot}
                        style={{ top: -8, left: "50%", marginLeft: -(cw * 0.18) }}
                      />
                    ) : (
                      <PaperSticker
                        kind={it.stickerKind}
                        color={it.stickerKind === "star" ? "#FFD84A" : "#ff7fae"}
                        size={Math.max(24, cw * 0.2)}
                        rotate={it.tapeRot * 2}
                        style={{ right: -8, top: -12 }}
                      />
                    )}
                  </div>

                  {/* percikan hati pixel saat mendarat */}
                  {HEART_PUFF.map((h, i) => (
                    <span
                      key={i}
                      aria-hidden
                      className="pl-puff"
                      style={{
                        position: "absolute",
                        left: "50%",
                        bottom: "10%",
                        opacity: 0,
                        pointerEvents: "none",
                        animation: `pl-puff 1200ms ease-out ${Math.round(dur * 0.72) + i * 90}ms both`,
                        ["--dx" as any]: `${h.dx}px`,
                      } as CSSProperties}
                    >
                      <PixelHeart size={h.size} color={h.color} />
                    </span>
                  ))}
                </div>
              );
            })}
        </div>
      )}

      {counterLabel && (
        <div className="flex flex-col items-center gap-1.5" style={{ width: "min(70vw, 260px)", position: "relative", zIndex: 60 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontFamily: FONT_LED,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.16em",
              color: THEME.labelText,
            }}
          >
            <PixelHeart size={11} glow={false} />
            <span>{counterLabel}</span>
          </div>
          <PixelProgress lit={Math.min(cursor, TOTAL_TARGET)} total={TOTAL_TARGET} height={5} gap={2} />
        </div>
      )}
    </div>
  );
}