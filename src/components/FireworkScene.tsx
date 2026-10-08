import { useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as RPointerEvent } from "react";
import { useStory } from "../context/StoryContext";
import { fireworkConfig as fwCfg } from "../config/media.js";

const FWState = {
  IDLE: 0,
  MAIN_LAUNCH: 1,
  MAIN_EXPLODE: 2,
  MAIN_TEXT: 3,
  WISH_LAUNCH: 4,
  WISH_EXPLODE: 5,
  WISH_TEXT: 6,
  FINAL_LAUNCH: 7,
  FINAL_EXPLODE: 8,
  FINAL_TEXT: 9,
  TRANSITION_OUT: 10,
  DONE: 11,
} as const;
type FWStateKind = typeof FWState[keyof typeof FWState];

// streak  = garis tipis memancar (ledakan utama, seperti di video)
// blob    = gumpalan padat berwarna (awal setiap wish)
// textForm= titik-titik penyusun huruf
type ParticleKind = "streak" | "blob" | "sparkle" | "textForm";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number; // boleh negatif = delay sebelum mulai
  maxLife: number;
  size: number;
  color: string;
  kind: ParticleKind;
  gravity: number;
  drag: number;
  // khusus textForm
  tx?: number;
  ty?: number;
  startX?: number;
  startY?: number;
  tweenDur?: number;
  fadeStart?: number;
  fadeDur?: number;
}

interface Rocket {
  x: number;
  y: number;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  startAt: number;
  duration: number;
  color: string;
  size: number;
  t: number;
}

interface FloatingStar {
  x: number;
  y: number;
  vy: number;
  vx: number;
  size: number;
  alpha: number;
  phase: number;
}

interface TextAnim {
  textFormationDuration: number;
  textHoldDuration: number;
  fadeDuration: number;
}

// Warna ledakan utama (biru seperti di video)
const STREAK_BLUE = ["#2F6BFF", "#4F8BFF", "#7FB0FF", "#A8CCFF"];
// Warna wish: kuning, hijau, pink, tosca, ungu, biru, oranye (primer, aksen)
const PALETTE_WISH: string[][] = [
  ["#FFD84A", "#FFF0A0"],
  ["#7CFF5B", "#C6FF9A"],
  ["#FF7BD5", "#FFB3EA"],
  ["#40F0D0", "#A0FFEA"],
  ["#B07CFF", "#DCC8FF"],
  ["#5AA8FF", "#B0D6FF"],
  ["#FF9A4A", "#FFCB9C"],
];

// Tap tercepat yang diterima: 1 detik
const TAP_COOLDOWN_MS = 1000;

// konstanta: jarak total partikel = v0 * K(drag)
const kDist = (drag: number) => 16.67 / -Math.log(drag);

export default function FireworkScene() {
  const { currentScene, goToScene, tryAutoStartScene2 } = useStory();
  const active = currentScene === 2;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const stateRef = useRef<FWStateKind>(FWState.IDLE);
  const [hintMode, setHintMode] = useState<"start" | "wish" | "off">("off");
  const doneTriggeredRef = useRef(false);
  const startedRef = useRef(false);
  const musicStartedRef = useRef(false);
  const timersRef = useRef<number[]>([]);
  const finalScheduledRef = useRef(false);
  const lastTapRef = useRef(0);
  const lastWishPosRef = useRef<{ x: number; y: number } | null>(null);
  const tapIdxRef = useRef(0);
  const paletteIdxRef = useRef(0);

  // ==========================================
  // Firework Config Normalizer (format lama & baru)
  // ==========================================
  const resolvedCfg = useMemo(() => {
    const raw = fwCfg && fwCfg.enabled ? fwCfg : null;
    if (!raw) {
      return {
        enabled: false,
        mainBirthday: { text: "", launchDuration: 1800, explosionDelay: 300, textFormationDuration: 1000, textHoldDuration: 2200, displayDuration: 2800 },
        wishes: { interval: 1000, animation: { launchDuration: 720, explosionDelay: 260, textFormationDuration: 900, textHoldDuration: 1800, fadeDuration: 900 }, items: [] as any[] },
        ending: { text: "", duration: 3000, launchDuration: 1900 },
      };
    }
    const main = Object.assign(
      { text: "HAPPY BIRTHDAY!", launchDuration: 1800, explosionDelay: 300, textFormationDuration: 1000, textHoldDuration: 2200, displayDuration: 2800 },
      raw.mainBirthday || {},
    );
    if (main.displayDuration < 1500 && main.textFormationDuration > 0 && main.textHoldDuration > 0) {
      main.displayDuration = (main.explosionDelay || 0) + main.textFormationDuration + main.textHoldDuration;
    }
    const ending = Object.assign({ text: "", duration: 3000, launchDuration: 1900 }, raw.ending || {});

    let interval = 1000;
    let animWish = { launchDuration: 720, explosionDelay: 260, textFormationDuration: 900, textHoldDuration: 1800, fadeDuration: 900 };
    let items: any[] = [];

    const spreadDefault = [
      { x: 0.50, y: 0.22 }, { x: 0.24, y: 0.40 }, { x: 0.76, y: 0.40 },
      { x: 0.50, y: 0.58 }, { x: 0.22, y: 0.72 }, { x: 0.78, y: 0.72 },
      { x: 0.50, y: 0.40 }, { x: 0.32, y: 0.58 }, { x: 0.68, y: 0.58 },
    ];
    const fromStrings = (strings: string[]) =>
      strings.map((text, i) => ({
        text,
        position: spreadDefault[i % spreadDefault.length],
        launch: { x: 0.5, y: 0.95 },
      }));

    const rawWishes: any = raw.wishes;
    if (Array.isArray(rawWishes)) {
      const strings = rawWishes.map((s: any) => String(s || "")).filter(Boolean);
      interval = typeof (raw as any).wishInterval === "number" ? (raw as any).wishInterval : interval;
      items = fromStrings(strings);
    } else if (rawWishes && typeof rawWishes === "object") {
      if (typeof rawWishes.interval === "number") interval = Math.max(100, rawWishes.interval);
      else if (typeof (raw as any).wishInterval === "number") interval = Math.max(100, (raw as any).wishInterval);
      if (rawWishes.animation && typeof rawWishes.animation === "object") {
        animWish = Object.assign({}, animWish, rawWishes.animation);
      }
      if (Array.isArray(rawWishes.items)) {
        items = rawWishes.items
          .map((it: any) => {
            if (!it) return null;
            const text = typeof it === "string" ? it : String(it.text || "");
            if (!text) return null;
            const pos = it.position || it.pos || null;
            const lch = it.launch || it.from || null;
            return {
              text,
              position: {
                x: pos && typeof pos.x === "number" ? pos.x : 0.5,
                y: pos && typeof pos.y === "number" ? pos.y : 0.4,
              },
              launch: {
                x: lch && typeof lch.x === "number" ? lch.x : 0.5,
                y: lch && typeof lch.y === "number" ? lch.y : 0.95,
              },
            };
          })
          .filter(Boolean);
      }
    }

    return {
      enabled: true,
      mainBirthday: main,
      wishes: { interval, animation: animWish, items },
      ending,
    };
  }, []);

  const wishes = useMemo(() => resolvedCfg.wishes.items || [], [resolvedCfg]);

  const reduced = typeof window !== "undefined"
    ? window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    : false;
  const MAX_PARTICLES = reduced ? 1400 : 2600;

  const particlesRef = useRef<Particle[]>([]);
  const rocketsRef = useRef<Rocket[]>([]);
  const starsRef = useRef<FloatingStar[]>([]);
  const transitionOutStartRef = useRef<number>(0);

  // Partikel teks SELALU masuk (agar huruf tidak bolong); efek lain dibuang bila penuh.
  const spawnParticle = (p: Particle) => {
    const arr = particlesRef.current;
    if (p.kind !== "textForm" && arr.length >= MAX_PARTICLES) return;
    arr.push(p);
  };

  const clearTimers = () => {
    for (const t of timersRef.current) window.clearTimeout(t);
    timersRef.current = [];
  };
  const addTimer = (fn: () => void, ms: number) => {
    const id = window.setTimeout(() => {
      timersRef.current = timersRef.current.filter((x) => x !== id);
      fn();
    }, ms);
    timersRef.current.push(id);
    return id;
  };

  const initStars = (w: number, h: number) => {
    const count = reduced ? 45 : 90;
    const arr: FloatingStar[] = [];
    for (let i = 0; i < count; i++) {
      arr.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.02,
        vy: -0.005 - Math.random() * 0.02,
        size: Math.random() < 0.15 ? 2 : 1,
        alpha: 0.35 + Math.random() * 0.6,
        phase: Math.random() * Math.PI * 2,
      });
    }
    starsRef.current = arr;
  };

  const resetScene = () => {
    stateRef.current = FWState.IDLE;
    particlesRef.current = [];
    rocketsRef.current = [];
    doneTriggeredRef.current = false;
    transitionOutStartRef.current = 0;
    finalScheduledRef.current = false;
    tapIdxRef.current = 0;
    paletteIdxRef.current = 0;
    lastWishPosRef.current = null;
    clearTimers();
    setHintMode("off");
  };

  // =====================================================================
  // Sampling teks -> titik-titik tipis (tanpa outline, font tidak terlalu tebal)
  // Maks 2 baris, seimbang, otomatis mengecil bila melebihi safe area.
  // =====================================================================
  const sampleTextPoints = (
    text: string,
    fontSize: number,
    cw: number,
    ch: number,
    centerX: number,
    centerY: number,
  ): { x: number; y: number }[] => {
    const off = document.createElement("canvas");
    off.width = Math.max(2, Math.ceil(cw));
    off.height = Math.max(2, Math.ceil(ch));
    const octx = off.getContext("2d", { willReadFrequently: true });
    if (!octx) return [];
    octx.fillStyle = "#fff";
    octx.textAlign = "center";
    octx.textBaseline = "middle";

    const safePadX = Math.max(18, cw * 0.08);
    const safeL = safePadX;
    const safeR = cw - safePadX;
    const safeT = Math.max(100, ch * 0.12); // beri ruang untuk label "TAP-TAP"
    const safeB = ch - Math.max(60, ch * 0.08);
    const safeW = Math.max(60, safeR - safeL);

    const fontStr = (s: number) => `700 ${s}px Inter, system-ui, -apple-system, "Segoe UI", sans-serif`;
    const measure = (str: string, s: number) => {
      octx.font = fontStr(s);
      return octx.measureText(str).width;
    };

    let fs = Math.max(12, fontSize);
    const words = text.split(/\s+/).filter(Boolean);
    let lines: string[] = [text];
    if (words.length > 1 && text.length > 10) {
      let best = { i: 1, diff: Infinity };
      for (let i = 1; i < words.length; i++) {
        const a = measure(words.slice(0, i).join(" "), fs);
        const b = measure(words.slice(i).join(" "), fs);
        const diff = Math.abs(a - b);
        if (diff < best.diff) best = { i, diff };
      }
      lines = [words.slice(0, best.i).join(" "), words.slice(best.i).join(" ")];
    }

    for (let it = 0; it < 24; it++) {
      let maxW = 0;
      for (const l of lines) maxW = Math.max(maxW, measure(l, fs));
      if (maxW <= safeW * 0.9) break;
      fs = Math.max(12, fs * 0.92);
    }

    const lh = fs * 1.3;
    let maxW = 0;
    for (const l of lines) maxW = Math.max(maxW, measure(l, fs));
    const halfW = maxW / 2 + 4;
    const halfH = (lh * lines.length) / 2 + 4;
    let cx = centerX;
    let cy = centerY;
    if (cx - halfW < safeL) cx = safeL + halfW;
    if (cx + halfW > safeR) cx = safeR - halfW;
    if (cy - halfH < safeT) cy = safeT + halfH;
    if (cy + halfH > safeB) cy = safeB - halfH;

    octx.font = fontStr(fs);
    const startY = cy - ((lines.length - 1) * lh) / 2;
    lines.forEach((line, i) => octx.fillText(line, cx, startY + i * lh));

    const img = octx.getImageData(0, 0, off.width, off.height).data;
    const step = Math.max(3, Math.round(fs / 9));
    const pts: { x: number; y: number }[] = [];
    for (let y = 0; y < off.height; y += step) {
      for (let x = 0; x < off.width; x += step) {
        if (img[(y * off.width + x) * 4 + 3] > 120) {
          pts.push({ x: x + (Math.random() - 0.5) * 0.8, y: y + (Math.random() - 0.5) * 0.8 });
        }
      }
    }
    if (pts.length === 0) {
      for (let i = 0; i < 80; i++) {
        pts.push({ x: cx + (Math.random() - 0.5) * 140, y: cy + (Math.random() - 0.5) * 40 });
      }
    }
    return pts;
  };

  // =====================================================================
  // EFEK LEDAKAN
  // =====================================================================

  // Garis-garis tipis memancar (burst biru di video)
  const spawnStreaks = (
    cx: number,
    cy: number,
    count: number,
    radius: number,
    colors: string[],
    lifeBase: number,
  ) => {
    const drag = 0.965;
    const K = kDist(drag);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = radius * (0.45 + Math.random() * 0.55);
      const v0 = dist / K;
      spawnParticle({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * v0,
        vy: Math.sin(angle) * v0,
        life: 0,
        maxLife: lifeBase + Math.random() * lifeBase * 0.5,
        size: 1,
        color: colors[(Math.random() * colors.length) | 0],
        kind: "streak",
        gravity: 0.00004,
        drag,
      });
    }
  };

  // Titik-titik teks yang mengalir dari pusat ledakan ke posisi huruf
  const spawnTextDots = (
    cx: number,
    cy: number,
    pts: { x: number; y: number }[],
    colors: string[],
    anim: TextAnim,
    size: number,
  ) => {
    for (let i = 0; i < pts.length; i++) {
      const t = pts[i];
      const delay = Math.random() * 220;
      const tweenDur = anim.textFormationDuration * (0.75 + Math.random() * 0.4);
      const fadeStart = tweenDur + anim.textHoldDuration;
      const sx = cx + (Math.random() - 0.5) * 14;
      const sy = cy + (Math.random() - 0.5) * 14;
      spawnParticle({
        x: sx,
        y: sy,
        vx: 0,
        vy: 0,
        life: -delay,
        maxLife: fadeStart + anim.fadeDuration,
        size,
        color: Math.random() < 0.8 ? colors[0] : colors[1] ?? colors[0],
        kind: "textForm",
        gravity: 0,
        drag: 1,
        tx: t.x,
        ty: t.y,
        startX: sx,
        startY: sy,
        tweenDur,
        fadeStart,
        fadeDur: anim.fadeDuration,
      });
    }
  };

  // MAIN / FINAL: burst garis tipis + teks putih dari titik-titik
  const explodeMain = (
    cx: number,
    cy: number,
    text: string,
    cw: number,
    ch: number,
    opts: {
      streakColors: string[];
      textColors: string[];
      radiusMul: number;
      count: number;
      fontSize: number;
      anim: TextAnim;
    },
  ) => {
    const radius = cw * 0.36 * opts.radiusMul;
    spawnStreaks(cx, cy, Math.floor(opts.count * (reduced ? 0.6 : 1)), radius, opts.streakColors, 2200);
    // percikan putih kecil
    const sparkN = reduced ? 14 : 28;
    for (let i = 0; i < sparkN; i++) {
      const angle = Math.random() * Math.PI * 2;
      const v0 = (radius * (0.2 + Math.random() * 0.6)) / kDist(0.97);
      spawnParticle({
        x: cx, y: cy,
        vx: Math.cos(angle) * v0, vy: Math.sin(angle) * v0,
        life: 0, maxLife: 900 + Math.random() * 900,
        size: 2, color: "#FFFFFF", kind: "sparkle", gravity: 0.00006, drag: 0.97,
      });
    }
    if (text.length > 0) {
      const pts = sampleTextPoints(text, opts.fontSize, cw, ch, cx, cy);
      spawnTextDots(cx, cy, pts, opts.textColors, opts.anim, 2);
    }
  };

  // WISH: gumpalan berwarna padat + burst kecil + teks berwarna
  const explodeWish = (
    cx: number,
    cy: number,
    text: string,
    palette: string[],
    cw: number,
    ch: number,
    anim: TextAnim,
  ) => {
    const [c1, c2] = palette;
    // 1) gumpalan padat berduri
    const blobN = reduced ? 140 : 260;
    const Rb = cw * 0.085;
    const drag = 0.9;
    const K = kDist(drag);
    for (let i = 0; i < blobN; i++) {
      const angle = Math.random() * Math.PI * 2;
      let r = Rb * Math.sqrt(Math.random());
      if (Math.random() < 0.14) r = Rb * (1.15 + Math.random() * 0.5); // duri
      const v0 = r / K;
      spawnParticle({
        x: cx, y: cy,
        vx: Math.cos(angle) * v0, vy: Math.sin(angle) * v0,
        life: 0,
        maxLife: 1000 + Math.random() * 700,
        size: Math.random() < 0.3 ? 3 : 2,
        color: Math.random() < 0.72 ? c1 : c2,
        kind: "blob",
        gravity: 0.00002,
        drag,
      });
    }
    // 2) burst garis kecil di dekat teks (warna lain)
    const other = PALETTE_WISH[(Math.random() * PALETTE_WISH.length) | 0];
    const ox = cx + (Math.random() < 0.5 ? -1 : 1) * cw * (0.12 + Math.random() * 0.1);
    const oy = cy - ch * (0.03 + Math.random() * 0.05);
    spawnStreaks(
      Math.min(cw - 24, Math.max(24, ox)),
      Math.max(60, oy),
      reduced ? 22 : 44,
      cw * 0.1,
      [other[0], other[1]],
      1300,
    );
    // 3) teks
    if (text.length > 0) {
      const fontSize = Math.max(18, Math.min(34, cw * 0.075));
      const pts = sampleTextPoints(text, fontSize, cw, ch, cx, cy);
      spawnTextDots(cx, cy, pts, [c1, c2], anim, 2);
    }
  };

  // =====================================================================
  // LAUNCHER + TIMELINE
  // =====================================================================
  const launchOneFirework = (
    cw: number,
    ch: number,
    payload: { text: string; position: { x: number; y: number }; launch: { x: number; y: number } },
    palette: string[],
    animCfg: { launchDuration: number } & Partial<TextAnim>,
    kind: "main" | "wish" | "final",
    onExploded?: () => void,
  ) => {
    const startX = cw * (typeof payload.launch.x === "number" ? payload.launch.x : 0.5);
    const startY = ch * (typeof payload.launch.y === "number" ? payload.launch.y : 0.95) + 10;
    const targetX = cw * (typeof payload.position.x === "number" ? payload.position.x : 0.5);
    const targetY = ch * (typeof payload.position.y === "number" ? payload.position.y : 0.3);
    const duration = Math.max(450, animCfg.launchDuration || 720);

    rocketsRef.current.push({
      x: startX, y: startY, startX, startY, targetX, targetY,
      startAt: performance.now(), duration,
      color: kind === "wish" ? palette[0] : "#D8FF5A",
      size: kind === "wish" ? 2.4 : 3,
      t: 0,
    });

    const textAnim: TextAnim = {
      textFormationDuration: animCfg.textFormationDuration ?? 1000,
      textHoldDuration: animCfg.textHoldDuration ?? 2000,
      fadeDuration: animCfg.fadeDuration ?? 900,
    };

    addTimer(() => {
      if (kind === "wish") {
        explodeWish(targetX, targetY, payload.text, palette, cw, ch, textAnim);
      } else if (kind === "main") {
        explodeMain(targetX, targetY, payload.text, cw, ch, {
          streakColors: STREAK_BLUE,
          textColors: ["#EAF2FF", "#A8CCFF"],
          radiusMul: 1,
          count: 190,
          fontSize: Math.max(24, Math.min(44, cw * 0.095)),
          anim: textAnim,
        });
      } else {
        explodeMain(targetX, targetY, payload.text, cw, ch, {
          streakColors: ["#FFD86B", "#FF8AA8", "#FFE9A8", "#C9A8FF", "#FFFFFF"],
          textColors: ["#FFE9A8", "#FFFFFF"],
          radiusMul: 1.15,
          count: 240,
          fontSize: Math.max(24, Math.min(46, cw * 0.1)),
          anim: textAnim,
        });
      }
      if (onExploded) onExploded();
    }, duration + 20);
  };

  const startMainBirthday = (cw: number, ch: number) => {
    stateRef.current = FWState.MAIN_LAUNCH;
    const main = resolvedCfg.mainBirthday;
    launchOneFirework(
      cw, ch,
      { text: main.text, position: { x: 0.5, y: 0.27 }, launch: { x: 0.5, y: 0.97 } },
      STREAK_BLUE,
      {
        launchDuration: main.launchDuration,
        textFormationDuration: main.textFormationDuration,
        textHoldDuration: main.textHoldDuration,
        fadeDuration: 1100,
      },
      "main",
      () => {
        stateRef.current = FWState.MAIN_EXPLODE;
        addTimer(() => {
          if (stateRef.current < FWState.MAIN_TEXT) stateRef.current = FWState.MAIN_TEXT;
          // tampilkan label "TAP-TAP LAYAR UNTUK WISHES"
          setHintMode("wish");
          if (wishes.length === 0) scheduleFinalAfterLastWish(cw, ch);
        }, (main.explosionDelay || 0) + 450);
      },
    );
  };

  // Final otomatis muncul setelah wish TERAKHIR (yang di-tap) selesai tampil
  const scheduleFinalAfterLastWish = (cw: number, ch: number) => {
    if (finalScheduledRef.current) return;
    finalScheduledRef.current = true;
    const a = resolvedCfg.wishes.animation;
    const wait =
      a.launchDuration + a.explosionDelay + a.textFormationDuration +
      Math.round(a.textHoldDuration * 0.7) + 400;
    addTimer(() => startFinal(cw, ch), wait);
  };

  const startFinal = (cw: number, ch: number) => {
    if (stateRef.current >= FWState.FINAL_LAUNCH) return;
    stateRef.current = FWState.FINAL_LAUNCH;
    const ending = resolvedCfg.ending;
    launchOneFirework(
      cw, ch,
      { text: ending.text, position: { x: 0.5, y: 0.33 }, launch: { x: 0.5, y: 0.97 } },
      ["#FFD86B", "#FF8AA8"],
      {
        launchDuration: typeof ending.launchDuration === "number" ? ending.launchDuration : 1900,
        textFormationDuration: 1100,
        textHoldDuration: Math.max(1200, (ending.duration || 3000) - 600),
        fadeDuration: 900,
      },
      "final",
      () => {
        stateRef.current = FWState.FINAL_EXPLODE;
        addTimer(() => spawnStreaks(cw * 0.24, ch * 0.42, 70, cw * 0.2, PALETTE_WISH[2], 1800), 220);
        addTimer(() => spawnStreaks(cw * 0.76, ch * 0.4, 70, cw * 0.2, PALETTE_WISH[4], 1800), 400);
        addTimer(() => {
          stateRef.current = FWState.FINAL_TEXT;
          addTimer(() => beginTransitionOut(), ending.duration || 3000);
        }, 640);
      },
    );
  };

  const beginTransitionOut = () => {
    if (stateRef.current === FWState.TRANSITION_OUT || stateRef.current === FWState.DONE) return;
    stateRef.current = FWState.TRANSITION_OUT;
    transitionOutStartRef.current = performance.now();
    setHintMode("off");
    addTimer(() => {
      stateRef.current = FWState.DONE;
      if (!doneTriggeredRef.current) {
        doneTriggeredRef.current = true;
        goToScene(3, 400);
      }
    }, 1100);
  };

  // =====================================================================
  // MAIN EFFECT: canvas + render loop
  // =====================================================================
  useEffect(() => {
    if (!active) return;
    resetScene();
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let cw = 0;
    let ch = 0;
    let dpr = 1;
    const resize = () => {
      const rect = container.getBoundingClientRect();
      dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
      cw = rect.width;
      ch = rect.height;
      canvas.width = Math.floor(cw * dpr);
      canvas.height = Math.floor(ch * dpr);
      canvas.style.width = cw + "px";
      canvas.style.height = ch + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      initStars(cw, ch);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);

    // Tampilkan petunjuk "tap" - kembang api menunggu tap pertama
    addTimer(() => setHintMode("start"), 500);

    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(48, now - last);
      last = now;
      ctx.clearRect(0, 0, cw, ch);

      // ---- bintang latar (kotak kecil, berkedip halus)
      const stars = starsRef.current;
      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.phase += 0.002 * dt;
        if (s.y < -5) { s.y = ch + 5; s.x = Math.random() * cw; }
        if (s.x < -5) s.x = cw + 5; else if (s.x > cw + 5) s.x = -5;
        ctx.globalAlpha = s.alpha * (0.65 + 0.35 * Math.sin(s.phase));
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(Math.round(s.x), Math.round(s.y), s.size, s.size);
      }
      ctx.globalAlpha = 1;

      // ---- roket: garis tipis memanjang + kepala kecil bercahaya
      const rockets = rocketsRef.current;
      for (let i = rockets.length - 1; i >= 0; i--) {
        const r = rockets[i];
        r.t = Math.min(1, (now - r.startAt) / r.duration);
        const eased = 1 - Math.pow(1 - r.t, 2.2);
        r.x = r.startX + (r.targetX - r.startX) * eased;
        r.y = r.startY + (r.targetY - r.startY) * eased;

        const dx = r.x - r.startX;
        const dy = r.y - r.startY;
        const dist = Math.hypot(dx, dy);
        if (dist > 1) {
          const len = Math.min(dist, 170);
          const ux = dx / dist;
          const uy = dy / dist;
          const tx = r.x - ux * len;
          const ty = r.y - uy * len;
          const g = ctx.createLinearGradient(tx, ty, r.x, r.y);
          g.addColorStop(0, r.color + "00");
          g.addColorStop(1, r.color + "ee");
          ctx.globalCompositeOperation = "lighter";
          ctx.strokeStyle = g;
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.moveTo(tx, ty);
          ctx.lineTo(r.x, r.y);
          ctx.stroke();
        }
        const hg = ctx.createRadialGradient(r.x, r.y, 0, r.x, r.y, r.size * 3.6);
        hg.addColorStop(0, "rgba(255,255,255,0.95)");
        hg.addColorStop(0.4, r.color + "aa");
        hg.addColorStop(1, r.color + "00");
        ctx.fillStyle = hg;
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.size * 3.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalCompositeOperation = "source-over";

        if (r.t >= 1) rockets.splice(i, 1);
      }

      // ---- partikel
      const arr = particlesRef.current;
      const dragF = dt / 16.67;
      ctx.globalCompositeOperation = "lighter";
      for (let i = arr.length - 1; i >= 0; i--) {
        const p = arr[i];
        p.life += dt;
        if (p.life < 0) continue; // masih delay
        if (p.life >= p.maxLife) {
          arr[i] = arr[arr.length - 1];
          arr.pop();
          continue;
        }

        if (p.kind === "textForm") {
          const dur = p.tweenDur || 900;
          const f = Math.min(1, p.life / dur);
          const e = 1 - Math.pow(1 - f, 3);
          p.x = p.startX! + (p.tx! - p.startX!) * e;
          p.y = p.startY! + (p.ty! - p.startY!) * e;

          let a = Math.min(1, p.life / 160);
          if (p.life > (p.fadeStart || 0)) {
            a *= Math.max(0, 1 - (p.life - p.fadeStart!) / (p.fadeDur || 900));
          }
          // kedip LED halus setelah huruf terbentuk
          if (f >= 1) a *= 0.88 + 0.12 * Math.sin(now * 0.008 + i * 0.7);
          if (a <= 0.01) continue;

          ctx.globalAlpha = a * 0.16;
          ctx.fillStyle = p.color;
          ctx.fillRect(p.x - 2.5, p.y - 2.5, 5, 5); // halo
          ctx.globalAlpha = a;
          ctx.fillRect(Math.round(p.x - 1), Math.round(p.y - 1), 2, 2);
          continue;
        }

        // fisika (streak / blob / sparkle)
        const d = Math.pow(p.drag, dragF);
        p.vx *= d;
        p.vy = p.vy * d + p.gravity * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;

        const frac = p.life / p.maxLife;
        const fadeFrom = p.kind === "streak" ? 0.45 : p.kind === "blob" ? 0.4 : 0.55;
        let a = 1;
        if (frac < 0.05) a = frac / 0.05;
        else if (frac > fadeFrom) a = Math.max(0, 1 - (frac - fadeFrom) / (1 - fadeFrom));

        if (p.kind === "streak") {
          ctx.globalAlpha = a * 0.95;
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(p.x - p.vx * 55, p.y - p.vy * 55);
          ctx.lineTo(p.x, p.y);
          ctx.stroke();
        } else if (p.kind === "blob") {
          ctx.globalAlpha = a * 0.2;
          ctx.fillStyle = p.color;
          ctx.fillRect(p.x - 3.5, p.y - 3.5, 7, 7);
          ctx.globalAlpha = a;
          const sz = Math.round(p.size);
          ctx.fillRect(Math.round(p.x - sz / 2), Math.round(p.y - sz / 2), sz, sz);
        } else {
          ctx.globalAlpha = a;
          ctx.fillStyle = p.color;
          ctx.fillRect(Math.round(p.x - 1), Math.round(p.y - 1), 2, 2);
        }
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";

      // ---- transisi keluar
      if (stateRef.current === FWState.TRANSITION_OUT || stateRef.current === FWState.DONE) {
        const t = Math.min(1, (now - transitionOutStartRef.current) / 1100);
        ctx.fillStyle = `rgba(5,2,12,${0.55 * t})`;
        ctx.fillRect(0, 0, cw, ch);
      }

      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      ro.disconnect();
      clearTimers();
      startedRef.current = false; // agar scene bisa diputar ulang
      musicStartedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  // TAP pertama = mulai (HAPPY BIRTHDAY). Tap berikutnya = wish baru di titik yang disentuh.
  const handleTap = (_e: RPointerEvent<HTMLElement>) => {
    if (!active) return;
    const container = containerRef.current;
    if (!container) return;
    const now = performance.now();
    // Jeda minimum antar tap = 1 detik (membatasi overlap kembang api)
    if (now - lastTapRef.current < TAP_COOLDOWN_MS) return;
    lastTapRef.current = now;

    const rect = container.getBoundingClientRect();
    const cw = rect.width;
    const ch = rect.height;
    const st = stateRef.current;

    // tap pertama: mulai kembang api utama + musik
    if (!startedRef.current && st === FWState.IDLE) {
      startedRef.current = true;
      if (!musicStartedRef.current) {
        musicStartedRef.current = true;
        void tryAutoStartScene2();
      }
      setHintMode("off");
      startMainBirthday(cw, ch);
      return;
    }

    if (st < FWState.MAIN_TEXT || st >= FWState.FINAL_LAUNCH) return;
    if (!wishes.length || tapIdxRef.current >= wishes.length) return;
    if (st < FWState.WISH_LAUNCH) stateRef.current = FWState.WISH_LAUNCH;

    // Posisi wish ACAK (bukan di titik tap), dijaga agar tidak menumpuk persis di wish sebelumnya
    let fx = 0.5;
    let fy = 0.4;
    for (let k = 0; k < 8; k++) {
      fx = 0.26 + Math.random() * 0.48; // 26% - 74% lebar
      fy = 0.24 + Math.random() * 0.46; // 24% - 70% tinggi
      const last = lastWishPosRef.current;
      if (!last || Math.hypot((fx - last.x) * cw, (fy - last.y) * ch) > cw * 0.28) break;
    }
    lastWishPosRef.current = { x: fx, y: fy };
    const item = wishes[tapIdxRef.current] as any;
    tapIdxRef.current++;
    const palette = PALETTE_WISH[paletteIdxRef.current++ % PALETTE_WISH.length];
    launchOneFirework(
      cw, ch,
      {
        text: item.text,
        position: { x: fx, y: Math.min(0.78, Math.max(0.22, fy)) },
        launch: { x: 0.5 + (fx - 0.5) * 0.5, y: 0.97 },
      },
      palette,
      resolvedCfg.wishes.animation,
      "wish",
      () => {
        if (stateRef.current < FWState.WISH_EXPLODE) stateRef.current = FWState.WISH_EXPLODE;
      },
    );
    if (tapIdxRef.current >= wishes.length) scheduleFinalAfterLastWish(cw, ch);
  };

  const handleSkip = (e: RPointerEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (stateRef.current < FWState.TRANSITION_OUT && !doneTriggeredRef.current) beginTransitionOut();
  };

  return (
    <section
      className={`scene-layer ${active ? "scene-active" : "scene-hidden"}`}
      aria-hidden={!active}
      ref={containerRef}
      onPointerDown={active ? handleTap : undefined}
      style={{ padding: 0, cursor: active ? "pointer" : "default", touchAction: "manipulation" }}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full select-none"
        aria-hidden
        style={{ display: "block", touchAction: "none" }}
      />

      {/* Label petunjuk seperti di video */}
      <div
        className="absolute left-0 right-0 text-center pointer-events-none select-none"
        style={{
          top: "max(5.2rem, calc(env(safe-area-inset-top) + 3.6rem))",
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.16em",
          color: "rgba(150,185,255,0.85)",
          textTransform: "uppercase",
          opacity: active && hintMode !== "off" ? 1 : 0,
          transition: "opacity 0.8s ease",
          zIndex: 7,
        }}
        aria-hidden
      >
        <span style={{ color: "#FF9A4A" }}>✦</span>{" "}
        {hintMode === "start" ? "TAP LAYAR UNTUK MULAI" : "TAP-TAP LAYAR UNTUK WISHES"}{" "}
        <span style={{ color: "#FF9A4A" }}>✦</span>
      </div>

      {/* Tombol lewati (kecil, tidak mengganggu) */}
      {active && hintMode === "wish" && (
        <button
          type="button"
          onPointerDown={handleSkip}
          style={{
            position: "absolute",
            right: 14,
            bottom: "max(1rem, calc(env(safe-area-inset-bottom) + 0.8rem))",
            zIndex: 8,
            fontSize: 11,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "rgba(255,240,210,0.55)",
            background: "transparent",
            border: "1px solid rgba(255,240,210,0.25)",
            borderRadius: 999,
            padding: "6px 12px",
          }}
        >
          Lanjut ›
        </button>
      )}

      <div className="vignette" />
    </section>
  );
}