import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Capacitor config for Guts & Gains Coach.
 *
 * - appId: reverse-DNS bundle identifier used by iOS & Android stores.
 *   Once an app is published to the App Store / Play Store this MUST NOT
 *   change (it identifies the installed app on every device).
 * - appName: shown under the icon on the home screen.
 * - webDir: folder Vite builds into; Capacitor copies this into the
 *   native shells when you run `npx cap sync`.
 * - server.url: enables hot-reload from the Lovable sandbox while
 *   developing on a physical device or emulator. REMOVE this whole
 *   `server` block before producing a real production build for the
 *   stores — otherwise the installed app would load remote code instead
 *   of the bundled assets.
 */
const config: CapacitorConfig = {
  appId: 'app.lovable.54326becdaf944dcbc9e1d0d403cba65',
  appName: 'guts-gains-coach',
  webDir: 'dist',
  server: {
    url: 'https://54326bec-daf9-44dc-bc9e-1d0d403cba65.lovableproject.com?forceHideBadge=true',
    cleartext: true,
  },
};

export default config;
