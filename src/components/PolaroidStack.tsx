import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { polaroidPhotos as photoFallback, polaroidPhotos as polaroidPhotoList } from "../config/media.js";
import {
  birthdayConfig,
  polaroidRotations,
  polaroidTranslates,
} from "../config/birthdayConfig.js";

interface PolaroidStackProps {
  onComplete?: () => void;
  active?: boolean;
}

const MAX_STACK = 30;
const TOTAL_TARGET = 30;
const LEAVE_FADE_MS = 500;
const SETTLE_ENTER_MS = 180;

type SlotPreset = {
  x: number;
  y: number;
  rot: number;
  label: string;
};

const SLOT_PRESETS: SlotPreset[] = [
  { x: -76, y: -130, rot: -8.0, label: "TopLeft" },
  { x:  76, y:  96,  rot:  6.5, label: "BotRight" },
  { x:  80, y: -126, rot:  9.0, label: "TopRight" },
  { x: -80, y:  94,  rot: -5.5, label: "BotLeft" },
  { x: -92, y:   4,  rot: -3.5, label: "MidLeft" },
  { x:  92, y:  -2,  rot:  5.0, label: "MidRight" },
  { x:   0, y: -114, rot: -2.5, label: "MidTopSafe" },
  { x:   2, y: 102,  rot:  3.8, label: "BotCenter" },
  { x:   0, y: -34,  rot:  1.2, label: "Center" },
];

const JITTER_TABLE: Array<[number, number, number]> = [
  [ 7, -5,  3.2],
  [-6,  4, -2.8],
  [ 5,  7,  4.1],
  [-4, -8, -3.5],
  [ 9,  3,  2.6],
  [-8,  6, -3.9],
  [ 4, -7,  1.8],
  [-5,  5,  4.6],
];

const FINAL_LAST_COUNT = 3;
const FINAL_ROTATIONS = [-1.8, 1.2, -0.7];
const FINAL_SCALE_BASE = 0.96;

function getSlotForIndex(c: number): { settleX: number; settleY: number; settleT: number; settleS: number } {
  if (c >= TOTAL_TARGET - FINAL_LAST_COUNT) {
    const finalIdx = c - (TOTAL_TARGET - FINAL_LAST_COUNT);
    const rot = FINAL_ROTATIONS[finalIdx % FINAL_ROTATIONS.length];
    const scaleBoost = finalIdx * 0.01;
    return {
      settleX: 0,
      settleY: 0,
      settleT: rot,
      settleS: Math.min(1.0, FINAL_SCALE_BASE + scaleBoost),
    };
  }
  const slotIdx = c % SLOT_PRESETS.length;
  const pass = Math.floor(c / SLOT_PRESETS.length);
  const slot = SLOT_PRESETS[slotIdx];
  let jx = 0;
  let jy = 0;
  let jr = 0;
  let scaleBoost = 0;
  if (pass > 0) {
    const jit = JITTER_TABLE[(pass - 1) % JITTER_TABLE.length];
    const k = Math.min(pass, 4);
    jx = jit[0] * k;
    jy = jit[1] * k;
    jr = jit[2] * k;
    scaleBoost = -0.01 * Math.min(pass, 6);
  }
  const settleX = Math.max(-120, Math.min(120, slot.x + jx));
  const settleY = Math.max(-146, Math.min(140, slot.y + jy));
  const settleT = slot.rot + jr;
  const settleS = Math.max(0.78, 0.9 + scaleBoost - pass * 0.006);
  return { settleX, settleY, settleT, settleS };
}

type SlotItem = {
  index: number;
  photoSrc: string | null;
  rotation: number;
  enterTx: number;
  enterTy: number;
  settleT: number;
  settleS: number;
  settleX: number;
  settleY: number;
  key: string;
  entering: boolean;
  leavingAt?: number;
  errored?: boolean;
};

export default function PolaroidStack({ onComplete, active = true }: PolaroidStackProps) {
  const availablePhotos = useMemo(() => {
    const specific = (polaroidPhotoList || []).filter((p: string) => typeof p === "string" && p.length > 0);
    if (specific.length > 0) return specific;
    return (photoFallback || []).filter((p: string) => typeof p === "string" && p.length > 0);
  }, []);

  const totalCount = availablePhotos.length > 0
    ? Math.min(TOTAL_TARGET, Math.max(availablePhotos.length, Math.min(availablePhotos.length * Math.ceil(TOTAL_TARGET / Math.max(1, availablePhotos.length)), TOTAL_TARGET)))
    : 0;

  const [visible, setVisible] = useState<SlotItem[]>([]);
  const [cursor, setCursor] = useState(0);
  const [errorMap, setErrorMap] = useState<Record<string, boolean>>({});
  const timers = useRef<number[]>([]);
  const lastAddedIdx = useRef<number>(-1);
  const lastPrunedKey = useRef<string | null>(null);

  useEffect(() => {
    if (!active) return;
    const intervalMs = 50;
    const scanTimer = window.setInterval(() => {
      const now = Date.now();
      setVisible((cur) => {
        const toRemove: string[] = [];
        for (const it of cur) {
          if (it.leavingAt && now - it.leavingAt >= LEAVE_FADE_MS) {
            toRemove.push(it.key);
          }
        }
        if (toRemove.length === 0) return cur;
        return cur.filter((it) => !toRemove.includes(it.key));
      });
    }, intervalMs);
    timers.current.push(scanTimer);
    return () => window.clearInterval(scanTimer);
  }, [active]);

  const addNext = useCallback(() => {
    setCursor((c) => {
      if (lastAddedIdx.current >= c) return c + 1;
      lastAddedIdx.current = c;
      const next = c + 1;
      if (availablePhotos.length === 0) {
        return TOTAL_TARGET + 1;
      }
      const photoIdx = availablePhotos.length > 0 ? c % availablePhotos.length : 0;
      const rot = polaroidRotations[c % polaroidRotations.length];
      const entryT = polaroidTranslates[c % polaroidTranslates.length];
      const slot = getSlotForIndex(c);
      const settleRot = slot.settleT;
      const settleScale = slot.settleS;
      const settleX = slot.settleX;
      const settleY = slot.settleY;
      const key = `p-${c}-${Date.now()}`;
      const item: SlotItem = {
        index: c,
        photoSrc: availablePhotos[photoIdx] ?? null,
        rotation: rot,
        enterTx: entryT.x,
        enterTy: entryT.y,
        settleT: settleRot,
        settleS: settleScale,
        settleX,
        settleY,
        key,
        entering: true,
      };
      setVisible((prev) => {
        const activeItems = prev.filter((it) => !it.leavingAt);
        if (activeItems.length >= MAX_STACK && lastPrunedKey.current !== key) {
          const oldest = [...activeItems].sort((a, b) => a.index - b.index)[0];
          if (oldest) {
            lastPrunedKey.current = oldest.key;
            const prev2 = prev.map((it) =>
              it.key === oldest.key ? { ...it, leavingAt: Date.now() } : it,
            );
            return [...prev2, item];
          }
        }
        return [...prev, item];
      });
      const t1 = window.setTimeout(() => {
        setVisible((prev) => prev.map((it) => (it.key === key ? { ...it, entering: false } : it)));
      }, SETTLE_ENTER_MS);
      timers.current.push(t1);
      return next;
    });
  }, [availablePhotos]);

  useEffect(() => {
    if (!active) return;
    // start after short delay (scene fade)
    const t0 = window.setTimeout(() => addNext(), 1100);
    timers.current.push(t0);
    return () => {
      timers.current.forEach((t) => window.clearTimeout(t));
      timers.current = [];
    };
  }, [active, addNext]);

  useEffect(() => {
    if (!active) return;
    const photoDuration = birthdayConfig.photoDuration ?? 3500;
    // every photoDuration ms add next, but only if we haven't finished
    if (cursor >= TOTAL_TARGET) return;
    if (availablePhotos.length === 0) {
      // empty state, no scheduling
      return;
    }
    const t = window.setTimeout(() => {
      if (cursor < TOTAL_TARGET) addNext();
    }, photoDuration);
    timers.current.push(t);
    return () => window.clearTimeout(t);
  }, [cursor, active, addNext, availablePhotos.length]);

  useEffect(() => {
    if (!active) return;
    if (availablePhotos.length === 0) {
      const t = window.setTimeout(() => onComplete?.(), 1800);
      return () => window.clearTimeout(t);
    }
    if (cursor >= TOTAL_TARGET) {
      const t = window.setTimeout(() => onComplete?.(), 1800);
      return () => window.clearTimeout(t);
    }
  }, [cursor, active, onComplete, availablePhotos.length]);

  const handleImgError = (key: string) => {
    setErrorMap((m) => ({ ...m, [key]: true }));
  };

  const counterLabel =
    availablePhotos.length === 0
      ? null
      : `${Math.min(cursor, TOTAL_TARGET)} / ${TOTAL_TARGET}`;

  return (
    <div className="relative w-full max-w-sm mx-auto flex flex-col items-center gap-3 py-2">
      {availablePhotos.length === 0 ? (
        <div className="glass px-6 py-10 text-center">
          <p className="text-romantic text-3xl text-cinematic-gold mb-2">Your memories</p>
          <p className="text-cinematic-soft/80">will appear here ❤️</p>
        </div>
      ) : (
        <div
          className="relative"
          style={{ width: "min(96vw, 374px)", height: "min(130vw, 500px)" }}
          aria-label="Polaroid photo stack"
        >
          {visible.map((it) => {
            const isLeaving = !!it.leavingAt;
            const baseZ = 1000 + it.index;
            const z = isLeaving ? baseZ - 500 : baseZ;
            const initialTransform = `translate(${it.enterTx}px, ${it.enterTy}px) rotate(${it.rotation}deg) scale(0.96)`;
            const settleTransform = `translate(${it.settleX}px, ${it.settleY}px) rotate(${it.settleT}deg) scale(${it.settleS})`;
            const leaveTransform = `translate(calc(${it.settleX}px + 26px), calc(${it.settleY}px + 40px)) rotate(calc(${it.settleT}deg + 6deg)) scale(calc(${it.settleS} * 0.82))`;
            const errored = errorMap[it.key];
            let currentTransform: string;
            let currentOpacity: number;
            if (isLeaving) {
              currentTransform = leaveTransform;
              currentOpacity = 0;
            } else if (it.entering) {
              currentTransform = initialTransform;
              currentOpacity = 0;
            } else {
              currentTransform = settleTransform;
              currentOpacity = 1;
            }
            return (
              <div
                key={it.key}
                className="absolute inset-0 flex items-center justify-center polaroid will-change-transform"
                style={{
                  zIndex: z,
                  transform: currentTransform,
                  opacity: currentOpacity,
                  transition:
                    "transform 500ms cubic-bezier(0.22, 0.61, 0.36, 1), opacity 450ms ease-out",
                  width: "clamp(50%, 64%, 72%)",
                  height: "clamp(58%, 70%, 76%)",
                  left: "50%",
                  top: "50%",
                  marginLeft: "-32%",
                  marginTop: "-35%",
                }}
              >
                <div className="relative w-full h-full">
                  <div
                    className="w-full overflow-hidden rounded-[2px]"
                    style={{ height: "93%", background: "#1a1020" }}
                  >
                    {it.photoSrc && !errored ? (
                      <img
                        src={it.photoSrc}
                        alt={`Memory ${it.index + 1}`}
                        loading="lazy"
                        decoding="async"
                        onError={() => handleImgError(it.key)}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-cinematic-soft/40 text-sm">
                        Memory {it.index + 1}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {counterLabel && (
        <p className="text-xs text-cinematic-soft/60 tracking-widest">{counterLabel}</p>
      )}
    </div>
  );
}
