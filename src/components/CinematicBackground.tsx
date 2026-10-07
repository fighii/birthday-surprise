import { useMemo } from "react";
import { useStory } from "../context/StoryContext";

const moodStyles: Record<
  string,
  { bg: string; glowA: string; glowB: string; opacity: number; blur: number }
> = {
  night: {
    bg: "radial-gradient(ellipse at 50% 15%, #140a24 0%, #0a0418 45%, #05010c 80%, #020005 100%)",
    glowA: "rgba(120, 90, 255, 0.10)",
    glowB: "rgba(255, 150, 180, 0.08)",
    opacity: 0.22,
    blur: 0.1,
  },
  opening: {
    bg: "radial-gradient(ellipse at 50% 40%, #1a0f2e 0%, #0a0612 55%, #050208 100%)",
    glowA: "rgba(255, 107, 157, 0.18)",
    glowB: "rgba(247, 201, 126, 0.10)",
    opacity: 0.35,
    blur: 0,
  },
  warm: {
    bg: "radial-gradient(ellipse at 50% 45%, #3a1f2e 0%, #160a1d 55%, #0a0612 100%)",
    glowA: "rgba(255, 140, 160, 0.30)",
    glowB: "rgba(247, 201, 126, 0.20)",
    opacity: 0.55,
    blur: 0,
  },
  memory: {
    bg: "radial-gradient(ellipse at 50% 50%, #24122b 0%, #0e0718 55%, #050208 100%)",
    glowA: "rgba(255, 140, 180, 0.22)",
    glowB: "rgba(200, 170, 255, 0.16)",
    opacity: 0.5,
    blur: 0.4,
  },
  bright: {
    bg: "radial-gradient(ellipse at 50% 40%, #34163a 0%, #1a0b26 55%, #0a0612 100%)",
    glowA: "rgba(255, 140, 170, 0.28)",
    glowB: "rgba(247, 201, 126, 0.22)",
    opacity: 0.62,
    blur: 0,
  },
  cinematic: {
    bg: "radial-gradient(ellipse at 50% 45%, #2f1530 0%, #140a20 55%, #0a0612 100%)",
    glowA: "rgba(255, 150, 160, 0.28)",
    glowB: "rgba(247, 201, 126, 0.24)",
    opacity: 0.6,
    blur: 0,
  },
  darker: {
    bg: "radial-gradient(ellipse at 50% 55%, #1b0e22 0%, #0c0614 55%, #050208 100%)",
    glowA: "rgba(255, 107, 157, 0.16)",
    glowB: "rgba(200, 170, 255, 0.10)",
    opacity: 0.42,
    blur: 1.5,
  },
  romantic: {
    bg: "radial-gradient(ellipse at 50% 45%, #2a0f2a 0%, #12081c 55%, #050208 100%)",
    glowA: "rgba(255, 120, 170, 0.28)",
    glowB: "rgba(247, 201, 126, 0.18)",
    opacity: 0.56,
    blur: 0.2,
  },
  veryDark: {
    bg: "radial-gradient(ellipse at 50% 55%, #0e0718 0%, #070310 55%, #030108 100%)",
    glowA: "rgba(255, 107, 157, 0.10)",
    glowB: "rgba(247, 201, 126, 0.06)",
    opacity: 0.28,
    blur: 2,
  },
  reveal: {
    bg: "radial-gradient(ellipse at 50% 45%, #4a1f3a 0%, #1f0c26 40%, #0a0612 100%)",
    glowA: "rgba(255, 140, 180, 0.45)",
    glowB: "rgba(247, 201, 126, 0.35)",
    opacity: 0.82,
    blur: 0,
  },
};

function Stars({ count = 32 }: { count?: number }) {
  const stars = useMemo(() => {
    const arr: { top: string; left: string; size: number; delay: number; duration: number }[] = [];
    for (let i = 0; i < count; i++) {
      arr.push({
        top: Math.random() * 100 + "%",
        left: Math.random() * 100 + "%",
        size: Math.random() * 2 + 0.6,
        delay: Math.random() * 4,
        duration: 3 + Math.random() * 4,
      });
    }
    return arr;
  }, [count]);

  return (
    <div className="absolute inset-0 pointer-events-none" aria-hidden>
      {stars.map((s, i) => (
        <span
          key={i}
          className="absolute rounded-full bg-white animate-shimmer"
          style={{
            top: s.top,
            left: s.left,
            width: `${s.size}px`,
            height: `${s.size}px`,
            animationDelay: `${s.delay}s`,
            animationDuration: `${s.duration}s`,
            opacity: 0.55,
            boxShadow: "0 0 4px rgba(255,255,255,0.8)",
          }}
        />
      ))}
    </div>
  );
}

function Hearts({ count = 10 }: { count?: number }) {
  const hearts = useMemo(() => {
    const arr: { top: string; left: string; size: number; delay: number; duration: number; rotate: number }[] = [];
    for (let i = 0; i < count; i++) {
      arr.push({
        top: 10 + Math.random() * 80 + "%",
        left: Math.random() * 100 + "%",
        size: 12 + Math.random() * 18,
        delay: Math.random() * 6,
        duration: 9 + Math.random() * 8,
        rotate: -20 + Math.random() * 40,
      });
    }
    return arr;
  }, [count]);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
      {hearts.map((h, i) => (
        <span
          key={i}
          className="absolute text-cinematic-glow animate-float-slow"
          style={{
            top: h.top,
            left: h.left,
            fontSize: `${h.size}px`,
            opacity: 0.18,
            animationDelay: `${h.delay}s`,
            animationDuration: `${h.duration}s`,
            transform: `rotate(${h.rotate}deg)`,
            filter: "drop-shadow(0 0 6px rgba(255, 138, 168, 0.6))",
          }}
        >
          ❤
        </span>
      ))}
    </div>
  );
}

export default function CinematicBackground() {
  const { sceneMood } = useStory();
  const style = moodStyles[sceneMood] ?? moodStyles.opening;

  return (
    <div
      className="fixed inset-0 overflow-hidden transition-all duration-[1600ms] ease-out"
      style={{
        background: style.bg,
        zIndex: 0,
        filter: `blur(${style.blur}px)`,
      }}
      aria-hidden
    >
      <div
        className="absolute transition-all duration-[1400ms] ease-out"
        style={{
          top: "-15%",
          left: "-10%",
          width: "60%",
          height: "60%",
          borderRadius: "9999px",
          background: `radial-gradient(circle, ${style.glowA} 0%, transparent 65%)`,
          opacity: style.opacity,
          filter: "blur(60px)",
        }}
      />
      <div
        className="absolute transition-all duration-[1400ms] ease-out"
        style={{
          bottom: "-20%",
          right: "-10%",
          width: "70%",
          height: "60%",
          borderRadius: "9999px",
          background: `radial-gradient(circle, ${style.glowB} 0%, transparent 65%)`,
          opacity: style.opacity,
          filter: "blur(70px)",
        }}
      />
      <Stars count={42} />
      <Hearts count={8} />
    </div>
  );
}
