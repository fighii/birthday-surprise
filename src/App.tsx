import { StoryProvider, useStory, type SceneId } from "./context/StoryContext";
import CinematicBackground from "./components/CinematicBackground";
import MusicPlayer from "./components/MusicPlayer";
import OpeningScene from "./components/01.OpeningScene";
import FireworkScene from "./components/02.FireworkScene";
import PolaroidStack from "./components/03.PolaroidStack";
import FirstMemoryScene from "./components/04.FirstMemoryScene";
import PhotoStory from "./components/05.PhotoStory";
import TimelineScene from "./components/06.TimelineScene";
import VideoScene from "./components/07.VideoScene";
import LoveLetter from "./components/08.LoveLetter";
import BuildUp from "./components/09.BuildUp";
import FinalSurprise from "./components/10.FinalSurprise";

function Stage() {
  const { currentScene, prevScene, isTransitioning } = useStory();
  const scenes: { id: SceneId; Comp: React.ComponentType }[] = [
    { id: 1, Comp: OpeningScene },
    { id: 2, Comp: FireworkScene },
    { id: 3, Comp: PolaroidStack },
    { id: 4, Comp: FirstMemoryScene },
    { id: 5, Comp: PhotoStory },
    { id: 6, Comp: TimelineScene },
    { id: 7, Comp: VideoScene },
    { id: 8, Comp: LoveLetter },
    { id: 9, Comp: BuildUp },
    { id: 10, Comp: FinalSurprise },
  ];

  return (
    <div
      className="relative w-full h-[100svh] min-h-[100svh] max-h-[100svh] overflow-hidden"
      style={{ height: "100svh", minHeight: "100svh", maxHeight: "100svh" }}
      data-current-scene={currentScene}
      data-transitioning={isTransitioning}
    >
      <CinematicBackground />
      {/* hemat memori: hanya scene aktif, scene sebelumnya (untuk fade-out) dan scene berikutnya (preload) */}
      {scenes
        .filter(({ id }) => id === currentScene || id === prevScene || id === currentScene + 1)
        .map(({ id, Comp }) => (
          <Comp key={id} />
        ))}
      <MusicPlayer />
    </div>
  );
}

export default function App() {
  return (
    <StoryProvider>
      <Stage />
    </StoryProvider>
  );
}