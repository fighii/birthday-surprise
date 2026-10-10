import { useStory } from "../context/StoryContext";
import StarryBackdrop from "./StarryBackdrop";
import { THEME } from "../config/sceneTheme";

// Latar global: langit malam biru + bintang kotak + hati pixel (StarryBackdrop),
// lalu "mood" scene hanya menggeser warna lewat lapisan rose / gelap di atasnya.
const moods: Record<string, { rose: number; dark: number }> = {
  night: { rose: 0, dark: 0.1 },
  opening: { rose: 0.15, dark: 0 },
  warm: { rose: 0.8, dark: 0 },
  memory: { rose: 0.5, dark: 0.05 },
  bright: { rose: 0.7, dark: 0 },
  cinematic: { rose: 0.6, dark: 0 },
  darker: { rose: 0.3, dark: 0.25 },
  romantic: { rose: 0.9, dark: 0 },
  veryDark: { rose: 0.1, dark: 0.45 },
  reveal: { rose: 1, dark: 0 },
};

export default function CinematicBackground() {
  const { sceneMood, currentScene } = useStory();
  const m = moods[sceneMood] ?? moods.opening;
  // PhotoStory (scene 5) menutupi seluruh layar dengan foto buram -> animasi bintang di belakangnya
  // tidak terlihat, jadi dihentikan agar CPU/GPU HP tidak terbuang.
  const starsActive = currentScene !== 5;

  return (
    <div
      className="fixed inset-0 overflow-hidden"
      style={{ zIndex: 0, background: THEME.night }}
      aria-hidden
    >
      <StarryBackdrop variant="night" active={starsActive} />

      {/* nuansa plum-rose di bagian bawah, naik saat scene makin hangat */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: [
            "radial-gradient(90% 55% at 50% 88%, rgba(220,70,140,0.40), rgba(60,10,60,0) 72%)",
            `linear-gradient(180deg, rgba(0,0,0,0) 35%, ${THEME.plum} 100%)`,
          ].join(","),
          opacity: m.rose,
          transition: "opacity 1600ms ease-out",
        }}
      />
      {/* peredup untuk scene yang lebih sunyi */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "rgb(2,3,12)",
          opacity: m.dark,
          transition: "opacity 1600ms ease-out",
        }}
      />
    </div>
  );
}