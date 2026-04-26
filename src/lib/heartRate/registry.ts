/**
 * Central registry of heart-rate providers.
 *
 * Adding a source: build a new file in `providers/`, export an `HRProvider`,
 * and append it to the array below. No other file in the app needs to
 * change. The compatibility modal renders directly from this list, the
 * connect flow looks up providers by id, and analytics / DB writes use
 * `providerId` as the `hr_source` value.
 */
import type { HRProvider, HRProviderId } from "./types";
import { webBluetoothProvider } from "./providers/webBluetooth";
import {
  appleHealthProvider,
  garminConnectProvider,
  healthConnectProvider,
  polarFlowProvider,
  samsungHealthProvider,
} from "./providers/stubs";

/**
 * Order matters — this is the order shown in the compatibility modal.
 * Available providers come first, then platform-relevant stubs, then the
 * cloud-OAuth ones.
 */
export const HR_PROVIDERS: readonly HRProvider[] = [
  webBluetoothProvider,
  appleHealthProvider,
  healthConnectProvider,
  samsungHealthProvider,
  garminConnectProvider,
  polarFlowProvider,
];

export const getProvider = (id: HRProviderId): HRProvider | undefined =>
  HR_PROVIDERS.find((p) => p.id === id);

/** Providers whose `availability().available` is currently `true`. */
export const getAvailableProviders = (): HRProvider[] =>
  HR_PROVIDERS.filter((p) => p.availability().available);

/** Returns the first available provider, used as the default "connect" target. */
export const getDefaultProvider = (): HRProvider | undefined =>
  getAvailableProviders()[0];