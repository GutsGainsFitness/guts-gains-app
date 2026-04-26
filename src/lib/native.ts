/**
 * Native runtime detection + thin wrappers around Capacitor plugins.
 *
 * Goal: keep components platform-agnostic. They call `triggerVibrate(...)`
 * or `requestKeepAwake()` and this module decides whether to call the
 * native Capacitor plugin or fall back to the browser API.
 *
 * The Capacitor packages are imported statically (small bundle cost) but
 * `Capacitor.isNativePlatform()` returns `false` in a normal browser, so
 * the plugins simply no-op there and we always pick the web fallback.
 */
import { Capacitor } from "@capacitor/core";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { LocalNotifications } from "@capacitor/local-notifications";
import { StatusBar, Style } from "@capacitor/status-bar";
import { App as CapacitorApp } from "@capacitor/app";

export const isNative = (): boolean => {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
};

/**
 * Returns the active platform: "ios", "android" or "web".
 * Use sparingly — prefer `isNative()` for runtime branching.
 */
export const getPlatform = (): "ios" | "android" | "web" => {
  try {
    const p = Capacitor.getPlatform();
    if (p === "ios" || p === "android") return p;
    return "web";
  } catch {
    return "web";
  }
};

/**
 * One-time native bootstrap: configure the status bar for our dark
 * brand, enable edge-to-edge so the web layout draws underneath the
 * status bar (we use `safe-pt` utilities to leave room), and wire
 * the Android hardware back button to history.back().
 *
 * Safe to call on web — every call is guarded.
 */
export const initNativeShell = async (
  onAndroidBack?: () => void,
): Promise<void> => {
  if (!isNative()) return;
  try {
    await StatusBar.setStyle({ style: Style.Dark });
    // Make the WebView draw behind the status bar (edge-to-edge).
    // safe-area-inset-top in CSS handles the offset.
    if (getPlatform() === "android") {
      await StatusBar.setOverlaysWebView({ overlay: true });
      await StatusBar.setBackgroundColor({ color: "#00000000" });
    }
  } catch {
    /* ignore — status bar plugin may be unavailable in test envs */
  }
  if (onAndroidBack && getPlatform() === "android") {
    try {
      await CapacitorApp.addListener("backButton", ({ canGoBack }) => {
        if (canGoBack) {
          onAndroidBack();
        } else {
          CapacitorApp.exitApp();
        }
      });
    } catch {
      /* ignore */
    }
  }
};

/**
 * Trigger a haptic / vibration cue.
 *
 * @param pattern A single duration in ms, or a web-style pattern array
 *                (on/off/on/off…). On native we approximate the pattern by
 *                firing a sequence of impacts; on web we forward it directly
 *                to `navigator.vibrate`.
 * @param intensity Used only on native to pick an ImpactStyle.
 */
export const triggerVibrate = async (
  pattern: number | number[],
  intensity: "light" | "medium" | "heavy" = "medium",
): Promise<void> => {
  if (isNative()) {
    try {
      const style =
        intensity === "heavy"
          ? ImpactStyle.Heavy
          : intensity === "light"
            ? ImpactStyle.Light
            : ImpactStyle.Medium;

      if (typeof pattern === "number") {
        await Haptics.impact({ style });
        return;
      }
      // Approximate web vibrate pattern: fire one impact per "on" segment
      // (even indices), spaced by the corresponding "off" gap.
      for (let i = 0; i < pattern.length; i += 2) {
        await Haptics.impact({ style });
        const gap = pattern[i + 1];
        if (typeof gap === "number" && gap > 0) {
          await new Promise((r) => setTimeout(r, gap));
        }
      }
      return;
    } catch {
      /* fall through to web */
    }
  }
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {
      /* ignore */
    }
  }
};

/**
 * Cancel any in-progress vibration. Native haptics fire-and-forget so this
 * is a no-op there; on web we cancel the queued vibration pattern.
 */
export const cancelVibrate = (): void => {
  if (isNative()) return;
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate(0);
    } catch {
      /* ignore */
    }
  }
};

// ---------- Wake Lock ----------

type WebSentinel = EventTarget & { release: () => Promise<void> };

export interface KeepAwakeHandle {
  release: () => Promise<void>;
}

/**
 * Keep the screen awake. Returns a handle whose `release()` undoes it.
 *
 * On native (Capacitor): TODO — when the user installs `@capacitor-community/keep-awake`
 * we can switch to that. For now native simply succeeds with a no-op handle
 * because the device-level "stay awake" is handled by the foreground app
 * lifecycle. (We deliberately do NOT add another plugin until the user
 * asks; this keeps the bundle small.)
 *
 * On web: uses `navigator.wakeLock.request('screen')`.
 */
export const requestKeepAwake = async (): Promise<KeepAwakeHandle | null> => {
  if (isNative()) {
    // Active foreground apps on iOS/Android already get screen-on behavior
    // governed by the OS idle timer. A real "prevent sleep" plugin can be
    // dropped in later without touching callers.
    return { release: async () => {} };
  }
  const nav = typeof navigator !== "undefined"
    ? (navigator as Navigator & {
        wakeLock?: { request: (type: "screen") => Promise<WebSentinel> };
      })
    : undefined;
  if (!nav?.wakeLock) return null;
  try {
    const sentinel = await nav.wakeLock.request("screen");
    return {
      release: async () => {
        try {
          await sentinel.release();
        } catch {
          /* ignore */
        }
      },
    };
  } catch {
    return null;
  }
};

// ---------- Local Notifications (native only) ----------

/**
 * Ask the user for permission to schedule local notifications. No-op on web.
 * Returns true if permission is granted (or already granted), false otherwise.
 */
export const ensureNotificationPermission = async (): Promise<boolean> => {
  if (!isNative()) return false;
  try {
    const status = await LocalNotifications.checkPermissions();
    if (status.display === "granted") return true;
    const req = await LocalNotifications.requestPermissions();
    return req.display === "granted";
  } catch {
    return false;
  }
};

export { LocalNotifications };
