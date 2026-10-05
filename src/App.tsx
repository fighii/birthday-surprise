import { StoryProvider, useStory, type SceneId } from "./context/StoryContext";
import CinematicBackground from "./components/CinematicBackground";
import MusicPlayer from "./components/MusicPlayer";
import OpeningScene from "./components/OpeningScene";
import BirthdayScene from "./components/BirthdayScene";
import FirstMemoryScene from "./components/FirstMemoryScene";
import PhotoStory from "./components/PhotoStory";
import TimelineScene from "./components/TimelineScene";
import VideoScene from "./components/VideoScene";
import LoveLetter from "./components/LoveLetter";
import BuildUp from "./components/BuildUp";
import FinalSurprise from "./components/FinalSurprise";

function Stage() {
  const { currentScene, isTransitioning } = useStory();
  const scenes: { id: SceneId; Comp: React.ComponentType }[] = [
    { id: 1, Comp: OpeningScene },
    { id: 2, Comp: BirthdayScene },
    { id: 3, Comp: FirstMemoryScene },
    { id: 4, Comp: PhotoStory },
    { id: 5, Comp: TimelineScene },
    { id: 6, Comp: VideoScene },
    { id: 7, Comp: LoveLetter },
    { id: 8, Comp: BuildUp },
    { id: 9, Comp: FinalSurprise },
  ];

  return (
    <div
      className="relative w-full h-[100svh] min-h-[100svh] max-h-[100svh] overflow-hidden"
      style={{ height: "100svh", minHeight: "100svh", maxHeight: "100svh" }}
      data-current-scene={currentScene}
      data-transitioning={isTransitioning}
    >
      <CinematicBackground />
      {scenes.map(({ id, Comp }) => (
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
