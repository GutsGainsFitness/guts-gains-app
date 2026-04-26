/**
 * Heart-rate provider abstraction.
 *
 * The app talks to ONE interface (`HRProvider`) and never imports a concrete
 * Bluetooth / Health-Kit / Connect-IQ SDK directly. Adding a new source —
 * Apple Health, Google Health Connect, Garmin Connect IQ, Polar Flow, Samsung
 * Health, or a future first-party cloud sync — means dropping a new file in
 * `providers/` and registering it. The UI, the timer flow, the calorie
 * pipeline, and the workout session screen do not change.
 *
 * Design rules:
 *  - A provider is **stateless** at the module level. `connect()` returns a
 *    `HRSession` whose `disconnect()` cleans everything up.
 *  - Streaming providers (BLE, Apple Watch live workout) push samples via
 *    the `onSample` callback. Polling providers (Health Connect "last known
 *    HR") can call `onSample` on their own cadence.
 *  - `availability()` returns synchronously cheap info so the UI can render
 *    a list of providers WITHOUT awaiting any permissions.
 *  - `kind` describes the physical source so we can show the right copy
 *    (icon, instructions) without hard-coding provider IDs in the UI.
 */

export type HRProviderId =
  | "web-bluetooth"
  | "apple-health"
  | "health-connect"
  | "garmin-connect"
  | "polar-flow"
  | "samsung-health";

/** Physical class of source — drives icon + copy in the UI. */
export type HRProviderKind = "ble-strap" | "watch-native" | "watch-cloud" | "phone-bridge";

/** Why a provider is not currently usable. UI maps this to a localized message. */
export type HRUnavailableReason =
  | "coming-soon"
  | "platform-unsupported" // e.g. Apple Health on Android
  | "ios-no-web-bluetooth"
  | "iframe-blocked"
  | "insecure-context"
  | "no-api"
  | "needs-companion-app";

export interface HRAvailability {
  available: boolean;
  /** Set when `available === false`. */
  reason?: HRUnavailableReason;
}

export interface HRSample {
  bpm: number;
  /** ms since epoch — providers should set this so we can dedupe / interpolate. */
  timestamp: number;
}

export interface HRSession {
  /** Human-readable device label. Shown in the "connected to X" pill. */
  deviceName: string;
  /** Provider that opened this session — used for analytics + the `hr_source` column. */
  providerId: HRProviderId;
  /** Stops streaming and releases all OS resources. Idempotent. */
  disconnect: () => void;
}

export interface HRConnectOptions {
  onSample: (sample: HRSample) => void;
  /** Called when the device drops the connection unexpectedly. */
  onDisconnect?: () => void;
}

export interface HRProvider {
  id: HRProviderId;
  kind: HRProviderKind;
  /**
   * i18n key for the provider's display name. Translations live in
   * `src/i18n/translations.ts` under `app.interval.hr_compat.<id>_title` so
   * we don't ship hard-coded copy here.
   */
  labelKey: string;
  /**
   * Synchronous availability snapshot. Cheap — UI calls this on every render
   * to decide whether to show a "connect" button or a "coming soon" pill.
   */
  availability: () => HRAvailability;
  /**
   * Opens a live HR session. MUST be called from a user-gesture handler
   * (browsers and iOS WKWebView require this for permission prompts).
   */
  connect: (options: HRConnectOptions) => Promise<HRSession>;
}

/**
 * Thrown by `connect()` when the user cancels the system picker.
 * The UI should swallow this silently instead of showing a toast.
 */
export class HRConnectCancelledError extends Error {
  constructor() {
    super("User cancelled the HR device picker");
    this.name = "HRConnectCancelledError";
  }
}