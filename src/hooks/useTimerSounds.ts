import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Shared audio engine for all in-app timers (rest timer, interval timer, …).
 *
 * Why a hook instead of inline AudioContext?
 *  - iOS WKWebView (Capacitor) only exposes `webkitAudioContext` on older
 *    versions and ALWAYS starts the context in "suspended" state until the
 *    very first user gesture plays a sound. If the first beep happens after
 *    a setInterval tick (i.e. NOT inside a click handler), iOS silently
 *    drops it — which is exactly why timers work on desktop but stay mute
 *    inside the native app.
 *  - We solve it by exposing `unlock()`. Components must call this from the
 *    same synchronous click/tap handler that starts the timer. After unlock
 *    the context stays running for the rest of the session.
 *
 * Audio specs follow mem://design/timer-sounds (RestTimer is source of truth):
 *   peak gain = (volume / 100) * 0.6
 *   hold peak for dur*0.7s, then exponential ramp to 0.001 at dur s.
 */
export function useTimerSounds(opts: {
  soundOnRef: React.MutableRefObject<boolean>;
  volumeRef: React.MutableRefObject<number>; // 0-100
}) {
  const ctxRef = useRef<AudioContext | null>(null);
  const silentAudioRef = useRef<HTMLAudioElement | null>(null);
  const unlockedRef = useRef(false);
  // Track every oscillator we've scheduled into the future so reset() /
  // cancel can stop them deterministically. Using a Set so individual
  // entries can be removed when they finish naturally (onended).
  const scheduledRef = useRef<Set<OscillatorNode>>(new Set());
  // Reactive mirror of `unlockedRef` so components can render an
  // "Audio active / blocked" indicator. We expose the ref AND the state
  // because the hot path (beep) reads the ref to avoid re-renders, while
  // the UI uses the state for declarative rendering.
  const [unlocked, setUnlocked] = useState(false);

  const getCtx = useCallback((): AudioContext | null => {
    if (typeof window === "undefined") return null;
    if (ctxRef.current) return ctxRef.current;
    const Ctor =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return null;
    try {
      ctxRef.current = new Ctor();
      return ctxRef.current;
    } catch {
      return null;
    }
  }, []);

  /**
   * Call this from inside a click/tap handler BEFORE the first scheduled beep.
   * Plays a 1-sample silent buffer so iOS marks the context as user-activated.
   *
   * Mobile-web (iOS Safari + Android Chrome) extras:
   *  - Also start a looping silent HTMLAudioElement with `playsInline`. On iOS
   *    this routes our subsequent WebAudio output to the *media* channel
   *    instead of the ringer/notification channel, which means the beeps are
   *    audible even when the device's silent switch is on AND keep playing
   *    when the screen locks during the timer.
   *  - Re-resume the AudioContext on every gesture; mobile browsers suspend
   *    it whenever the tab loses focus (incoming call, app switch, etc.).
   */
  const unlock = useCallback(() => {
    const ctx = getCtx();
    if (!ctx) {
      // No AudioContext available at all — treat as blocked so the UI can
      // show a clear status instead of a stale "active" badge.
      setUnlocked(false);
      return;
    }
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }
    let webAudioOk = false;
    try {
      const buffer = ctx.createBuffer(1, 1, 22050);
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.connect(ctx.destination);
      src.start(0);
      webAudioOk = true;
    } catch {
      /* ignore */
    }
    // Route audio through the media channel on mobile so the silent switch
    // doesn't mute our beeps. We only need to do this once per session.
    if (!unlockedRef.current && typeof Audio !== "undefined") {
      try {
        // Tiny inline silent WAV (~0.05s) — keeps the media session alive
        // without consuming bandwidth or being audible.
        const silent = new Audio(
          "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=",
        );
        silent.loop = true;
        silent.volume = 0;
        // iOS requires playsInline so the audio doesn't take over the
        // fullscreen player UI.
        silent.setAttribute("playsinline", "");
        silent.setAttribute("webkit-playsinline", "");
        // play() returns a Promise; ignore rejection (e.g. autoplay blocked)
        // Track success/failure of media-channel unlock so the UI badge
        // can flip to "blocked" when autoplay policy denies us.
        silent
          .play()
          .then(() => {
            unlockedRef.current = true;
            setUnlocked(true);
          })
          .catch(() => {
            // Media element couldn't start. WebAudio may still work, so
            // only mark blocked if WebAudio also failed.
            if (!webAudioOk) setUnlocked(false);
          });
        silentAudioRef.current = silent;
      } catch {
        /* ignore — fall back to plain WebAudio */
      }
    }
    // If WebAudio worked we can already consider sound unlocked, even if
    // the silent <audio> element is still loading or got blocked.
    if (webAudioOk && ctx.state !== "suspended") {
      unlockedRef.current = true;
      setUnlocked(true);
    }
  }, [getCtx]);

  const beep = useCallback(
    (freq = 1200, dur = 1.5, when?: number) => {
      if (!opts.soundOnRef.current) return;
      const ctx = getCtx();
      if (!ctx) return;
      try {
        if (ctx.state === "suspended") ctx.resume().catch(() => {});
        // Schedule on the AudioContext clock — this is rock-solid even when
        // the rendering thread is jittery (e.g. iOS during a layout/paint
        // pass right after a React state transition).
        // `when` may be in the past if the JS event loop slipped; clamp it
        // to "now" so the beep still plays instead of being silently
        // dropped by the audio thread.
        const startAt = Math.max(when ?? ctx.currentTime, ctx.currentTime);
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = freq;
        const peak =
          (Math.max(0, Math.min(100, opts.volumeRef.current)) / 100) * 0.6;
        gain.gain.setValueAtTime(peak, startAt);
        gain.gain.setValueAtTime(peak, startAt + dur * 0.7);
        gain.gain.exponentialRampToValueAtTime(0.001, startAt + dur);
        osc.start(startAt);
        osc.stop(startAt + dur);
        scheduledRef.current.add(osc);
        osc.onended = () => {
          scheduledRef.current.delete(osc);
          try {
            osc.disconnect();
            gain.disconnect();
          } catch {
            /* ignore */
          }
        };
      } catch {
        /* ignore */
      }
    },
    [getCtx, opts.soundOnRef, opts.volumeRef],
  );

  /**
   * Schedule a beep relative to the current audio clock. Use this for
   * tones that need to land at a precise offset (e.g. a 400ms double-tone)
   * regardless of JS-thread jitter.
   *
   * Returns the absolute AudioContext time the beep is scheduled at, so
   * callers can chain follow-up tones on the same baseline.
   */
  const scheduleBeep = useCallback(
    (offsetSec: number, freq = 1200, dur = 1.5): number => {
      const ctx = getCtx();
      if (!ctx) return 0;
      const at = ctx.currentTime + Math.max(0, offsetSec);
      beep(freq, dur, at);
      return at;
    },
    [beep, getCtx],
  );

  /**
   * Plan a sequence of beeps in one go on the audio clock.
   * Each tuple is [offsetFromNowSec, freq, durSec]. All offsets are
   * relative to the moment scheduleBurst is called, so e.g.
   *   scheduleBurst([[0, 1400, 1.5], [0.4, 1600, 1.5]])
   * gives the exact double-tone the RestTimer uses for phase transitions
   * — but without depending on a JS setTimeout that iOS may delay.
   */
  const scheduleBurst = useCallback(
    (steps: Array<[number, number, number]>): void => {
      const ctx = getCtx();
      if (!ctx) return;
      const base = ctx.currentTime;
      for (const [offset, freq, dur] of steps) {
        beep(freq, dur, base + Math.max(0, offset));
      }
    },
    [beep, getCtx],
  );

  /** Stop every still-pending beep. Used by reset() so a long tail of
   *  scheduled tones doesn't outlive a user-initiated cancel. */
  const cancelScheduled = useCallback(() => {
    const ctx = ctxRef.current;
    const now = ctx?.currentTime ?? 0;
    for (const osc of scheduledRef.current) {
      try {
        osc.stop(now);
      } catch {
        /* already stopped */
      }
    }
    scheduledRef.current.clear();
  }, []);

  // Close audio context on unmount to free resources
  useEffect(() => {
    return () => {
      for (const osc of scheduledRef.current) {
        try { osc.stop(); } catch { /* ignore */ }
      }
      scheduledRef.current.clear();
      try {
        ctxRef.current?.close();
      } catch {
        /* ignore */
      }
      ctxRef.current = null;
      try {
        silentAudioRef.current?.pause();
        silentAudioRef.current = null;
      } catch {
        /* ignore */
      }
      unlockedRef.current = false;
    };
  }, []);

  return { beep, scheduleBeep, scheduleBurst, cancelScheduled, unlock, unlocked };
}
