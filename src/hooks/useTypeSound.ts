import { useEffect, useRef } from "react";
import { birthdayConfig } from "../config/birthdayConfig.js";

// Suara ketikan disintesis langsung lewat Web Audio (tidak perlu file audio).
// Volume bisa diatur di birthdayConfig.js dengan `typeSoundVolume: 0.18` (0 = mati).
const VOLUME = Number((birthdayConfig as any).typeSoundVolume ?? 0.18);
const MIN_GAP_MS = 38; // jeda minimum antar klik supaya tidak jadi dengung saat mengetik sangat cepat
const MAX_BURST = 6; // lonjakan lebih dari ini (mis. tap untuk skip) tidak dibunyikan

let ctx: AudioContext | null = null;
let noise: AudioBuffer | null = null;
let lastPlay = 0;
let listening = false;

function createCtx() {
  if (ctx) return ctx;
  const AC: typeof AudioContext | undefined =
    typeof window !== "undefined" ? window.AudioContext || (window as any).webkitAudioContext : undefined;
  if (!AC) return null;
  ctx = new AC();
  const len = Math.floor(ctx.sampleRate * 0.04);
  noise = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = noise.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  return ctx;
}

// Browser memblokir audio sebelum ada sentuhan/klik pertama. Setelah itu suara aktif.
function listenForUnlock() {
  if (listening || typeof window === "undefined") return;
  listening = true;
  const unlock = () => {
    const c = createCtx();
    if (c && c.state === "suspended") void c.resume();
    if (c && c.state === "running") {
      window.removeEventListener("pointerdown", unlock, true);
      window.removeEventListener("touchend", unlock, true);
      window.removeEventListener("keydown", unlock, true);
    }
  };
  window.addEventListener("pointerdown", unlock, true);
  window.addEventListener("touchend", unlock, true);
  window.addEventListener("keydown", unlock, true);
}

function click(isSpace: boolean) {
  if (!ctx || ctx.state !== "running" || !noise || VOLUME <= 0) return;
  const now = performance.now();
  if (now - lastPlay < MIN_GAP_MS) return;
  lastPlay = now;

  const t = ctx.currentTime;
  const vol = VOLUME * (0.75 + Math.random() * 0.35);

  // "klik" tuts: noise pendek lewat bandpass
  const src = ctx.createBufferSource();
  src.buffer = noise;
  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = (isSpace ? 1300 : 2300) * (0.9 + Math.random() * 0.25);
  bp.Q.value = 0.9;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.002);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.035);
  src.connect(bp).connect(g).connect(ctx.destination);
  src.start(t);
  src.stop(t + 0.045);

  // "thock" rendah singkat supaya terasa seperti tuts, bukan desis
  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(isSpace ? 110 : 170, t);
  osc.frequency.exponentialRampToValueAtTime(isSpace ? 70 : 100, t + 0.04);
  const og = ctx.createGain();
  og.gain.setValueAtTime(0.0001, t);
  og.gain.exponentialRampToValueAtTime(vol * 0.55, t + 0.002);
  og.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
  osc.connect(og).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + 0.06);
}

/**
 * Bunyikan satu klik setiap kali `count` (jumlah huruf yang sudah tampil) bertambah,
 * jadi kecepatan suara otomatis mengikuti kecepatan mengetik.
 * @param count     jumlah huruf yang sudah tampil
 * @param enabled   suara hanya aktif saat true
 * @param lastChar  huruf yang baru muncul (spasi = bunyi lebih rendah, undefined = diam)
 */
export function useTypeSound(count: number, enabled: boolean, lastChar?: string) {
  const prev = useRef(0);
  useEffect(() => {
    listenForUnlock();
  }, []);
  useEffect(() => {
    const before = prev.current;
    prev.current = count;
    if (!enabled || count <= before) return;
    if (count - before > MAX_BURST) return; // lompatan (skip) -> tanpa suara
    if (lastChar === undefined || lastChar === "\n") return;
    click(lastChar === " ");
  }, [count, enabled, lastChar]);
}
