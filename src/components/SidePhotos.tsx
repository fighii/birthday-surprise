import { useEffect, useMemo, useState } from "react";
import { TornPhoto, hash01 } from "./PaperCutout";

// Foto latar di sisi kiri/kanan layar (selang-seling), menyembul dari belakang konten.
// WAJIB ditaruh di dalam container `relative` yang membuat stacking context (mis. `relative z-10`),
// karena lapisan ini memakai zIndex -1 supaya berada di belakang teks.
export default function SidePhotos({
  photos = [],
  visible = true,
  seed = 1,
  max = 6,
  leftPeek = 0.5,
  rightPeek = 0.5,
}: {
  photos?: string[];
  visible?: boolean;
  seed?: number;
  max?: number;
  /** porsi foto (0-1) yang terlihat di layar */
  leftPeek?: number;
  rightPeek?: number;
}) {
  const list = useMemo(
    () => (photos || []).filter((p) => typeof p === "string" && p.length > 0).slice(0, max),
    [photos, max],
  );
  const [failed, setFailed] = useState<Record<number, boolean>>({});
  const [vw, setVw] = useState(() => (typeof window === "undefined" ? 400 : window.innerWidth));
  useEffect(() => {
    const on = () => setVw(window.innerWidth);
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  if (!list.length) return null;

  const w = Math.round(Math.min(112, Math.max(64, vw * 0.19)));
  const n = list.length;

  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        top: 0,
        bottom: 0,
        left: "50%",
        width: "100vw",
        marginLeft: "-50vw",
        overflow: "hidden",
        pointerEvents: "none",
        zIndex: -1,
      }}
    >
      {list.map((src, i) => {
        if (failed[i]) return null;
        const left = i % 2 === 0;
        const peek = left ? leftPeek : rightPeek;
        const hide = -(1 - peek) * w;
        const rot = (hash01(seed * 9 + i) - 0.5) * 22 + (left ? -5 : 5);
        const d = 300 + i * 180;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              top: `${((i + 0.5) / n) * 100}%`,
              [left ? "left" : "right"]: hide,
              width: w,
              marginTop: -w * 0.55,
            }}
          >
            <div
              style={{
                opacity: visible ? 0.95 : 0,
                transform: visible ? "translateX(0)" : `translateX(${left ? -50 : 50}px)`,
                transition: `opacity 900ms ease ${d}ms, transform 900ms cubic-bezier(0.22,0.8,0.3,1) ${d}ms`,
              }}
            >
              <TornPhoto
                src={src}
                width={w}
                seed={i + 3}
                caption=""
                tapeColor={(["pink", "gold", "blue"] as const)[i % 3]}
                onFail={() => setFailed((f) => ({ ...f, [i]: true }))}
                style={{ transform: `rotate(${rot}deg)` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
