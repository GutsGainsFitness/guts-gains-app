import { useEffect, useRef, useState } from "react";
import { Pause, Play, RotateCcw, Plus, Minus, Volume2, VolumeX } from "lucide-react";
import { Database } from "@/integrations/supabase/types";
import { Slider } from "@/components/ui/slider";
import { useTimerSounds } from "@/hooks/useTimerSounds";

type TrainingMode = Database["public"]["Enums"]["training_mode"];

export const REST_PRESETS: Record<TrainingMode, { default: number; range: [number, number]; label: string; description: string }> = {
  hypertrofie: { default: 75, range: [45, 120], label: "HYPERTROFIE", description: "60-90s rust voor spiergroei" },
  powerlift: { default: 210, range: [120, 360], label: "POWERLIFT", description: "3-5 min rust voor max kracht" },
  uithoudingsvermogen: { default: 30, range: [15, 60], label: "UITHOUDING", description: "15-60s rust voor conditie" },
  interval: { default: 30, range: [10, 90], label: "INTERVAL", description: "Korte rust voor HIIT" },
};

type Phase = "idle" | "countdown" | "running";

interface Props {
  mode: TrainingMode;
  defaultRest?: number;
  onComplete?: () => void;
}

const RestTimer = ({ mode, defaultRest, onComplete }: Props) => {
  const preset = REST_PRESETS[mode];
  const [duration, setDuration] = useState(defaultRest ?? preset.default);
  const [remaining, setRemaining] = useState(defaultRest ?? preset.default);
  const [phase, setPhase] = useState<Phase>("idle");
  const [countdownVal, setCountdownVal] = useState(3);
  const intervalRef = useRef<number | null>(null);

  // Sound on/off preference, persisted
  const [soundOn, setSoundOn] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const stored = window.localStorage.getItem("rest_timer_sound_on");
    return stored === null ? true : stored === "true";
  });
  useEffect(() => {
    if (typeof window !== "undefined") window.localStorage.setItem("rest_timer_sound_on", String(soundOn));
  }, [soundOn]);
  const soundOnRef = useRef(soundOn);
  useEffect(() => { soundOnRef.current = soundOn; }, [soundOn]);

  // Volume 0-100, persisted
  const [volume, setVolume] = useState<number>(() => {
    if (typeof window === "undefined") return 70;
    const stored = window.localStorage.getItem("rest_timer_volume");
    const n = stored === null ? 70 : Number.parseInt(stored, 10);
    return Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : 70;
  });
  useEffect(() => {
    if (typeof window !== "undefined") window.localStorage.setItem("rest_timer_volume", String(volume));
  }, [volume]);
  const volumeRef = useRef(volume);
  useEffect(() => { volumeRef.current = volume; }, [volume]);

  // Shared audio engine (handles iOS WKWebView unlock + webkit fallback).
  // scheduleBurst lets us plant the completion double-tone on the audio
  // clock so the 400ms gap is exact even if iOS slips the next JS tick.
  const { beep, scheduleBurst, cancelScheduled, unlock } = useTimerSounds({
    soundOnRef,
    volumeRef,
  });

  useEffect(() => {
    setDuration(defaultRest ?? preset.default);
    setRemaining(defaultRest ?? preset.default);
    setPhase("idle");
  }, [mode, defaultRest, preset.default]);

  // Countdown phase: 3-2-1 beeps before timer starts
  useEffect(() => {
    if (phase !== "countdown") return;
    const id = window.setInterval(() => {
      setCountdownVal((c) => {
        if (c <= 1) {
          // Countdown done → start the actual timer
          beep(1400, 1.5); // high "GO" tone
          setPhase("running");
          return 3;
        }
        beep(1200, 0.3); // short countdown beep
        return c - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [phase]);

  // Main timer
  useEffect(() => {
    if (phase !== "running") {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = window.setInterval(() => {
      setRemaining((r) => {
        // Beeps at 3, 2, 1 seconds remaining
        if (r <= 3 && r >= 2) {
          beep(1200, 0.3);
        }
        if (r <= 1) {
          // Completion — long high double tone
          scheduleBurst([
            [0, 1400, 1.5],
            [0.4, 1600, 1.5],
          ]);
          setPhase("idle");
          onComplete?.();
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
  }, [phase, onComplete, scheduleBurst]);

  const reset = () => {
    setRemaining(duration);
    setPhase("idle");
    setCountdownVal(3);
    cancelScheduled();
  };

  const handleStartPause = () => {
    if (phase === "idle") {
      // CRITICAL on iOS / Capacitor WKWebView: unlock the AudioContext from
      // inside this synchronous user gesture, otherwise every subsequent
      // beep scheduled from setInterval ticks is silently dropped.
      unlock();
      // Start with 3-2-1 countdown
      beep(1200, 0.3);
      setCountdownVal(3);
      setRemaining(duration);
      setPhase("countdown");
    } else if (phase === "countdown") {
      // Cancel countdown
      setPhase("idle");
      setCountdownVal(3);
    } else if (phase === "running") {
      // Pause
      setPhase("idle");
    }
  };

  const adjust = (delta: number) => {
    const next = Math.max(preset.range[0], Math.min(preset.range[1], duration + delta));
    setDuration(next);
    setRemaining(next);
  };

  const isActive = phase === "running" || phase === "countdown";
  const displaySeconds = phase === "countdown" ? countdownVal : remaining;
  const mm = phase === "countdown" ? 0 : Math.floor(remaining / 60);
  const ss = phase === "countdown" ? countdownVal : remaining % 60;
  const pct = phase === "countdown" ? 0 : duration > 0 ? ((duration - remaining) / duration) * 100 : 0;
  const statusLabel = phase === "countdown" ? "KLAAR?" : phase === "running" ? "RUST" : "RUST";

  return (
    <div className="border-2 border-primary/30 bg-card rounded-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs font-heading tracking-[0.3em] text-primary">{preset.label}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{preset.description}</p>
        </div>
        {/* Sound toggle + volume */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSoundOn((s) => !s)}
            className="p-1.5 rounded-sm border border-border hover:border-primary transition-colors"
            title={soundOn ? "Geluid uit" : "Geluid aan"}
          >
            {soundOn ? <Volume2 size={14} className="text-primary" /> : <VolumeX size={14} className="text-muted-foreground" />}
          </button>
          {soundOn && (
            <div className="w-20">
              <Slider
                value={[volume]}
                onValueChange={([v]) => setVolume(v)}
                min={0}
                max={100}
                step={5}
                className="h-5"
              />
            </div>
          )}
        </div>
      </div>

      <div className="relative flex items-center justify-center my-6">
        <svg className="w-40 h-40 -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="45" fill="none" stroke="hsl(var(--muted))" strokeWidth="6" />
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="6"
            strokeDasharray={`${2 * Math.PI * 45}`}
            strokeDashoffset={`${2 * Math.PI * 45 * (1 - pct / 100)}`}
            strokeLinecap="round"
            className="transition-all duration-500"
          />
        </svg>
        <div className="absolute text-center">
          {phase === "countdown" ? (
            <>
              <p className="text-5xl font-heading text-primary tabular-nums animate-pulse">
                {countdownVal}
              </p>
              <p className="text-xs text-primary mt-1 font-heading tracking-wider">KLAAR?</p>
            </>
          ) : (
            <>
              <p className="text-4xl font-heading text-foreground tabular-nums">
                {mm}:{(remaining % 60).toString().padStart(2, "0")}
              </p>
              <p className="text-xs text-muted-foreground mt-1">RUST</p>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center justify-center gap-3 mb-4">
        <button onClick={() => adjust(-15)} disabled={isActive} className="w-10 h-10 border border-border rounded-sm hover:border-primary text-muted-foreground hover:text-primary transition-colors flex items-center justify-center disabled:opacity-40" type="button">
          <Minus size={16} />
        </button>
        <button
          onClick={handleStartPause}
          className="px-6 h-12 bg-primary text-primary-foreground font-heading text-sm tracking-wider rounded-sm flex items-center gap-2 hover:bg-primary/90 transition-colors"
          type="button"
        >
          {isActive ? <Pause size={16} /> : <Play size={16} />}
          {isActive ? "PAUZE" : "START"}
        </button>
        <button onClick={reset} className="w-10 h-10 border border-border rounded-sm hover:border-primary text-muted-foreground hover:text-primary transition-colors flex items-center justify-center" type="button">
          <RotateCcw size={16} />
        </button>
        <button onClick={() => adjust(15)} disabled={isActive} className="w-10 h-10 border border-border rounded-sm hover:border-primary text-muted-foreground hover:text-primary transition-colors flex items-center justify-center disabled:opacity-40" type="button">
          <Plus size={16} />
        </button>
      </div>

      <p className="text-xs text-center text-muted-foreground">
        Rust: <span className="text-foreground tabular-nums">{duration}s</span> • Bereik {preset.range[0]}-{preset.range[1]}s
      </p>
    </div>
  );
};

export default RestTimer;
