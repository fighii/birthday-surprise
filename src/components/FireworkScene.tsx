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

  const wishes = useMemo(() => (fwCfg && fwCfg.wishes ? fwCfg.wishes.filter(Boolean) : []), []);
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
    clearTimers();
    forceRerender();
  };

  // Text sampling: rasterize text -> target coords. CENTER = (centerX, centerY) = POSISI LEDAKAN cx/cy!
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
    off.width = cw * scale;
    off.height = ch * scale;
    const octx = off.getContext("2d", { willReadFrequently: true });
    if (!octx) return [];
    octx.scale(scale, scale);
    octx.fillStyle = "#fff";
    octx.textAlign = "center";
    octx.textBaseline = "middle";
    const fs = Math.min(fontSize, cw * 0.14);
    // Break into 2 lines if too long (wish texts usually longer)
    const words = text.split(" ");
    let lines: string[] = [];
    if (words.length > 3 && text.length > 22) {
      const mid = Math.ceil(words.length / 2);
      lines.push(words.slice(0, mid).join(" "), words.slice(mid).join(" "));
    } else {
      lines.push(text);
    }
    const lh = fs * 1.18;
    // PUSAT SELURUH BLOCK TEXT = centerX, centerY (cx/cy LEDAKAN! bukan tengah canvas)
    const startY = centerY - ((lines.length - 1) * lh) / 2;
    lines.forEach((line, i) => {
      const localFs =
        line.length > 28 ? fs * 0.76 : line.length > 22 ? fs * 0.84 : line.length > 16 ? fs * 0.92 : fs;
      // Pixel font feel: font-weight BLACK + Inter = solid crisp pixel shape
      octx.font = `900 ${localFs}px Inter, system-ui, -apple-system, sans-serif`;
      octx.fillText(line, centerX, startY + i * lh);
    });
    const img = octx.getImageData(0, 0, off.width, off.height).data;
    const pts: { x: number; y: number }[] = [];
    const step = Math.max(9, Math.floor(scale * 4.5)); // step 9px = renggang PIXEL ART NATURAL
    for (let y = 0; y < off.height; y += step) {
      for (let x = 0; x < off.width; x += step) {
        const a = img[(y * off.width + x) * 4 + 3];
        if (a > 180) {
          pts.push({ x: Math.round(x / scale), y: Math.round(y / scale) });
        }
      }
    }
    if (pts.length === 0) {
      for (let i = 0; i < targetCount; i++) {
        pts.push({ x: centerX + (Math.random() - 0.5) * 120, y: centerY + (Math.random() - 0.5) * 50 });
      }
    }
    return pts;
  };

  const startMainBirthday = (cw: number, ch: number) => {
    stateRef.current = FWState.MAIN_LAUNCH;
    const { mainBirthday } = fwCfg;
    const rocket: Rocket = {
      x: cw * 0.5 + (Math.random() - 0.5) * 20,
      y: ch + 20,
      startY: ch + 20,
      targetY: ch * 0.30 + Math.random() * ch * 0.08,
      vy: 0,
      startAt: performance.now(),
      duration: mainBirthday.launchDuration,
      color: PALETTE_MAIN[0],
      trailTimer: 0,
      exploded: false,
      size: 4.3,
      t: 0,
    };
    rocketsRef.current.push(rocket);
    addTimer(() => {
      explodeAt(rocket.x, rocket.targetY, PALETTE_MAIN, 1.0, cw, ch, mainBirthday.text, "main");
      stateRef.current = FWState.MAIN_EXPLODE;
      addTimer(() => {
        stateRef.current = FWState.MAIN_TEXT;
        activeTextRef.current = mainBirthday.text;
        textKindRef.current = "main";
        addTimer(() => {
          if (wishes.length > 0) {
            startWish(cw, ch);
          } else {
            startFinal(cw, ch);
          }
        }, mainBirthday.displayDuration);
      }, mainBirthday.explosionDelay + 450);
    }, mainBirthday.launchDuration + 20);
  };

  const startWish = (cw: number, ch: number) => {
    const idx = wishIdxRef.current;
    if (idx >= wishes.length) {
      startFinal(cw, ch);
      return;
    }
    stateRef.current = FWState.WISH_LAUNCH;
    const palette = PALETTE_WISH[idx % PALETTE_WISH.length];
    const x = cw * (0.16 + Math.random() * 0.68);
    const targetY = ch * (0.20 + Math.random() * 0.22);
    const duration = 1500 + Math.random() * 400;
    const rocket: Rocket = {
      x,
      y: ch + 20,
      startY: ch + 20,
      targetY,
      vy: 0,
      startAt: performance.now(),
      duration,
      color: palette[0],
      trailTimer: 0,
      exploded: false,
      size: 3.7,
      t: 0,
    };
    rocketsRef.current.push(rocket);
    addTimer(() => {
      explodeAt(x, targetY, palette, 0.9, cw, ch, wishes[idx], "wish");
      stateRef.current = FWState.WISH_EXPLODE;
      addTimer(() => {
        stateRef.current = FWState.WISH_TEXT;
        activeTextRef.current = wishes[idx];
        textKindRef.current = "wish";
        addTimer(() => {
          textOpacityRef.current = 0;
          textScaleRef.current = 0.85;
          activeTextRef.current = "";
          wishIdxRef.current = idx + 1;
          addTimer(() => {
            if (wishIdxRef.current >= wishes.length) {
              startFinal(cw, ch);
            } else {
              startWish(cw, ch);
            }
          }, fwCfg.wishInterval || 2200);
        }, 2100);
      }, 420);
    }, duration + 20);
  };

  const startFinal = (cw: number, ch: number) => {
    stateRef.current = FWState.FINAL_LAUNCH;
    const { ending } = fwCfg;
    const palette = ["#FFD86B", "#FF8AA8", "#FFE9A8", "#A084FF", "#FFFFFF"];
    const duration = 1900;
    const rocket: Rocket = {
      x: cw * 0.5 + (Math.random() - 0.5) * 12,
      y: ch + 20,
      startY: ch + 20,
      targetY: ch * 0.28,
      vy: 0,
      startAt: performance.now(),
      duration,
      color: "#FFFFFF",
      trailTimer: 0,
      exploded: false,
      size: 5.3,
      t: 0,
    };
    rocketsRef.current.push(rocket);
    addTimer(() => {
      explodeAt(rocket.x, rocket.targetY, palette, 1.4, cw, ch, ending.text, "final");
      stateRef.current = FWState.FINAL_EXPLODE;
      addTimer(() => {
        explodeAt(cw * 0.26, ch * 0.38, PALETTE_WISH[1].slice(0, 3), 0.72, cw, ch, "", "final");
      }, 220);
      addTimer(() => {
        explodeAt(cw * 0.74, ch * 0.35, PALETTE_WISH[2].slice(0, 3), 0.72, cw, ch, "", "final");
      }, 400);
      addTimer(() => {
        stateRef.current = FWState.FINAL_TEXT;
        activeTextRef.current = ending.text;
        textKindRef.current = "final";
        addTimer(() => {
          beginTransitionOut(cw, ch);
        }, ending.duration || 3000);
      }, 620);
    }, duration + 20);
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
    const baseCount = reduced ? 92 : 162;
    const count = Math.floor(baseCount * scale);
    const dominantColor = palette[0];
    const accentColor = palette[1] ?? dominantColor;
    // ✅ UKURAN PIXEL LEBIH BESAR 1.4-1.5x (proporsional, matching font size baru)
    const pixSize =
      kind === "final" ? 3.05 : kind === "main" ? 2.85 : kind === "wish" ? 2.4 : 2.5;

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.32;
      const speed = (0.13 + Math.random() * 0.62) * scale * (reduced ? 0.82 : 1);
      const isForm = Math.random() < 0.55 && textForForm.length > 0;
      const color = isForm ? (Math.random() < 0.78 ? dominantColor : accentColor) : sampleColor(palette);
      const p: Particle = {
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0,
        maxLife: isForm ? 4600 + Math.random() * 1600 : 1600 + Math.random() * 1600,
        size: isForm
          ? pixSize * (0.93 + Math.random() * 0.18)
          // EXPLODE PARTICLE SQUARE LEBIH BESAR (1.8x → 3.6x scale, bukan 1.2→2.4!)
          : (1.8 + Math.random() * 3.5) * scale,
        color,
        kind: isForm ? "textForm" : "explode",
        alpha: 1,
        gravity: isForm ? 0 : 0.00015 + Math.random() * 0.00022,
        drag: isForm ? 0.986 : 0.988 - Math.random() * 0.008,
        glow: isForm ? pixSize * 6.2 : 10 + Math.random() * 16 * scale,
      };
      spawnParticle(p);
    }
    // Sparkle particle size BESAR + SQUARE nanti di render
    for (let i = 0; i < (reduced ? 22 : 40) * scale; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (0.06 + Math.random() * 0.33) * scale;
      spawnParticle({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0,
        maxLife: 650 + Math.random() * 1100,
        size: 1.0 + Math.random() * 1.7,
        color: sampleColor(palette),
        kind: "sparkle",
        alpha: 1,
        gravity: 0.00005,
        drag: 0.985,
        glow: 7 + Math.random() * 12,
      });
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
              size: pixSize * (0.91 + Math.random() * 0.21),
              color: Math.random() < 0.82 ? dominantColor : accentColor,
              kind: "textForm",
              alpha: 1,
              gravity: 0,
              drag: 0.986,
              glow: pixSize * 6.2,
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
        const coreSz = r.size * 1.15;
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
        // Sebelumnya: explode, sparkle, rocketTrail = arc() BULAT → sekarang SEMUA KOTAK SAMA!
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        const sz = p.size;
        const hsz = sz / 2;
        ctx.fillRect(p.x - hsz, p.y - hsz, sz, sz);
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
