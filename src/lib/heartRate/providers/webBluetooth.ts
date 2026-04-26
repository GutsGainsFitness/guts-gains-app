/**
 * Web Bluetooth provider — wraps the existing `connectHeartRateMonitor`
 * helper so the rest of the app talks to it through the generic
 * `HRProvider` interface. This is the only provider that ships today;
 * everything else in `providers/` is a placeholder waiting for native
 * integration work.
 */
import {
  connectHeartRateMonitor,
  detectBluetoothBlockReason,
  type BluetoothBlockReason,
} from "../../heartRate";
import {
  HRConnectCancelledError,
  type HRAvailability,
  type HRProvider,
  type HRSession,
  type HRUnavailableReason,
} from "../types";

const mapBlockReason = (reason: BluetoothBlockReason): HRUnavailableReason | null => {
  switch (reason) {
    case "ios": return "ios-no-web-bluetooth";
    case "iframe": return "iframe-blocked";
    case "insecure": return "insecure-context";
    case "no-api": return "no-api";
    case null: return null;
  }
};

export const webBluetoothProvider: HRProvider = {
  id: "web-bluetooth",
  kind: "ble-strap",
  labelKey: "app.interval.hr_compat.straps_title",

  availability(): HRAvailability {
    const reason = mapBlockReason(detectBluetoothBlockReason());
    return reason ? { available: false, reason } : { available: true };
  },

  async connect({ onSample, onDisconnect }): Promise<HRSession> {
    try {
      const handle = await connectHeartRateMonitor(
        (bpm) => onSample({ bpm, timestamp: Date.now() }),
        onDisconnect,
      );
      return {
        deviceName: handle.deviceName,
        providerId: "web-bluetooth",
        disconnect: handle.disconnect,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (
        msg.includes("cancelled") ||
        msg.includes("User cancelled") ||
        msg.includes("NotFoundError")
      ) {
        throw new HRConnectCancelledError();
      }
      throw err;
    }
  },
};