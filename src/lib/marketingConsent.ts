/**
 * GDPR/AVG marketing consent helpers.
 *
 * Each call writes a NEW row to `marketing_consents` so we keep a full
 * audit history of what the user agreed to and when. We never overwrite
 * a previous consent — withdrawals are also stored as a fresh row with
 * `granted = false`. This is the only way to legally prove opt-in if a
 * recipient ever complains to the Autoriteit Persoonsgegevens.
 */
import { supabase } from "@/integrations/supabase/client";

export const MARKETING_POLICY_VERSION = "v1-2025-04";

export const MARKETING_CONSENT_TEXT_NL =
  "Ja, Guts & Gains Fitness mag mijn e-mailadres gebruiken om mij af en toe nieuws, " +
  "trainingstips en aanbiedingen te sturen. Ik kan mij op elk moment uitschrijven via " +
  "de unsubscribe-link in elke e-mail of door contact op te nemen via gutsgainsfitness@gmail.com.";

export const MARKETING_CONSENT_TEXT_EN =
  "Yes, Guts & Gains Fitness may use my email address to occasionally send me news, " +
  "training tips and offers. I can unsubscribe at any time via the unsubscribe link " +
  "in every email or by contacting gutsgainsfitness@gmail.com.";

export const MARKETING_CONSENT_TEXT_ES =
  "Sí, Guts & Gains Fitness puede usar mi correo electrónico para enviarme " +
  "ocasionalmente noticias, consejos de entrenamiento y ofertas. Puedo darme de baja " +
  "en cualquier momento mediante el enlace de cancelación en cada correo o " +
  "contactando a gutsgainsfitness@gmail.com.";

export type ConsentSource =
  | "cookie_banner"
  | "signup"
  | "profile"
  | "admin"
  | "unsubscribe_link";

export type ConsentLanguage = "nl" | "en" | "es";

const consentTextFor = (lang: ConsentLanguage): string => {
  if (lang === "en") return MARKETING_CONSENT_TEXT_EN;
  if (lang === "es") return MARKETING_CONSENT_TEXT_ES;
  return MARKETING_CONSENT_TEXT_NL;
};

interface RecordConsentArgs {
  email: string;
  granted: boolean;
  source: ConsentSource;
  language: ConsentLanguage;
  userId?: string | null;
}

/**
 * Record a marketing-email consent decision.
 * Safe to call from anonymous (cookie banner) or authenticated contexts.
 */
export async function recordMarketingConsent({
  email,
  granted,
  source,
  language,
  userId,
}: RecordConsentArgs): Promise<{ ok: boolean; error?: string }> {
  const cleanEmail = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return { ok: false, error: "invalid_email" };
  }

  const { error } = await supabase.from("marketing_consents").insert({
    email: cleanEmail,
    granted,
    source,
    user_id: userId ?? null,
    policy_version: MARKETING_POLICY_VERSION,
    consent_text: consentTextFor(language),
    user_agent:
      typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 500) : null,
    // We deliberately do NOT capture the IP client-side; Postgres can't
    // get the real client IP either. If we ever need it for audit, we'll
    // add an edge function. For now, the user_agent + timestamp + email
    // is the legal minimum for AVG/GDPR.
  });

  if (error) {
    console.error("[marketing-consent] insert failed:", error);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}
