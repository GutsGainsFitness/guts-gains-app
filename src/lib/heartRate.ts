// Heart rate utilities: Web Bluetooth + Keytel calorie formula
// Web Bluetooth Heart Rate Service: 0x180D, characteristic: 0x2A37

export interface HRMonitorHandle {
  device: BluetoothDevice;
  disconnect: () => void;
  deviceName: string;
}

/**
 * Connect to a BLE heart rate monitor (Polar, Garmin, Wahoo, Coospo, etc.)
 * Calls onHeartRate(bpm) for every measurement (~1 Hz).
 * Throws if Web Bluetooth not supported, or user cancels picker.
 */
export async function connectHeartRateMonitor(
  onHeartRate: (bpm: number) => void,
  onDisconnect?: () => void
): Promise<HRMonitorHandle> {
  if (!("bluetooth" in navigator)) {
    throw new Error(
      "Web Bluetooth wordt niet ondersteund in deze browser. Gebruik Chrome of Edge op desktop of Android."
    );
  }

  const device = await navigator.bluetooth!.requestDevice({
    filters: [{ services: ["heart_rate"] }],
    optionalServices: ["battery_service"],
  });

  const server = await device.gatt!.connect();
  const service = await server.getPrimaryService("heart_rate");
  const characteristic = await service.getCharacteristic("heart_rate_measurement");

  const handler = (event: Event) => {
    const value = (event.target as BluetoothRemoteGATTCharacteristic).value;
    if (!value) return;
    const bpm = parseHeartRate(value);
    if (bpm > 0) onHeartRate(bpm);
  };

  characteristic.addEventListener("characteristicvaluechanged", handler);
  await characteristic.startNotifications();

  const disconnectHandler = () => {
    onDisconnect?.();
  };
  device.addEventListener("gattserverdisconnected", disconnectHandler);

  return {
    device,
    deviceName: device.name || "Hartslagband",
    disconnect: () => {
      try {
        characteristic.removeEventListener("characteristicvaluechanged", handler);
        device.removeEventListener("gattserverdisconnected", disconnectHandler);
        characteristic.stopNotifications().catch(() => {});
        if (device.gatt?.connected) device.gatt.disconnect();
      } catch {
        // ignore
      }
    },
  };
}

/**
 * Parse heart rate from BLE characteristic value.
 * Spec: first byte is flags. Bit 0 = HR format (0=uint8, 1=uint16).
 */
function parseHeartRate(value: DataView): number {
  const flags = value.getUint8(0);
  const is16Bit = (flags & 0x01) === 1;
  return is16Bit ? value.getUint16(1, true) : value.getUint8(1);
}

/**
 * Keytel formula — exact calorie burn from heart rate.
 * Reference: Keytel et al. 2005, J Sports Sci.
 * Returns kcal burned during the session.
 */
export function caloriesFromHeartRate(params: {
  avgHeartRate: number;
  weightKg: number;
  ageYears: number;
  gender: "man" | "vrouw" | "anders";
  durationSeconds: number;
}): number {
  const { avgHeartRate, weightKg, ageYears, gender, durationSeconds } = params;
  if (avgHeartRate <= 0 || weightKg <= 0 || ageYears <= 0 || durationSeconds <= 0) return 0;

  const minutes = durationSeconds / 60;

  // Keytel formula returns kJ/min, divide by 4.184 for kcal/min
  let kcalPerMin: number;
  if (gender === "man") {
    kcalPerMin =
      (-55.0969 + 0.6309 * avgHeartRate + 0.1988 * weightKg + 0.2017 * ageYears) / 4.184;
  } else {
    // women + others use the female formula (more conservative)
    kcalPerMin =
      (-20.4022 + 0.4472 * avgHeartRate - 0.1263 * weightKg + 0.074 * ageYears) / 4.184;
  }

  return Math.max(0, Math.round(kcalPerMin * minutes));
}

export function isWebBluetoothSupported(): boolean {
  return typeof navigator !== "undefined" && "bluetooth" in navigator;
}

/** True when the page is loaded inside an iframe. */
export function isInIframe(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.self !== window.top;
  } catch {
    // Cross-origin access throws → we are definitely in an iframe
    return true;
  }
}

/**
 * Detect iOS / iPadOS (any browser on iOS uses WebKit and blocks Web Bluetooth).
 */
export function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  const isiPhoneOrIPad = /iPhone|iPad|iPod/i.test(ua);
  // iPadOS 13+ identifies as Mac but exposes touch support
  const isIPadOS =
    ua.includes("Macintosh") &&
    typeof navigator.maxTouchPoints === "number" &&
    navigator.maxTouchPoints > 1;
  return isiPhoneOrIPad || isIPadOS;
}

/**
 * Detect why Web Bluetooth might be unavailable. Returns null when everything
 * looks OK, otherwise a reason code that callers can map to a UI message.
 *
 * "ios" is checked BEFORE "no-api" so the UI can show a platform-specific
 * message instead of the generic "use Chrome" one.
 */
export type BluetoothBlockReason = "no-api" | "iframe" | "insecure" | "ios" | null;

export function detectBluetoothBlockReason(): BluetoothBlockReason {
  if (typeof navigator === "undefined") return "no-api";
  if (isIOS()) return "ios";
  if (!("bluetooth" in navigator)) return "no-api";
  if (typeof window !== "undefined" && window.isSecureContext === false) return "insecure";
  // Inside an iframe Web Bluetooth requires `allow="bluetooth"` on the parent
  // <iframe>. The Lovable preview iframe does not set this, so requestDevice
  // will throw a SecurityError. Treat any iframe as blocked and let the UI
  // suggest opening the app in a new tab.
  if (isInIframe()) return "iframe";
  return null;
}
