import { useEffect, useRef, useState } from "react";
import { useStory } from "../context/StoryContext";
import { birthdayConfig } from "../config/birthdayConfig.js";
import { videos as videoList } from "../config/media.js";

export default function VideoScene() {
  const { currentScene, goToScene, duckMusicOn, duckMusicOff } = useStory();
  const active = currentScene === 6;
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [phase, setPhase] = useState(0);
  const video = videoList && videoList[0];
  const duckDoneRef = useRef<"idle" | "on" | "off">("idle");

  useEffect(() => {
    if (!active) return;
    if (duckDoneRef.current !== "on") {
      duckDoneRef.current = "on";
      void duckMusicOn();
    }
    setPhase(0);
    const t1 = window.setTimeout(() => setPhase(1), 400);
    const t2 = window.setTimeout(() => setPhase(2), 1200);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      if (duckDoneRef.current === "on") {
        duckDoneRef.current = "off";
        void duckMusicOff();
      }
      if (videoRef.current) {
        try {
          videoRef.current.pause();
        } catch {
          /* noop */
        }
      }
    };
  }, [active, duckMusicOn, duckMusicOff]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (!active) {
      try {
        v.pause();
        v.muted = true;
      } catch {
        /* noop */
      }
      return;
    }
    const attemptPlay = async () => {
      try {
        v.muted = true;
        v.playsInline = true;
        v.setAttribute("playsinline", "true");
        v.currentTime = 0;
        const p = v.play();
        if (p && typeof p.then === "function") {
          await p;
        }
        try {
          v.muted = false;
          const p2 = v.play();
          if (p2 && typeof p2.then === "function") {
            await p2;
          }
        } catch {
          v.muted = true;
        }
      } catch {
        try {
          v.muted = true;
          void v.play();
        } catch {
          /* noop */
        }
      }
    };
    if (phase >= 2) {
      const t = window.setTimeout(() => void attemptPlay(), 250);
      return () => window.clearTimeout(t);
    }
    return;
  }, [active, phase]);

  return (
    <section
      className={`scene-layer ${active ? "scene-active" : "scene-hidden"}`}
      aria-hidden={!active}
    >
      <div className="relative z-10 w-full max-w-xl mx-auto flex flex-col items-center gap-5 px-4 text-center">
        <p
          className={`text-romantic text-3xl sm:text-4xl text-cinematic-gold transition-all duration-[900ms] ${
            phase >= 1 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"
          }`}
        >
          {birthdayConfig.videoText}
        </p>

        <div
          className={`w-full relative transition-all duration-[1100ms] ease-out ${
            phase >= 2
              ? "opacity-100 scale-100 blur-0"
              : "opacity-0 scale-[0.96] blur-md"
          }`}
          style={{ aspectRatio: "16 / 9", maxWidth: 520 }}
        >
          {video ? (
            <div
              className="relative w-full h-full rounded-2xl overflow-hidden glass"
              style={{ padding: 4 }}
            >
              <video
                ref={videoRef}
                src={video}
                preload="auto"
                autoPlay
                muted
                playsInline
                disablePictureInPicture
                controlsList="nodownload nofullscreen noremoteplayback"
                className="w-full h-full rounded-xl object-contain bg-black select-none pointer-events-none"
                poster=""
                aria-label="Birthday surprise video"
                draggable={false}
              />
            </div>
          ) : (
            <div className="glass w-full h-full flex items-center justify-center rounded-2xl">
              <div className="text-center px-6">
                <p className="text-romantic text-3xl text-cinematic-gold mb-2">Video</p>
                <p className="text-cinematic-soft/80">Your video surprise will appear here ❤️</p>
              </div>
            </div>
          )}
        </div>

        <button
          className="btn-secondary transition-opacity duration-700"
          onClick={() => goToScene(7, 300)}
        >
          One last thing →
        </button>
      </div>

      <div className="vignette" />
    </section>
  );
}
