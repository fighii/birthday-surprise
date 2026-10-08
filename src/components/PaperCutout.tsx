import type { CSSProperties, ReactNode } from "react";
import { FONT_HAND, FONT_LED } from "../config/sceneTheme";
import AssetImage from "./AssetImage";

// =====================================================================
// Komponen gaya CUT-OUT PAPER (kertas gunting) untuk tema langit malam + LED
//   CutoutText   : huruf-huruf kertas ala "ransom note"
//   PaperNote    : secarik kertas bertepi sobek (untuk pesan)
//   TornPhoto    : foto di kertas bertepi sobek
//   PaperSticker : bintang / hati kertas bergaris tepi putih
//   Tape         : washi tape
// =====================================================================

export const hash01 = (n: number) => {
  const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
};

// Tekstur serat kertas (SVG data-URI, dirender sekali -> ringan di Safari)
const GRAIN = `url("data:image/svg+xml;utf8,${encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.36  0 0 0 0 0.26  0 0 0 0 0.22  0 0 0 1.2 -0.46'/></filter><rect width='120' height='120' filter='url(#n)'/></svg>",
)}")`;

export const paperBg = (color: string): CSSProperties => ({
  backgroundColor: color,
  backgroundImage: GRAIN,
  backgroundSize: "120px 120px",
  backgroundBlendMode: "multiply",
});

// Poligon tepi sobek (tidak rata di keempat sisi)
export function tornPolygon(seed: number, amp = 2.2, steps = 12): string {
  const pts: string[] = [];
  const j = (k: number) => hash01(seed * 31 + k) * amp;
  for (let i = 0; i <= steps; i++) pts.push(`${((i / steps) * 100).toFixed(1)}% ${j(i).toFixed(1)}%`);
  for (let i = 1; i < steps; i++) pts.push(`${(100 - j(40 + i)).toFixed(1)}% ${((i / steps) * 100).toFixed(1)}%`);
  for (let i = steps; i >= 0; i--) pts.push(`${((i / steps) * 100).toFixed(1)}% ${(100 - j(80 + i)).toFixed(1)}%`);
  for (let i = steps - 1; i > 0; i--) pts.push(`${j(120 + i).toFixed(1)}% ${((i / steps) * 100).toFixed(1)}%`);
  return `polygon(${pts.join(",")})`;
}

// Poligon kecil untuk potongan huruf
function letterPolygon(seed: number): string {
  const r = (k: number, a: number) => (hash01(seed * 17 + k) * a).toFixed(1);
  return `polygon(${r(1, 5)}% ${r(2, 7)}%, 45% ${r(3, 4)}%, ${(100 - Number(r(4, 5))).toFixed(1)}% ${r(5, 6)}%, ${(100 - Number(r(6, 4))).toFixed(1)}% 52%, ${(100 - Number(r(7, 5))).toFixed(1)}% ${(100 - Number(r(8, 7))).toFixed(1)}%, 55% ${(100 - Number(r(9, 4))).toFixed(1)}%, ${r(10, 5)}% ${(100 - Number(r(11, 6))).toFixed(1)}%, ${r(12, 4)}% 46%)`;
}

const SHADOW_PAPER = "drop-shadow(1px 2px 0 rgba(0,0,0,0.28)) drop-shadow(0 6px 7px rgba(0,0,0,0.38))";

// ---------------------------------------------------------------------
// Tape
// ---------------------------------------------------------------------
export function Tape({
  width = 52,
  height = 17,
  rotate = 0,
  color = "pink",
  style,
}: {
  width?: number;
  height?: number;
  rotate?: number;
  color?: "pink" | "gold" | "blue";
  style?: CSSProperties;
}) {
  const sets = {
    pink: ["rgba(255,176,208,0.80)", "rgba(255,214,230,0.80)"],
    gold: ["rgba(255,216,74,0.78)", "rgba(255,240,170,0.78)"],
    blue: ["rgba(120,170,255,0.75)", "rgba(190,215,255,0.75)"],
  }[color];
  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        width,
        height,
        transform: `rotate(${rotate}deg)`,
        background: `repeating-linear-gradient(45deg, ${sets[0]} 0 6px, ${sets[1]} 6px 12px)`,
        boxShadow: "0 1px 3px rgba(60,10,40,0.28)",
        clipPath: "polygon(0 8%, 4% 0, 8% 10%, 100% 0, 96% 50%, 100% 92%, 6% 100%, 0 90%, 3% 50%)",
        ...style,
      }}
    />
  );
}

// ---------------------------------------------------------------------
// CutoutText : huruf kertas "ransom note"
// ---------------------------------------------------------------------
const TONES = [
  { bg: "#fff7ec", fg: "#8c2f55" }, // krem + rose tua
  { bg: "#ff9cc2", fg: "#3a0f2a" }, // pink
  { bg: "#FFD84A", fg: "#4a2a00" }, // emas
  { bg: "#1b2a6b", fg: "#fff0a0" }, // biru malam + emas (nyambung dgn langit)
  { bg: "#fdeef1", fg: "#d93a78" }, // pink pucat
  { bg: "#c9a8ff", fg: "#2a1450" }, // lavender
];
const FACES: { family: string; weight: number }[] = [
  { family: 'Georgia, "Times New Roman", serif', weight: 700 },
  { family: FONT_LED, weight: 900 },
  { family: FONT_HAND, weight: 700 },
  { family: '"Courier New", Courier, monospace', weight: 700 },
];

export function CutoutText({
  text,
  fontSize = "clamp(26px, 8vw, 38px)",
  show = true,
  seed = 1,
  stagger = 55,
  delay = 0,
  reduce = false,
  style,
}: {
  text: string;
  fontSize?: string;
  show?: boolean;
  seed?: number;
  stagger?: number;
  delay?: number;
  reduce?: boolean;
  style?: CSSProperties;
}) {
  const words = text.split(/\s+/).filter(Boolean);
  let li = 0;
  return (
    <span
      aria-label={text}
      role="text"
      style={{
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        alignItems: "center",
        gap: "0.28em 0.5em",
        fontSize,
        ...style,
      }}
    >
      {words.map((w, wi) => (
        <span key={wi} aria-hidden style={{ display: "inline-flex", whiteSpace: "nowrap", filter: SHADOW_PAPER }}>
          {Array.from(w).map((ch) => {
            const i = li++;
            const k = seed * 13 + i;
            const tone = TONES[(i * 3 + seed) % TONES.length];
            const face = FACES[(i * 5 + seed * 2) % FACES.length];
            const rot = (hash01(k) - 0.5) * 12;
            const dy = (hash01(k + 3) - 0.5) * 0.18; // em
            const d = reduce ? 0 : delay + i * stagger;
            return (
              <span
                key={i}
                style={{
                  display: "inline-block",
                  margin: "0 0.03em",
                  opacity: show ? 1 : 0,
                  transform: show
                    ? `translateY(${dy}em) rotate(${rot}deg)`
                    : `translateY(-0.8em) rotate(${rot + 20}deg) scale(1.35)`,
                  transition: reduce
                    ? "none"
                    : `transform 560ms cubic-bezier(0.34,1.5,0.5,1) ${d}ms, opacity 240ms ease ${d}ms`,
                }}
              >
                <span
                  style={{
                    display: "block",
                    padding: "0.07em 0.2em 0.03em",
                    ...paperBg(tone.bg),
                    color: tone.fg,
                    fontFamily: face.family,
                    fontWeight: face.weight,
                    lineHeight: 1.08,
                    clipPath: letterPolygon(k),
                  }}
                >
                  {ch}
                </span>
              </span>
            );
          })}
        </span>
      ))}
    </span>
  );
}

// ---------------------------------------------------------------------
// PaperNote : secarik kertas bertepi sobek
// ---------------------------------------------------------------------
const NOTE_TONES = {
  cream: { bg: "#fff7ec", fg: "#8c2f55" },
  pink: { bg: "#ffd1e3", fg: "#7a1f4a" },
  kraft: { bg: "#e7c9a0", fg: "#5a3216" },
  navy: { bg: "#1b2a6b", fg: "#fff0a0" },
};

export function PaperNote({
  children,
  rotate = 0,
  tone = "cream",
  tape = true,
  tapeColor = "pink",
  seed = 1,
  style,
  innerStyle,
}: {
  children: ReactNode;
  rotate?: number;
  tone?: keyof typeof NOTE_TONES;
  tape?: boolean;
  tapeColor?: "pink" | "gold" | "blue";
  seed?: number;
  style?: CSSProperties;
  innerStyle?: CSSProperties;
}) {
  const t = NOTE_TONES[tone];
  return (
    <div
      style={{
        position: "relative",
        transform: `rotate(${rotate}deg)`,
        filter: "drop-shadow(0 10px 14px rgba(0,0,0,0.45)) drop-shadow(0 2px 3px rgba(0,0,0,0.3))",
        ...style,
      }}
    >
      <div
        style={{
          ...paperBg(t.bg),
          color: t.fg,
          padding: "16px 20px 14px",
          clipPath: tornPolygon(seed, 2.4, 14),
          ...innerStyle,
        }}
      >
        {children}
      </div>
      {tape && <Tape color={tapeColor} rotate={-4 + seed} style={{ top: -9, left: "50%", marginLeft: -26 }} />}
    </div>
  );
}

// ---------------------------------------------------------------------
// TornPhoto : foto di kertas bertepi sobek
// (parent mengatur posisi/transform lewat prop style)
// ---------------------------------------------------------------------
export function TornPhoto({
  src,
  width = 72,
  seed = 1,
  tape = true,
  tapeColor = "pink",
  caption,
  onFail,
  style,
}: {
  src: string;
  width?: number;
  seed?: number;
  tape?: boolean;
  tapeColor?: "pink" | "gold" | "blue";
  caption?: string;
  onFail?: () => void;
  style?: CSSProperties;
}) {
  const pad = width * 0.07;
  return (
    <div
      aria-hidden
      style={{
        width,
        filter: "drop-shadow(0 8px 10px rgba(0,0,0,0.5)) drop-shadow(0 1px 2px rgba(0,0,0,0.35))",
        ...style,
      }}
    >
      <div
        style={{
          ...paperBg("#fff7ec"),
          padding: `${pad}px ${pad}px 0`,
          clipPath: tornPolygon(seed, 3.2, 12),
        }}
      >
        <AssetImage
          src={src}
          alt=""
          onFail={onFail}
          draggable={false}
          style={{
            width: "100%",
            height: width * 0.8,
            objectFit: "cover",
            display: "block",
            filter: "saturate(1.05) contrast(1.02) sepia(0.06)",
          }}
        />
        <div
          style={{
            height: width * 0.22,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: FONT_HAND,
            fontSize: Math.max(10, width * 0.15),
            color: "#d93a78",
            whiteSpace: "nowrap",
          }}
        >
          {caption ?? "♥"}
        </div>
      </div>
      {tape && (
        <Tape
          color={tapeColor}
          width={width * 0.42}
          height={14}
          rotate={-6 + seed * 3}
          style={{ top: -7, left: "50%", marginLeft: -(width * 0.21) }}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------
// PaperSticker : bintang / hati kertas bergaris tepi putih
// ---------------------------------------------------------------------
const STAR = "M50 6 L61 38 L95 38 L67 58 L78 92 L50 71 L22 92 L33 58 L5 38 L39 38 Z";
const HEART = "M50 88 C12 60 6 38 22 24 C34 14 46 20 50 32 C54 20 66 14 78 24 C94 38 88 60 50 88 Z";

export function PaperSticker({
  kind = "star",
  color = "#FFD84A",
  size = 40,
  rotate = 0,
  style,
}: {
  kind?: "star" | "heart";
  color?: string;
  size?: number;
  rotate?: number;
  style?: CSSProperties;
}) {
  const d = kind === "star" ? STAR : HEART;
  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        width: size,
        height: size,
        transform: `rotate(${rotate}deg)`,
        filter: "drop-shadow(1px 3px 0 rgba(0,0,0,0.25)) drop-shadow(0 6px 8px rgba(0,0,0,0.4))",
        pointerEvents: "none",
        ...style,
      }}
    >
      <svg viewBox="0 0 100 100" width="100%" height="100%">
        <path d={d} fill="#fffaf0" stroke="#fffaf0" strokeWidth="14" strokeLinejoin="round" />
        <path d={d} fill={color} />
      </svg>
    </div>
  );
}