import { useEffect, useRef, useState } from "react";
import { useStory } from "../context/StoryContext";
import { music as musicCfg } from "../config/media.js";
import { birthdayConfig } from "../config/birthdayConfig.js";
import { FONT_LED, THEME } from "../config/sceneTheme";
import { Tape, tornPolygon } from "./PaperCutout";
import { PixelHeart, PixelProgress, paperBg } from "./PaperExtras";

type MusicConfigShape = { src?: string; title?: string } | null;
const musicConfig = musicCfg as MusicConfigShape;

const LEDS = 12;
const COMPACT_LEDS = 6;
const PILL_CLIP = tornPolygon(6, 5, 10);
const TILE_CLIP = tornPolygon(4, 6, 8);
const COMPACT_QUERY = "(max-width: 520px)";

// HP (iPhone): player diringkas jadi kotak kecil agar tidak menutupi konten
function useCompact() {
  const [compact, setCompact] = useState(
    () => typeof window !== "undefined" && window.matchMedia(COMPACT_QUERY).matches,
  );
  useEffect(() => {
    const m = window.matchMedia(COMPACT_QUERY);
    const on = () => setCompact(m.matches);
    on();
    m.addEventListener?.("change", on);
    return () => m.removeEventListener?.("change", on);
  }, []);
  return compact;
}

export default function MusicPlayer() {
  const { currentScene, musicPlaying, toggleMusic, musicNeedsTap, setMusicNeedsTap, audioRef } = useStory();
  const [progress, setProgress] = useState(0);
  const compact = useCompact();
  const show = currentScene >= 2 && musicConfig && musicConfig.src;
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const tick = () => {
      const d = audio.duration || 0;
      if (d > 0) setProgress((audio.currentTime / d) * 100);
      rafRef.current = requestAnimationFrame(tick);
    };
    if (musicPlaying) {
      rafRef.current = requestAnimationFrame(tick);
    } else {
      const d = audio.duration || 0;
      if (d > 0) setProgress((audio.currentTime / d) * 100);
    }
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [musicPlaying, audioRef]);

  if (!show) return null;
  const title = musicConfig?.title || "Our Song";
  const needsTap = musicNeedsTap && !musicPlaying;
  const cfgVol = birthdayConfig.music?.volume ?? 0.45;
  const lit = Math.round(((progress || 0) / 100) * LEDS);
  const litCompact = Math.round(((progress || 0) / 100) * COMPACT_LEDS);
  // PhotoStory (scene 5) punya bar progres di paling atas -> turunkan sedikit
  const topExtra = currentScene === 5 ? "1.6rem" : "0.55rem";

  const labelBtn = {
    display: "flex",
    alignItems: "center",
    gap: 6,
    minHeight: 44,
    background: "transparent",
    border: 0,
    color: "#8c2f55",
    fontFamily: FONT_LED,
    fontWeight: 800,
    fontSize: compact ? 11 : 12,
    letterSpacing: "0.1em",
    textTransform: "uppercase" as const,
    cursor: "pointer",
    WebkitTapHighlightColor: "transparent",
    touchAction: "manipulation" as const,
  };

  let inner;
  if (needsTap) {
    inner = (
      <button onClick={toggleMusic} aria-label="Play our song" style={labelBtn}>
        <span className="animate-heart-beat">
          <PixelHeart size={compact ? 14 : 16} />
        </span>
        <span>{compact ? "▶ Lagu" : "Putar lagu kita"}</span>
      </button>
    );
  } else if (compact) {
    inner = (
      <button
        onClick={toggleMusic}
        aria-label={musicPlaying ? "Pause music" : "Play music"}
        style={{
          position: "relative",
          display: "block",
          width: 46,
          height: 46,
          padding: 0,
          background: "transparent",
          border: 0,
          color: "#8c2f55",
          cursor: "pointer",
          WebkitTapHighlightColor: "transparent",
          touchAction: "manipulation",
        }}
      >
        <span aria-hidden style={{ position: "absolute", top: 6, left: 7 }}>
          <PixelHeart size={9} glow={false} />
        </span>
        <span
          aria-hidden
          style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, paddingBottom: 5, paddingLeft: 2 }}
        >
          {musicPlaying ? "❚❚" : "▶"}
        </span>
        <span aria-hidden style={{ position: "absolute", left: 9, right: 9, bottom: 7 }}>
          <PixelProgress lit={litCompact} total={COMPACT_LEDS} height={3} gap={1} color="#e23d7c" offColor="rgba(140,47,85,0.2)" />
        </span>
      </button>
    );
  } else {
    inner = (
      <>
        <div className="flex items-center gap-1.5 min-w-0">
          <PixelHeart size={14} />
          <span
            className="truncate max-w-[26vw] sm:max-w-[22ch]"
            style={{ fontFamily: FONT_LED, fontWeight: 800, fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase" }}
          >
            {title}
          </span>
        </div>
        <div className="w-12 sm:w-24" aria-hidden>
          <PixelProgress lit={lit} total={LEDS} height={6} gap={2} color="#e23d7c" offColor="rgba(140,47,85,0.2)" />
        </div>
        <button
          onClick={toggleMusic}
          aria-label={musicPlaying ? "Pause music" : "Play music"}
          style={{
            width: 40,
            height: 40,
            minWidth: 40,
            background: "#ff9cc2",
            color: "#3a0f2a",
            border: 0,
            boxShadow: "2px 2px 0 rgba(60,10,40,0.35)",
            transform: "rotate(-3deg)",
            cursor: "pointer",
            fontSize: 14,
            lineHeight: 1,
          }}
        >
          {musicPlaying ? "❚❚" : "▶"}
        </button>
      </>
    );
  }

  const tile = compact && !needsTap;

  return (
    <>
      {musicConfig && musicConfig.src && (
        <audio
          ref={audioRef}
          src={musicConfig.src}
          loop={birthdayConfig.music?.loop ?? true}
          preload="auto"
          onPlay={() => setMusicNeedsTap(false)}
          onCanPlay={() => {
            const audio = audioRef.current;
            if (audio) audio.volume = cfgVol;
          }}
        />
      )}
      <div
        className="fixed z-[70]"
        style={{
          top: `calc(env(safe-area-inset-top, 0px) + ${topExtra})`,
          right: "max(0.5rem, env(safe-area-inset-right, 0px))",
          left: "auto",
          maxWidth: "calc(100% - 1rem)",
          opacity: compact ? 0.94 : 1,
        }}
      >
        <div
          role="region"
          aria-label="Music player"
          style={{
            position: "relative",
            filter: "drop-shadow(1px 2px 0 rgba(0,0,0,0.3)) drop-shadow(0 6px 8px rgba(0,0,0,0.4))",
            transform: "rotate(-1.2deg)",
          }}
        >
          <div
            style={{
              ...paperBg("#fff7ec"),
              color: "#8c2f55",
              padding: tile ? 0 : compact ? "0 12px 0 10px" : "6px 10px 6px 14px",
              clipPath: tile ? TILE_CLIP : PILL_CLIP,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            {inner}
          </div>
          <Tape width={tile ? 20 : 30} height={tile ? 9 : 12} rotate={-14} color="gold" style={{ top: -4, left: -5 }} />
          <span
            aria-hidden
            style={{
              position: "absolute",
              right: -3,
              top: -4,
              width: 6,
              height: 6,
              background: THEME.spark,
              boxShadow: `0 0 8px ${THEME.spark}`,
            }}
          />
        </div>
      </div>
    </>
  );
}
