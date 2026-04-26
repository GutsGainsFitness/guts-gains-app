/**
 * Placeholder providers for sources that need a real native integration.
 *
 * Each one declares itself **unavailable** with reason `"coming-soon"` so
 * the compatibility modal can list it consistently and we can swap the
 * implementation later WITHOUT touching the UI:
 *
 *  - apple-health     → Capacitor + HealthKit plugin (iOS only)
 *  - health-connect   → Capacitor + Google Health Connect (Android 14+)
 *  - garmin-connect   → Garmin Connect IQ OAuth + their REST API
 *  - polar-flow       → Polar AccessLink OAuth + REST API
 *  - samsung-health   → Samsung Health Data SDK (Android, partner approval)
 *
 * Concretely, replacing one of these means: implement `connect()` to open
 * the provider's session (or poll the API), set `availability()` to return
 * `{ available: true }` when the OS / OAuth token allows it, and that's it.
 * The rest of the app already routes samples through `onSample()`.
 */
import { Capacitor } from "@capacitor/core";
import type { HRProvider } from "../types";

const notImplemented = async (): Promise<never> => {
  throw new Error("Provider not implemented yet");
};

const isIOSPlatform = () => {
  try { return Capacitor.getPlatform() === "ios"; } catch { return false; }
};
const isAndroidPlatform = () => {
  try { return Capacitor.getPlatform() === "android"; } catch { return false; }
};

export const appleHealthProvider: HRProvider = {
  id: "apple-health",
  kind: "watch-native",
  labelKey: "app.interval.hr_compat.apple_title",
  availability: () => isIOSPlatform()
    ? { available: false, reason: "coming-soon" }
    : { available: false, reason: "platform-unsupported" },
  connect: notImplemented,
};

export const healthConnectProvider: HRProvider = {
  id: "health-connect",
  kind: "phone-bridge",
  labelKey: "app.interval.hr_compat.wearos_title",
  availability: () => isAndroidPlatform()
    ? { available: false, reason: "coming-soon" }
    : { available: false, reason: "platform-unsupported" },
  connect: notImplemented,
};

export const garminConnectProvider: HRProvider = {
  id: "garmin-connect",
  kind: "watch-cloud",
  labelKey: "app.interval.hr_compat.garmin_title",
  availability: () => ({ available: false, reason: "coming-soon" }),
  connect: notImplemented,
};

export const polarFlowProvider: HRProvider = {
  id: "polar-flow",
  kind: "watch-cloud",
  labelKey: "app.interval.hr_compat.polar_title",
  availability: () => ({ available: false, reason: "coming-soon" }),
  connect: notImplemented,
};

export const samsungHealthProvider: HRProvider = {
  id: "samsung-health",
  kind: "watch-native",
  labelKey: "app.interval.hr_compat.samsung_title",
  availability: () => isAndroidPlatform()
    ? { available: false, reason: "coming-soon" }
    : { available: false, reason: "platform-unsupported" },
  connect: notImplemented,
};