import { useEffect, useMemo, useRef, useState } from "react";
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

type ParticleKind = "star" | "rocketTrail" | "smoke" | "explode" | "sparkle" | "textForm";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  kind: ParticleKind;
  alpha: number;
  gravity: number;
  drag: number;
  glow: number;
  tx?: number;
  ty?: number;
  startX?: number;
  startY?: number;
  tweenT?: number;
  tweenDur?: number;
}

interface Rocket {
  x: number;
  y: number;
  startY: number;
  targetY: number;
  vy: number;
  startAt: number;
  duration: number;
  color: string;
  trailTimer: number;
  exploded: boolean;
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

const PALETTE_MAIN = ["#FFB347", "#FFD07F", "#FFE9A8", "#FF8AA8", "#C9A8FF", "#FFFFFF"];
const PALETTE_WISH = [
  ["#FFB347", "#FFD07F", "#FFE9A8", "#FFFFFF"], // 1. Warm Gold Sunset
  ["#FF6B9D", "#FF8AA8", "#FFC9DE", "#FFFFFF"], // 2. Raspberry Pink
  ["#A084FF", "#C9A8FF", "#E8D9FF", "#FFFFFF"], // 3. Lavender Purple
  ["#67C6FF", "#8AD9FF", "#C9ECFF", "#FFFFFF"], // 4. Sky Blue Ice
  ["#6DE39A", "#9CFFB0", "#D5FFDC", "#FFFFFF"], // 5. Mint Emerald
  ["#FFD86B", "#FFE08A", "#FFF0C4", "#FFFFFF"], // 6. Bright Sun Gold
  ["#FF7EB9", "#FF9CC6", "#FFCFE0", "#FFFFFF"], // 7. Magenta Blush
];

function sampleColor(arr: string[]) {
  return arr[(Math.random() * arr.length) | 0];
}

export default function FireworkScene() {
  const { currentScene, goToScene, tryAutoStartScene2 } = useStory();
  const active = currentScene === 2;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const stateRef = useRef<FWStateKind>(FWState.IDLE);
  const [, setRenderTick] = useState(0);
  const forceRerender = () => setRenderTick((v) => (v + 1) & 0xffff);
  const textOpacityRef = useRef(0);
  const textScaleRef = useRef(0.85);
  const activeTextRef = useRef<string>("");
  const textKindRef = useRef<"main" | "wish" | "final">("main");
  const doneTriggeredRef = useRef(false);
  const startedRef = useRef(false);
  const musicStartedRef = useRef(false);
  const timersRef = useRef<number[]>([]);
  const finalScheduledRef = useRef(false);

  // ==========================================
  // BACKWARD COMPAT: Firework Config Normalizer
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
      { text: "HAPPY BIRTHDAY", launchDuration: 1800, explosionDelay: 300, textFormationDuration: 1000, textHoldDuration: 2200, displayDuration: 2800 },
      raw.mainBirthday || {},
    );
    // Compute effective displayDuration if not explicit but formation + hold provided
    if (main.displayDuration < 1500 && main.textFormationDuration > 0 && main.textHoldDuration > 0) {
      main.displayDuration = (main.explosionDelay || 0) + main.textFormationDuration + main.textHoldDuration;
    }
    const ending = Object.assign({ text: "", duration: 3000, launchDuration: 1900 }, raw.ending || {});

    // --- Wishes normalizer: support BOTH formats NEW (wishes:{interval, animation, items[]}) & OLD (wishes: string[]) ---
    let interval = 1000;
    let animWish = { launchDuration: 720, explosionDelay: 260, textFormationDuration: 900, textHoldDuration: 1800, fadeDuration: 900 };
    let items: any[] = [];

    const rawWishes: any = raw.wishes;
    if (Array.isArray(rawWishes)) {
      // FORMAT LAMA: wishes = string[] (atau any[] teks). Convert ke items.
      const strings = rawWishes.map((s: any) => String(s || "")).filter(Boolean);
      interval = typeof (raw as any).wishInterval === "number" ? (raw as any).wishInterval : interval;
      const spread = [
        { x: 0.50, y: 0.22 }, { x: 0.24, y: 0.40 }, { x: 0.76, y: 0.40 },
        { x: 0.50, y: 0.58 }, { x: 0.22, y: 0.72 }, { x: 0.78, y: 0.72 },
        { x: 0.50, y: 0.40 }, { x: 0.32, y: 0.58 }, { x: 0.68, y: 0.58 },
      ];
      items = strings.map((text: string, i: number) => ({
        text,
        position: spread[i % spread.length],
        launch: { x: 0.50, y: 0.95 },
      }));
    } else if (rawWishes && typeof rawWishes === "object") {
      // FORMAT BARU: wishes { interval, animation, items: [] }
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
            const posX = pos && typeof pos.x === "number" ? pos.x : 0.50;
            const posY = pos && typeof pos.y === "number" ? pos.y : 0.40;
            const lch = it.launch || it.from || null;
            const lchX = lch && typeof lch.x === "number" ? lch.x : 0.50;
            const lchY = lch && typeof lch.y === "number" ? lch.y : 0.95;
            return { text, position: { x: posX, y: posY }, launch: { x: lchX, y: lchY } };
          })
          .filter(Boolean);
      } else if (Array.isArray(rawWishes._legacyList) && rawWishes._legacyList.length > 0) {
        // Fallback legacy list jika items kosong
        const strings = rawWishes._legacyList.map(String).filter(Boolean);
        const spread = [
          { x: 0.50, y: 0.22 }, { x: 0.24, y: 0.40 }, { x: 0.76, y: 0.40 },
          { x: 0.50, y: 0.58 }, { x: 0.22, y: 0.72 }, { x: 0.78, y: 0.72 },
        ];
        items = strings.map((text: string, i: number) => ({
          text,
          position: spread[i % spread.length],
          launch: { x: 0.50, y: 0.95 },
        }));
        if (typeof rawWishes._legacyInterval === "number") interval = rawWishes._legacyInterval;
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
  const wishIdxRef = useRef(0);

  const reduced = typeof window !== "undefined"
    ? window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    : false;
  const MAX_PARTICLES = reduced ? 160 : 280;

  const particlesRef = useRef<Particle[]>([]);
  const rocketsRef = useRef<Rocket[]>([]);
  const starsRef = useRef<FloatingStar[]>([]);
  const transitionOutStartRef = useRef<number>(0);
  const sceneFadeRef = useRef(0);

  const spawnParticle = (p: Particle) => {
    const arr = particlesRef.current;
    if (arr.length >= MAX_PARTICLES) {
      arr.splice(0, arr.length - MAX_PARTICLES + 1);
    }
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

  // Init floating stars background
  const initStars = (w: number, h: number) => {
    const count = reduced ? 35 : 65;
    const arr: FloatingStar[] = [];
    for (let i = 0; i < count; i++) {
      arr.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.08,
        vy: -0.04 - Math.random() * 0.08,
        size: Math.random() * 1.6 + 0.4,
        alpha: 0.3 + Math.random() * 0.6,
        phase: Math.random() * Math.PI * 2,
      });
    }
    starsRef.current = arr;
  };

  const resetScene = () => {
    stateRef.current = FWState.IDLE;
    particlesRef.current = [];
    rocketsRef.current = [];
    textOpacityRef.current = 0;
    textScaleRef.current = 0.85;
    activeTextRef.current = "";
    textKindRef.current = "main";
    wishIdxRef.current = 0;
    doneTriggeredRef.current = false;
    sceneFadeRef.current = 0;
    transitionOutStartRef.current = 0;
    finalScheduledRef.current = false;
    clearTimers();
    forceRerender();
  };

  // ✅ Text sampling: safe area + padding dinamis + 2 lines BALANCE wrap + scale down if overflow + pixel bounding box hitung TERAKHIR
  const sampleTextPoints = (
    text: string,
    fontSize: number,
    targetCount: number,
    cw: number,
    ch: number,
    centerX: number,
    centerY: number,
  ): { x: number; y: number }[] => {
    const off = document.createElement("canvas");
    const scale = 2;
    off.width = Math.max(2, Math.ceil(cw * scale));
    off.height = Math.max(2, Math.ceil(ch * scale));
    const octx = off.getContext("2d", { willReadFrequently: true });
    if (!octx) return [];
    octx.scale(scale, scale);
    octx.fillStyle = "#fff";
    octx.textAlign = "center";
    octx.textBaseline = "middle";

    // SAFE AREA LAYER 1: Persentase layar + pixel minimal
    const rawSafePadX = Math.max(18, cw * 0.085);  // 18px + 8.5% width (naik dari 7%)
    const rawSafePadY = Math.max(26, ch * 0.095);  // 26px + 9.5% height (naik dari 8%)
    // SAFE AREA LAYER 2: IPHONE EXPLICIT HARDCODE (Dynamic Island 59px top, Home Indicator 34px bottom)
    const safeAreaTop = Math.max(rawSafePadY, 59 + 26);   // Dynamic Island 59px + 26px breathing space = MIN 85px ATAS
    const safeAreaBottom = Math.max(rawSafePadY, 34 + 26); // Home Indicator 34px + 26px breathing space = MIN 60px BAWAH
    const safePadX = rawSafePadX;
    // Safe bounds (canvas pixel yang BOLEH ditempati text pixel)
    const safeL = safePadX;
    const safeR = cw - safePadX;
    const safeT = safeAreaTop;
    const safeB = ch - safeAreaBottom;
    const safeW = Math.max(60, safeR - safeL);
    const safeH = Math.max(120, safeB - safeT);

    const words = text.split(/\s+/).filter(Boolean);
    let lines: string[] = [];
    let fs = Math.max(10, Math.min(fontSize, cw * 0.145));

    // 1) Cari line split BALANCE (paling seimbang width kedua line) — MAKSIMAL 2 BARIS
    const fontStr = (size: number) => `900 ${size}px Inter, system-ui, -apple-system, Segoe UI, sans-serif`;
    const measureWidth = (str: string, size: number) => {
      octx.font = fontStr(size);
      return octx.measureText(str).width;
    };
    // Pencarian split paling seimbang: total 1..n kata di line1, sisanya line2.
    if (words.length <= 1 || text.length <= 16) {
      lines = [text];
    } else {
      let best: { i: number; diff: number } = { i: Math.ceil(words.length / 2), diff: Infinity };
      for (let i = 1; i <= words.length - 1; i++) {
        const a = words.slice(0, i).join(" ");
        const b = words.slice(i).join(" ");
        const wa = measureWidth(a, fs);
        const wb = measureWidth(b, fs);
        const diff = Math.abs(wa - wb);
        if (diff < best.diff) best = { i, diff };
      }
      lines = [words.slice(0, best.i).join(" "), words.slice(best.i).join(" ")];
    }

    // 2) Auto SCALE DOWN fs jika total width/height melebihi SAFE BOUNDS.
    //    Ukur lagi setelah split, loop kurangi fs sampai masuk safe. LEBIH KETAT (0.94, bukan 0.995)
    const maxIter = 20;
    for (let it = 0; it < maxIter; it++) {
      const lh = fs * 1.26;
      octx.font = fontStr(fs);
      let maxLineW = 0;
      for (const l of lines) maxLineW = Math.max(maxLineW, octx.measureText(l).width);
      const totalH = lh * lines.length;
      if (maxLineW <= safeW * 0.92 && totalH <= safeH * 0.92) break;
      fs = Math.max(10, fs * 0.88);
      if (fs <= 10) break;
    }
    // Tambahan: pixel size offset padding (anti crop pinggiran font saat raster)
    // NAIK: 10% dari font size, MIN 4px (dulu 8% min 3px)
    const pixPadX = Math.max(4, Math.round(fs * 0.10));
    const pixPadY = Math.max(4, Math.round(fs * 0.10));

    // 3) Hitung BOUNDING BOX text (centerX, centerY) → geser centerX/Y jika keluar safe area.
    //    LINE HEIGHT sama persis dengan scale down loop agar hitungan bounding konsisten
    const lh = fs * 1.26;
    octx.font = fontStr(fs);
    let maxLineW = 0;
    for (const l of lines) maxLineW = Math.max(maxLineW, octx.measureText(l).width);
    const totalW = maxLineW + pixPadX * 2;
    const totalH = lh * lines.length + pixPadY * 2;

    let targetCenterX = centerX;
    let targetCenterY = centerY;
    // Clamp box supaya FULLY WITHIN SAFE AREA (beri extra margin 4px lagi agar TIDAK MEPET)
    const extraBreath = 4;
    const halfW = totalW / 2 + extraBreath;
    const halfH = totalH / 2 + extraBreath;
    const boxL = targetCenterX - halfW;
    const boxR = targetCenterX + halfW;
    const boxT = targetCenterY - halfH;
    const boxB = targetCenterY + halfH;
    if (boxL < safeL) targetCenterX += (safeL - boxL);
    if (boxR > safeR) targetCenterX -= (boxR - safeR);
    if (boxT < safeT) targetCenterY += (safeT - boxT);
    if (boxB > safeB) targetCenterY -= (boxB - safeB);

    // 4) Draw text di offscreen. START Y = targetCenterY + center align lines
    const startY = targetCenterY - ((lines.length - 1) * lh) / 2;
    lines.forEach((line, i) => {
      // Font: Inter BLACK 900 = pixel bentuk solid, tipis tidak akan hilang
      octx.font = fontStr(fs);
      octx.fillText(line, targetCenterX, startY + i * lh);
    });

    // 5) Rasterize alpha → points. STEP LEBIH KECIL (dulu step=9 → 3 css px → SEKARANG step=6 → 3 css px LEBIH RAPAT SAMPLING!)
    //    Step kecil = lebih banyak pixel LED = huruf lebih jelas bentuknya TIDAK BOLONG / terpencil step.
    const img = octx.getImageData(0, 0, off.width, off.height).data;
    const pts: { x: number; y: number }[] = [];
    const step = Math.max(6, Math.floor(scale * 3));
    // ALPHA THRESHOLD TURUNKAN DRAMATIS: dulu 190 TERLALU KETAT (pinggir huruf terpotong)
    // → SEKARANG 110, pixel pinggir alpha 110+ tetap ikut, shape huruf TIDAK TERPOTONG.
    const aThresh = 110;
    for (let y = 0; y < off.height; y += step) {
      for (let x = 0; x < off.width; x += step) {
        const a = img[(y * off.width + x) * 4 + 3];
        if (a > aThresh) {
          const px = Math.round(x / scale);
          const py = Math.round(y / scale);
          // Filter HARD 2x: HANYA pixel di DALAM safe area YANG JAUH 4px DARI pinggir safe (anti mepet crop!)
          if (px >= safeL + extraBreath && px <= safeR - extraBreath && py >= safeT + extraBreath && py <= safeB - extraBreath) {
            pts.push({ x: px, y: py });
          }
        }
      }
    }
    if (pts.length === 0) {
      for (let i = 0; i < targetCount; i++) {
        pts.push({ x: targetCenterX + (Math.random() - 0.5) * 160, y: targetCenterY + (Math.random() - 0.5) * 60 });
      }
    }
    return pts;
  };

  // ========================================================
  // FIREWORK LAUNCHERS + TIMELINE OVERLAP SCHEDULER (1 sec)
  // ========================================================
  const launchOneFirework = (
    cw: number,
    ch: number,
    payload: {
      text: string;
      position: { x: number; y: number };
      launch: { x: number; y: number };
    },
    palette: string[],
    animCfg: { launchDuration: number; explosionDelay: number },
    kind: "main" | "wish" | "final",
    scale: number,
    onExploded?: () => void,
  ) => {
    // Launch start = launch.x * cw, launch.y * ch (default: tengah bawah = 0.5*cw, 0.95*ch)
    const startX = cw * (typeof payload.launch.x === "number" ? payload.launch.x : 0.50);
    const startY = ch * (typeof payload.launch.y === "number" ? payload.launch.y : 0.95) + 10;
    // Explosion target position = position.x * cw, position.y * ch
    const targetY = ch * (typeof payload.position.y === "number" ? payload.position.y : 0.30);
    const targetX = cw * (typeof payload.position.x === "number" ? payload.position.x : 0.50);
    // Rocket berjalan miring (startX,Y → targetX,targetY) karena beberapa wish posisi kiri/kanan bukan tengah
    const duration = Math.max(450, animCfg.launchDuration || 720);
    const palette0 = palette[0] || "#FFD07F";
    const rocket: Rocket = {
      x: startX,
      y: startY,
      startY,
      targetY,
      vy: 0,
      startAt: performance.now(),
      duration,
      color: palette0,
      trailTimer: 0,
      exploded: false,
      size: kind === "final" ? 5.3 : kind === "main" ? 4.3 : 3.7,
      t: 0,
    };
    (rocket as any).targetX = targetX; // reuse di draw loop nanti untuk lerp x juga (bukan cuma y!)
    (rocket as any).startX = startX;
    rocketsRef.current.push(rocket);
    addTimer(() => {
      explodeAt(targetX, targetY, palette, scale, cw, ch, payload.text, kind);
      if (onExploded) onExploded();
    }, duration + 20);
  };

  // ✅ START MAIN BIRTHDAY (posisi tengah, launch dari tengah bawah) → setelah selesai displayDuration → schedule ALL wishes OVERLAP
  const startMainBirthday = (cw: number, ch: number) => {
    stateRef.current = FWState.MAIN_LAUNCH;
    const main = resolvedCfg.mainBirthday;
    launchOneFirework(
      cw, ch,
      {
        text: main.text,
        position: { x: 0.50, y: 0.24 },  // posisi ledakan: tengah atas
        launch:   { x: 0.50, y: 0.95 },  // launch: TENGAH BAWAH (sesuai spec!)
      },
      PALETTE_MAIN,
      { launchDuration: main.launchDuration, explosionDelay: main.explosionDelay },
      "main",
      1.0,
      () => {
        stateRef.current = FWState.MAIN_EXPLODE;
        addTimer(() => {
          stateRef.current = FWState.MAIN_TEXT;
          activeTextRef.current = main.text;
          textKindRef.current = "main";
          // Setelah Main text hold selesai → SCHEDULE SEMUA WISHES SEKALIGUS (overlap)
          addTimer(() => {
            scheduleAllWishesTimeline(cw, ch);
          }, main.displayDuration);
        }, (main.explosionDelay || 0) + 450);
      },
    );
  };

  // 📅 TIMELINE SCHEDULER: schedule launch wish[0] at t=0, wish[1] at t=interval, wish[2] t=2*interval dst → SETELAH final launch date → start final firework.
  const scheduleAllWishesTimeline = (cw: number, ch: number) => {
    stateRef.current = FWState.WISH_LAUNCH;
    const wishCfg = resolvedCfg.wishes;
    const anim = wishCfg.animation;
    const N = wishes.length;
    if (N === 0) { startFinal(cw, ch); return; }

    // Schedule EVERY wish at offset i * interval (OVERLAP! no await)
    let lastWishLaunchOffset = 0;
    for (let i = 0; i < N; i++) {
      const offset = i * Math.max(100, wishCfg.interval);
      lastWishLaunchOffset = Math.max(lastWishLaunchOffset, offset);
      const palette = PALETTE_WISH[i % PALETTE_WISH.length];
      addTimer(() => {
        const item = wishes[i] as any;
        if (!item || !item.text) return;
        // Wish explosion scale 0.92, sesuai kecepatan wish
        launchOneFirework(
          cw, ch, item, palette,
          { launchDuration: anim.launchDuration, explosionDelay: anim.explosionDelay },
          "wish",
          0.92,
          () => {
            stateRef.current = stateRef.current < FWState.WISH_EXPLODE ? FWState.WISH_EXPLODE : stateRef.current;
            addTimer(() => {
              stateRef.current = stateRef.current < FWState.WISH_TEXT ? FWState.WISH_TEXT : stateRef.current;
              activeTextRef.current = item.text;
              textKindRef.current = "wish";
            }, anim.explosionDelay + 220);
          },
        );
      }, offset);
    }

    // Schedule FINAL firework: ketika wish TERAKHIR sudah punya waktu selesai total (launch + explode + formation + hold + fade + safety 300)
    const finalAfter =
      lastWishLaunchOffset +
      (anim.launchDuration + anim.explosionDelay + anim.textFormationDuration + anim.textHoldDuration + anim.fadeDuration) +
      320;
    if (finalScheduledRef.current) return;
    finalScheduledRef.current = true;
    addTimer(() => { startFinal(cw, ch); }, finalAfter);
  };

  // 🎆 FINAL FIREWORK (lebih besar, posisi tengah, 2 sekunder kiri kanan) → transition out
  const startFinal = (cw: number, ch: number) => {
    stateRef.current = FWState.FINAL_LAUNCH;
    const ending = resolvedCfg.ending;
    const palette = ["#FFD86B", "#FF8AA8", "#FFE9A8", "#A084FF", "#FFFFFF"];
    const duration = typeof ending.launchDuration === "number" ? ending.launchDuration : 1900;
    launchOneFirework(
      cw, ch,
      { text: ending.text, position: { x: 0.50, y: 0.29 }, launch: { x: 0.50, y: 0.95 } },
      palette,
      { launchDuration: duration, explosionDelay: 400 },
      "final",
      1.4,
      () => {
        stateRef.current = FWState.FINAL_EXPLODE;
        addTimer(() => {
          explodeAt(cw * 0.24, ch * 0.40, PALETTE_WISH[1].slice(0, 3), 0.72, cw, ch, "", "final");
        }, 220);
        addTimer(() => {
          explodeAt(cw * 0.76, ch * 0.37, PALETTE_WISH[2].slice(0, 3), 0.72, cw, ch, "", "final");
        }, 400);
        addTimer(() => {
          stateRef.current = FWState.FINAL_TEXT;
          activeTextRef.current = ending.text;
          textKindRef.current = "final";
          addTimer(() => { beginTransitionOut(cw, ch); }, ending.duration || 3000);
        }, 640);
      },
    );
  };

  const explodeAt = (
    cx: number,
    cy: number,
    palette: string[],
    scale: number,
    cw: number,
    ch: number,
    textForForm: string,
    kind: "main" | "wish" | "final",
  ) => {
    // ✨✨ STRATEGI BARU: LEDAKAN SELALU JELAS TERLIHAT, SEBAGIAN KECIL MEMBENTUK TEXT
    // Step 1: SPAWN BURST LEDAKAN BESAR (100% explode particle, TIDAK ADA textForm)
    //         → User SELALU melihat BOOM pixel terlebih dahulu.
    // Step 2: Baru SEBAGIAN KECIL particle tambahan jadi textForm (ratio 32%, dulu 55%)
    // Step 3: Explode life DIPERPANJANG agar terlihat bersamaan dengan text yang terbentuk.
    // Hasil: "ada ledakan jelas → sebagian pixel mengalir jadi huruf → ledakan sisa masih terlihat"

    const dominantColor = palette[0];
    const accentColor = palette[1] ?? dominantColor;
    const pixSize =
      kind === "final" ? 4 : kind === "main" ? 4 : kind === "wish" ? 3 : 3;
    const explodeSizesPool: number[] = [2,2,3,3,3,3,4,4,4,5,6];
    const sparklePool: number[] = [2,2,2,3,3,4];

    // =========================================================
    // 💥 BURST 1: LEDAKAN PERTAMA 100% EXPLODE (TIDAK ADA TEXT)
    //            Pastikan ledakan TERLIHAT JELAS sebelum text terbentuk!
    // =========================================================
    const burst1Count = Math.floor((reduced ? 110 : 180) * scale); // lebih banyak dari sebelumnya!
    for (let i = 0; i < burst1Count; i++) {
      const angle = (Math.PI * 2 * i) / burst1Count + (Math.random() - 0.5) * 0.38;
      const speed = (0.16 + Math.random() * 0.68) * scale * (reduced ? 0.84 : 1);
      // 100% = explode JANGAN DIUBAH jadi text, tetap berhamburan seperti kembang api normal!
      const p: Particle = {
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0,
        // 💥 Life explode DIPERPANJANG +800ms: sambil text terbentuk ledakan masih kelihatan!
        maxLife: 2400 + Math.random() * 1800,
        size: explodeSizesPool[Math.floor(Math.random() * explodeSizesPool.length)],
        color: sampleColor(palette),
        kind: "explode",
        alpha: 1,
        gravity: 0.00018 + Math.random() * 0.00024,
        drag: 0.988 - Math.random() * 0.008,
        glow: 14 + Math.random() * 20 * scale, // glow lebih besar = LEDAKAN LEBIH TERANG
      };
      spawnParticle(p);
    }

    // =========================================================
    // 💥 BURST 2: LEDAKAN SPARKLE EXTRA (tambahan terang)
    // =========================================================
    const sparkleN = Math.floor((reduced ? 28 : 52) * scale);
    for (let i = 0; i < sparkleN; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (0.07 + Math.random() * 0.38) * scale;
      spawnParticle({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0,
        maxLife: 900 + Math.random() * 1400,
        size: sparklePool[Math.floor(Math.random() * sparklePool.length)],
        color: sampleColor(palette),
        kind: "sparkle",
        alpha: 1,
        gravity: 0.00005,
        drag: 0.985,
        glow: 10 + Math.random() * 15,
      });
    }

    // =========================================================
    // 📝 HANYA 32% SAJA particle tambahan yang akan membentuk text!
    //    Sebagian besar = LEDAKAN biasa (burst1) supaya ledakan TETAP TERLIHAT JELAS.
    // =========================================================
    if (textForForm.length > 0) {
      const candidateCount = Math.floor((reduced ? 70 : 128) * scale);
      for (let i = 0; i < candidateCount; i++) {
        const angle = (Math.PI * 2 * i) / candidateCount + (Math.random() - 0.5) * 0.28;
        const speed = (0.10 + Math.random() * 0.52) * scale * (reduced ? 0.82 : 1);
        const isForm = Math.random() < 0.32; // HANYA 32% menjadi text! sisanya 68% explode biasa
        const color = isForm
          ? (Math.random() < 0.8 ? dominantColor : accentColor)
          : sampleColor(palette);
        const finalSize: number = isForm
          ? pixSize + (Math.random() < 0.28 ? 1 : 0)
          : explodeSizesPool[Math.floor(Math.random() * explodeSizesPool.length)];
        const p: Particle = {
          x: cx,
          y: cy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 0,
          maxLife: isForm
            ? 4700 + Math.random() * 1600
            : 2300 + Math.random() * 1700,
          size: finalSize,
          color,
          kind: isForm ? "textForm" : "explode",
          alpha: 1,
          gravity: isForm ? 0 : 0.00014 + Math.random() * 0.00020,
          drag: isForm ? 0.986 : 0.988 - Math.random() * 0.008,
          glow: isForm ? pixSize * 6 : 12 + Math.random() * 18 * scale,
        };
        spawnParticle(p);
      }
    }
    if (textForForm.length > 0) {
      // ✅ FONT SIZE 1.5x LEBIH BESAR (clamp + persen of screen width)
      const fontSize =
        kind === "final"
          ? Math.max(24, Math.min(58, cw * 0.115))
          : kind === "main"
          ? Math.max(28, Math.min(62, cw * 0.128))
          : Math.max(22, Math.min(50, cw * 0.098));
      // ✅ PUSAT TEXT = (cx, cy) — DI TEMPAT KEMBANG API MELEDAK! bukan tengah canvas
      const pts = sampleTextPoints(textForForm, fontSize, 0, cw, ch, cx, cy);
      if (pts.length > 0) {
        const existingCandidates = particlesRef.current.filter(
          (p) => p.kind === "textForm" && p.tx === undefined && p.life < 200,
        );
        const assignTargetsTo = (list: Particle[]) => {
          list.forEach((p, i) => {
            const t = pts[i % pts.length];
            p.tx = t.x;
            p.ty = t.y;
            // ✅ TRUE TWEEN: simpan START POSISI (cx, cy = area ledakan) -> transisi jelas cinematic
            p.startX = p.x;
            p.startY = p.y;
            p.tweenT = 0;
            p.tweenDur = 700 + Math.random() * 480;
          });
        };
        assignTargetsTo(existingCandidates.slice(0, pts.length));
        const assigned = Math.min(existingCandidates.length, pts.length);
        const remaining = pts.length - assigned;
        if (remaining > 0) {
          for (let k = assigned; k < pts.length; k++) {
            const t = pts[k];
            const angle = Math.random() * Math.PI * 2;
            const speed = 0.11 + Math.random() * 0.48;
            const sx = cx + (Math.random() - 0.5) * 10;
            const sy = cy + (Math.random() - 0.5) * 10;
            spawnParticle({
              x: sx,
              y: sy,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed,
              life: 0,
              maxLife: 4700 + Math.random() * 1500,
              size: pixSize + (Math.random() < 0.25 ? 1 : 0),
              color: Math.random() < 0.82 ? dominantColor : accentColor,
              kind: "textForm",
              alpha: 1,
              gravity: 0,
              drag: 0.986,
              glow: pixSize * 6,
              tx: t.x,
              ty: t.y,
              startX: sx,
              startY: sy,
              tweenT: 0,
              tweenDur: 720 + Math.random() * 520,
            });
          }
        }
      }
    }
  };

  const beginTransitionOut = (_cw: number, _ch: number) => {
    if (stateRef.current === FWState.TRANSITION_OUT || stateRef.current === FWState.DONE) return;
    stateRef.current = FWState.TRANSITION_OUT;
    transitionOutStartRef.current = performance.now();
    addTimer(() => {
      stateRef.current = FWState.DONE;
      if (!doneTriggeredRef.current) {
        doneTriggeredRef.current = true;
        goToScene(3, 400);
      }
    }, 1100);
  };

  // Main activate/deactivate + state machine init
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

    // Start music tryAutoStartScene2 (moved from BirthdayScene)
    if (!musicStartedRef.current) {
      musicStartedRef.current = true;
      // Delay slightly so canvas starts drawing + cinematic timing with first rocket launch
      addTimer(() => { void tryAutoStartScene2(); }, 650);
    }

    if (!startedRef.current) {
      startedRef.current = true;
      // Begin state machine: main birthday after small delay
      addTimer(() => startMainBirthday(cw, ch), 450);
    }

    // Animation loop
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(48, now - last);
      last = now;

      // Clear
      ctx.clearRect(0, 0, cw, ch);

      // Draw stars (slow moving background) — SQUARE PIXEL FILLRECT (matching font pixel!)
      const stars = starsRef.current;
      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.phase += 0.002 * dt;
        if (s.y < -5) {
          s.y = ch + 5;
          s.x = Math.random() * cw;
        }
        if (s.x < -5) s.x = cw + 5;
        else if (s.x > cw + 5) s.x = -5;
        const flick = 0.6 + 0.4 * Math.sin(s.phase);
        ctx.globalAlpha = s.alpha * flick;
        ctx.fillStyle = "#ffffff";
        const starSz = Math.max(1, s.size);
        ctx.fillRect(s.x - starSz / 2, s.y - starSz / 2, starSz, starSz);
      }
      ctx.globalAlpha = 1;

      // Rockets update + draw — ROCKET CORE = SQUARE (matching pixel art style)
      const rockets = rocketsRef.current;
      for (let i = rockets.length - 1; i >= 0; i--) {
        const r = rockets[i];
        r.t = Math.min(1, (now - r.startAt) / r.duration);
        const eased = 1 - Math.pow(1 - r.t, 2.6);
        r.y = r.startY + (r.targetY - r.startY) * eased;
        // ✅ Gerak X juga (startX → targetX) untuk roket wish yang menuju posisi kiri/kanan!
        const rAny = r as any;
        const rStartX = typeof rAny.startX === "number" ? rAny.startX : r.x;
        const rTargetX = typeof rAny.targetX === "number" ? rAny.targetX : r.x;
        r.x = rStartX + (rTargetX - rStartX) * eased;
        r.trailTimer += dt;
        const spawnEvery = reduced ? 16 : 9;
        if (r.trailTimer >= spawnEvery) {
          r.trailTimer = 0;
          spawnParticle({
            x: r.x + (Math.random() - 0.5) * 1.5,
            y: r.y + r.size * 1.2,
            vx: (Math.random() - 0.5) * 0.05,
            vy: 0.05 + Math.random() * 0.12,
            life: 0,
            maxLife: 500 + Math.random() * 400,
            size: r.size * 0.6 + Math.random() * 0.9,
            color: Math.random() < 0.5 ? r.color : "#FFFFFF",
            kind: "rocketTrail",
            alpha: 1,
            gravity: 0.0,
            drag: 0.98,
            glow: 9 + Math.random() * 7,
          });
          if (Math.random() < 0.35) {
            spawnParticle({
              x: r.x + (Math.random() - 0.5) * 3,
              y: r.y + r.size * 2,
              vx: (Math.random() - 0.5) * 0.03,
              vy: 0.03 + Math.random() * 0.05,
              life: 0,
              maxLife: 800 + Math.random() * 700,
              size: 2.1 + Math.random() * 2.4,
              color: "rgba(200,200,220,0.5)",
              kind: "smoke",
              alpha: 0.4,
              gravity: 0,
              drag: 0.995,
              glow: 0,
            });
          }
        }
        // Rocket glow aura (lighter composite)
        const grad = ctx.createRadialGradient(r.x, r.y, 0, r.x, r.y, r.size * 4.8);
        grad.addColorStop(0, "rgba(255,255,255,1)");
        grad.addColorStop(0.35, r.color + "cc");
        grad.addColorStop(1, r.color + "00");
        ctx.globalCompositeOperation = "lighter";
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.size * 4.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalCompositeOperation = "source-over";
        // ✅ Rocket CORE = SQUARE PIXEL (bukan lingkaran! Matching pixel art font & particles)
        ctx.fillStyle = "#FFFFFF";
        const coreSz = Math.max(2, Math.round(r.size * 1.15));
        ctx.fillRect(r.x - coreSz / 2, r.y - coreSz / 2, coreSz, coreSz);

        if (r.t >= 1) {
          rockets.splice(i, 1);
        }
      }

      // Particles update + draw — SINGLE PASS, ALL PIXEL SQUARE, TRUE TWEEN CINEMATIC
      const arr = particlesRef.current;
      const nowMs = now;

      ctx.globalCompositeOperation = "lighter";
      for (let i = arr.length - 1; i >= 0; i--) {
        const p = arr[i];
        p.life += dt;
        const aliveFrac = p.life / p.maxLife;
        if (aliveFrac >= 1) { arr.splice(i, 1); continue; }

        const isText = p.kind === "textForm";

        // ✅ TEXTFORM TRUE TWEEN CINEMATIC: startX/Y → tx/ty (bukan incremental lerp!)
        // Transisi SMOOTH: partikel terbang explode beberapa frame (life<80ms), lalu start tween terkunci ke pixel huruf
        // Visual: TERBANG TERLEBIH DAHULU → BERHENTI SEKARAT → MULAI MENYUSUN HURUF (smooth!)
        if (isText && p.tx !== undefined && p.ty !== undefined) {
          const TWEEN_DELAY = 70 + Math.random() * 80; // 70-150ms partikel "terbang acak" terlebih dahulu (explode feel)
          const effT = Math.max(0, p.life - TWEEN_DELAY);
          p.tweenT = effT;
          const twDur = p.tweenDur || 780;
          const twFrac = Math.min(1, effT / twDur);
          if (twFrac < 1) {
            // ✅ PHASE 1: Terbang acak sebentar (0-70/150ms) → velocity explode masih aktif (natural!)
            if (p.life < TWEEN_DELAY) {
              // Belum mulai tween = terbang sesuai velocity ledakan (fade gravity=0)
              p.vx *= p.drag;
              p.vy *= p.drag;
              p.x += p.vx * dt;
              p.y += p.vy * dt;
            } else {
              // ✅ PHASE 2: TRUE CINEMATIC TWEEN — easeOutCubic dari start posisi KE pixel huruf target (NO OVERSHOOT!)
              const ease = 1 - Math.pow(1 - twFrac, 3);
              if (p.startX === undefined) { p.startX = p.x; p.startY = p.y; }
              const sX = p.startX!;
              const sY = p.startY!;
              p.x = sX + (p.tx! - sX) * ease;
              p.y = sY + (p.ty! - sY) * ease;
              // Zero velocity (pastikan tidak drift!)
              p.vx = 0;
              p.vy = 0;
            }
          } else {
            // ✅ PHASE 3: LOCK PIXEL TOTAL di posisi huruf — selamanya, sampai fade out
            p.x = p.tx;
            p.y = p.ty;
            p.vx = 0;
            p.vy = 0;
          }
        } else {
          // Non-text particle: normal physics (explode/sparkle/rocketTrail/smoke)
          p.vx *= p.drag;
          p.vy = p.vy * p.drag + p.gravity * dt;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
        }

        // Alpha fade (textForm bertahan lebih lama: 87% life baru fade, non-text = 78%)
        let alpha = 1;
        const fadeEndFrac = isText ? 0.89 : 0.79;
        const fadeInFrac = isText ? 0.05 : 0.12;
        if (aliveFrac < fadeInFrac) alpha = aliveFrac / fadeInFrac;
        else if (aliveFrac > fadeEndFrac) alpha = Math.max(0, 1 - (aliveFrac - fadeEndFrac) / (1 - fadeEndFrac));
        if (p.kind === "smoke") alpha *= 0.4;
        // Micro flicker LED natural: ±4% opacity Saja (size TETAP SAMA!)
        const flickP =
          isText
            ? 0.965 + 0.035 * Math.sin(nowMs * 0.011 + i * 0.29)
            : 1;
        alpha *= flickP;
        p.alpha = alpha;

        // Glow aura LED (all particles — non glow=0 soal smoke)
        if (p.glow > 0 && alpha > 0.03) {
          const glowRadius = p.size * (isText ? 3.3 : 4.7);
          const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glowRadius);
          g.addColorStop(0, p.color);
          g.addColorStop(0.46, p.color + "4f");
          g.addColorStop(1, p.color + "00");
          ctx.globalAlpha = alpha * (isText ? 0.66 : 0.9);
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(p.x, p.y, glowRadius, 0, Math.PI * 2);
          ctx.fill();
        }
        // ✅ ALL PARTICLES = SQUARE fillRect (100% pixel art style, matching font pixel!)
        // ✅✨ PIXEL SQUARE INTEGER SIZE: sz dibulatkan SELALU ke integer kelipatan!
        // Ini membuat semua LED pixel fireworks TERLIHAT NATURAL pixel board, bukan float blur.
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        const sz = Math.max(1, Math.round(p.size));
        const hsz = (sz % 2 === 0) ? sz / 2 : sz / 2;
        ctx.fillRect(Math.round(p.x - hsz), Math.round(p.y - hsz), sz, sz);
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";

      // ✅ DOM TEXT OVERLAY = MAX 0 OPACITY (100% DIHAPUS! Pixel font = 100% object utama)
      if (activeTextRef.current.length > 0) {
        const targetOpacity = 0; // HARD ZERO — teks DOM TIDAK PERNAH MUNCUL!
        const targetScale = 1;
        textOpacityRef.current += (targetOpacity - textOpacityRef.current) * Math.min(1, dt / 220);
        textScaleRef.current += (targetScale - textScaleRef.current) * Math.min(1, dt / 500);
      } else {
        textOpacityRef.current += (0 - textOpacityRef.current) * Math.min(1, dt / 380);
        textScaleRef.current += (0.85 - textScaleRef.current) * Math.min(1, dt / 380);
      }

      // Transition out: dim scene
      if (stateRef.current === FWState.TRANSITION_OUT) {
        const t = Math.min(1, (now - transitionOutStartRef.current) / 1100);
        sceneFadeRef.current = t;
        ctx.fillStyle = `rgba(5,2,12,${0.55 * t})`;
        ctx.fillRect(0, 0, cw, ch);
      }

      // Force occasional rerender to update DOM text overlay opacity (for smoothness)
      if ((now | 0) % 4 === 0) forceRerender();

      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      ro.disconnect();
      clearTimers();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  // Skip / fast-forward: tap anywhere during scene -> jump to transition out
  const handleSkip = () => {
    if (stateRef.current < FWState.TRANSITION_OUT && !doneTriggeredRef.current) {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      let cw = 0, ch = 0;
      if (container) {
        const rect = container.getBoundingClientRect();
        cw = rect.width; ch = rect.height;
      }
      beginTransitionOut(cw, ch);
    }
  };

  const titleStyle: React.CSSProperties =
    textKindRef.current === "final"
      ? { fontSize: "clamp(1.5rem, 7.2vw, 2.8rem)", letterSpacing: "0.04em" }
      : textKindRef.current === "main"
      ? { fontSize: "clamp(1.8rem, 8vw, 3rem)", letterSpacing: "0.06em" }
      : { fontSize: "clamp(1rem, 4.6vw, 1.45rem)", letterSpacing: "0.02em", lineHeight: 1.25 };
  void titleStyle; // preserved for future, currently unused since DOM overlay removed.

  return (
    <section
      className={`scene-layer ${active ? "scene-active" : "scene-hidden"}`}
      aria-hidden={!active}
      ref={containerRef}
      onClick={active ? handleSkip : undefined}
      onTouchStart={active ? handleSkip : undefined}
      style={{ padding: 0, cursor: active ? "pointer" : "default" }}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full select-none"
        aria-hidden
        style={{
          display: "block",
          touchAction: "none",
        }}
      />

      {/* Scene fade overlay for transition out */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "rgba(5,2,12,0)",
          opacity: Math.min(1, sceneFadeRef.current * 0.8),
          transition: "background 0.1s linear",
          zIndex: 6,
        }}
        aria-hidden
      />

      {/* Tiny hint first 4s */}
      {active && stateRef.current < FWState.WISH_LAUNCH && (
        <div
          className="absolute left-0 right-0 text-center pointer-events-none select-none"
          style={{
            bottom: "max(1.2rem, calc(env(safe-area-inset-bottom) + 0.9rem))",
            fontSize: 11,
            letterSpacing: "0.12em",
            color: "rgba(255,240,210,0.4)",
            textTransform: "uppercase",
            animation: "fadeOutHint 4s ease-out forwards",
          }}
          aria-hidden
        >
          Tap anywhere to skip
        </div>
      )}

      <style>{`
        @keyframes fadeOutHint {
          0% { opacity: 0; }
          25% { opacity: 0.7; }
          70% { opacity: 0.5; }
          100% { opacity: 0; }
        }
      `}</style>

      <div className="vignette" />
    </section>
  );
}
