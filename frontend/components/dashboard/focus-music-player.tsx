"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Disc3,
  ListMusic,
  Music2,
  Pause,
  Play,
  Repeat,
  Shuffle,
  SkipBack,
  SkipForward,
  Trash2,
  Upload,
  Volume2,
  X
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api-client";
import { cn } from "@/lib/cn";
import {
  emitFocusMusicState,
  focusMusicCommandEvent,
  type FocusMusicCommandDetail
} from "@/lib/music-events";
import { useTimerStore } from "@/lib/timer-store";

type UploadedTrackDTO = {
  id: string;
  title: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
};

type BuiltInTrack = {
  id: string;
  kind: "builtin";
  title: string;
  source: string;
  mood: string;
  category: "ambient" | "song";
  engine?: "rain" | "brown-noise" | "lofi" | "forest";
  url?: string;
  durationSeconds: number;
};

type UploadedTrack = UploadedTrackDTO & {
  kind: "upload";
  source: string;
  mood: string;
  durationSeconds: number;
};

type MusicTrack = BuiltInTrack | UploadedTrack;
type StoppableNode = AudioNode & { stop?: () => void };

const clayButtonClass =
  "border-white/16 bg-white/[0.09] shadow-[inset_0_1px_0_rgba(255,255,255,0.22),inset_0_-10px_22px_rgba(0,0,0,0.22),0_14px_28px_rgba(0,0,0,0.28)] hover:border-cyan/35 hover:bg-white/[0.14] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.25),inset_0_-8px_20px_rgba(0,0,0,0.2),0_18px_34px_rgba(37,99,235,0.2)] active:translate-y-[1px]";
const roundClayButtonClass = cn("h-12 w-12 rounded-full p-0 transition", clayButtonClass);
const primaryClayButtonClass =
  "border-cyan/35 bg-cyan/20 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.24),inset_0_-10px_22px_rgba(18,24,38,0.34),0_16px_34px_rgba(37,99,235,0.28)] hover:border-cyan/55 hover:bg-cyan/26 active:translate-y-[1px]";

const builtInTracks: BuiltInTrack[] = [
  { id: "rain", kind: "builtin", title: "Rain", source: "Ambient setting", mood: "Soft rain texture", category: "ambient", engine: "rain", durationSeconds: 300 },
  { id: "brown-noise", kind: "builtin", title: "Brown Noise", source: "Ambient setting", mood: "Low-noise shield", category: "ambient", engine: "brown-noise", durationSeconds: 300 },
  { id: "lofi", kind: "builtin", title: "Lo-fi", source: "Ambient setting", mood: "Low tempo study bed", category: "ambient", engine: "lofi", durationSeconds: 210 },
  { id: "forest", kind: "builtin", title: "Forest", source: "Ambient setting", mood: "Soft nature focus layer", category: "ambient", engine: "forest", durationSeconds: 300 },
  {
    id: "cotton-eye-joe",
    kind: "builtin",
    title: "Cotton Eye Joe",
    source: "Public domain song",
    mood: "Traditional country song",
    category: "song",
    url: "https://upload.wikimedia.org/wikipedia/commons/transcoded/2/2b/CottonEyeJoe.ogg/CottonEyeJoe.ogg.mp3",
    durationSeconds: 182
  },
  {
    id: "fur-elise",
    kind: "builtin",
    title: "Für Elise",
    source: "Public domain song",
    mood: "Classic piano study",
    category: "song",
    url: "https://upload.wikimedia.org/wikipedia/commons/1/15/For_Elise_%28F%C3%BCr_Elise%29_Beethoven_JMC_Han.ogg",
    durationSeconds: 154
  },
  {
    id: "cripple-creek",
    kind: "builtin",
    title: "Cripple Creek",
    source: "Public domain song",
    mood: "Traditional country song",
    category: "song",
    url: "https://upload.wikimedia.org/wikipedia/commons/transcoded/1/11/CrippleCreek.ogg/CrippleCreek.ogg.mp3",
    durationSeconds: 190
  },
  {
    id: "nobody-knows",
    kind: "builtin",
    title: "Nobody Knows the Trouble",
    source: "Public domain song",
    mood: "Traditional spiritual vocal",
    category: "song",
    url: "https://upload.wikimedia.org/wikipedia/commons/transcoded/b/b8/NobodyKnowsTheTroubleISee.ogg/NobodyKnowsTheTroubleISee.ogg.mp3",
    durationSeconds: 213
  },
  {
    id: "keep-your-lamp",
    kind: "builtin",
    title: "Keep Your Lamp Trimmed",
    source: "Public domain song",
    mood: "Traditional blues gospel",
    category: "song",
    url: "https://upload.wikimedia.org/wikipedia/commons/transcoded/7/70/KeepYourLampTrimmedAndBurning.ogg/KeepYourLampTrimmedAndBurning.ogg.mp3",
    durationSeconds: 183
  },
  {
    id: "shenandoah",
    kind: "builtin",
    title: "Shenandoah",
    source: "Public domain song",
    mood: "Traditional American song",
    category: "song",
    url: "https://upload.wikimedia.org/wikipedia/commons/transcoded/1/19/Shenandoah.ogg/Shenandoah.ogg.mp3",
    durationSeconds: 132
  }
];

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function audioContextFactory() {
  return window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
}

async function playAudioSafely(audio: HTMLAudioElement, failureMessage: string) {
  try {
    await audio.play();
    return true;
  } catch (error) {
    console.warn("ProCast music playback failed", error);
    toast.error(failureMessage);
    return false;
  }
}

function createNoiseBuffer(context: AudioContext, engine: "rain" | "brown-noise" | "forest") {
  const seconds = 2;
  const buffer = context.createBuffer(1, context.sampleRate * seconds, context.sampleRate);
  const data = buffer.getChannelData(0);
  let brown = 0;

  for (let i = 0; i < data.length; i += 1) {
    const white = Math.random() * 2 - 1;
    if (engine === "brown-noise" || engine === "forest") {
      brown = (brown + 0.02 * white) / 1.02;
      data[i] = brown * (engine === "forest" ? 4.5 : 7);
    } else {
      data[i] = white * 0.7;
    }
  }

  return buffer;
}

export function FocusMusicPlayer({ open, onCloseAction }: { open: boolean; onCloseAction: () => void }) {
  const [uploadedTracks, setUploadedTracks] = useState<UploadedTrackDTO[]>([]);
  const [activeTrackId, setActiveTrackId] = useState("rain");
  const [playing, setPlaying] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [musicSessionActive, setMusicSessionActive] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [duration, setDuration] = useState(300);
  const [volume, setVolume] = useState(0.55);
  const [repeat, setRepeat] = useState(true);
  const [shuffle, setShuffle] = useState(false);
  const timerStatus = useTimerStore((state) => state.status);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const activeNodesRef = useRef<StoppableNode[]>([]);
  const progressIntervalRef = useRef<number | null>(null);
  const startedAtRef = useRef<number>(Date.now());
  const elapsedBeforePlayRef = useRef(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const repeatRef = useRef(repeat);
  const shuffleRef = useRef(shuffle);
  const activeTrackIdRef = useRef(activeTrackId);
  const tracksRef = useRef<MusicTrack[]>([]);
  const playingRef = useRef(playing);
  const musicSessionActiveRef = useRef(musicSessionActive);

  const tracks = useMemo<MusicTrack[]>(
    () => [
      ...builtInTracks,
      ...uploadedTracks.map((track) => ({
        ...track,
        kind: "upload" as const,
        source: "Your upload",
        mood: `${Math.max(1, Math.round(track.sizeBytes / 1024 / 1024))} MB saved track`,
        durationSeconds: 240
      }))
    ],
    [uploadedTracks]
  );
  const activeTrack = tracks.find((track) => track.id === activeTrackId) ?? tracks[0];

  repeatRef.current = repeat;
  shuffleRef.current = shuffle;
  activeTrackIdRef.current = activeTrackId;
  tracksRef.current = tracks;
  playingRef.current = playing;
  musicSessionActiveRef.current = musicSessionActive;

  function markMusicSessionActive() {
    musicSessionActiveRef.current = true;
    setMusicSessionActive(true);
  }

  function clearProgressTimer() {
    if (progressIntervalRef.current) {
      window.clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  }

  function stopGeneratedNodes() {
    activeNodesRef.current.forEach((node) => {
      try {
        node.stop?.();
      } catch {
        // The node may already be stopped.
      }
      try {
        node.disconnect();
      } catch {
        // The node may already be disconnected.
      }
    });
    activeNodesRef.current = [];
    masterGainRef.current = null;
  }

  function cleanupObjectUrl() {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }

  function stopCurrentTrack(resetPosition = true) {
    clearProgressTimer();
    stopGeneratedNodes();
    const audio = audioRef.current;
    if (audio) {
      audio.onended = null;
      audio.onerror = null;
      audio.onloadedmetadata = null;
      audio.pause();
      try {
        audio.currentTime = 0;
      } catch {
        // Some streamed sources do not allow seeking before metadata is ready.
      }
      audio.removeAttribute("src");
      audio.load();
    }
    audioRef.current = null;
    cleanupObjectUrl();
    setPlaying(false);
    if (resetPosition) {
      elapsedBeforePlayRef.current = 0;
      setElapsed(0);
    }
  }

  function stopMusicSession() {
    stopCurrentTrack();
    musicSessionActiveRef.current = false;
    setMusicSessionActive(false);
  }

  function startProgress(track: MusicTrack) {
    clearProgressTimer();
    progressIntervalRef.current = window.setInterval(() => {
      if (audioRef.current) {
        setElapsed(audioRef.current.currentTime || 0);
        if (Number.isFinite(audioRef.current.duration)) setDuration(audioRef.current.duration);
        return;
      }

      const nextElapsed = elapsedBeforePlayRef.current + (Date.now() - startedAtRef.current) / 1000;
      if (nextElapsed >= track.durationSeconds && track.kind === "builtin") {
        if (repeatRef.current) {
          elapsedBeforePlayRef.current = 0;
          startedAtRef.current = Date.now();
          setElapsed(0);
          return;
        }
        void playAdjacent(1);
        return;
      }
      setElapsed(Math.min(nextElapsed, track.durationSeconds));
    }, 250);
  }

  async function startHostedSong(track: BuiltInTrack, resumeFromCurrent = false) {
    if (resumeFromCurrent && audioRef.current) {
      const resumed = await playAudioSafely(audioRef.current, "Could not resume this song. Try another track.");
      if (!resumed) return;
      startedAtRef.current = Date.now();
      setPlaying(true);
      startProgress(track);
      return;
    }

    if (!track.url) {
      toast.error("Song file is not available.");
      return;
    }

    stopCurrentTrack(false);
    const audio = new Audio(track.url);
    audio.volume = volume;
    audio.preload = "auto";
    audio.onloadedmetadata = () => {
      if (Number.isFinite(audio.duration)) setDuration(audio.duration);
    };
    audio.onerror = () => console.warn("ProCast could not load hosted song", track.url);
    audio.onended = () => {
      if (repeatRef.current) {
        audio.currentTime = 0;
        void playAudioSafely(audio, "Could not restart this song. Try another track.");
        return;
      }
      void playAdjacent(1);
    };

    audioRef.current = audio;
    if (!resumeFromCurrent) {
      elapsedBeforePlayRef.current = 0;
      setElapsed(0);
    }
    const started = await playAudioSafely(audio, "Could not play this song. Try another track.");
    if (!started) {
      if (audioRef.current === audio) audioRef.current = null;
      setPlaying(false);
      return;
    }
    markMusicSessionActive();
    startedAtRef.current = Date.now();
    setDuration(track.durationSeconds);
    setPlaying(true);
    startProgress(track);
  }

  async function startBuiltInTrack(track: BuiltInTrack, resumeFromCurrent = false) {
    if (track.category === "song") {
      await startHostedSong(track, resumeFromCurrent);
      return;
    }

    stopCurrentTrack(false);
    const AudioContextCtor = audioContextFactory();
    if (!AudioContextCtor) {
      toast.error("Focus music is not supported in this browser.");
      return;
    }

    const context = audioContextRef.current ?? new AudioContextCtor();
    audioContextRef.current = context;
    if (context.state === "suspended") await context.resume();

    const masterGain = context.createGain();
    masterGain.gain.value = volume * 0.34;
    masterGain.connect(context.destination);
    masterGainRef.current = masterGain;
    activeNodesRef.current.push(masterGain);

    if (track.engine === "rain" || track.engine === "brown-noise" || track.engine === "forest") {
      const source = context.createBufferSource();
      const filter = context.createBiquadFilter();
      source.buffer = createNoiseBuffer(context, track.engine);
      source.loop = true;
      filter.type = track.engine === "rain" ? "bandpass" : "lowpass";
      filter.frequency.value = track.engine === "rain" ? 1650 : track.engine === "forest" ? 900 : 260;
      source.connect(filter);
      filter.connect(masterGain);
      source.start();
      activeNodesRef.current.push(source, filter);
    } else if (track.engine === "lofi") {
      [174.61, 220, 261.63].forEach((frequency, index) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = "triangle";
        oscillator.frequency.value = frequency;
        gain.gain.value = 0.045 / (index + 1);
        oscillator.connect(gain);
        gain.connect(masterGain);
        oscillator.start();
        activeNodesRef.current.push(oscillator, gain);
      });
    }

    if (!resumeFromCurrent) {
      elapsedBeforePlayRef.current = 0;
      setElapsed(0);
    }
    startedAtRef.current = Date.now();
    setDuration(track.durationSeconds);
    markMusicSessionActive();
    setPlaying(true);
    startProgress(track);
  }

  async function startUploadedTrack(track: UploadedTrack, resumeFromCurrent = false) {
    if (resumeFromCurrent && audioRef.current) {
      const resumed = await playAudioSafely(audioRef.current, "Could not resume uploaded music.");
      if (!resumed) return;
      startedAtRef.current = Date.now();
      setPlaying(true);
      startProgress(track);
      return;
    }

    stopCurrentTrack(false);
    const response = await apiFetch(`/music/tracks/${track.id}/stream`);
    if (!response.ok) {
      toast.error("Could not load uploaded music.");
      return;
    }

    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const audio = new Audio(objectUrl);
    audio.volume = volume;
    audio.preload = "auto";
    audio.onloadedmetadata = () => {
      if (Number.isFinite(audio.duration)) setDuration(audio.duration);
    };
    audio.onended = () => {
      if (repeatRef.current) {
        audio.currentTime = 0;
        void playAudioSafely(audio, "Could not restart uploaded music.");
        return;
      }
      void playAdjacent(1);
    };

    objectUrlRef.current = objectUrl;
    audioRef.current = audio;
    if (!resumeFromCurrent) {
      elapsedBeforePlayRef.current = 0;
      setElapsed(0);
    }
    const started = await playAudioSafely(audio, "Could not play this upload. Try another audio file.");
    if (!started) {
      if (audioRef.current === audio) audioRef.current = null;
      cleanupObjectUrl();
      setPlaying(false);
      return;
    }
    markMusicSessionActive();
    startedAtRef.current = Date.now();
    setPlaying(true);
    startProgress(track);
  }

  async function playTrack(trackId: string, resumeFromCurrent = false) {
    const track = tracks.find((item) => item.id === trackId);
    if (!track) return;

    activeTrackIdRef.current = track.id;
    setActiveTrackId(track.id);
    if (track.kind === "builtin") {
      await startBuiltInTrack(track, resumeFromCurrent);
      return;
    }
    await startUploadedTrack(track, resumeFromCurrent);
  }

  function pauseTrack() {
    if (!playing) return;
    clearProgressTimer();
    elapsedBeforePlayRef.current = elapsed;
    audioRef.current?.pause();
    stopGeneratedNodes();
    setPlaying(false);
  }

  async function togglePlayback() {
    if (playing) {
      pauseTrack();
      return;
    }
    await playTrack(activeTrack.id, true);
  }

  async function playAdjacent(direction: 1 | -1) {
    const currentTracks = tracksRef.current;
    if (currentTracks.length === 0) return;
    const currentIndex = Math.max(0, currentTracks.findIndex((track) => track.id === activeTrackIdRef.current));
    const nextIndex = shuffleRef.current
      ? Math.floor(Math.random() * currentTracks.length)
      : (currentIndex + direction + currentTracks.length) % currentTracks.length;
    await playTrack(currentTracks[nextIndex].id);
  }

  async function seek(value: number) {
    const nextElapsed = Math.max(0, Math.min(value, duration || activeTrack.durationSeconds));
    setElapsed(nextElapsed);
    elapsedBeforePlayRef.current = nextElapsed;
    if (audioRef.current) {
      audioRef.current.currentTime = nextElapsed;
      return;
    }
    if (playing && activeTrack.kind === "builtin") {
      await startBuiltInTrack(activeTrack, true);
    }
  }

  async function loadUploadedTracks() {
    const response = await apiFetch("/music/tracks");
    if (!response.ok) return;
    const data = await response.json();
    setUploadedTracks(data.tracks ?? []);
  }

  async function uploadTrack(file: File) {
    if (!file.type.startsWith("audio/")) {
      toast.error("Upload an audio file.");
      return;
    }

    setUploading(true);
    const response = await apiFetch("/music/tracks", {
      method: "POST",
      headers: {
        "Content-Type": file.type,
        "x-track-title": encodeURIComponent(file.name.replace(/\.[^.]+$/, ""))
      },
      body: file
    });
    const data = await response.json().catch(() => ({}));
    setUploading(false);

    if (!response.ok) {
      const errorMsg = typeof data.error === "object" ? data.error.message || JSON.stringify(data.error) : data.error;
      toast.error(errorMsg || "Could not upload music.");
      return;
    }

    setUploadedTracks(data.tracks ?? []);
    setActiveTrackId(data.track.id);
    toast.success("Music uploaded and saved.");
  }

  async function deleteUploadedTrack(track: UploadedTrack) {
    const response = await apiFetch(`/music/tracks/${track.id}`, { method: "DELETE" });
    if (!response.ok) {
      toast.error("Could not remove uploaded music.");
      return;
    }
    setUploadedTracks((current) => current.filter((item) => item.id !== track.id));
    if (activeTrackId === track.id) {
      stopCurrentTrack();
      setActiveTrackId("rain");
    }
  }

  useEffect(() => {
    if (timerStatus === "completed") stopMusicSession();
  }, [timerStatus]);

  useEffect(() => {
    if (open) void loadUploadedTracks();
  }, [open]);

  useEffect(() => {
    emitFocusMusicState({
      available: musicSessionActive,
      playing,
      trackId: activeTrack?.id ?? null,
      title: activeTrack?.title ?? null
    });
  }, [activeTrack?.id, activeTrack?.title, musicSessionActive, playing]);

  useEffect(() => {
    async function handleMusicCommand(event: Event) {
      const { action } = (event as CustomEvent<FocusMusicCommandDetail>).detail;
      if (action === "pause") {
        pauseTrack();
        return;
      }

      if (action === "stop") {
        stopMusicSession();
        return;
      }

      if (action === "resume") {
        if (!musicSessionActiveRef.current) return;
        await playTrack(activeTrackIdRef.current, true);
        return;
      }

      if (action === "resume-or-start") {
        if (playingRef.current) return;
        await playTrack(activeTrackIdRef.current, musicSessionActiveRef.current);
        return;
      }

      if (playingRef.current) {
        pauseTrack();
        return;
      }

      if (musicSessionActiveRef.current) {
        await playTrack(activeTrackIdRef.current, true);
      }
    }

    window.addEventListener(focusMusicCommandEvent, handleMusicCommand);
    return () => window.removeEventListener(focusMusicCommandEvent, handleMusicCommand);
  });

  useEffect(() => {
    if (masterGainRef.current) masterGainRef.current.gain.value = volume * 0.34;
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  useEffect(() => {
    return () => {
      emitFocusMusicState({ available: false, playing: false, trackId: null, title: null });
      stopCurrentTrack();
      void audioContextRef.current?.close();
    };
  }, []);

  if (!open) return null;

  const progressMax = Math.max(1, duration || activeTrack.durationSeconds);
  const uploadedCount = tracks.filter((track) => track.kind === "upload").length;

  return (
    <div
      className="fixed inset-0 z-[95] flex items-center justify-center bg-black/62 px-3 py-4 backdrop-blur-xl sm:px-4 sm:py-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCloseAction();
      }}
    >
      <div className="glass-strong relative max-h-[92vh] w-full max-w-5xl overflow-y-auto overflow-x-hidden rounded-[28px] border-cyan/20 bg-[#10131f]/90 shadow-[0_36px_140px_rgba(0,0,0,0.62)]">
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_20%_10%,rgba(37,99,235,0.24),transparent_32%),radial-gradient(circle_at_80%_0%,rgba(118,228,167,0.16),transparent_28%)]" />
        <div className="relative grid gap-0 lg:grid-cols-[0.95fr_1.05fr]">
          <section className="border-b border-white/10 p-4 sm:p-6 lg:border-b-0 lg:border-r">
            <div className="mb-6 flex items-start justify-between gap-4 sm:mb-7">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.28em] text-cyan">Focus audio deck</p>
                <h2 className="mt-3 font-display text-3xl font-extrabold sm:text-4xl">Music that stays out of your way.</h2>
                <p className="mt-2 text-sm leading-6 text-muted">Pick a focus sound, upload your own track, and keep it available inside ProCast.</p>
              </div>
              <Button className={cn("h-11 w-11 shrink-0", roundClayButtonClass)} size="icon" variant="secondary" onClick={onCloseAction} aria-label="Close music player">
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="rounded-[26px] border border-white/12 bg-white/[0.07] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] sm:p-5">
              <div className="mb-5 flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
                <div
                  className={cn(
                    "relative flex h-32 w-32 shrink-0 items-center justify-center rounded-full border border-cyan/30 shadow-[0_18px_45px_rgba(37,99,235,0.28)]",
                    "bg-[radial-gradient(circle_at_center,#08090f_0_12%,#d7e5ff_13%_14%,#18243b_15%_34%,#2563eb_35%_37%,#0f172a_38%_60%,#76e4a7_61%_63%,#172033_64%_100%)]",
                    playing && "animate-spin [animation-duration:7s] [animation-timing-function:linear]"
                  )}
                  aria-label={`Now playing ${activeTrack.title}`}
                >
                  <div className="absolute inset-3 rounded-full border border-white/12" />
                  <div className="absolute inset-7 rounded-full border border-white/10" />
                  <div className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/30 bg-[#10131f] shadow-[inset_0_2px_8px_rgba(0,0,0,0.65)]" />
                  <p className="relative z-10 max-w-[78px] text-center text-[10px] font-extrabold uppercase leading-tight tracking-normal text-white drop-shadow">
                    {activeTrack.title}
                  </p>
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-muted">{activeTrack.source}</p>
                  <h3 className="truncate font-display text-2xl font-extrabold">{activeTrack.title}</h3>
                  <p className="truncate text-sm text-muted">{activeTrack.mood}</p>
                </div>
              </div>

              <input
                className="w-full accent-cyan"
                type="range"
                min={0}
                max={progressMax}
                step={1}
                value={Math.min(elapsed, progressMax)}
                onChange={(event) => void seek(Number(event.target.value))}
                aria-label="Music progress"
              />
              <div className="mt-2 flex justify-between text-xs font-bold text-muted">
                <span>{formatTime(elapsed)}</span>
                <span>{formatTime(progressMax)}</span>
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                <Button
                  className={cn(roundClayButtonClass, shuffle && primaryClayButtonClass)}
                  size="icon"
                  variant="secondary"
                  onClick={() => setShuffle((value) => !value)}
                  aria-label="Shuffle"
                >
                  <Shuffle className="h-5 w-5" />
                </Button>
                <Button className={roundClayButtonClass} size="icon" variant="secondary" onClick={() => void playAdjacent(-1)} aria-label="Previous track">
                  <SkipBack className="h-6 w-6" />
                </Button>
                <Button
                  className={cn("h-14 w-14 rounded-full p-0", primaryClayButtonClass)}
                  size="icon"
                  onClick={() => void togglePlayback()}
                  aria-label={playing ? "Pause music" : "Play music"}
                >
                  {playing ? <Pause className="h-7 w-7" /> : <Play className="h-7 w-7" />}
                </Button>
                <Button className={roundClayButtonClass} size="icon" variant="secondary" onClick={() => void playAdjacent(1)} aria-label="Next track">
                  <SkipForward className="h-6 w-6" />
                </Button>
                <Button
                  className={cn(roundClayButtonClass, repeat && primaryClayButtonClass)}
                  size="icon"
                  variant="secondary"
                  onClick={() => setRepeat((value) => !value)}
                  aria-label="Repeat"
                >
                  <Repeat className="h-5 w-5" />
                </Button>
              </div>

              <div className="mt-5 flex items-center gap-3 rounded-2xl border border-white/10 bg-black/18 px-4 py-3">
                <Volume2 className="h-4 w-4 text-cyan" />
                <input
                  className="w-full accent-cyan"
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={volume}
                  onChange={(event) => setVolume(Number(event.target.value))}
                  aria-label="Music volume"
                />
                <span className="w-10 text-right text-xs font-bold text-muted">{Math.round(volume * 100)}%</span>
              </div>
            </div>
          </section>

          <section className="relative p-4 sm:p-6">
            <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.22em] text-cyan">
                  <ListMusic className="h-4 w-4" />
                  Library
                </p>
                <p className="mt-1 text-sm text-muted">4 ambient sounds + 6 focus music tracks + {uploadedCount} saved upload{uploadedCount === 1 ? "" : "s"}.</p>
              </div>
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void uploadTrack(file);
                    event.currentTarget.value = "";
                  }}
                />
                <Button
                  className={cn(
                    "h-12 w-full min-w-[150px] justify-center whitespace-nowrap rounded-full px-5 text-white sm:w-auto",
                    primaryClayButtonClass
                  )}
                  variant="secondary"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  <Upload className="h-4 w-4" />
                  {uploading ? "Uploading..." : "Add music"}
                </Button>
              </div>
            </div>

            <div className="focus-scrollbar max-h-[48vh] space-y-3 overflow-y-auto pr-1 lg:max-h-[56vh]">
              {tracks.map((track) => {
                const active = track.id === activeTrack.id;
                return (
                  <button
                    key={track.id}
                    type="button"
                    onClick={() => void playTrack(track.id)}
                    className={cn(
                      "group flex w-full items-center justify-between gap-4 rounded-3xl border p-4 text-left transition",
                      active
                        ? "border-cyan/45 bg-cyan/12 shadow-[0_18px_48px_rgba(37,99,235,0.22)]"
                        : "border-white/10 bg-white/[0.045] hover:border-white/20 hover:bg-white/[0.075]"
                    )}
                  >
                    <div className="flex min-w-0 items-center gap-4">
                      <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/10 bg-black/18 text-sm font-extrabold", active && "border-cyan/35 text-cyan")}>
                        {track.kind === "upload" || (track.kind === "builtin" && track.category === "song") ? (
                          <Music2 className="h-5 w-5" />
                        ) : (
                          <Disc3 className="h-5 w-5" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-display text-lg font-extrabold">{track.title}</p>
                        <p className="truncate text-xs text-muted">{track.source} / {track.mood}</p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="hidden rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs font-bold text-muted sm:inline-flex">
                        {formatTime(track.durationSeconds)}
                      </span>
                      {track.kind === "upload" ? (
                        <span
                          role="button"
                          tabIndex={0}
                          aria-label="Delete uploaded music"
                          onClick={(event) => {
                            event.stopPropagation();
                            void deleteUploadedTrack(track);
                          }}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              event.stopPropagation();
                              void deleteUploadedTrack(track);
                            }
                          }}
                          className={cn(
                            "inline-flex h-10 w-10 items-center justify-center rounded-full border text-danger transition",
                            clayButtonClass,
                            "border-danger/25 bg-danger/10 hover:bg-danger/20"
                          )}
                        >
                          <Trash2 className="h-4 w-4" />
                        </span>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
