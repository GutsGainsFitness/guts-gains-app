import { useCallback, useEffect, useRef, useState } from "react";
import { requestKeepAwake, type KeepAwakeHandle } from "@/lib/native";

/**
 * Keep the device screen awake.
 *
 * - In a browser: uses the Screen Wake Lock API (`navigator.wakeLock`).
 *   Browsers automatically release the wake lock when the page becomes
 *   hidden (tab switched, screen locked, etc.). This hook re-acquires it
 *   as soon as the page becomes visible again, as long as `enabled` is true.
 * - In a Capacitor native app: delegates to `requestKeepAwake()` which
 *   currently relies on normal foreground-app behaviour. A dedicated
 *   keep-awake plugin can be plugged in later without touching callers.
 *
 * Limitations:
 *  - Web Wake Lock requires HTTPS and a user gesture before the first request.
 *  - On the web it only keeps the screen on while the page is visible — it
 *    cannot keep JavaScript running with the screen off. For that you need
 *    a native background mode (Android foreground service / iOS audio
 *    background mode), provided by the Capacitor wrapper.
 *  - Not supported on iOS Safari < 16.4. Older browsers silently no-op.
 */
export function useWakeLock(enabled: boolean) {
  const handleRef = useRef<KeepAwakeHandle | null>(null);
  const [active, setActive] = useState(false);

  const supported =
    typeof navigator !== "undefined" &&
    typeof (navigator as Navigator & { wakeLock?: unknown }).wakeLock !== "undefined";

  const release = useCallback(async () => {
    const h = handleRef.current;
    handleRef.current = null;
    setActive(false);
    if (h) {
      try { await h.release(); } catch { /* ignore */ }
    }
  }, []);

  const request = useCallback(async () => {
    if (handleRef.current) return; // already held
    const handle = await requestKeepAwake();
    if (!handle) {
      setActive(false);
      return;
    }
    handleRef.current = handle;
    setActive(true);
  }, []);

  // Acquire/release based on `enabled`.
  useEffect(() => {
    if (enabled) {
      void request();
    } else {
      void release();
    }
  }, [enabled, request, release]);

  // Re-acquire when the tab becomes visible again. The browser drops the
  // web Wake Lock on visibility change; the native handle is unaffected
  // but re-requesting is harmless because `request()` is idempotent.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const onVisibility = () => {
      if (document.visibilityState === "visible" && enabled && !handleRef.current) {
        void request();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [enabled, request]);

  // Cleanup on unmount.
  useEffect(() => {
    return () => { void release(); };
  }, [release]);

  return { supported, active };
}
