/**
 * Privacy-vriendelijke CTA tracking.
 *
 * - Geen cookies, geen IP, geen user-agent — past bij ons privacybeleid.
 * - Klikken worden anoniem gelogd in de tabel `cta_events`.
 * - Sendt fire-and-forget zodat het nooit een navigatie blokkeert.
 */
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useRef } from "react";

export type CtaId =
  // Hero
  | "hero.intake"
  | "hero.pricing"
  | "hero.open_app"
  // Navbar
  | "navbar.intake.desktop"
  | "navbar.intake.mobile"
  | "navbar.app.desktop"
  | "navbar.app.mobile"
  // App features
  | "appfeat.signup"
  | "appfeat.open_app"
  | "appfeat.faq.intake"
  | "appfeat.faq.pricing"
  | "appfeat.faq.login"
  | "appfeat.bottom.login"
  // Pricing
  | "pricing.intake_cta"
  | "pricing.checkout"
  // Promo banner
  | "promo.app_signup";

/**
 * Bepaalt de viewport-variant (mobile/tablet/desktop) aan de hand van breedte.
 * Tailwind-achtige breakpoints: <768 mobile, 768-1023 tablet, ≥1024 desktop.
 */
function getViewportVariant(): "mobile" | "tablet" | "desktop" | null {
  if (typeof window === "undefined") return null;
  const w = window.innerWidth;
  if (w < 768) return "mobile";
  if (w < 1024) return "tablet";
  return "desktop";
}

function getOrientation(): "portrait" | "landscape" | null {
  if (typeof window === "undefined") return null;
  return window.innerHeight >= window.innerWidth ? "portrait" : "landscape";
}

function buildPayload(ctaId: CtaId, metadata?: Record<string, unknown>) {
  const variant = getViewportVariant();
  // Voeg automatisch variant + oriëntatie toe zodat we per device-type CTR kunnen meten.
  // Bestaande metadata mag dit overrulen.
  const enrichedMetadata: Record<string, unknown> = {
    variant,
    orientation: getOrientation(),
    ...(metadata ?? {}),
  };
  return {
    cta_id: ctaId,
    page_path:
      typeof window !== "undefined"
        ? window.location.pathname + window.location.hash
        : "",
    referrer:
      typeof document !== "undefined" && document.referrer
        ? document.referrer.slice(0, 500)
        : null,
    language:
      typeof document !== "undefined"
        ? document.documentElement.lang || null
        : null,
    viewport_width:
      typeof window !== "undefined" ? window.innerWidth : null,
    metadata: enrichedMetadata,
  };
}

export function trackCta(ctaId: CtaId, metadata?: Record<string, unknown>) {
  // Best-effort, never throw, never block the click.
  try {
    void supabase
      .from("cta_events" as never)
      .insert(buildPayload(ctaId, metadata) as never);
  } catch {
    // swallow
  }
}

/**
 * Per pageview, dedupliceer impressies per CTA om dubbele tellingen
 * te voorkomen wanneer een CTA bijvoorbeeld in en uit beeld scrollt.
 */
const loggedImpressions =
  typeof window !== "undefined"
    ? ((window as unknown as { __ggCtaImpressions?: Set<string> }).__ggCtaImpressions ??=
        new Set<string>())
    : new Set<string>();

export function trackCtaImpression(
  ctaId: CtaId,
  metadata?: Record<string, unknown>,
) {
  try {
    // Dedupe per variant: als gebruiker vanuit mobile naar desktop resized
    // tellen we beide impressies (relevant voor CTR per device).
    const variant = getViewportVariant() ?? "unknown";
    const path =
      typeof window !== "undefined"
        ? window.location.pathname + window.location.hash
        : "";
    const key = `${ctaId}|${variant}|${path}`;
    if (loggedImpressions.has(key)) return;
    loggedImpressions.add(key);
    void supabase
      .from("cta_impressions" as never)
      .insert(buildPayload(ctaId, metadata) as never);
  } catch {
    // swallow
  }
}

/**
 * Hook: registreer een impressie zodra het element ≥50% in beeld is.
 * Eén impressie per CTA per pageview.
 */
export function useCtaImpression<T extends Element>(
  ctaId: CtaId | null | undefined,
  metadata?: Record<string, unknown>,
) {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    if (!ctaId) return;
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      // Fallback: log direct
      if (ctaId) trackCtaImpression(ctaId, metadata);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            trackCtaImpression(ctaId, metadata);
            observer.disconnect();
            break;
          }
        }
      },
      { threshold: [0, 0.5, 1] },
    );
    observer.observe(el);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctaId]);
  return ref;
}
