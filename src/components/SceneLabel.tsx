import type { CSSProperties, ReactNode } from "react";
import { THEME, FONT_LED } from "../config/sceneTheme";

interface SceneLabelProps {
  children: ReactNode;
  visible?: boolean;
  style?: CSSProperties;
}

// Label kecil huruf kapital ber-spasi: "✦ TEKS ✦" (gaya sama dengan "TAP-TAP LAYAR UNTUK WISHES")
export default function SceneLabel({ children, visible = true, style }: SceneLabelProps) {
  return (
    <div
      aria-hidden
      className="pointer-events-none select-none text-center"
      style={{
        fontFamily: FONT_LED,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.16em",
        textTransform: "uppercase",
        color: THEME.labelText,
        opacity: visible ? 1 : 0,
        transition: "opacity 0.8s ease",
        ...style,
      }}
    >
      <span style={{ color: THEME.spark }}>✦</span> {children} <span style={{ color: THEME.spark }}>✦</span>
    </div>
  );
}
