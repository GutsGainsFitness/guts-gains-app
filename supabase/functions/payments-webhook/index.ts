import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { type StripeEnv, verifyWebhook } from "../_shared/stripe.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

/**
 * Resolve a referral code (e.g. "PABLO7K") to the inviter's user_id.
 * Returns null if code is missing/invalid.
 */
async function resolveInviter(code: string | null | undefined): Promise<string | null> {
  if (!code) return null;
  const clean = String(code).trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12);
  if (!clean) return null;
  const { data } = await supabase.rpc("resolve_invite_code", { _code: clean });
  return (data as string | null) ?? null;
}

/**
 * Best-effort: register a confirmed `purchase` invite + immediately unlock the
 * invite_purchase achievement for the inviter. Idempotent — safe to call twice.
 */
async function creditInviterForPurchase(opts: {
  referrerCode: string | null;
  inviteeEmail: string | null;
  inviteeName: string | null;
  purchaseId: string | null;
}) {
  const inviterUserId = await resolveInviter(opts.referrerCode);
  if (!inviterUserId) {
    console.log("No inviter resolved for referrer_code:", opts.referrerCode);
    return;
  }

  // 1. Insert invite row (skip if same purchase already credited).
  if (opts.purchaseId) {
    const { data: existing } = await supabase
      .from("invites")
      .select("id")
      .eq("source_purchase_id", opts.purchaseId)
      .maybeSingle();
    if (existing) {
      console.log("Invite already exists for purchase:", opts.purchaseId);
    } else {
      const { error: invErr } = await supabase.from("invites").insert({
        inviter_user_id: inviterUserId,
        invitee_email: opts.inviteeEmail,
        invitee_name: opts.inviteeName,
        invite_type: "purchase",
        status: "confirmed",
        source_purchase_id: opts.purchaseId,
        confirmed_at: new Date().toISOString(),
      });
      if (invErr) console.error("Failed to insert invite row:", invErr);
      else console.log("Invite row created (confirmed) for inviter:", inviterUserId);
    }
  }

  // 2. Recount confirmed purchases for inviter and unlock matching tier achievements.
  const { count: purchaseCount } = await supabase
    .from("invites")
    .select("*", { count: "exact", head: true })
    .eq("inviter_user_id", inviterUserId)
    .eq("invite_type", "purchase")
    .eq("status", "confirmed");

  const purchases = purchaseCount ?? 0;
  const tiersToGrant: Array<{ key: string; label: string; reward: string }> = [];
  if (purchases >= 1) tiersToGrant.push({ key: "invite_gold",     label: "Gold Scout",     reward: "Gratis 1-op-1 PT sessie" });
  if (purchases >= 5) tiersToGrant.push({ key: "invite_platinum", label: "Platinum Mogul", reward: "Merch pack + 3 PT sessies" });

  if (tiersToGrant.length > 0) {
    const { data: existing } = await supabase
      .from("user_achievements")
      .select("achievement_key")
      .eq("user_id", inviterUserId)
      .in("achievement_key", tiersToGrant.map((t) => t.key));
    const have = new Set((existing ?? []).map((r: { achievement_key: string }) => r.achievement_key));
    const toGrant = tiersToGrant.filter((t) => !have.has(t.key));

    if (toGrant.length > 0) {
      const { error: achErr } = await supabase
        .from("user_achievements")
        .insert(toGrant.map((t) => ({ user_id: inviterUserId, achievement_key: t.key })));
      if (achErr) {
        console.error("Failed to unlock invite tier(s):", achErr);
      } else {
        console.log(`Unlocked invite tier(s) ${toGrant.map((t) => t.key).join(", ")} for ${inviterUserId}`);

        // Get inviter name for the admin notification.
        const { data: prof } = await supabase
          .from("profiles")
          .select("naam, email")
          .eq("user_id", inviterUserId)
          .maybeSingle();
        const inviterName = prof?.naam || prof?.email || "Een client";

        // One admin notification per newly-granted tier.
        const notifications = toGrant.map((t) => ({
          type: "invite_tier_unlocked",
          title: `${inviterName} behaalde ${t.label}!`,
          body: `Beloning: ${t.reward}. Neem contact op om uit te delen.`,
          related_user_id: inviterUserId,
          metadata: {
            tier_key: t.key,
            tier_label: t.label,
            reward: t.reward,
            invitee_email: opts.inviteeEmail,
            purchase_count: purchases,
          },
        }));
        const { error: notifErr } = await supabase
          .from("admin_notifications")
          .insert(notifications);
        if (notifErr) console.error("Failed to insert admin notification:", notifErr);
      }
    }
  }
}

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const url = new URL(req.url);
  const env = (url.searchParams.get("env") || "sandbox") as StripeEnv;

  try {
    const event = await verifyWebhook(req, env);
    console.log("Received event:", event.type, "env:", env);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        console.log("Checkout completed:", session.id, "amount:", session.amount_total);

        // Pull referrer_code + product_name from either session.metadata (one-time)
        // or subscription_data.metadata (subscriptions, surfaced via session.metadata fallback).
        const meta = (session.metadata ?? {}) as Record<string, string>;
        const referrerCode = meta.referrer_code || null;
        const productName = meta.product_name || "Onbekend product";
        const customerEmail = session.customer_email || session.customer_details?.email || null;
        const customerName = session.customer_details?.name || null;

        // Store purchase (with referrer_code for audit trail).
        const { data: purchase, error } = await supabase
          .from("purchases")
          .upsert(
            {
              stripe_session_id: session.id,
              product_name: productName,
              amount: session.amount_total || 0,
              currency: session.currency || "eur",
              customer_email: customerEmail,
              status: session.payment_status || "completed",
              environment: env,
              referrer_code: referrerCode,
            },
            { onConflict: "stripe_session_id" },
          )
          .select("id")
          .single();

        if (error) {
          console.error("Failed to store purchase:", error);
        } else {
          console.log("Purchase stored:", purchase?.id);
        }

        // Credit the inviter (best-effort, never throws).
        try {
          await creditInviterForPurchase({
            referrerCode,
            inviteeEmail: customerEmail,
            inviteeName: customerName,
            purchaseId: purchase?.id ?? null,
          });
        } catch (e) {
          console.error("Inviter credit error (non-fatal):", e);
        }
        break;
      }
      default:
        console.log("Unhandled event:", event.type);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Webhook error:", e);
    return new Response("Webhook error", { status: 400 });
  }
});
