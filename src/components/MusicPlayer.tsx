import { useEffect, useRef, useState } from "react";
import { useStory } from "../context/StoryContext";
import { music as musicCfg } from "../config/media.js";
import { birthdayConfig } from "../config/birthdayConfig.js";

type MusicConfigShape = { src?: string; title?: string } | null;
const musicConfig = musicCfg as MusicConfigShape;

export default function MusicPlayer() {
  const { currentScene, musicPlaying, toggleMusic, musicNeedsTap, setMusicNeedsTap, audioRef } = useStory();
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const show = currentScene >= 2 && musicConfig && musicConfig.src;
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !musicConfig) return;
    const meta = () => setDuration(audio.duration || 0);
    audio.addEventListener("loadedmetadata", meta);
    return () => audio.removeEventListener("loadedmetadata", meta);
  }, [audioRef]);

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
        className="fixed z-[70] max-w-[calc(100%-1rem)]"
        style={{
          top: "calc(env(safe-area-inset-top) + 0.9rem)",
          right: "clamp(0.5rem, 2.5vw, 0.85rem)",
          left: "auto",
        }}
      >
        <div
          className="glass flex items-center gap-2 px-2.5 py-1.5 shadow-xl"
          style={{ borderRadius: 999 }}
          role="region"
          aria-label="Music player"
        >
          {needsTap ? (
            <button
              className="text-sm text-cinematic-soft hover:text-white transition-colors font-medium flex items-center gap-1.5"
              onClick={toggleMusic}
              aria-label="Play our song"
            >
              <span className="animate-heart-beat">❤️</span>
              <span>Play our song ❤️</span>
            </button>
          ) : (
            <>
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-cinematic-love animate-pulse-soft text-sm" aria-hidden>❤️</span>
                <span className="text-[11px] sm:text-sm text-cinematic-soft/90 truncate max-w-[28vw] sm:max-w-[22ch]">
                  {title}
                </span>
              </div>
              <div
                className="w-10 sm:w-24 h-[3px] rounded-full bg-white/10 overflow-hidden"
                aria-hidden
              >
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${progress || 0}%`,
                    background: "linear-gradient(90deg,#ff8aa8,#f7c97e)",
                    transition: "width 80ms linear",
                  }}
                />
              </div>
              <button
                onClick={toggleMusic}
                className="h-8 w-8 min-h-[44px] min-w-[44px] rounded-full bg-white/8 hover:bg-white/15 flex items-center justify-center text-white transition-colors border border-white/10"
                aria-label={musicPlaying ? "Pause music" : "Play music"}
              >
                <span className="text-sm leading-none">
                  {musicPlaying ? "❚❚" : "▶"}
                </span>
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}
