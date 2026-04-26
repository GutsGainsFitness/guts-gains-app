import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

/**
 * Native-feeling swipe-back gesture for mobile.
 *
 * Listens for a horizontal swipe that:
 *   - starts within `edgeWidth` px of the left screen edge
 *   - travels at least `minDistance` px to the right
 *   - stays mostly horizontal (deltaX > 2 * |deltaY|)
 *   - completes within `maxDuration` ms
 *
 * On match, calls `navigate(-1)`.
 *
 * Disabled when:
 *   - viewport is wider than the mobile breakpoint (md: 768px)
 *   - the gesture starts inside an element opted out via [data-no-swipe-back]
 *     (e.g. carousels, sliders, range inputs)
 *   - the user is on the dashboard root `/app` (nothing to go back to inside the app)
 */
export function useSwipeBack(options?: {
  edgeWidth?: number;
  minDistance?: number;
  maxDuration?: number;
}) {
  const navigate = useNavigate();
  const location = useLocation();

  const edgeWidth = options?.edgeWidth ?? 24;
  const minDistance = options?.minDistance ?? 80;
  const maxDuration = options?.maxDuration ?? 600;

  useEffect(() => {
    // Only on mobile-sized viewports
    if (typeof window === "undefined") return;
    if (window.matchMedia("(min-width: 768px)").matches) return;

    // Don't swipe-back from the app root — there's no app-internal "back"
    if (location.pathname === "/app") return;

    let startX = 0;
    let startY = 0;
    let startTime = 0;
    let tracking = false;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const t = e.touches[0];

      // Only start tracking if the touch begins near the left edge
      if (t.clientX > edgeWidth) return;

      // Respect opt-out for elements that need their own horizontal gestures
      const target = e.target as Element | null;
      if (target?.closest("[data-no-swipe-back]")) return;

      startX = t.clientX;
      startY = t.clientY;
      startTime = Date.now();
      tracking = true;
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (!tracking) return;
      tracking = false;

      const t = e.changedTouches[0];
      if (!t) return;

      const dx = t.clientX - startX;
      const dy = Math.abs(t.clientY - startY);
      const dt = Date.now() - startTime;

      const isHorizontal = dx > 2 * dy;
      const isFarEnough = dx >= minDistance;
      const isQuickEnough = dt <= maxDuration;

      if (isHorizontal && isFarEnough && isQuickEnough) {
        navigate(-1);
      }
    };

    const onTouchCancel = () => {
      tracking = false;
    };

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("touchcancel", onTouchCancel, { passive: true });

    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchCancel);
    };
  }, [navigate, location.pathname, edgeWidth, minDistance, maxDuration]);
}
