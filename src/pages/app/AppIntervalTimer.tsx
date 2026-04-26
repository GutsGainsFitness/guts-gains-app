import { useEffect, useMemo, useRef, useState } from "react";
import { Play, Pause, RotateCcw, Plus, Minus, Save, HeartPulse, Bluetooth, BluetoothOff, Info, Volume2, VolumeX, Vibrate, VibrateOff, Sun, SunDim, CheckCircle2, AlertTriangle } from "lucide-react";
import AppShell from "@/components/app/AppShell";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { calculateCalories, calculateAge } from "@/lib/calories";
import {
  caloriesFromHeartRate,
  isWebBluetoothSupported,
  detectBluetoothBlockReason,
} from "@/lib/heartRate";
import { getDefaultProvider } from "@/lib/heartRate/registry";
import { HRConnectCancelledError, type HRSession } from "@/lib/heartRate/types";
import IntervalInfoModal, { PRESET_INFO, type PresetInfo } from "@/components/app/IntervalInfoModal";
import HRCompatibilityModal from "@/components/app/HRCompatibilityModal";
import { toast } from "sonner";
import { useLanguage } from "@/i18n/LanguageContext";
import { useWakeLock } from "@/hooks/useWakeLock";
import { Slider } from "@/components/ui/slider";
import { triggerVibrate, cancelVibrate } from "@/lib/native";
import { useTimerSounds } from "@/hooks/useTimerSounds";

type Phase = "work" | "rest" | "done" | "idle" | "countdown";

const PRESETS = Object.values(PRESET_INFO);

const AppIntervalTimer = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [work, setWork] = useState(30);
  const [rest, setRest] = useState(30);
  const [rounds, setRounds] = useState(8);
  const [currentRound, setCurrentRound] = useState(0);
  const [phase, setPhase] = useState<Phase>("idle");
  const [remaining, setRemaining] = useState(30);
  const [running, setRunning] = useState(false);
  const [profileWeight, setProfileWeight] = useState(75);
  const [profileAge, setProfileAge] = useState(30);
  const [profileGender, setProfileGender] = useState<"man" | "vrouw" | "anders">("man");
  const [savedHistory, setSavedHistory] = useState<Array<{ name: string; rounds: number; total: number; date: string }>>([]);
  const intervalRef = useRef<number | null>(null);

  // Sound preference, persisted in localStorage
  const [soundOn, setSoundOn] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const stored = window.localStorage.getItem("interval_sound_on");
    return stored === null ? true : stored === "true";
  });
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("interval_sound_on", String(soundOn));
    }
  }, [soundOn]);
  const soundOnRef = useRef(soundOn);
  useEffect(() => { soundOnRef.current = soundOn; }, [soundOn]);

  // Volume preference (0-100), persisted in localStorage. Default 60.
  const [volume, setVolume] = useState<number>(() => {
    if (typeof window === "undefined") return 60;
    const stored = window.localStorage.getItem("interval_volume");
    const n = stored === null ? 60 : Number.parseInt(stored, 10);
    return Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : 60;
  });
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("interval_volume", String(volume));
    }
  }, [volume]);
  const volumeRef = useRef(volume);
  useEffect(() => { volumeRef.current = volume; }, [volume]);

  // Shared audio engine — handles iOS WKWebView unlock (Capacitor) and
  // webkitAudioContext fallback. Without unlock() called from a user
  // gesture, beeps fired from setInterval are silent on native iOS.
  const {
    beep,
    scheduleBurst,
    cancelScheduled,
    unlock,
    unlocked: audioUnlocked,
  } = useTimerSounds({ soundOnRef, volumeRef });

  // Vibration preference, persisted in localStorage. Defaults on when the
  // device supports it. Used in parallel with sound so users with muted
  // phones still get phase cues.
  const [vibrateOn, setVibrateOn] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const stored = window.localStorage.getItem("interval_vibrate_on");
    return stored === null ? true : stored === "true";
  });
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("interval_vibrate_on", String(vibrateOn));
    }
  }, [vibrateOn]);
  const vibrateOnRef = useRef(vibrateOn);
  useEffect(() => { vibrateOnRef.current = vibrateOn; }, [vibrateOn]);

  // Keep-screen-awake preference, persisted in localStorage. Defaults on.
  const [keepAwake, setKeepAwake] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const stored = window.localStorage.getItem("interval_keep_awake");
    return stored === null ? true : stored === "true";
  });
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("interval_keep_awake", String(keepAwake));
    }
  }, [keepAwake]);

  // Hold a screen wake lock while the timer is actively running and the user
  // wants the screen to stay on. Only works while the page is visible — for
  // true screen-off background execution we'd need a native wrapper
  // (Capacitor + a foreground service plugin on Android / audio background
  // mode on iOS).
  const wakeLock = useWakeLock(running && keepAwake);

  const vibrateSupported = typeof navigator !== "undefined" && "vibrate" in navigator;

  /**
   * Trigger device vibration / haptics if enabled.
   * `pattern` is a single duration (ms) or alternating on/off durations.
   * Routes through `triggerVibrate` so we get native Capacitor Haptics
   * inside the iOS/Android shell and `navigator.vibrate` in the browser.
   */
  const vibrate = (pattern: number | number[], intensity: "light" | "medium" | "heavy" = "medium") => {
    if (!vibrateOnRef.current) return;
    void triggerVibrate(pattern, intensity);
  };

  // Heart rate state
  const [currentHR, setCurrentHR] = useState<number | null>(null);
  const [hrSamples, setHrSamples] = useState<number[]>([]);
  const [hrConnected, setHrConnected] = useState(false);
  const [hrDeviceName, setHrDeviceName] = useState<string>("");
  const [hrConnecting, setHrConnecting] = useState(false);
  const hrHandleRef = useRef<HRSession | null>(null);

  // Info modal
  const [infoPreset, setInfoPreset] = useState<PresetInfo | null>(null);
  const [hrHelpOpen, setHrHelpOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("gewicht_kg, geboortedatum, geslacht")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.gewicht_kg) setProfileWeight(Number(data.gewicht_kg));
        const age = calculateAge(data?.geboortedatum ?? null);
        if (age) setProfileAge(age);
        if (data?.geslacht) setProfileGender(data.geslacht);
      });
    // Load past interval sessions
    supabase
      .from("workout_sessions")
      .select("plan_name_snapshot, duration_seconds, session_date")
      .eq("user_id", user.id)
      .eq("training_mode", "interval")
      .order("session_date", { ascending: false })
      .limit(5)
      .then(({ data }) => {
        if (data) {
          setSavedHistory(
            data.map((s) => ({
              name: s.plan_name_snapshot || t("app.interval.default_name"),
              rounds: 0,
              total: s.duration_seconds || 0,
              date: s.session_date,
            }))
          );
        }
      });
  }, [user]);

  // Cleanup HR connection on unmount
  useEffect(() => {
    return () => {
      hrHandleRef.current?.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!running) {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = window.setInterval(() => {
      setRemaining((r) => {
        // Countdown cue on the last 3 seconds of work, rest or pre-start
        // countdown — including the very last second (r === 1). The phase
        // transition tone below plays right after, so the user hears:
        // beep-beep-beep-GO and feels: tap-tap-tap-LONG.
        // Match RestTimer (mem://design/timer-sounds):
        // - Pre-start countdown: korte 0.3s beep per cijfer (3-2-1)
        // - Lopende werk/rust: 1.5s beep op seconden 3 en 2; bij 1 komt
        //   direct de eindtoon dubbeltoon i.p.v. nog een aparte beep.
        if (phase === "countdown" && r <= 3 && r >= 2) {
          beep(1200, 0.3);
          vibrate(80);
        }
        if ((phase === "work" || phase === "rest") && r <= 3 && r >= 2) {
          beep(1200, 1.5);
          vibrate(80);
        }
        if (r <= 1) {
          // Phase transition
          if (phase === "countdown") {
            // Pre-start countdown finished → start first work phase
            beep(1400, 1.5);
            vibrate([200, 80, 200]);
            setPhase("work");
            return work;
          }
          if (phase === "work") {
            // Schedule both transition tones on the AudioContext clock so
            // the 400ms gap is precise even if iOS delays the next JS tick.
            scheduleBurst([
              [0, 1400, 1.5],
              [0.4, 1600, 1.5],
            ]);
            vibrate(300); // long single buzz → rest begins
            setPhase("rest");
            return rest;
          } else if (phase === "rest") {
            const nextRound = currentRound + 1;
            if (nextRound >= rounds) {
              scheduleBurst([
                [0, 1400, 1.5],
                [0.4, 1600, 1.5],
              ]);
              vibrate([300, 100, 300, 100, 500], "heavy"); // session done
              setPhase("done");
              setRunning(false);
              return 0;
            }
            scheduleBurst([
              [0, 1400, 1.5],
              [0.4, 1600, 1.5],
            ]);
            vibrate([200, 80, 200]); // double pulse → next work round
            setCurrentRound(nextRound);
            setPhase("work");
            return work;
          }
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
  }, [running, phase, work, rest, rounds, currentRound, scheduleBurst]);

  const start = () => {
    if (phase === "idle" || phase === "done") {
      setCurrentRound(0);
      // Reset HR samples for fresh session
      setHrSamples([]);
      // CRITICAL on iOS / Capacitor WKWebView: unlock the AudioContext from
      // inside this synchronous user gesture so subsequent beeps fired by
      // the setInterval tick are audible on native iOS.
      unlock();
      // Start tone signals "we're going". The loop ticks once per second and
      // plays a countdown beep when remaining is 3, 2 or 1. Setting remaining
      // to 4 here means the first tick decrements to 3 → beep, then 2 → beep,
      // then 1 → beep, then transitions into the first work phase. Net result:
      // 1 start-tone + 3 countdown beeps + work start-tone.
      beep(1200, 0.3);
      vibrate(150);
      setPhase("countdown");
      setRemaining(4);
    }
    setRunning(true);
  };

  const reset = () => {
    setRunning(false);
    setPhase("idle");
    setCurrentRound(0);
    setRemaining(work);
    setHrSamples([]);
    // Cancel any in-progress web vibration so a long buzz doesn't outlive a reset
    cancelVibrate();
    // Stop any beeps that were already queued on the audio clock — without
    // this a user who hits reset right at a phase transition still hears
    // the second half of the double-tone after pressing the button.
    cancelScheduled();
  };


  const applyPreset = (p: typeof PRESETS[number]) => {
    setWork(p.work);
    setRest(p.rest);
    setRounds(p.rounds);
    reset();
  };

  const handleConnectHR = async () => {
    // IMPORTANT: requestDevice() must be the first thing we await inside this
    // handler so the browser still considers it triggered by a user gesture.
    const reason = detectBluetoothBlockReason();
    if (reason === "iframe") {
      toast.error(t("app.interval.bt_iframe_desc"));
      return;
    }
    if (reason === "insecure") {
      toast.error(t("app.interval.bt_insecure"));
      return;
    }
    if (reason === "no-api") {
      toast.error(t("app.interval.bt_no_api"));
      return;
    }
    setHrConnecting(true);
    try {
      const provider = getDefaultProvider();
      if (!provider) {
        toast.error(t("app.interval.bt_no_api"));
        return;
      }
      const session = await provider.connect({
        onSample: ({ bpm }) => {
          setCurrentHR(bpm);
          setHrSamples((prev) => [...prev, bpm]);
        },
        onDisconnect: () => {
          setHrConnected(false);
          setCurrentHR(null);
          toast.warning(t("app.interval.hr_disconnected_warn"));
        },
      });
      hrHandleRef.current = session;
      setHrConnected(true);
      setHrDeviceName(session.deviceName);
      toast.success(`${t("app.interval.hr_connected")} ${session.deviceName}`);
    } catch (err) {
      // User cancelled the system picker — silent.
      if (err instanceof HRConnectCancelledError) return;
      const msg = err instanceof Error ? err.message : t("app.interval.connect_failed");
      // SecurityError typically means iframe / permissions-policy blocked us
      if (msg.includes("SecurityError") || msg.includes("permissions policy") || msg.includes("disallowed")) {
        toast.error(t("app.interval.bt_iframe_desc"));
        return;
      }
      toast.error(msg);
    } finally {
      setHrConnecting(false);
    }
  };

  const handleDisconnectHR = () => {
    hrHandleRef.current?.disconnect();
    hrHandleRef.current = null;
    setHrConnected(false);
    setCurrentHR(null);
  };

  const totalDuration = (work + rest) * rounds;
  const elapsedDone = phase === "done"
    ? totalDuration
    : currentRound * (work + rest) + (phase === "rest" ? work + (rest - remaining) : phase === "work" ? work - remaining : 0);

  const avgHR = useMemo(
    () => (hrSamples.length > 0 ? Math.round(hrSamples.reduce((a, b) => a + b, 0) / hrSamples.length) : null),
    [hrSamples]
  );
  const maxHR = useMemo(
    () => (hrSamples.length > 0 ? Math.max(...hrSamples) : null),
    [hrSamples]
  );

  const liveCalories = useMemo(() => {
    if (avgHR) {
      return caloriesFromHeartRate({
        avgHeartRate: avgHR,
        weightKg: profileWeight,
        ageYears: profileAge,
        gender: profileGender,
        durationSeconds: elapsedDone,
      });
    }
    return calculateCalories("interval", profileWeight, elapsedDone);
  }, [avgHR, profileWeight, profileAge, profileGender, elapsedDone]);

  const totalEstimatedCalories = useMemo(() => {
    if (avgHR) {
      return caloriesFromHeartRate({
        avgHeartRate: avgHR,
        weightKg: profileWeight,
        ageYears: profileAge,
        gender: profileGender,
        durationSeconds: totalDuration,
      });
    }
    return calculateCalories("interval", profileWeight, totalDuration);
  }, [avgHR, profileWeight, profileAge, profileGender, totalDuration]);

  const saveSession = async () => {
    if (!user || phase !== "done") return;
    const validAvg = avgHR && avgHR >= 30 && avgHR <= 250 ? avgHR : null;
    const validMax = maxHR && maxHR >= 30 && maxHR <= 250 ? maxHR : null;
    const hrSource = validAvg ? "bluetooth" : null;

    // Disconnect BLE on save to free the device
    hrHandleRef.current?.disconnect();
    hrHandleRef.current = null;
    setHrConnected(false);

    const { error } = await supabase.from("workout_sessions").insert({
      user_id: user.id,
      plan_name_snapshot: `Interval ${work}/${rest} × ${rounds}`,
      training_mode: "interval",
      duration_seconds: totalDuration,
      ended_at: new Date().toISOString(),
      avg_heart_rate: validAvg,
      max_heart_rate: validMax,
      hr_source: hrSource,
    });
    if (error) toast.error(t("app.interval.save_failed"));
    else toast.success(t("app.interval.session_saved"));
  };

  const phaseColor = phase === "work" ? "text-primary" : phase === "rest" ? "text-foreground" : phase === "countdown" ? "text-primary" : "text-muted-foreground";
  const phaseLabel = phase === "work" ? t("app.interval.work") : phase === "rest" ? t("app.interval.rest") : phase === "done" ? t("app.interval.done") : phase === "countdown" ? t("app.interval.countdown") : t("app.interval.ready");

  return (
    <AppShell>
      <div className="p-6 md:p-10 max-w-4xl mx-auto">
        <div className="mb-8">
          <p className="text-primary font-heading text-xs tracking-[0.35em] mb-2">{t("app.interval.tag")}</p>
          <h1 className="text-3xl font-heading text-foreground">{t("app.interval.title")}</h1>
          <p className="text-sm text-muted-foreground mt-2">{t("app.interval.desc")}</p>
        </div>

        {/* Sound + vibration + screen toggles */}
        <div className="mb-3 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={() => setSoundOn((s) => !s)}
            className="inline-flex items-center gap-2 px-3 py-1.5 border border-border bg-card hover:border-primary text-foreground font-heading text-[10px] tracking-wider rounded-sm transition-colors"
            aria-pressed={soundOn}
            title={soundOn ? t("app.interval.sound_on") : t("app.interval.sound_off")}
          >
            {soundOn ? (
              <Volume2 size={12} className="text-primary" />
            ) : (
              <VolumeX size={12} className="text-muted-foreground" />
            )}
            {soundOn ? t("app.interval.sound_on") : t("app.interval.sound_off")}
          </button>
          {vibrateSupported && (
            <button
              type="button"
              onClick={() => {
                setVibrateOn((v) => {
                  const next = !v;
                  // Give immediate tactile feedback when turning on
                  if (next && typeof navigator !== "undefined" && "vibrate" in navigator) {
                    try { navigator.vibrate(80); } catch { /* ignore */ }
                  }
                  return next;
                });
              }}
              className="inline-flex items-center gap-2 px-3 py-1.5 border border-border bg-card hover:border-primary text-foreground font-heading text-[10px] tracking-wider rounded-sm transition-colors"
              aria-pressed={vibrateOn}
              title={vibrateOn ? t("app.interval.vibrate_on") : t("app.interval.vibrate_off")}
            >
              {vibrateOn ? (
                <Vibrate size={12} className="text-primary" />
              ) : (
                <VibrateOff size={12} className="text-muted-foreground" />
              )}
              {vibrateOn ? t("app.interval.vibrate_on") : t("app.interval.vibrate_off")}
            </button>
          )}
          {wakeLock.supported && (
            <button
              type="button"
              onClick={() => setKeepAwake((k) => !k)}
              className="inline-flex items-center gap-2 px-3 py-1.5 border border-border bg-card hover:border-primary text-foreground font-heading text-[10px] tracking-wider rounded-sm transition-colors"
              aria-pressed={keepAwake}
              title={keepAwake ? t("app.interval.keep_awake_on") : t("app.interval.keep_awake_off")}
            >
              {keepAwake ? (
                <Sun size={12} className={wakeLock.active ? "text-primary" : "text-foreground"} />
              ) : (
                <SunDim size={12} className="text-muted-foreground" />
              )}
              {keepAwake ? t("app.interval.keep_awake_on") : t("app.interval.keep_awake_off")}
            </button>
          )}
        </div>

        {/* Audio unlock status — only meaningful when sound is on. iOS/Capacitor
            requires a user gesture before WebAudio can play; this badge tells
            the user whether subsequent beeps will actually be audible. */}
        {soundOn && (
          <div
            className={`mb-3 inline-flex items-center gap-2 px-3 py-1.5 border rounded-sm font-heading text-[10px] tracking-wider transition-colors ${
              audioUnlocked
                ? "border-primary/40 bg-primary/5 text-primary"
                : "border-border bg-card text-muted-foreground"
            }`}
            role="status"
            aria-live="polite"
            title={audioUnlocked ? undefined : t("app.interval.audio_blocked_hint")}
          >
            {audioUnlocked ? (
              <>
                <CheckCircle2 size={12} />
                {t("app.interval.audio_active")}
              </>
            ) : (
              <>
                <AlertTriangle size={12} />
                {t("app.interval.audio_blocked")}
              </>
            )}
          </div>
        )}

        {/* Volume slider — only shown when sound is enabled */}
        {soundOn && (
          <div className="mb-6 flex items-center gap-3 px-3 py-2 border border-border bg-card rounded-sm">
            <Volume2 size={14} className="text-muted-foreground shrink-0" />
            <span className="font-heading text-[10px] tracking-wider text-muted-foreground shrink-0">
              {t("app.interval.volume")}
            </span>
            <Slider
              value={[volume]}
              min={0}
              max={100}
              step={5}
              onValueChange={(v) => setVolume(v[0] ?? 0)}
              onValueCommit={() => {
                // Preview tone after the user finishes dragging
                beep(660, 0.2);
              }}
              className="flex-1"
              aria-label={t("app.interval.volume")}
            />
            <span className="font-heading text-[10px] tracking-wider text-foreground tabular-nums w-10 text-right">
              {volume}%
            </span>
          </div>
        )}

        {/* HR connect button */}
        <div className="mb-6">
          {hrConnected ? (
            <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-primary/5 border border-primary/30 rounded-sm">
              <div className="flex items-center gap-2 text-xs">
                <Bluetooth size={14} className="text-primary" />
                <span className="text-foreground font-heading tracking-wider">{hrDeviceName.toUpperCase()}</span>
                <span className="text-muted-foreground">{t("app.interval.hr_kcal_active")}</span>
              </div>
              <button
                onClick={handleDisconnectHR}
                className="text-[10px] font-heading tracking-wider text-muted-foreground hover:text-primary inline-flex items-center gap-1"
              >
                <BluetoothOff size={12} /> {t("app.interval.disconnect")}
              </button>
            </div>
          ) : (() => {
            const blockReason = detectBluetoothBlockReason();
            if (blockReason === "ios") {
              // iOS blocks Web Bluetooth in EVERY browser (Safari, Chrome and
              // Edge for iOS all run on WebKit). Show a clear platform message
              // instead of a dead button.
              return (
                <div className="flex items-start gap-2 px-4 py-3 bg-primary/5 border border-primary/30 rounded-sm">
                  <BluetoothOff size={14} className="text-primary mt-0.5 shrink-0" />
                  <div className="text-xs">
                    <p className="text-foreground font-heading tracking-wider">{t("app.interval.bt_ios_title")}</p>
                    <p className="text-muted-foreground mt-1 leading-relaxed normal-case tracking-normal">
                      {t("app.interval.bt_ios_desc")}
                    </p>
                  </div>
                </div>
              );
            }
            if (blockReason === "iframe") {
              return (
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 px-4 py-3 bg-primary/5 border border-primary/30 rounded-sm">
                  <div className="flex items-start gap-2 text-xs">
                    <BluetoothOff size={14} className="text-primary mt-0.5 shrink-0" />
                    <div>
                      <p className="text-foreground font-heading tracking-wider">{t("app.interval.bt_iframe_title")}</p>
                      <p className="text-muted-foreground mt-0.5 normal-case tracking-normal">{t("app.interval.bt_iframe_desc")}</p>
                    </div>
                  </div>
                  <a
                    href={typeof window !== "undefined" ? window.location.href : "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-primary bg-primary/10 hover:bg-primary/20 text-primary font-heading text-xs tracking-wider rounded-sm transition-colors"
                  >
                    <Bluetooth size={14} /> {t("app.interval.bt_open_new_tab")}
                  </a>
                </div>
              );
            }
            return (
              <div className="flex items-stretch gap-2">
                <button
                  onClick={handleConnectHR}
                  disabled={hrConnecting || blockReason === "no-api"}
                  className="flex-1 md:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-border bg-card hover:border-primary text-foreground font-heading text-xs tracking-wider rounded-sm disabled:opacity-50 transition-colors"
                  title={blockReason === "no-api" ? t("app.interval.bt_help") : ""}
                >
                  <HeartPulse size={14} className="text-primary" />
                  {hrConnecting ? t("app.interval.connecting") : t("app.interval.connect_band")}
                </button>
                <button
                  onClick={() => setHrHelpOpen(true)}
                  className="shrink-0 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 border border-border bg-card hover:border-primary text-muted-foreground hover:text-primary font-heading text-[10px] tracking-wider rounded-sm transition-colors"
                  aria-label={t("app.interval.hr_compat.title")}
                  title={t("app.interval.hr_compat.title")}
                >
                  <Info size={14} />
                  <span className="hidden sm:inline">{t("app.interval.hr_compat.button")}</span>
                </button>
              </div>
            );
          })()}
        </div>

        {/* Presets */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-heading tracking-wider text-muted-foreground">{t("app.interval.presets")}</p>
            <p className="text-[10px] text-muted-foreground inline-flex items-center gap-1">
              <Info size={11} className="text-primary" /> {t("app.interval.tap_for_info")}
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {PRESETS.map((p) => {
              const Icon = p.icon;
              return (
                <div
                  key={p.name}
                  className="relative border border-border bg-card rounded-sm hover:border-primary transition-colors group"
                >
                  <button
                    onClick={() => applyPreset(p)}
                    className="w-full p-3 text-left"
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <Icon size={12} className={p.accentClass} />
                      <p className="text-xs font-heading text-foreground">{p.name}</p>
                    </div>
                    <p className="text-[10px] text-muted-foreground">{p.work}s / {p.rest}s × {p.rounds}</p>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setInfoPreset(p);
                    }}
                    className="absolute top-1.5 right-1.5 p-1 rounded-sm text-muted-foreground hover:text-primary hover:bg-primary/10"
                    aria-label={`${t("app.interval.preset_info_about")} ${p.name}`}
                  >
                    <Info size={12} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <IntervalInfoModal
          preset={infoPreset}
          onClose={() => setInfoPreset(null)}
          onApply={(p) => {
            setWork(p.work);
            setRest(p.rest);
            setRounds(p.rounds);
            reset();
            // CRITICAL: unlock the AudioContext synchronously inside this
            // click handler. On iOS Safari / Capacitor WKWebView the user
            // gesture token is lost the moment we hand control back to the
            // browser (e.g. via setTimeout), and every subsequent beep
            // would be silently dropped.
            unlock();
            // Defer the actual start by one tick so the state updates above
            // (work/rest/rounds/reset) are applied first. unlock() above has
            // already primed the audio path for this gesture.
            setTimeout(() => start(), 100);
          }}
        />

        <HRCompatibilityModal open={hrHelpOpen} onClose={() => setHrHelpOpen(false)} />


        <div className="grid lg:grid-cols-2 gap-6">
          {/* Timer */}
          <div className="border-2 border-primary/30 bg-card p-6 rounded-sm">
            <div className="text-center mb-6">
              <p className={`text-xs font-heading tracking-[0.4em] ${phaseColor}`}>{phaseLabel}</p>
              <p className="text-xs text-muted-foreground mt-1">{t("app.interval.round")} {currentRound + (phase === "done" ? 0 : 1)} / {rounds}</p>
            </div>

            <div className="relative flex items-center justify-center my-6">
              <svg className="w-56 h-56 -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45" fill="none" stroke="hsl(var(--muted))" strokeWidth="6" />
                <circle
                  cx="50" cy="50" r="45" fill="none"
                  stroke={phase === "rest" ? "hsl(var(--foreground))" : "hsl(var(--primary))"}
                  strokeWidth="6"
                  strokeDasharray={`${2 * Math.PI * 45}`}
                  strokeDashoffset={`${2 * Math.PI * 45 * (1 - (phase === "work" ? (work - remaining) / work : phase === "rest" ? (rest - remaining) / rest : phase === "countdown" ? 0 : phase === "done" ? 1 : 0))}`}
                  strokeLinecap="round"
                  className="transition-all duration-500"
                />
              </svg>
              <div className="absolute text-center">
                {phase === "countdown" ? (
                  <>
                    <p className="text-5xl font-heading text-primary tabular-nums animate-pulse">
                      {Math.max(1, Math.min(3, remaining))}
                    </p>
                    <p className="text-xs text-primary mt-1 font-heading tracking-wider">{t("app.interval.countdown")}</p>
                  </>
                ) : (
                  <>
                    <p className="text-4xl font-heading text-foreground tabular-nums">
                      {Math.floor(remaining / 60)}:{(remaining % 60).toString().padStart(2, "0")}
                    </p>
                    <p className={`text-xs mt-1 font-heading tracking-wider ${phaseColor}`}>{phaseLabel}</p>
                  </>
                )}
              </div>
            </div>

            <div className="flex justify-center gap-3">
              <button
                onClick={running ? () => setRunning(false) : start}
                disabled={phase === "done"}
                className="px-8 h-12 bg-primary text-primary-foreground font-heading text-sm tracking-wider rounded-sm flex items-center gap-2 hover:bg-primary/90 disabled:opacity-50"
              >
                {running ? <Pause size={16} /> : <Play size={16} />}
                {running ? t("app.interval.pause") : t("app.interval.start")}
              </button>
              <button onClick={reset} className="w-12 h-12 border border-border rounded-sm hover:border-primary text-muted-foreground hover:text-primary flex items-center justify-center">
                <RotateCcw size={16} />
              </button>
              {phase === "done" && (
                <button onClick={saveSession} className="px-5 h-12 border border-primary text-primary font-heading text-xs tracking-wider rounded-sm hover:bg-primary/10 flex items-center gap-2">
                  <Save size={14} /> {t("app.interval.save")}
                </button>
              )}
            </div>

            <div className="mt-6 pt-6 border-t border-border grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-[10px] font-heading tracking-wider text-muted-foreground">{t("app.interval.total")}</p>
                <p className="text-lg font-heading text-foreground tabular-nums">
                  {Math.floor(totalDuration / 60)}:{(totalDuration % 60).toString().padStart(2, "0")}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-heading tracking-wider text-muted-foreground flex items-center justify-center gap-1">
                  <HeartPulse size={10} className={hrConnected ? "text-primary" : ""} />{t("app.interval.heart_rate")}
                </p>
                <p className="text-lg font-heading text-foreground tabular-nums">
                  {currentHR ?? <span className="text-muted-foreground/40 text-sm">—</span>}
                  {currentHR && <span className="text-[10px] text-muted-foreground ml-1">bpm</span>}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-heading tracking-wider text-muted-foreground">
                  {t("app.interval.kcal")}{!avgHR && <span className="text-muted-foreground/60">~</span>}
                </p>
                <p className="text-lg font-heading text-foreground tabular-nums">
                  {phase === "idle" ? totalEstimatedCalories : liveCalories}
                </p>
              </div>
            </div>
          </div>

          {/* Settings */}
          <div className="space-y-4">
            <div className="border border-border bg-card p-5 rounded-sm">
              <p className="text-xs font-heading tracking-wider text-muted-foreground mb-3">{t("app.interval.settings")}</p>
              <Stepper label={t("app.interval.work_sec")} value={work} setValue={setWork} min={5} max={300} step={5} />
              <Stepper label={t("app.interval.rest_sec")} value={rest} setValue={setRest} min={0} max={300} step={5} />
              <Stepper label={t("app.interval.rounds")} value={rounds} setValue={setRounds} min={1} max={50} step={1} />
            </div>

            {savedHistory.length > 0 && (
              <div className="border border-border bg-card p-5 rounded-sm">
                <p className="text-xs font-heading tracking-wider text-muted-foreground mb-3">{t("app.interval.recent")}</p>
                <div className="space-y-2">
                  {savedHistory.map((h, i) => (
                    <div key={i} className="flex items-center justify-between text-xs py-2 border-b border-border last:border-0">
                      <span className="text-foreground">{h.name}</span>
                      <span className="text-muted-foreground">{Math.floor(h.total / 60)} {t("app.interval.min")}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
};

const Stepper = ({ label, value, setValue, min, max, step }: { label: string; value: number; setValue: (n: number) => void; min: number; max: number; step: number }) => (
  <div className="flex items-center justify-between py-2 border-b border-border last:border-0">
    <p className="text-xs font-heading tracking-wider text-foreground">{label}</p>
    <div className="flex items-center gap-2">
      <button onClick={() => setValue(Math.max(min, value - step))} className="w-8 h-8 border border-border rounded-sm hover:border-primary text-muted-foreground hover:text-primary flex items-center justify-center">
        <Minus size={12} />
      </button>
      <span className="font-heading text-foreground tabular-nums w-10 text-center">{value}</span>
      <button onClick={() => setValue(Math.min(max, value + step))} className="w-8 h-8 border border-border rounded-sm hover:border-primary text-muted-foreground hover:text-primary flex items-center justify-center">
        <Plus size={12} />
      </button>
    </div>
  </div>
);

export default AppIntervalTimer;
