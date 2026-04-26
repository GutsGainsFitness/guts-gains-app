/**
 * Referral helpers — read/store/normalise invite codes.
 *
 * Flow:
 *  1. Visitor lands with `?ref=PABLO7K` → captureRefFromUrl() persists in localStorage (30d).
 *  2. Public forms (intake, booking, checkout) call getStoredRef() to prefill the visible referrer field.
 *  3. After successful submit, registerInvite() writes a row in `public.invites` so the inviter gets credit.
 */

import { supabase } from "@/integrations/supabase/client";

const STORAGE_KEY = "gg_ref_code";
const STORAGE_TS_KEY = "gg_ref_code_ts";
const TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export function normaliseRefCode(raw: string | null | undefined): string {
  return (raw ?? "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12);
}

/** Read ?ref= from current URL and persist it (called once on app boot). */
export function captureRefFromUrl(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get("ref");
    if (!raw) return null;
    const code = normaliseRefCode(raw);
    if (!code) return null;
    window.localStorage.setItem(STORAGE_KEY, code);
    window.localStorage.setItem(STORAGE_TS_KEY, String(Date.now()));
    return code;
  } catch {
    return null;
  }
}

/** Get a previously stored ref code (returns null if expired or missing). */
export function getStoredRef(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const code = window.localStorage.getItem(STORAGE_KEY);
    const ts = Number(window.localStorage.getItem(STORAGE_TS_KEY) ?? 0);
    if (!code) return null;
    if (!ts || Date.now() - ts > TTL_MS) {
      window.localStorage.removeItem(STORAGE_KEY);
      window.localStorage.removeItem(STORAGE_TS_KEY);
      return null;
    }
    return code;
  } catch {
    return null;
  }
}

/** Resolve a code to an inviter user_id via the security-definer SQL function. */
export async function resolveInviterUserId(code: string): Promise<string | null> {
  const clean = normaliseRefCode(code);
  if (!clean) return null;
  const { data, error } = await supabase.rpc("resolve_invite_code", { _code: clean });
  if (error || !data) return null;
  return data as unknown as string;
}

/** Register an invite row tied to a referral code. Silent on failure (best-effort). */
export async function registerInvite(opts: {
  code: string;
  inviteType: "intake" | "purchase";
  inviteeName?: string | null;
  inviteeEmail?: string | null;
  sourceIntakeId?: string | null;
  sourceBookingId?: string | null;
  sourcePurchaseId?: string | null;
  /** When true, mark immediately as confirmed (e.g. after successful payment). Defaults: intake=pending, purchase=confirmed. */
  confirmed?: boolean;
}): Promise<void> {
  const inviterUserId = await resolveInviterUserId(opts.code);
  if (!inviterUserId) return;
  const status =
    typeof opts.confirmed === "boolean"
      ? (opts.confirmed ? "confirmed" : "pending")
      : opts.inviteType === "purchase"
        ? "confirmed"
        : "pending";
  await supabase.from("invites").insert({
    inviter_user_id: inviterUserId,
    invitee_email: opts.inviteeEmail ?? null,
    invitee_name: opts.inviteeName ?? null,
    invite_type: opts.inviteType,
    status,
    source_intake_id: opts.sourceIntakeId ?? null,
    source_booking_id: opts.sourceBookingId ?? null,
    source_purchase_id: opts.sourcePurchaseId ?? null,
    confirmed_at: status === "confirmed" ? new Date().toISOString() : null,
  });
}

/** Build a shareable invite link for a given code. */
export function buildInviteUrl(code: string): string {
  const origin =
    typeof window !== "undefined" && window.location?.origin
      ? window.location.origin
      : "https://gutsgainsfitness.com";
  return `${origin}/?ref=${encodeURIComponent(normaliseRefCode(code))}`;
}
