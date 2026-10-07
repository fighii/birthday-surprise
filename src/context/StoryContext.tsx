import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type SceneId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

type SceneMood =
  | "opening"
  | "night"
  | "warm"
  | "memory"
  | "bright"
  | "cinematic"
  | "darker"
  | "romantic"
  | "veryDark"
  | "reveal";

interface StoryState {
  currentScene: SceneId;
  prevScene: SceneId;
  isTransitioning: boolean;
  sceneMood: SceneMood;
  musicInitialized: boolean;
  musicPlaying: boolean;
  musicNeedsTap: boolean;
  polaroidDone: boolean;
  finalDone: boolean;
}

interface StoryContextValue extends StoryState {
  goToScene: (scene: SceneId, pauseMs?: number) => void;
  setMusicInitialized: (v: boolean) => void;
  toggleMusic: () => void;
  setMusicPlaying: (v: boolean) => void;
  setMusicNeedsTap: (v: boolean) => void;
  markPolaroidDone: () => void;
  markFinalDone: () => void;
  audioRef: React.MutableRefObject<HTMLAudioElement | null>;
  fadeMusic: (toVolume: number, durationMs: number) => Promise<void>;
  duckMusicOn: () => Promise<void>;
  duckMusicOff: () => Promise<void>;
  tryAutoStartScene2: () => Promise<void>;
  musicVolRef: React.MutableRefObject<number>;
}

const StoryContext = createContext<StoryContextValue | null>(null);

const SCENE_MOOD: Record<SceneId, SceneMood> = {
  1: "opening",
  2: "night",
  3: "warm",
  4: "memory",
  5: "bright",
  6: "cinematic",
  7: "darker",
  8: "romantic",
  9: "veryDark",
  10: "reveal",
};

const DEFAULT_MUSIC_VOLUME = 0.78;
const DUCK_DUCKED_VOLUME = 0.20;
const DUCK_DURATION_OUT = 600;
const DUCK_DURATION_IN = 1200;

export function StoryProvider({ children }: { children: ReactNode }) {
  const [currentScene, setCurrentScene] = useState<SceneId>(1);
  const [prevScene, setPrevScene] = useState<SceneId>(1);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [sceneMood, setSceneMood] = useState<SceneMood>("opening");
  const [musicInitialized, setMusicInitialized] = useState(false);
  const [musicPlaying, setMusicPlaying] = useState(false);
  const [musicNeedsTap, setMusicNeedsTap] = useState(false);
  const [polaroidDone, setPolaroidDone] = useState(false);
  const [finalDone, setFinalDone] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const transitionTimer = useRef<number | null>(null);
  const musicVolRef = useRef<number>(DEFAULT_MUSIC_VOLUME);
  const fadeRafRef = useRef<number | null>(null);
  const duckingRef = useRef<"off" | "out" | "on" | "in">("off");

  const fadeMusic = useCallback(
    (toVolume: number, durationMs: number): Promise<void> => {
      const audio = audioRef.current;
      return new Promise((resolve) => {
        if (!audio || durationMs <= 0) {
          if (audio) {
            const clamped = Math.max(0, Math.min(1, toVolume));
            audio.volume = clamped;
            musicVolRef.current = clamped;
          }
          resolve();
          return;
        }
        if (fadeRafRef.current !== null) cancelAnimationFrame(fadeRafRef.current);
        const from = musicVolRef.current;
        const target = Math.max(0, Math.min(1, toVolume));
        const startedAt = performance.now();
        const tick = () => {
          const now = performance.now();
          const t = Math.min(1, (now - startedAt) / durationMs);
          const eased = 1 - Math.pow(1 - t, 3);
          const v = from + (target - from) * eased;
          if (audio) {
            audio.volume = v;
          }
          musicVolRef.current = v;
          if (t >= 1) {
            fadeRafRef.current = null;
            resolve();
            return;
          }
          fadeRafRef.current = requestAnimationFrame(tick);
        };
        fadeRafRef.current = requestAnimationFrame(tick);
      });
    },
    [],
  );

  const duckMusicOn = useCallback(async () => {
    duckingRef.current = "out";
    await fadeMusic(DUCK_DUCKED_VOLUME, DUCK_DURATION_OUT);
    duckingRef.current = "on";
  }, [fadeMusic]);

  const duckMusicOff = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;
    duckingRef.current = "in";
    let startedOk = !audio.paused;
    if (audio.paused) {
      try {
        await audio.play();
        startedOk = true;
        setMusicNeedsTap(false);
      } catch {
        setMusicNeedsTap(true);
      }
    }
    if (startedOk) {
      await fadeMusic(DEFAULT_MUSIC_VOLUME, DUCK_DURATION_IN);
      setMusicPlaying(true);
      setMusicInitialized(true);
    }
    duckingRef.current = "off";
  }, [fadeMusic]);

  const tryAutoStartScene2 = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (musicInitialized && !audio.paused) return;
    if (duckingRef.current !== "off") return;
    try {
      audio.volume = 0;
      musicVolRef.current = 0;
      await audio.play();
      setMusicPlaying(true);
      setMusicNeedsTap(false);
      setMusicInitialized(true);
      await fadeMusic(DEFAULT_MUSIC_VOLUME, DUCK_DURATION_IN);
    } catch {
      setMusicNeedsTap(true);
      setMusicPlaying(false);
    }
  }, [fadeMusic, musicInitialized]);

  const goToScene = useCallback((scene: SceneId, pauseMs = 500) => {
    setIsTransitioning(true);
    setPrevScene((prev) => prev);
    if (pauseMs > 0) {
      window.setTimeout(() => {
        setPrevScene(currentScene);
        setCurrentScene(scene);
        setSceneMood(SCENE_MOOD[scene]);
      }, pauseMs);
    } else {
      setPrevScene(currentScene);
      setCurrentScene(scene);
      setSceneMood(SCENE_MOOD[scene]);
    }
    if (transitionTimer.current) window.clearTimeout(transitionTimer.current);
    transitionTimer.current = window.setTimeout(() => {
      setIsTransitioning(false);
    }, 1100 + pauseMs);
  }, [currentScene]);

  const toggleMusic = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;
    try {
      if (audio.paused) {
        audio.volume = 0;
        musicVolRef.current = 0;
        await audio.play();
        setMusicPlaying(true);
        setMusicNeedsTap(false);
        setMusicInitialized(true);
        await fadeMusic(DEFAULT_MUSIC_VOLUME, 800);
      } else {
        await fadeMusic(0, 450);
        audio.pause();
        setMusicPlaying(false);
      }
    } catch {
      setMusicNeedsTap(true);
    }
  }, [fadeMusic]);

  const markPolaroidDone = useCallback(() => setPolaroidDone(true), []);
  const markFinalDone = useCallback(() => setFinalDone(true), []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onPlay = () => setMusicPlaying(true);
    const onPause = () => setMusicPlaying(false);
    const onErr = () => setMusicNeedsTap(true);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("error", onErr);
    return () => {
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("error", onErr);
      if (fadeRafRef.current !== null) cancelAnimationFrame(fadeRafRef.current);
    };
  }, []);

  const value = useMemo<StoryContextValue>(
    () => ({
      currentScene,
      prevScene,
      isTransitioning,
      sceneMood,
      musicInitialized,
      musicPlaying,
      musicNeedsTap,
      polaroidDone,
      finalDone,
      goToScene,
      setMusicInitialized,
      toggleMusic,
      setMusicPlaying,
      setMusicNeedsTap,
      markPolaroidDone,
      markFinalDone,
      audioRef,
      fadeMusic,
      duckMusicOn,
      duckMusicOff,
      tryAutoStartScene2,
      musicVolRef,
    }),
    [
      currentScene,
      prevScene,
      isTransitioning,
      sceneMood,
      musicInitialized,
      musicPlaying,
      musicNeedsTap,
      polaroidDone,
      finalDone,
      goToScene,
      toggleMusic,
      markPolaroidDone,
      markFinalDone,
      fadeMusic,
      duckMusicOn,
      duckMusicOff,
      tryAutoStartScene2,
    ],
  );

  return (
    <StoryContext.Provider value={value}>{children}</StoryContext.Provider>
  );
}

export function useStory() {
  const ctx = useContext(StoryContext);
  if (!ctx) throw new Error("useStory must be used within StoryProvider");
  return ctx;
}
