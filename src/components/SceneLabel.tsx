import { useMemo } from "react";
import type { CSSProperties, ReactNode } from "react";
import { FONT_LED } from "../config/sceneTheme";
import { Tape, hash01, tornPolygon } from "./PaperCutout";
import { paperBg } from "./PaperExtras";

type Tone = "cream" | "pink" | "kraft" | "navy" | "gold";

const TONES: Record<Tone, { bg: string; fg: string; spark: string }> = {
  cream: { bg: "#fff7ec", fg: "#8c2f55", spark: "#ff5d98" },
  pink: { bg: "#ffd1e3", fg: "#7a1f4a", spark: "#e23d7c" },
  kraft: { bg: "#e7c9a0", fg: "#5a3216", spark: "#e0701a" },
  navy: { bg: "#1b2a6b", fg: "#fff0a0", spark: "#FFD84A" },
  gold: { bg: "#FFD84A", fg: "#4a2a00", spark: "#e0701a" },
};
const ORDER: Tone[] = ["cream", "navy", "pink", "kraft", "gold"];
const TAPES = ["pink", "gold", "blue"] as const;

interface SceneLabelProps {
  children: ReactNode;
  visible?: boolean;
  style?: CSSProperties;
  /** warna kertas; default dipilih otomatis dari teks agar tiap label beda */
  tone?: Tone;
  /** kemiringan (derajat); default acak-deterministik dari teks */
  rotate?: number;
}

const seedOf = (s: string) => {
  let h = 7;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 9973;
  return h;
};

// Label kecil berupa potongan kertas sobek + tape, bintang pixel berkedip di kedua ujung.
// Props lama (children, visible, style) tetap berlaku, jadi semua scene otomatis ikut.
export default function SceneLabel({ children, visible = true, style, tone, rotate }: SceneLabelProps) {
  const seed = useMemo(() => seedOf(typeof children === "string" ? children : "label"), [children]);
  const t = TONES[tone ?? ORDER[seed % ORDER.length]];
  const rot = rotate ?? (hash01(seed) - 0.5) * 5;
  const clip = useMemo(() => tornPolygon(seed, 6, 8), [seed]);
  const tapeColor = TAPES[seed % TAPES.length];

  return (
    <div
      aria-hidden
      className="pointer-events-none select-none text-center"
      style={{
        position: "relative",
        display: "inline-block",
        opacity: visible ? 1 : 0,
        transform: visible ? `rotate(${rot}deg) translateY(0)` : `rotate(${rot + 6}deg) translateY(-10px) scale(1.12)`,
        transition: "opacity 0.8s ease, transform 0.7s cubic-bezier(0.34,1.5,0.5,1)",
        filter: "drop-shadow(1px 2px 0 rgba(0,0,0,0.28)) drop-shadow(0 5px 6px rgba(0,0,0,0.35))",
        ...style,
      }}
    >
      <style>{`@keyframes slTwinkle{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.35;transform:scale(.7)}}`}</style>
      <div
        style={{
          ...paperBg(t.bg),
          color: t.fg,
          fontFamily: FONT_LED,
          fontSize: 11,
          fontWeight: 800,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          padding: "6px 16px 5px",
          clipPath: clip,
          whiteSpace: "nowrap",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <span style={{ color: t.spark, display: "inline-block", animation: "slTwinkle 2.4s ease-in-out infinite" }}>✦</span>
        <span>{children}</span>
        <span style={{ color: t.spark, display: "inline-block", animation: "slTwinkle 2.4s ease-in-out 1.2s infinite" }}>✦</span>
      </div>
      <Tape
        width={26}
        height={11}
        rotate={-14 + (seed % 9)}
        color={tapeColor}
        style={{ top: -5, left: -8 }}
      />
    </div>
  );
}