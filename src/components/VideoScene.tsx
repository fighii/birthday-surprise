import { useEffect, useRef, useState } from "react";
import { useStory } from "../context/StoryContext";
import { birthdayConfig } from "../config/birthdayConfig.js";
import { videos as videoList } from "../config/media.js";
import { CutoutText, PaperNote, PaperSticker } from "./PaperCutout";
import { PaperButton, PaperFrame, usePrefersReducedMotion } from "./PaperExtras";
import SceneLabel from "./SceneLabel";
import { assetUrl } from "../lib/assets";

export default function VideoScene() {
  const { currentScene, goToScene, duckMusicOn, duckMusicOff } = useStory();
  const active = currentScene === 7;
  const reduce = usePrefersReducedMotion();
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
    <section className={`scene-layer ${active ? "scene-active" : "scene-hidden"}`} aria-hidden={!active}>
      <style>{`@keyframes vsBob { 0%,100% { translate: 0 0; } 50% { translate: 0 -6px; } }`}</style>

      <div className="relative z-10 w-full max-w-xl mx-auto flex flex-col items-center gap-5 px-4 text-center">
        <SceneLabel visible={phase >= 1}>Putar ya</SceneLabel>

        <h2 style={{ margin: 0 }}>
          <CutoutText
            text={birthdayConfig.videoText}
            fontSize="clamp(20px, 6vw, 28px)"
            seed={9}
            show={phase >= 1}
            stagger={30}
            reduce={reduce}
          />
        </h2>

        <div
          className="w-full relative transition-all duration-[1100ms] ease-out"
          style={{
            maxWidth: 520,
            opacity: phase >= 2 ? 1 : 0,
            transform: phase >= 2 ? "scale(1)" : "scale(0.96)",
            filter: phase >= 2 ? "blur(0)" : "blur(8px)",
          }}
        >
          <PaperSticker
            kind="star"
            color="#FFD84A"
            size={40}
            rotate={14}
            style={{ right: -10, top: -26, zIndex: 3, animation: reduce ? undefined : "vsBob 4.4s ease-in-out infinite" }}
          />
          <PaperSticker
            kind="heart"
            color="#ff7fae"
            size={34}
            rotate={-12}
            style={{ left: -8, bottom: 14, zIndex: 3, animation: reduce ? undefined : "vsBob 5s ease-in-out 1s infinite" }}
          />

          {video ? (
            <PaperFrame width="100%" seed={5} rotate={-1} tapeColor="pink" caption="♥ untukmu ♥">
              <div style={{ position: "relative", width: "100%", aspectRatio: "16 / 9" }}>
                <video
                  ref={videoRef}
                  src={assetUrl(video)}
                  preload="metadata"
                  muted
                  playsInline
                  disablePictureInPicture
                  controlsList="nodownload nofullscreen noremoteplayback"
                  className="w-full h-full object-contain bg-black select-none pointer-events-none"
                  poster=""
                  aria-label="Birthday surprise video"
                  draggable={false}
                />
              </div>
            </PaperFrame>
          ) : (
            <PaperNote rotate={-1.2} tone="cream" tapeColor="pink" seed={5} innerStyle={{ padding: "34px 24px" }}>
              <div style={{ aspectRatio: "16 / 9", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                <p className="text-romantic" style={{ margin: "0 0 6px", fontSize: 32 }}>
                  Video
                </p>
                <p style={{ margin: 0 }}>Your video surprise will appear here ❤️</p>
              </div>
            </PaperNote>
          )}
        </div>

        <PaperButton variant="secondary" seed={6} onClick={() => goToScene(8, 300)}>
          One last thing →
        </PaperButton>
      </div>

      <div className="vignette" />
    </section>
  );
}