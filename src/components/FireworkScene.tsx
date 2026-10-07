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

const PALETTE_MAIN = ["#FFE9A8", "#FFD07F", "#FFB347", "#FF8AA8", "#FFC9DE", "#C9A8FF"];
const PALETTE_WISH = [
  ["#FFD07F", "#FFE9A8", "#FFB347"],
  ["#FF8AA8", "#FFC9DE", "#FFFFFF"],
  ["#C9A8FF", "#E8D9FF", "#FFFFFF"],
  ["#8AD9FF", "#C9ECFF", "#FFFFFF"],
  ["#9CFFB0", "#D5FFDC", "#FFFFFF"],
  ["#FFE08A", "#FFF0C4", "#FFCF72"],
  ["#FF9CC6", "#FFCFE0", "#FFFFFF"],
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

  // Text sampling: rasterize text on offscreen canvas and return array of target coords
  const sampleTextPoints = (
    text: string,
    fontSize: number,
    targetCount: number,
    cw: number,
    ch: number,
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
    const fs = Math.min(fontSize, cw * 0.095);
    // Break into 2 lines if too long
    const words = text.split(" ");
    let lines: string[] = [];
    if (words.length > 4 && text.length > 26) {
      const mid = Math.ceil(words.length / 2);
      lines.push(words.slice(0, mid).join(" "), words.slice(mid).join(" "));
    } else {
      lines.push(text);
    }
    const lh = fs * 1.15;
    const startY = ch * 0.5 - ((lines.length - 1) * lh) / 2;
    lines.forEach((line, i) => {
      const localFs = line.length > 22 ? fs * 0.82 : line.length > 18 ? fs * 0.9 : fs;
      octx.font = `700 ${localFs}px Inter, system-ui, sans-serif`;
      octx.fillText(line, cw / 2, startY + i * lh);
    });
    const img = octx.getImageData(0, 0, off.width, off.height).data;
    const pts: { x: number; y: number }[] = [];
    const step = Math.max(9, Math.floor(scale * 4.5));
    for (let y = 0; y < off.height; y += step) {
      for (let x = 0; x < off.width; x += step) {
        const a = img[(y * off.width + x) * 4 + 3];
        if (a > 160) {
          pts.push({ x: Math.round(x / scale), y: Math.round(y / scale) });
        }
      }
    }
    if (pts.length === 0) {
      for (let i = 0; i < targetCount; i++) {
        pts.push({ x: cw / 2 + (Math.random() - 0.5) * 100, y: ch * 0.5 + (Math.random() - 0.5) * 40 });
      }
    }
    // Pixel art = don't shuffle the shape sample order
    return pts;
  };

  const startMainBirthday = (cw: number, ch: number) => {
    stateRef.current = FWState.MAIN_LAUNCH;
    const { mainBirthday } = fwCfg;
    const rocket: Rocket = {
      x: cw * 0.5 + (Math.random() - 0.5) * 20,
      y: ch + 20,
      startY: ch + 20,
      targetY: ch * 0.28 + Math.random() * ch * 0.08,
      vy: 0,
      startAt: performance.now(),
      duration: mainBirthday.launchDuration,
      color: PALETTE_MAIN[0],
      trailTimer: 0,
      exploded: false,
      size: 3.4,
      t: 0,
    };
    rocketsRef.current.push(rocket);
    addTimer(() => {
      // Explode
      explodeAt(rocket.x, rocket.targetY, PALETTE_MAIN, 1.0, cw, ch, mainBirthday.text, "main");
      stateRef.current = FWState.MAIN_EXPLODE;
      addTimer(() => {
        stateRef.current = FWState.MAIN_TEXT;
        activeTextRef.current = mainBirthday.text;
        textKindRef.current = "main";
        addTimer(() => {
          // next phase: wishes or skip to final
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
    const x = cw * (0.18 + Math.random() * 0.64);
    const targetY = ch * (0.22 + Math.random() * 0.18);
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
      size: 2.9,
      t: 0,
    };
    rocketsRef.current.push(rocket);
    addTimer(() => {
      explodeAt(x, targetY, palette, 0.85, cw, ch, wishes[idx], "wish");
      stateRef.current = FWState.WISH_EXPLODE;
      addTimer(() => {
        stateRef.current = FWState.WISH_TEXT;
        activeTextRef.current = wishes[idx];
        textKindRef.current = "wish";
        addTimer(() => {
          // Next wish
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
        }, 2000);
      }, 400);
    }, duration + 20);
  };

  const startFinal = (cw: number, ch: number) => {
    stateRef.current = FWState.FINAL_LAUNCH;
    const { ending } = fwCfg;
    const palette = ["#FFD07F", "#FF8AA8", "#FFE9A8", "#C9A8FF", "#FFFFFF"];
    const duration = 1900;
    const rocket: Rocket = {
      x: cw * 0.5 + (Math.random() - 0.5) * 12,
      y: ch + 20,
      startY: ch + 20,
      targetY: ch * 0.26,
      vy: 0,
      startAt: performance.now(),
      duration,
      color: "#FFFFFF",
      trailTimer: 0,
      exploded: false,
      size: 4.2,
      t: 0,
    };
    rocketsRef.current.push(rocket);
    addTimer(() => {
      explodeAt(rocket.x, rocket.targetY, palette, 1.3, cw, ch, ending.text, "final");
      stateRef.current = FWState.FINAL_EXPLODE;
      // Add 2 smaller secondary fireworks for grand finale
      addTimer(() => {
        explodeAt(cw * 0.28, ch * 0.36, ["#FF8AA8", "#FFC9DE"], 0.65, cw, ch, "", "final");
      }, 200);
      addTimer(() => {
        explodeAt(cw * 0.72, ch * 0.33, ["#C9A8FF", "#E8D9FF"], 0.65, cw, ch, "", "final");
      }, 380);
      addTimer(() => {
        stateRef.current = FWState.FINAL_TEXT;
        activeTextRef.current = ending.text;
        textKindRef.current = "final";
        addTimer(() => {
          beginTransitionOut(cw, ch);
        }, ending.duration || 3000);
      }, 600);
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
    const baseCount = reduced ? 80 : 140;
    const count = Math.floor(baseCount * scale);
    const dominantColor = palette[0];
    const accentColor = palette[1] ?? dominantColor;
    const pixSize =
      kind === "final" ? 2.05 : kind === "main" ? 1.95 : kind === "wish" ? 1.65 : 1.7;

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.28;
      const speed = (0.12 + Math.random() * 0.58) * scale * (reduced ? 0.82 : 1);
      const isForm = Math.random() < 0.55 && textForForm.length > 0;
      const color = isForm ? (Math.random() < 0.78 ? dominantColor : accentColor) : sampleColor(palette);
      const p: Particle = {
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0,
        maxLife: isForm ? 4200 + Math.random() * 1400 : 1400 + Math.random() * 1400,
        size: isForm
          ? pixSize * (0.92 + Math.random() * 0.18)
          : (1.2 + Math.random() * 2.4) * scale,
        color,
        kind: isForm ? "textForm" : "explode",
        alpha: 1,
        gravity: isForm ? 0 : 0.00015 + Math.random() * 0.0002,
        drag: isForm ? 0.986 : 0.988 - Math.random() * 0.008,
        glow: isForm ? pixSize * 5.5 : 8 + Math.random() * 14 * scale,
      };
      spawnParticle(p);
    }
    for (let i = 0; i < (reduced ? 18 : 34) * scale; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (0.05 + Math.random() * 0.28) * scale;
      spawnParticle({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0,
        maxLife: 600 + Math.random() * 950,
        size: 0.6 + Math.random() * 1.3,
        color: sampleColor(palette),
        kind: "sparkle",
        alpha: 1,
        gravity: 0.00005,
        drag: 0.985,
        glow: 6 + Math.random() * 11,
      });
    }
    if (textForForm.length > 0) {
      const fontSize =
        kind === "final"
          ? Math.max(18, Math.min(40, cw * 0.075))
          : kind === "main"
          ? Math.max(20, Math.min(42, cw * 0.078))
          : Math.max(14, Math.min(30, cw * 0.058));
      const pts = sampleTextPoints(textForForm, fontSize, 0, cw, ch);
      if (pts.length > 0) {
        const existingCandidates = particlesRef.current.filter(
          (p) => p.kind === "textForm" && p.tx === undefined && p.life < 200,
        );
        const assignTo = (list: Particle[]) => {
          list.forEach((p, i) => {
            const t = pts[i % pts.length];
            p.tx = t.x;
            p.ty = t.y;
            p.tweenT = 0;
            p.tweenDur = 620 + Math.random() * 380;
          });
        };
        assignTo(existingCandidates.slice(0, pts.length));
        const assigned = Math.min(existingCandidates.length, pts.length);
        const remaining = pts.length - assigned;
        if (remaining > 0) {
          for (let k = assigned; k < pts.length; k++) {
            const t = pts[k];
            const angle = Math.random() * Math.PI * 2;
            const speed = 0.1 + Math.random() * 0.45;
            spawnParticle({
              x: cx + (Math.random() - 0.5) * 8,
              y: cy + (Math.random() - 0.5) * 8,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed,
              life: 0,
              maxLife: 4300 + Math.random() * 1300,
              size: pixSize * (0.9 + Math.random() * 0.2),
              color: Math.random() < 0.82 ? dominantColor : accentColor,
              kind: "textForm",
              alpha: 1,
              gravity: 0,
              drag: 0.986,
              glow: pixSize * 5.5,
              tx: t.x,
              ty: t.y,
              tweenT: 0,
              tweenDur: 640 + Math.random() * 400,
            });
          }
        }
        // NO SHADOW PIXEL LAYER — dihapus sesuai permintaan
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

      // Draw stars (slow moving background)
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
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Rockets update + draw
      const rockets = rocketsRef.current;
      for (let i = rockets.length - 1; i >= 0; i--) {
        const r = rockets[i];
        r.t = Math.min(1, (now - r.startAt) / r.duration);
        // Ease out for position (accelerating launch)
        const eased = 1 - Math.pow(1 - r.t, 2.6);
        r.y = r.startY + (r.targetY - r.startY) * eased;
        // Trail
        r.trailTimer += dt;
        const spawnEvery = reduced ? 16 : 9;
        if (r.trailTimer >= spawnEvery) {
          r.trailTimer = 0;
          // Rocket trail particle
          spawnParticle({
            x: r.x + (Math.random() - 0.5) * 1.5,
            y: r.y + r.size * 1.2,
            vx: (Math.random() - 0.5) * 0.05,
            vy: 0.05 + Math.random() * 0.12,
            life: 0,
            maxLife: 500 + Math.random() * 400,
            size: r.size * 0.6 + Math.random() * 0.8,
            color: Math.random() < 0.5 ? r.color : "#FFFFFF",
            kind: "rocketTrail",
            alpha: 1,
            gravity: 0.0,
            drag: 0.98,
            glow: 8 + Math.random() * 6,
          });
          // Smoke occasionally
          if (Math.random() < 0.35) {
            spawnParticle({
              x: r.x + (Math.random() - 0.5) * 3,
              y: r.y + r.size * 2,
              vx: (Math.random() - 0.5) * 0.03,
              vy: 0.03 + Math.random() * 0.05,
              life: 0,
              maxLife: 800 + Math.random() * 700,
              size: 2 + Math.random() * 2.2,
              color: "rgba(200,200,220,0.5)",
              kind: "smoke",
              alpha: 0.4,
              gravity: 0,
              drag: 0.995,
              glow: 0,
            });
          }
        }
        // Draw rocket
        const grad = ctx.createRadialGradient(r.x, r.y, 0, r.x, r.y, r.size * 4.5);
        grad.addColorStop(0, "rgba(255,255,255,1)");
        grad.addColorStop(0.35, r.color + "cc");
        grad.addColorStop(1, r.color + "00");
        ctx.globalCompositeOperation = "lighter";
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.size * 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalCompositeOperation = "source-over";
        // Core
        ctx.fillStyle = "#FFFFFF";
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.size * 0.9, 0, Math.PI * 2);
        ctx.fill();

        if (r.t >= 1) {
          rockets.splice(i, 1);
        }
      }

      // Particles update + draw (SINGLE PASS — SHADOW LAYER REMOVED per user request)
      const arr = particlesRef.current;
      const nowMs = now;

      ctx.globalCompositeOperation = "lighter";
      for (let i = arr.length - 1; i >= 0; i--) {
        const p = arr[i];
        p.life += dt;
        const aliveFrac = p.life / p.maxLife;
        if (aliveFrac >= 1) { arr.splice(i, 1); continue; }

        if (p.kind === "textForm" && p.tx !== undefined && p.ty !== undefined) {
          p.tweenT = (p.tweenT || 0) + dt;
          const twDur = p.tweenDur || 720;
          const twFrac = Math.min(1, p.tweenT / twDur);
          // DIRECT LERP POSITION (NO VELOCITY OSCILLATION = NO BOUNCE!)
          // Before: velocity-based gx/gy force → bisa overshoot target karena velocity inertia
          // After: easeOutCubic lerp p.x directly from "current explode flight pos" -> "tx/ty"
          // Simpan start posisi sekali di first tween tick via particle scratch micro-state trick p.tx/p.ty existing + init via first pos if not set — gunakan tx/ty sbg target, set start pos pake property hidden dgn Object.defineProperty or ref? Lebih simpel: simpan startX/Y via p.vx/vy DIPAKAI SEBAGAI START POS di tween frame pertama, lalu set flag dengan tx === undefined tidak mungkin, kita simpan p.startX/startY di particle dengan assign inline (TS allow any extra props via typed interface? Tapi Particle tidak punya startX. Solution: gunakan p.tweenT == 0 (frame pertama start tween) simpan pos SEBAGAI awal via closure variable tidak mungkin. Easier: di spawn explodeAt sudah assign tx/ty langsung particle baru, jadi TIDAK PUNYA start pos. GIMNA caranya start posisi = posisi saat tween dimulai? Workaround: gunakan easeOutExpo lerp — tiap frame set pos = lerp(pos, target, 0.085 * ...). Ini akan smooth settle NO OVERSHOOT & tidak butuh start pos.
          if (twFrac < 1) {
            // Smoothly LERP current position directly toward target (NO VELOCITY, so no inertia bounce!)
            // easeOutCubic strength lerp, no velocity vector accumulation
            const lerpT = 1 - Math.pow(1 - Math.min(1, twFrac * 1.15), 3);
            // Calculate current toward target
            const towardX = p.tx - p.x;
            const towardY = p.ty - p.y;
            p.x += towardX * lerpT * Math.min(1, dt / 520);
            p.y += towardY * lerpT * Math.min(1, dt / 520);
            // Also dampen any leftover explode velocity (safety: no overshoot drift!)
            p.vx *= 0.92;
            p.vy *= 0.92;
            if (Math.abs(towardX) < 0.25 && Math.abs(towardY) < 0.25) {
              // Sudah dekat = langsung KUNCI, tidak usah tunggu twFrac penuh!
              p.tweenT = twDur + 1;
              p.x = p.tx;
              p.y = p.ty;
              p.vx = 0;
              p.vy = 0;
            }
          } else {
            // LOCK EKSACT — micro flicker hanya opacity, TIDAK POSISI (bounce = dari posisi bergoyang!)
            p.x = p.tx;
            p.y = p.ty;
            p.vx = 0;
            p.vy = 0;
          }
        } else {
          p.vx *= p.drag;
          p.vy = p.vy * p.drag + p.gravity * dt;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
        }

        // Alpha fade
        let alpha = 1;
        const fadeEndFrac = p.kind === "textForm" ? 0.87 : 0.78;
        const fadeInFrac = p.kind === "textForm" ? 0.05 : 0.12;
        if (aliveFrac < fadeInFrac) alpha = aliveFrac / fadeInFrac;
        else if (aliveFrac > fadeEndFrac) alpha = Math.max(0, 1 - (aliveFrac - fadeEndFrac) / (1 - fadeEndFrac));
        if (p.kind === "smoke") alpha *= 0.4;
        // Stabilize textForm: NO SIZE FLICKER! Posisi juga terkunci — opacity micro kedip tipis saja
        const flickP =
          p.kind === "textForm"
            ? 0.96 + 0.04 * Math.sin(nowMs * 0.012 + i * 0.31)
            : 1;
        alpha *= flickP;
        p.alpha = alpha;

        const isText = p.kind === "textForm";
        // Glow aura
        if (p.glow > 0 && alpha > 0.03) {
          const glowRadius = p.size * (isText ? 3.2 : 4.5);
          const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glowRadius);
          g.addColorStop(0, p.color);
          g.addColorStop(0.45, p.color + "55");
          g.addColorStop(1, p.color + "00");
          ctx.globalAlpha = alpha * (isText ? 0.65 : 0.9);
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(p.x, p.y, glowRadius, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        if (isText) {
          const sz = p.size;  // SAMA SELALU — TIDAK ADA SIZE FLICKER (menyebabkan "pulse/bounce")
          ctx.fillRect(p.x - sz / 2, p.y - sz / 2, sz, sz);
        } else {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";

      // Update text opacity/scale for DOM overlay (SUPER FAINT HINT ONLY — 0.12 MAX opacity, 99% canvas pixels dominate!)
      if (activeTextRef.current.length > 0) {
        const targetOpacity = 0.12;
        const targetScale = 1;
        textOpacityRef.current += (targetOpacity - textOpacityRef.current) * Math.min(1, dt / 450);
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

      {/* Centered text overlay with cinematic glow */}
      <div
        className="absolute inset-0 pointer-events-none flex items-center justify-center px-4"
        style={{ zIndex: 5 }}
        aria-hidden
      >
        <div
          className="text-center select-none"
          style={{
            opacity: textOpacityRef.current,
            transform: `scale(${textScaleRef.current})`,
            transition: "none",
            willChange: "opacity, transform",
            maxWidth: "92%",
          }}
        >
          <h2
            className={`font-bold whitespace-pre-wrap break-words ${
              textKindRef.current === "final"
                ? "text-romantic"
                : textKindRef.current === "main"
                ? "tracking-widest uppercase"
                : "font-semibold"
            }`}
            style={{
              color: textKindRef.current === "final" ? "#FFD7E3" : "#FFF6D8",
              // No strong text-shadow — it's just a readability hint, invisible to casual eye
              textShadow: "0 1px 2px rgba(0,0,0,0.4)",
              WebkitTextStroke: undefined,
              ...titleStyle,
            }}
          >
            {activeTextRef.current}
          </h2>
          {/* Sparkle decorations around text — also faint so it doesn't fight the pixel art */}
          {activeTextRef.current.length > 0 && (
            <div
              className="mt-4 flex items-center justify-center gap-3 text-cinematic-gold"
              style={{ opacity: Math.min(0.18, textOpacityRef.current * 1.6) }}
              aria-hidden
            >
              <span style={{ fontSize: "1.2em", opacity: 0.8 }}>✦</span>
              <span style={{ fontSize: "0.8em", opacity: 0.7 }}>✧</span>
              <span style={{ fontSize: "1.2em", opacity: 0.8 }}>✦</span>
            </div>
          )}
        </div>
      </div>

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
