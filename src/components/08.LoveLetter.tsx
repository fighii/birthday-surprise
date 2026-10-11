import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, RefObject } from "react";
import { useStory } from "../context/StoryContext";
import { birthdayConfig } from "../config/birthdayConfig.js";
import { FONT_HAND, FONT_LED, WISH_PALETTE } from "../config/sceneTheme";
import { loveLetterSidePhotos } from "../config/media.js";
import SidePhotos from "./SidePhotos";
import { CutoutText, PaperNote, PaperSticker, hash01 } from "./PaperCutout";
import { PaperButton, PixelBurstLayer, PixelDivider, PixelHeart, usePrefersReducedMotion } from "./PaperExtras";
import type { PixelBurstHandle } from "./PaperExtras";
import SceneLabel from "./SceneLabel";
import { useTypeSound } from "../hooks/useTypeSound";

// Tulisan tangan di kertas bergaris: tinggi baris = 32px, jadi setiap paragraf
// menempel rapi di garis (margin juga kelipatan 32px).
const LINE = 32;
const RULED =
  "repeating-linear-gradient(to bottom, transparent 0, transparent 31px, rgba(217,58,120,0.16) 31px, rgba(217,58,120,0.16) 32px)";

// ---------- ukuran amplop ----------
const EW = 280; // lebar amplop
const EH = 190; // tinggi amplop
const FLAP = 112; // tinggi tutup (flap)

const SEAL = [
  [0, 1, 1, 0, 0, 0, 1, 1, 0],
  [1, 1, 1, 1, 0, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1],
  [0, 1, 1, 1, 1, 1, 1, 1, 0],
  [0, 0, 1, 1, 1, 1, 1, 0, 0],
  [0, 0, 0, 1, 1, 1, 0, 0, 0],
  [0, 0, 0, 0, 1, 0, 0, 0, 0],
];
const SEAL_CELL = 5;

/**
 * Tahap animasi:
 * 0 tertutup · 1 segel pixel pecah · 2 tutup amplop terbuka separuh (0→90°)
 * 3 tutup amplop terbuka penuh (90→180°), kertas mulai terlihat di dalam
 * 4 kertas (masih terlipat) meluncur naik keluar dari amplop
 * 5 kertas maju ke depan & membesar, amplop bekas turun ke belakang
 * 6 kertas terbuka: lipatan atas & bawah membentang · 7 selesai (surat asli, bisa di-scroll)
 */
const FINAL_STAGE = 7;

const NOTCH_CLIP = `polygon(-3000px -3000px, 3000px -3000px, 3000px calc(50% - ${EH / 2}px), calc(50% + ${EW / 2}px) calc(50% - ${EH / 2}px), 50% calc(50% - ${EH / 2}px + ${EH * 0.54}px), calc(50% - ${EW / 2}px) calc(50% - ${EH / 2}px), -3000px calc(50% - ${EH / 2}px))`;
const OPEN_CLIP = "polygon(-3000px -3000px, 3000px -3000px, 3000px 3000px, 3000px 3000px, 50% 3000px, -3000px 3000px, -3000px 3000px)";

const FLAP_SHAPE = "polygon(0 0, 100% 0, 50% 100%)";
const CELL: CSSProperties = { gridArea: "1 / 1", justifySelf: "center", alignSelf: "center" };

// ---------- amplop: lapisan belakang (badan dalam + tutup yang sudah terbuka) ----------
function EnvelopeBack({ stage, behind, reduce }: { stage: number; behind: CSSProperties; reduce: boolean }) {
  return (
    <div
      aria-hidden
      style={{
        ...CELL,
        position: "relative",
        width: EW,
        height: EH,
        zIndex: 0,
        perspective: 900,
        ...behind,
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 14,
          right: 14,
          bottom: -12,
          height: 20,
          background: "radial-gradient(ellipse at center, rgba(40,10,30,0.45) 0%, transparent 70%)",
          filter: "blur(4px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "#e3a9ba",
          border: "3px solid #fff8ee",
          borderRadius: 4,
          boxShadow: "0 4px 0 rgba(90,30,60,0.28)",
        }}
      />

      {/* tutup amplop setengah kedua (90° → 180°): sisi dalamnya terlihat, ujungnya mengarah ke atas */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: EW,
          height: FLAP,
          transformOrigin: "50% 0",
          transformStyle: "preserve-3d",
          transform: "rotateX(-90deg)",
          visibility: stage >= 3 ? "visible" : "hidden",
          animation: stage >= 3 && !reduce ? "lrFlapBack 400ms cubic-bezier(0.2,0.7,0.3,1) both" : undefined,
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(to bottom, #f6d9c9, #fbe9dc)",
            clipPath: FLAP_SHAPE,
            transform: "rotateY(180deg)",
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
          }}
        />
      </div>

      <div style={{ position: "absolute", left: "50%", top: EH + 22, transform: "translateX(-50%)", whiteSpace: "nowrap" }}>
        <SceneLabel visible={stage === 0}>Tap amplop untuk membuka</SceneLabel>
      </div>
    </div>
  );
}

// ---------- amplop: lapisan depan (kantong, label, segel, tutup yang masih menutup) ----------
function EnvelopeFront({
  stage,
  behind,
  greeting,
  onOpen,
  sealRef,
  reduce,
}: {
  stage: number;
  behind: CSSProperties;
  greeting: string;
  onOpen: () => void;
  sealRef: RefObject<HTMLDivElement | null>;
  reduce: boolean;
}) {
  const panelEdge = "inset 0 0 0 3px #fff8ee";
  return (
    <button
      type="button"
      onClick={onOpen}
      disabled={stage > 0}
      aria-label="Buka amplop"
      style={{
        ...CELL,
        position: "relative",
        display: "block",
        width: EW,
        height: EH,
        zIndex: 2,
        padding: 0,
        border: 0,
        background: "transparent",
        cursor: stage === 0 ? "pointer" : "default",
        perspective: 900,
        WebkitTapHighlightColor: "transparent",
        touchAction: "manipulation",
        animation: stage === 0 && !reduce ? "lrWobble 3.4s ease-in-out infinite" : undefined,
        pointerEvents: stage > 0 ? "none" : "auto",
        ...behind,
      }}
    >
      {/* kantong depan: kiri, kanan, bawah */}
      <div aria-hidden style={{ position: "absolute", inset: 0, background: "#f8dcc4", boxShadow: panelEdge, clipPath: "polygon(0 0, 50% 54%, 0 100%)" }} />
      <div aria-hidden style={{ position: "absolute", inset: 0, background: "#f3cfb5", boxShadow: panelEdge, clipPath: "polygon(100% 0, 50% 54%, 100% 100%)" }} />
      <div aria-hidden style={{ position: "absolute", inset: 0, background: "#fbe6d3", boxShadow: panelEdge, clipPath: "polygon(0 100%, 50% 50%, 100% 100%)" }} />

      {/* label tulisan tangan */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          left: "50%",
          bottom: 18,
          maxWidth: EW - 90,
          padding: "2px 12px",
          background: "#fff7ec",
          color: "#b0335f",
          fontFamily: FONT_HAND,
          fontSize: 18,
          lineHeight: "24px",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          transform: "translateX(-50%) rotate(-2deg)",
          boxShadow: "0 2px 0 rgba(90,30,60,0.22)",
        }}
      >
        {greeting}
      </div>

      {/* tutup amplop setengah pertama (0° → 90°), menutup kertas */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: EW,
          height: FLAP,
          transformOrigin: "50% 0",
          transformStyle: "preserve-3d",
          visibility: stage >= 3 ? "hidden" : "visible",
          animation: stage >= 2 && !reduce ? "lrFlapFront 400ms cubic-bezier(0.5,0.05,0.8,0.5) both" : undefined,
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "#f2b8c9",
            clipPath: FLAP_SHAPE,
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
          }}
        />
      </div>

      {/* segel hati pixel — pecah jadi serpihan saat dibuka */}
      <div
        ref={sealRef}
        aria-hidden
        style={{
          position: "absolute",
          left: "50%",
          top: FLAP - 22,
          transform: "translateX(-50%)",
          display: "grid",
          gridTemplateColumns: `repeat(9, ${SEAL_CELL}px)`,
          gridAutoRows: `${SEAL_CELL}px`,
          gap: 1,
          filter: "drop-shadow(0 2px 0 rgba(90,30,60,0.35))",
          pointerEvents: "none",
        }}
      >
        {SEAL.flatMap((row, r) =>
          row.map((on, c) => {
            if (!on) return <div key={`${r}-${c}`} />;
            const seed = r * 9 + c + 1;
            const dx = (hash01(seed) - 0.5) * 120;
            const dy = (hash01(seed + 40) - 0.9) * 110;
            const rot = (hash01(seed + 80) - 0.5) * 180;
            const broken = stage >= 1;
            const hi = r <= 1 && c <= 2;
            return (
              <div
                key={`${r}-${c}`}
                style={{
                  background: hi ? "#ff9cc2" : r >= 5 ? "#c92f6c" : "#e23d7c",
                  opacity: broken ? 0 : 1,
                  transform: broken ? `translate(${dx}px, ${dy}px) rotate(${rot}deg) scale(0.4)` : "none",
                  transition: reduce ? "none" : "transform 650ms cubic-bezier(0.2,0.7,0.3,1), opacity 600ms ease 80ms",
                }}
              />
            );
          }),
        )}
      </div>
    </button>
  );
}

// ---------- efek mengetik ----------
const TYPE_MS = Number((birthdayConfig as any).loveLetterTypeMsPerChar) || 16;
const PARA_PAUSE = 10; // jeda kecil antar paragraf (dihitung sebagai huruf virtual)
const hasSideLetter = (loveLetterSidePhotos || []).some((p: string) => typeof p === "string" && p.length > 0);

function useTypedCount(total: number, run: boolean, reduce: boolean) {
  const [n, setN] = useState(0);
  const skipped = useRef(false);
  useEffect(() => {
    if (!run) {
      skipped.current = false;
      setN(0);
      return;
    }
    if (reduce) {
      setN(total);
      return;
    }
    skipped.current = false;
    const start = performance.now() + 600;
    let raf = 0;
    const tick = (now: number) => {
      if (skipped.current) {
        setN(total);
        return;
      }
      const k = Math.min(total, Math.max(0, Math.floor((now - start) / TYPE_MS)));
      setN(k);
      if (k < total) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [run, reduce, total]);
  const skip = useCallback(() => {
    skipped.current = true;
    setN(total);
  }, [total]);
  return { n, skip };
}

// ---------- isi surat (dipakai oleh surat asli & salinan panel lipatan) ----------
function LetterBody({
  greeting,
  paragraphs,
  run,
  reduce,
  onContinue,
}: {
  greeting: string;
  paragraphs: string[];
  run: boolean;
  reduce: boolean;
  onContinue: () => void;
}) {
  const lastIdx = paragraphs.length - 1;
  const offsets = useMemo(() => {
    const o: number[] = [];
    let acc = 0;
    paragraphs.forEach((p) => {
      o.push(acc);
      acc += p.length + PARA_PAUSE;
    });
    return o;
  }, [paragraphs]);
  const total = lastIdx >= 0 ? offsets[lastIdx] + paragraphs[lastIdx].length : 0;
  const { n, skip } = useTypedCount(total, run, reduce);
  const done = run && n >= total;
  let cur = 0;
  for (let i = 0; i < offsets.length; i++) if (offsets[i] <= n) cur = i;

  // suara ketikan (hanya surat asli yang sedang diketik, bukan salinan lipatan)
  const typedChar = paragraphs[cur]?.[n - offsets[cur] - 1];
  useTypeSound(n, run && !done, typedChar);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const caretRef = useRef<HTMLSpanElement | null>(null);
  const [ready, setReady] = useState(false); // true setelah surat selesai & digulir sampai bawah
  const [sc, setSc] = useState({ can: false, top: 0, size: 1, atEnd: true });

  const measure = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const can = el.scrollHeight - el.clientHeight > 6;
    const size = Math.min(1, el.clientHeight / Math.max(1, el.scrollHeight));
    const top = el.scrollTop / Math.max(1, el.scrollHeight);
    const atEnd = el.scrollTop + el.clientHeight >= el.scrollHeight - 6;
    setSc((p) =>
      p.can === can && p.atEnd === atEnd && Math.abs(p.top - top) < 0.002 && Math.abs(p.size - size) < 0.002
        ? p
        : { can, top, size, atEnd },
    );
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    measure();
    el.addEventListener("scroll", measure, { passive: true });
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    if (contentRef.current) ro.observe(contentRef.current);
    return () => {
      el.removeEventListener("scroll", measure);
      ro.disconnect();
    };
  }, [measure]);

  // Continue aktif hanya setelah teks selesai diketik DAN isi surat digulir sampai bawah
  // (kalau surat muat satu layar, cukup menunggu selesai mengetik). Tidak ada auto-scroll.
  useEffect(() => {
    if (!run) {
      setReady(false);
      return;
    }
    if (done && (!sc.can || sc.atEnd)) setReady(true);
  }, [run, done, sc.can, sc.atEnd]);

  return (
    <PaperNote rotate={-0.5} tone="cream" tapeColor="pink" seed={8} innerStyle={{ padding: "20px 18px 14px" }}>
      <div style={{ position: "relative" }}>
        <div
          ref={scrollRef}
          className="hide-scrollbar text-left"
          onClick={(e) => {
            if ((e.target as HTMLElement).closest("button")) return;
            if (run && !done) skip(); // tap = langsung tampilkan semua
          }}
          style={{
            maxHeight:
              "calc(100svh - max(8rem, env(safe-area-inset-top)) - max(3rem, env(safe-area-inset-bottom)) - 2.5rem)",
            overflowY: "auto",
            WebkitOverflowScrolling: "touch",
            overscrollBehavior: "contain",
          }}
        >
          <div ref={contentRef}>
            <div className="flex justify-center" style={{ marginBottom: 14 }}>
              <CutoutText text={greeting} fontSize="clamp(20px, 6vw, 28px)" seed={12} show stagger={30} reduce={reduce} />
            </div>

            <PixelDivider count={9} style={{ marginBottom: 18 }} colors={["#e23d7c", "#e0a21a"]} />

            {/* kertas bergaris + tulisan tangan (diketik huruf per huruf) */}
            <div style={{ backgroundImage: RULED, paddingRight: 2 }}>
              {paragraphs.map((p, i) => {
                const isLast = i === lastIdx && paragraphs.length > 1;
                const local = Math.max(0, Math.min(p.length, n - offsets[i]));
                const showCaret = run && !done && i === cur;
                return (
                  <p
                    key={i}
                    style={{
                      margin: `0 0 ${LINE}px`,
                      fontFamily: FONT_HAND,
                      fontSize: isLast ? 28 : 21,
                      lineHeight: `${LINE}px`,
                      color: isLast ? "#d93a78" : "#6a2a47",
                      textAlign: isLast ? "center" : "left",
                    }}
                  >
                    <span>{p.slice(0, local)}</span>
                    {showCaret && (
                      <span
                        ref={caretRef}
                        aria-hidden
                        style={{
                          display: "inline-block",
                          width: 2,
                          height: "0.9em",
                          marginLeft: 1,
                          verticalAlign: "-0.1em",
                          background: "#d93a78",
                          animation: "ltBlink 0.9s steps(2, start) infinite",
                        }}
                      />
                    )}
                    {/* sisa teks tetap memakan ruang (tak terlihat) agar baris tidak loncat */}
                    <span aria-hidden style={{ opacity: 0 }}>
                      {p.slice(local)}
                    </span>
                  </p>
                );
              })}
            </div>

            <div className="flex justify-end" style={{ opacity: done ? 1 : 0, transition: "opacity 700ms ease" }} aria-hidden>
              <PixelHeart size={26} />
            </div>

            {run && (
              <div className="flex flex-col items-end" style={{ paddingTop: 14, marginTop: 6, gap: 6 }}>
                <PaperButton
                  variant="primary"
                  seed={3}
                  onClick={onContinue}
                  disabled={!ready}
                  aria-disabled={!ready}
                  style={{ opacity: ready ? 1 : 0.45, cursor: ready ? "pointer" : "not-allowed", transition: "opacity 400ms ease" }}
                >
                  Continue →
                </PaperButton>
                {!ready && done && sc.can && (
                  <span style={{ fontFamily: FONT_LED, fontSize: 10, letterSpacing: "0.1em", color: "#d93a78" }}>
                    geser sampai bawah dulu
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* rel scroll di samping surat */}
        {run && sc.can && (
          <div
            aria-hidden
            style={{ position: "absolute", right: -5, top: 6, bottom: 6, width: 4, background: "rgba(217,58,120,0.16)", pointerEvents: "none" }}
          >
            <div
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: `${sc.top * 100}%`,
                height: `${Math.max(sc.size * 100, 8)}%`,
                background: "#e23d7c",
                boxShadow: "0 0 4px rgba(226,61,124,0.6)",
              }}
            />
          </div>
        )}
        {/* petunjuk: masih ada teks di bawah */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: 24,
            pointerEvents: "none",
            opacity: run && sc.can && !sc.atEnd ? 1 : 0,
            transition: "opacity 300ms ease",
          }}
        >
          <span
            style={{
              position: "absolute",
              left: 4,
              bottom: 2,
              fontFamily: FONT_LED,
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: "0.12em",
              color: "#d93a78",
              animation: "ltBounce 1.1s ease-in-out infinite",
            }}
          >
            ▾ geser
          </span>
        </div>
      </div>
    </PaperNote>
  );
}

// ---------- kertas terlipat tiga (atas & bawah terlipat ke belakang bagian tengah) ----------
const BACK_FACE = "linear-gradient(to bottom, #f1dcc6 0%, #fbefe0 35%, #fbefe0 65%, #f1dcc6 100%)";

function FoldedLetter({
  stage,
  transform,
  body,
  reduce,
}: {
  stage: number;
  transform: string;
  body: React.ReactNode;
  reduce: boolean;
}) {
  const unfolding = stage >= 6;
  const face: CSSProperties = {
    position: "absolute",
    inset: 0,
    backfaceVisibility: "hidden",
    WebkitBackfaceVisibility: "hidden",
  };
  const copy = (
    <div style={{ position: "absolute", left: 0, right: 0, top: 0, pointerEvents: "none" }}>{body}</div>
  );
  const shade = null; // tanpa lapisan gelap saat surat dibuka
  const clipTop = "inset(0 0 66.4% 0)";
  const clipMid = "inset(33.3% 0 33.3% 0)";
  const clipBot = "inset(66.4% 0 0 0)";

  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        perspective: 1500,
        transformStyle: "preserve-3d",
        transform,
        transition: reduce ? "none" : "transform 1000ms cubic-bezier(0.3,0.8,0.3,1)",
        pointerEvents: "none",
      }}
    >
      {/* bagian atas: engsel di tepi atas bagian tengah */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          transformStyle: "preserve-3d",
          transformOrigin: "50% 33.3%",
          transform: "translateZ(-3px) rotateX(180deg)",
          animation: unfolding && !reduce ? "lrTopUnfold 1000ms cubic-bezier(0.25,0.8,0.3,1) both" : undefined,
        }}
      >
        <div style={{ ...face, clipPath: clipTop }}>
          {copy}
          {shade}
        </div>
        <div style={{ ...face, clipPath: clipTop, transform: "rotateY(180deg)", background: BACK_FACE }} />
      </div>

      {/* bagian bawah: engsel di tepi bawah bagian tengah */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          transformStyle: "preserve-3d",
          transformOrigin: "50% 66.6%",
          transform: "translateZ(-3px) rotateX(-180deg)",
          animation: unfolding && !reduce ? "lrBotUnfold 1000ms cubic-bezier(0.25,0.8,0.3,1) 90ms both" : undefined,
        }}
      >
        <div style={{ ...face, clipPath: clipBot }}>
          {copy}
          {shade}
        </div>
        <div style={{ ...face, clipPath: clipBot, transform: "rotateY(180deg)", background: BACK_FACE }} />
      </div>

      {/* bagian tengah: tidak berputar */}
      <div style={{ position: "absolute", inset: 0, transformStyle: "preserve-3d" }}>
        <div style={{ ...face, clipPath: clipMid }}>{copy}</div>
      </div>
    </div>
  );
}

export default function LoveLetter() {
  const { currentScene, goToScene } = useStory();
  const active = currentScene === 8;
  const reduce = usePrefersReducedMotion();
  const [stage, setStage] = useState(0);
  const [phase, setPhase] = useState(0);
  const [paperSize, setPaperSize] = useState({ w: 520, h: 520 });
  const timers = useRef<number[]>([]);
  const burstRef = useRef<PixelBurstHandle | null>(null);
  const sealRef = useRef<HTMLDivElement | null>(null);
  const paperRef = useRef<HTMLDivElement | null>(null);
  const paragraphs = useMemo(
    () => (birthdayConfig.loveLetter || "").split("\n\n").map((p) => p.trim()).filter(Boolean),
    [],
  );

  const open = stage >= FINAL_STAGE;

  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };

  // ukur ukuran surat asli supaya kertas terlipat bisa dikecilkan pas masuk amplop
  useLayoutEffect(() => {
    const el = paperRef.current;
    if (!el) return;
    const measure = () => {
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      if (w > 0 && h > 0) setPaperSize((p) => (p.w === w && p.h === h ? p : { w, h }));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!active) return;
    setStage(0);
    setPhase(0);
    const t1 = window.setTimeout(() => setPhase(1), 400);
    return () => {
      window.clearTimeout(t1);
      timers.current.forEach((t) => window.clearTimeout(t));
      timers.current = [];
    };
  }, [active]);

  const handleOpen = () => {
    if (stage > 0) return;
    if (reduce) {
      setStage(FINAL_STAGE);
      return;
    }
    const W = window.innerWidth;
    const H = window.innerHeight;

    // 1. segel pixel pecah + percikan emas
    setStage(1);
    const r = sealRef.current?.getBoundingClientRect();
    const cx = r ? r.left + r.width / 2 : W * 0.5;
    const cy = r ? r.top + r.height / 2 : H * 0.44;
    burstRef.current?.burst(cx, cy, ["#FFD84A", "#FFF0A0"], 0.6);

    // 2-3. tutup amplop membuka (dua tahap supaya bisa pindah ke belakang kertas)
    later(() => setStage(2), 420);
    later(() => setStage(3), 820);
    // 4. kertas terlipat meluncur naik dari amplop
    later(() => setStage(4), 1250);
    // 5. kertas maju ke depan, amplop bekas turun ke belakang
    later(() => setStage(5), 2350);
    // 6. kertas membuka ke atas & bawah
    later(() => {
      setStage(6);
      burstRef.current?.burst(W * 0.3, H * 0.3, WISH_PALETTE[2], 1);
      burstRef.current?.burst(W * 0.72, H * 0.26, WISH_PALETTE[0], 1);
      burstRef.current?.burst(W * 0.5, H * 0.16, WISH_PALETTE[4], 1.2);
    }, 2900);
    // 7. ganti ke surat asli (bisa di-scroll)
    later(() => setStage(FINAL_STAGE), 4050);
  };

  // Surat TIDAK pindah otomatis: hanya lewat tombol Continue.

  // ---------- posisi kertas terlipat relatif terhadap amplop ----------
  const s0 = Math.min(1, (EW - 44) / paperSize.w); // skala saat masuk amplop
  const hp = (paperSize.h / 3) * s0; // tinggi bagian tengah (yang terlihat saat terlipat)
  const dy0 = EH / 2 - 14 - hp / 2; // posisi di dalam kantong
  const dy1 = dy0 - 170; // posisi setelah meluncur keluar
  const foldTransform =
    stage >= 5
      ? "translateY(0px) scale(1)"
      : stage === 4
        ? `translateY(${dy1}px) scale(${s0})`
        : `translateY(${dy0}px) scale(${s0})`;

  // amplop bekas bergeser ke belakang surat, mengintip sedikit di bawahnya
  const behindShift = Math.max(0, paperSize.h / 2 - 30);
  const behind: CSSProperties =
    stage >= 5
      ? {
          transform: `translateY(${behindShift}px) scale(0.94)`,
          transition: reduce ? "none" : "transform 1000ms cubic-bezier(0.3,0.8,0.3,1)",
        }
      : {};

  const noop = () => {};
  const foldBody = (
    <LetterBody greeting={birthdayConfig.loveLetterGreeting} paragraphs={paragraphs} run={false} reduce onContinue={noop} />
  );

  return (
    <section className={`scene-layer ${active ? "scene-active" : "scene-hidden"}`} aria-hidden={!active}>
      <style>{`
        @keyframes lrFlapFront {
          from { transform: rotateX(0deg); }
          to   { transform: rotateX(-90deg); }
        }
        @keyframes lrFlapBack {
          from { transform: rotateX(-90deg); }
          to   { transform: rotateX(-180deg); }
        }
        @keyframes lrTopUnfold {
          from { transform: translateZ(-3px) rotateX(180deg); }
          to   { transform: translateZ(0) rotateX(0deg); }
        }
        @keyframes lrBotUnfold {
          from { transform: translateZ(-3px) rotateX(-180deg); }
          to   { transform: translateZ(0) rotateX(0deg); }
        }
        @keyframes lrShade {
          from { opacity: 0.55; }
          to   { opacity: 0; }
        }
        @keyframes ltBlink {
          0%, 100% { opacity: 0; }
          50% { opacity: 1; }
        }
        @keyframes ltBounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(3px); }
        }
        @keyframes lrFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes lrWobble {
          0%, 100% { rotate: 0deg; }
          25% { rotate: 1.1deg; }
          75% { rotate: -1.1deg; }
        }
      `}</style>

      {active && <PixelBurstLayer ref={burstRef} />}

      <div
        className="relative z-10 w-full max-w-xl mx-auto flex flex-col items-center gap-5 px-4 text-center"
        style={hasSideLetter ? { paddingInline: "clamp(26px, 8vw, 44px)" } : undefined}
      >
        <SidePhotos photos={loveLetterSidePhotos} visible={stage >= 5} seed={8} leftPeek={0.55} rightPeek={0.55} />
        <SceneLabel visible={phase >= 1}>Surat untukmu</SceneLabel>

        {/* judul memudar & menyusut halus saat kertas maju ke depan */}
        <div
          style={{
            maxHeight: stage >= 5 ? 0 : 150,
            opacity: stage >= 5 ? 0 : 1,
            overflow: stage >= 5 ? "hidden" : "visible",
            transition: "max-height 800ms ease, opacity 600ms ease",
          }}
        >
          <h2 style={{ margin: 0 }}>
            <CutoutText
              text={birthdayConfig.loveLetterTitle}
              fontSize="clamp(26px, 8vw, 38px)"
              seed={8}
              show={phase >= 1}
              reduce={reduce}
            />
          </h2>
        </div>

        {/* amplop (belakang & depan) dan kertas menumpuk di satu sel grid */}
        <div
          style={{
            display: "grid",
            width: "100%",
            maxWidth: 520,
            justifyItems: "center",
            alignItems: "center",
            opacity: phase >= 1 ? 1 : 0,
            transform: phase >= 1 ? "translateY(0)" : "translateY(24px)",
            transition: "opacity 900ms ease, transform 900ms ease",
          }}
        >
          <EnvelopeBack stage={stage} behind={behind} reduce={reduce} />

          <EnvelopeFront
            stage={stage}
            behind={behind}
            greeting={birthdayConfig.loveLetterGreeting}
            onOpen={handleOpen}
            sealRef={sealRef}
            reduce={reduce}
          />

          {/* kertas: surat asli menentukan ukuran; salinan terlipat tampil selama animasi */}
          <div
            ref={paperRef}
            className="relative"
            style={{
              ...CELL,
              width: "100%",
              zIndex: 3,
              visibility: stage >= 3 ? "visible" : "hidden",
              pointerEvents: open ? "auto" : "none",
              clipPath: open ? "none" : stage >= 5 ? OPEN_CLIP : NOTCH_CLIP,
              transition: reduce ? "none" : "clip-path 650ms ease",
            }}
          >
            <div style={{ visibility: open ? "inherit" : "hidden" }}>
              <LetterBody
                greeting={birthdayConfig.loveLetterGreeting}
                paragraphs={paragraphs}
                run={open}
                reduce={reduce}
                onContinue={() => goToScene(9, 300)}
              />
            </div>

            {!open && !reduce && <FoldedLetter stage={stage} transform={foldTransform} body={foldBody} reduce={reduce} />}

            {open && (
              <div
                aria-hidden
                style={{ position: "absolute", inset: 0, pointerEvents: "none", animation: reduce ? undefined : "lrFadeIn 500ms ease both" }}
              >
                <PaperSticker kind="star" color="#FFD84A" size={38} rotate={-14} style={{ left: -10, top: -18, zIndex: 3 }} />
                <PaperSticker kind="heart" color="#ff7fae" size={34} rotate={12} style={{ right: -8, top: -14, zIndex: 3 }} />
              </div>
            )}
          </div>
        </div>
      </div>

    </section>
  );
}