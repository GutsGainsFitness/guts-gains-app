import { useEffect, useState } from "react";
import splashImage from "@/assets/splash-gutsandgains.jpeg";

/**
 * Brand splash that fades out after the app finishes mounting.
 *
 * Behaviour
 * ---------
 * - Fixed full-viewport overlay (z-50) so it covers any underlying UI while
 *   the dashboard hydrates.
 * - The Guts & Gains secondary logo pulses with a soft red glow to match the
 *   brand palette, giving a launch-app feel similar to native splash screens.
 * - Auto-dismisses after `holdMs` + the fade-out duration. We render the DOM
 *   for a beat after `visible=false` so the CSS opacity transition can play,
 *   then unmount completely (`mounted=false`) so the overlay no longer
 *   intercepts pointer events or keeps the logo image in memory.
 *
 * Why a component (not a static index.html splash)
 * ------------------------------------------------
 * Vite's index.html shows a blank page until the JS bundle parses. A React
 * splash can't replace that pre-hydration gap, but it covers the second,
 * larger gap: route transition + initial data fetch on the dashboard. That's
 * the moment a launching PWA feels "stuck" without a visual.
 */
const BrandSplash = ({ holdMs = 900 }: { holdMs?: number }) => {
  const [visible, setVisible] = useState(true);
  const [mounted, setMounted] = useState(true);

  useEffect(() => {
    // Respect users who don't want motion: skip the pulse + shorten the hold.
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    const hideAt = window.setTimeout(() => setVisible(false), prefersReduced ? 350 : holdMs);
    // 500ms matches the opacity transition below
    const unmountAt = window.setTimeout(() => setMounted(false), (prefersReduced ? 350 : holdMs) + 500);

    return () => {
      window.clearTimeout(hideAt);
      window.clearTimeout(unmountAt);
    };
  }, [holdMs]);

  if (!mounted) return null;

  return (
    <div
      aria-hidden="true"
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-background transition-opacity duration-500 ${
        visible ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
    >
      {/* Soft radial red glow behind the logo */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 50% 45%, hsl(0 72% 51% / 0.25), transparent 55%)",
        }}
      />
      <img
        src={splashImage}
        alt=""
        className="relative w-72 max-w-[70vw] h-auto select-none animate-splash-pulse"
        draggable={false}
      />
    </div>
  );
};

export default BrandSplash;
