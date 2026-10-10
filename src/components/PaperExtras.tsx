import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from "react";
import { FONT_HAND, FONT_LED, THEME, WISH_PALETTE } from "../config/sceneTheme";
import { Tape, tornPolygon, paperBg } from "./PaperCutout";

// =====================================================================
// Komponen tambahan tema CUT-OUT PAPER + PIXEL FIREWORKS
//   usePrefersReducedMotion : hook reduce-motion
//   paperBg                 : tekstur kertas (dipakai banyak scene)
//   PixelHeart              : hati pixel-art (SVG)
//   PixelProgress           : bar progres kotak-kotak LED
//   PixelDivider            : garis pemisah titik LED
//   PaperButton             : tombol kertas bertepi sobek
//   PaperFrame              : bingkai foto/video kertas sobek + tape
//   PixelBurstLayer         : lapisan percikan kembang api pixel (burst())
// =====================================================================

export function usePrefersReducedMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduce(m.matches);
    const handler = (e: MediaQueryListEvent) => setReduce(e.matches);
    m.addEventListener?.("change", handler);
    return () => m.removeEventListener?.("change", handler);
  }, []);
  return reduce;
}

// paperBg ada di PaperCutout.tsx (di-export ulang di sini agar import lama tetap jalan)
export { paperBg };

// ---------------------------------------------------------------------
// PixelHeart
// ---------------------------------------------------------------------
const HEART_GRID = [
  [0, 1, 1, 0, 0, 0, 1, 1, 0],
  [1, 1, 1, 1, 0, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1],
  [0, 1, 1, 1, 1, 1, 1, 1, 0],
  [0, 0, 1, 1, 1, 1, 1, 0, 0],
  [0, 0, 0, 1, 1, 1, 0, 0, 0],
  [0, 0, 0, 0, 1, 0, 0, 0, 0],
];

export function PixelHeart({
  size = 18,
  color = "#ff5d98",
  highlight = "#ffd1e3",
  glow = true,
  style,
}: {
  size?: number;
  color?: string;
  highlight?: string;
  glow?: boolean;
  style?: CSSProperties;
}) {
  const rects: ReactNode[] = [];
  HEART_GRID.forEach((row, r) =>
    row.forEach((on, c) => {
      if (on) {
        rects.push(
          <rect key={`${r}-${c}`} x={c} y={r} width={1.04} height={1.04} fill={r <= 1 && c <= 2 ? highlight : color} />,
        );
      }
    }),
  );
  return (
    <svg
      aria-hidden
      width={size}
      height={(size * 8) / 9}
      viewBox="0 0 9 8"
      shapeRendering="crispEdges"
      style={{
        display: "block",
        flexShrink: 0,
        filter: glow ? `drop-shadow(0 0 ${Math.max(3, size * 0.28)}px ${color})` : undefined,
        ...style,
      }}
    >
      {rects}
    </svg>
  );
}

// ---------------------------------------------------------------------
// PixelProgress : kotak-kotak LED menyala
// ---------------------------------------------------------------------
export function PixelProgress({
  lit,
  total,
  width = "100%",
  height = 5,
  gap = 2,
  color = THEME.rose,
  offColor = "rgba(255,200,222,0.2)",
  style,
}: {
  lit: number;
  total: number;
  width?: string | number;
  height?: number;
  gap?: number;
  color?: string;
  offColor?: string;
  style?: CSSProperties;
}) {
  return (
    <div aria-hidden style={{ display: "flex", gap, width, height, ...style }}>
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          style={{
            flex: 1,
            background: i < lit ? color : offColor,
            boxShadow: i < lit ? `0 0 5px ${color}` : "none",
            transition: "all 300ms ease",
          }}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------
// PixelDivider : titik-titik LED berselang-seling
// ---------------------------------------------------------------------
export function PixelDivider({
  count = 9,
  size = 5,
  gap = 7,
  colors = [THEME.rose, THEME.gold],
  style,
}: {
  count?: number;
  size?: number;
  gap?: number;
  colors?: string[];
  style?: CSSProperties;
}) {
  return (
    <div aria-hidden style={{ display: "flex", gap, justifyContent: "center", ...style }}>
      {Array.from({ length: count }).map((_, i) => {
        const c = colors[i % colors.length];
        return <span key={i} style={{ width: size, height: size, background: c, boxShadow: `0 0 6px ${c}` }} />;
      })}
    </div>
  );
}

// ---------------------------------------------------------------------
// PaperButton : tombol kertas bertepi sobek
// ---------------------------------------------------------------------
type PaperButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "navy";
  seed?: number;
  tape?: boolean;
};

const BTN_TONES = {
  primary: { bg: "#FFD84A", fg: "#4a2a00" },
  secondary: { bg: "#fff7ec", fg: "#8c2f55" },
  navy: { bg: "#1b2a6b", fg: "#fff0a0" },
};

export const PaperButton = forwardRef<HTMLButtonElement, PaperButtonProps>(function PaperButton(
  { variant = "primary", seed = 1, tape, style, children, ...rest },
  ref,
) {
  const t = BTN_TONES[variant];
  const clip = useMemo(() => tornPolygon(seed, 3.5, 8), [seed]);
  const showTape = tape ?? variant === "primary";
  return (
    <button
      ref={ref}
      type="button"
      className="pp-btn"
      {...rest}
      style={{
        position: "relative",
        background: "transparent",
        border: 0,
        padding: 0,
        cursor: "pointer",
        minHeight: 44,
        filter: "drop-shadow(1px 3px 0 rgba(0,0,0,0.3)) drop-shadow(0 8px 10px rgba(0,0,0,0.4))",
        WebkitTapHighlightColor: "transparent",
        touchAction: "manipulation",
        ...style,
      }}
    >
      <style>{`.pp-btn > .pp-face{transition:transform 140ms ease}.pp-btn:active > .pp-face{transform:translateY(2px) scale(.97)}`}</style>
      <span
        className="pp-face"
        style={{
          display: "block",
          padding: "13px 24px",
          ...paperBg(t.bg),
          color: t.fg,
          fontFamily: FONT_LED,
          fontWeight: 800,
          fontSize: 14,
          letterSpacing: "0.1em",
          lineHeight: 1.15,
          clipPath: clip,
          whiteSpace: "nowrap",
        }}
      >
        {children}
      </span>
      {showTape && <Tape width={34} height={13} rotate={-12 + seed * 4} color="pink" style={{ top: -6, left: -8 }} />}
    </button>
  );
});

// ---------------------------------------------------------------------
// PaperFrame : bingkai kertas sobek untuk foto / video + tape
// ---------------------------------------------------------------------
export function PaperFrame({
  children,
  width,
  seed = 1,
  rotate = 0,
  tapeColor = "pink",
  caption = "♥",
  pad = 10,
  captionHeight = 34,
  style,
}: {
  children: ReactNode;
  width?: string | number;
  seed?: number;
  rotate?: number;
  tapeColor?: "pink" | "gold" | "blue";
  caption?: string;
  pad?: number;
  captionHeight?: number;
  style?: CSSProperties;
}) {
  const clip = useMemo(() => tornPolygon(seed, 1.8, 14), [seed]);
  return (
    <div
      style={{
        position: "relative",
        width,
        display: width ? "block" : "inline-block",
        transform: `rotate(${rotate}deg)`,
        // satu drop-shadow (dulu dua): bingkai besar, jadi biaya blur-nya terasa di HP
        filter: "drop-shadow(0 12px 14px rgba(0,0,0,0.5))",
        ...style,
      }}
    >
      <div style={{ ...paperBg("#fff7ec"), padding: `${pad}px ${pad}px 0`, clipPath: clip }}>
        <div style={{ position: "relative", overflow: "hidden", background: "#1a0f2a" }}>{children}</div>
        <div
          style={{
            height: captionHeight,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: FONT_HAND,
            fontSize: 20,
            color: "#d93a78",
            whiteSpace: "nowrap",
          }}
        >
          {caption}
        </div>
      </div>
      <Tape color={tapeColor} rotate={-9} style={{ top: -8, left: -12 }} />
      <Tape color="gold" rotate={8} style={{ top: -8, right: -12 }} />
    </div>
  );
}

// ---------------------------------------------------------------------
// PixelBurstLayer : percikan titik LED + garis tipis di seluruh layar
// ---------------------------------------------------------------------
type Spark = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  color: string;
  streak: boolean;
  drag: number;
};

export interface PixelBurstHandle {
  burst: (x: number, y: number, colors?: string[], power?: number) => void;
}

export const PixelBurstLayer = forwardRef<PixelBurstHandle, { zIndex?: number }>(function PixelBurstLayer(
  { zIndex = 40 },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sparks = useRef<Spark[]>([]);
  const raf = useRef<number | null>(null);
  const last = useRef(0);
  const size = useRef({ w: 0, h: 0 });

  const fit = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    const w = window.innerWidth;
    const h = window.innerHeight;
    size.current = { w, h };
    c.width = Math.floor(w * dpr);
    c.height = Math.floor(h * dpr);
    c.style.width = w + "px";
    c.style.height = h + "px";
    c.getContext("2d")?.setTransform(dpr, 0, 0, dpr, 0, 0);
  }, []);

  useEffect(() => {
    fit();
    window.addEventListener("resize", fit);
    return () => {
      window.removeEventListener("resize", fit);
      if (raf.current !== null) cancelAnimationFrame(raf.current);
      raf.current = null;
      sparks.current = [];
    };
  }, [fit]);

  function step(now: number) {
    const c = canvasRef.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx) {
      raf.current = null;
      return;
    }
    const dt = Math.min(48, now - last.current);
    last.current = now;
    const { w, h } = size.current;
    ctx.clearRect(0, 0, w, h);
    const arr = sparks.current;
    ctx.globalCompositeOperation = "lighter";
    const f = dt / 16.67;
    for (let i = arr.length - 1; i >= 0; i--) {
      const p = arr[i];
      p.life += dt;
      if (p.life >= p.max) {
        arr[i] = arr[arr.length - 1];
        arr.pop();
        continue;
      }
      const d = Math.pow(p.drag, f);
      p.vx *= d;
      p.vy = p.vy * d + 0.00003 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      const fr = p.life / p.max;
      const a = fr < 0.05 ? fr / 0.05 : fr > 0.45 ? Math.max(0, 1 - (fr - 0.45) / 0.55) : 1;
      ctx.fillStyle = p.color;
      if (p.streak) {
        ctx.globalAlpha = a * 0.9;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(p.x - p.vx * 55, p.y - p.vy * 55);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
      } else {
        ctx.globalAlpha = a * 0.16;
        ctx.fillRect(p.x - 2.5, p.y - 2.5, 5, 5);
        ctx.globalAlpha = a;
        ctx.fillRect(Math.round(p.x - 1), Math.round(p.y - 1), 2, 2);
      }
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    if (arr.length) {
      raf.current = requestAnimationFrame(step);
    } else {
      ctx.clearRect(0, 0, w, h);
      raf.current = null;
    }
  }

  useImperativeHandle(ref, () => ({
    burst(x, y, colors, power = 1) {
      const pal = colors && colors.length ? colors : WISH_PALETTE[(Math.random() * WISH_PALETTE.length) | 0];
      const arr = sparks.current;
      if (arr.length > 520) return;
      const dots = Math.round(44 * power);
      for (let i = 0; i < dots; i++) {
        const a = Math.random() * Math.PI * 2;
        const dist = (8 + Math.sqrt(Math.random()) * 34) * Math.sqrt(power);
        const drag = 0.92;
        const v0 = dist / (16.67 / -Math.log(drag));
        arr.push({
          x, y, vx: Math.cos(a) * v0, vy: Math.sin(a) * v0,
          life: 0, max: 900 + Math.random() * 700,
          color: Math.random() < 0.72 ? pal[0] : pal[1] ?? pal[0],
          streak: false, drag,
        });
      }
      const lines = Math.round(12 * power);
      for (let i = 0; i < lines; i++) {
        const a = Math.random() * Math.PI * 2;
        const drag = 0.965;
        const v0 = ((30 + Math.random() * 36) * Math.sqrt(power)) / (16.67 / -Math.log(drag));
        arr.push({
          x, y, vx: Math.cos(a) * v0, vy: Math.sin(a) * v0,
          life: 0, max: 800 + Math.random() * 500,
          color: pal[1] ?? pal[0], streak: true, drag,
        });
      }
      if (raf.current === null) {
        last.current = performance.now();
        raf.current = requestAnimationFrame(step);
      }
    },
  }));

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none"
      style={{ position: "fixed", inset: 0, zIndex, display: "block" }}
    />
  );
});