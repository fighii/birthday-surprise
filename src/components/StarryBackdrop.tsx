import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { THEME, WISH_PALETTE } from "../config/sceneTheme";

export interface StarryBackdropHandle {
  /** Percikan titik-titik LED + garis tipis di koordinat layar (clientX/clientY). */
  burst: (clientX: number, clientY: number, colors?: string[]) => void;
}

interface StarryBackdropProps {
  active?: boolean;
  /** night = biru malam (seperti kembang api) · romance = biru malam yang memudar ke plum-rose */
  variant?: "night" | "romance";
  density?: number; // pengali jumlah bintang (default 1)
}

type Star = { x: number; y: number; vx: number; vy: number; size: number; alpha: number; phase: number };
type PixHeart = { x: number; y: number; vy: number; alpha: number; phase: number; cell: number };
type Spark = {
  x: number; y: number; vx: number; vy: number;
  life: number; max: number; color: string; streak: boolean; drag: number;
};

const HEART_PIX = [
  [0, 1, 0, 1, 0],
  [1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1],
  [0, 1, 1, 1, 0],
  [0, 0, 1, 0, 0],
];

const BG: Record<"night" | "romance", string> = {
  night: [
    "radial-gradient(90% 60% at 50% 36%, rgba(30,70,170,0.50), rgba(10,20,60,0) 70%)",
    `linear-gradient(180deg, ${THEME.night} 0%, #070d2a 50%, #0a0f2e 100%)`,
  ].join(","),
  romance: [
    "radial-gradient(85% 50% at 50% 28%, rgba(40,80,190,0.36), rgba(10,20,60,0) 70%)",
    "radial-gradient(90% 55% at 50% 88%, rgba(190,60,130,0.26), rgba(60,10,60,0) 72%)",
    `linear-gradient(180deg, ${THEME.night} 0%, ${THEME.nightMid} 52%, ${THEME.plum} 100%)`,
  ].join(","),
};

const StarryBackdrop = forwardRef<StarryBackdropHandle, StarryBackdropProps>(function StarryBackdrop(
  { active = true, variant = "romance", density = 1 },
  ref,
) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sparksRef = useRef<Spark[]>([]);
  const sizeRef = useRef({ w: 0, h: 0 });

  useImperativeHandle(ref, () => ({
    burst(clientX, clientY, colors) {
      const c = canvasRef.current;
      if (!c) return;
      const r = c.getBoundingClientRect();
      const x = clientX - r.left;
      const y = clientY - r.top;
      const pal = colors && colors.length ? colors : WISH_PALETTE[(Math.random() * WISH_PALETTE.length) | 0];
      const arr = sparksRef.current;
      if (arr.length > 420) return;
      // titik LED (gumpalan kecil)
      for (let i = 0; i < 44; i++) {
        const a = Math.random() * Math.PI * 2;
        const dist = 8 + Math.sqrt(Math.random()) * 34;
        const drag = 0.92;
        const v0 = dist / (16.67 / -Math.log(drag));
        arr.push({
          x, y, vx: Math.cos(a) * v0, vy: Math.sin(a) * v0,
          life: 0, max: 900 + Math.random() * 700,
          color: Math.random() < 0.72 ? pal[0] : pal[1] ?? pal[0],
          streak: false, drag,
        });
      }
      // garis tipis memancar
      for (let i = 0; i < 12; i++) {
        const a = Math.random() * Math.PI * 2;
        const drag = 0.965;
        const v0 = (30 + Math.random() * 36) / (16.67 / -Math.log(drag));
        arr.push({
          x, y, vx: Math.cos(a) * v0, vy: Math.sin(a) * v0,
          life: 0, max: 800 + Math.random() * 500,
          color: pal[1] ?? pal[0], streak: true, drag,
        });
      }
    },
  }));

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    let stars: Star[] = [];
    let hearts: PixHeart[] = [];
    let dpr = 1;

    const init = () => {
      const { w, h } = sizeRef.current;
      const n = Math.round((reduced ? 45 : 90) * density);
      stars = Array.from({ length: n }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.02,
        vy: -0.005 - Math.random() * 0.02,
        size: Math.random() < 0.15 ? 2 : 1,
        alpha: 0.35 + Math.random() * 0.6,
        phase: Math.random() * Math.PI * 2,
      }));
      hearts = Array.from({ length: reduced ? 3 : 7 }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vy: -0.012 - Math.random() * 0.02,
        alpha: 0.18 + Math.random() * 0.2,
        phase: Math.random() * Math.PI * 2,
        cell: Math.random() < 0.5 ? 2 : 3,
      }));
    };

    const resize = () => {
      const r = wrap.getBoundingClientRect();
      dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
      sizeRef.current = { w: r.width, h: r.height };
      canvas.width = Math.floor(r.width * dpr);
      canvas.height = Math.floor(r.height * dpr);
      canvas.style.width = r.width + "px";
      canvas.style.height = r.height + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      init();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(48, now - last);
      last = now;
      const { w, h } = sizeRef.current;
      ctx.clearRect(0, 0, w, h);

      // bintang kotak (sama seperti kembang api)
      ctx.fillStyle = "#ffffff";
      for (const s of stars) {
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.phase += 0.002 * dt;
        if (s.y < -5) { s.y = h + 5; s.x = Math.random() * w; }
        if (s.x < -5) s.x = w + 5; else if (s.x > w + 5) s.x = -5;
        ctx.globalAlpha = s.alpha * (0.65 + 0.35 * Math.sin(s.phase));
        ctx.fillRect(Math.round(s.x), Math.round(s.y), s.size, s.size);
      }

      // hati pixel-art yang naik pelan
      ctx.fillStyle = THEME.rose;
      for (const hh of hearts) {
        hh.y += hh.vy * dt;
        hh.phase += 0.0015 * dt;
        if (hh.y < -20) { hh.y = h + 20; hh.x = Math.random() * w; }
        ctx.globalAlpha = hh.alpha * (0.7 + 0.3 * Math.sin(hh.phase));
        const c = hh.cell;
        const bx = Math.round(hh.x);
        const by = Math.round(hh.y);
        for (let r = 0; r < 5; r++)
          for (let q = 0; q < 5; q++)
            if (HEART_PIX[r][q]) ctx.fillRect(bx + q * c, by + r * c, c, c);
      }

      // percikan dari burst()
      const arr = sparksRef.current;
      if (arr.length) {
        ctx.globalCompositeOperation = "lighter";
        const f = dt / 16.67;
        for (let i = arr.length - 1; i >= 0; i--) {
          const p = arr[i];
          p.life += dt;
          if (p.life >= p.max) { arr[i] = arr[arr.length - 1]; arr.pop(); continue; }
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
        ctx.globalCompositeOperation = "source-over";
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [active, density]);

  return (
    <div
      ref={wrapRef}
      aria-hidden
      className="pointer-events-none"
      style={{ position: "absolute", inset: 0, zIndex: 0, overflow: "hidden", background: BG[variant] }}
    >
      <canvas ref={canvasRef} style={{ display: "block", position: "absolute", inset: 0 }} />
      {/* vinyet halus (tanpa tepi keras) */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(120% 90% at 50% 45%, rgba(0,0,0,0) 55%, rgba(2,3,12,0.55) 100%)",
        }}
      />
    </div>
  );
});

export default StarryBackdrop;
