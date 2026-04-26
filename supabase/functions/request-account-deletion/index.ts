// Public endpoint that lets people who can no longer log in request a
// manual deletion of their account. We accept the request from anonymous
// callers and write a row into `admin_notifications` using the service
// role so an admin can process it. We never confirm whether the email
// belongs to an existing account, to avoid leaking that information.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface DeletionRequestPayload {
  email?: unknown;
  name?: unknown;
  reason?: unknown;
  // honeypot field — bots often fill every input. Real users won't see it.
  website?: unknown;
}

const isString = (v: unknown): v is string => typeof v === "string";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: DeletionRequestPayload;
  try {
    body = (await req.json()) as DeletionRequestPayload;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Honeypot — if filled, silently pretend success.
  if (isString(body.website) && body.website.trim().length > 0) {
    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const email = isString(body.email) ? body.email.trim().toLowerCase() : "";
  const name = isString(body.name) ? body.name.trim().slice(0, 200) : "";
  const reason = isString(body.reason) ? body.reason.trim().slice(0, 1000) : "";

  // Basic email validation — keep it small to minimize cold-start.
  // (Single-escape the regex; double escapes would match literal \s/\..)
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 320;
  if (!emailOk) {
    return new Response(
      JSON.stringify({ error: "Geldig e-mailadres is verplicht" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  // ---- Rate limiting: max 3 requests per IP per hour ----
  // We hash the IP so we never store raw addresses (privacy-friendly).
  const rawIp =
    req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";
  const ipHashBuf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(rawIp),
  );
  const ipHash = Array.from(new Uint8Array(ipHashBuf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count: recentCount } = await admin
    .from("deletion_request_rate_limits")
    .select("id", { count: "exact", head: true })
    .eq("ip_hash", ipHash)
    .gte("created_at", oneHourAgo);

  if ((recentCount ?? 0) >= 3) {
    return new Response(
      JSON.stringify({
        error:
          "Te veel verzoeken vanaf dit adres. Probeer het over een uur opnieuw of neem contact op via gutsgainsfitness@gmail.com.",
      }),
      {
        status: 429,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "Retry-After": "3600",
        },
      },
    );
  }

  // Best-effort cleanup of stale rows (non-blocking).
  admin
    .from("deletion_request_rate_limits")
    .delete()
    .lt("created_at", oneHourAgo)
    .then(({ error: cleanupErr }) => {
      if (cleanupErr) {
        console.warn(
          "[request-account-deletion] cleanup failed:",
          cleanupErr.message,
        );
      }
    });

  // Record this attempt before the insert so concurrent requests count too.
  await admin
    .from("deletion_request_rate_limits")
    .insert({ ip_hash: ipHash });

  const { error } = await admin.from("admin_notifications").insert({
    type: "account_deletion_request",
    title: `Verwijderverzoek: ${email}`,
    body: reason || "(Geen reden opgegeven)",
    metadata: {
      email,
      name: name || null,
      submitted_at: new Date().toISOString(),
      // Capture the user agent so the admin can spot obvious bot traffic.
      user_agent: req.headers.get("user-agent") ?? null,
    },
  });

  if (error) {
    console.error("[request-account-deletion] insert failed:", error);
    return new Response(
      JSON.stringify({ error: "Kon verzoek niet opslaan" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  // Fire-and-forget admin notification email via Lovable's own email
  // infrastructure (send-transactional-email). The template's `to` field
  // forces delivery to the site owner regardless of recipientEmail.
  // We don't block the response on email delivery — the DB insert is the
  // source of truth and the admin will see the request in /admin/klanten.
  try {
    // We call send-transactional-email via raw fetch instead of
    // supabase.functions.invoke() because the JS client overrides the
    // Authorization header with the anon key, which the gateway rejects
    // with UNAUTHORIZED_INVALID_JWT_FORMAT. A direct fetch lets us send
    // the service role key as a Bearer JWT, which the gateway accepts.
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    // send-transactional-email runs with verify_jwt=true and the gateway
    // expects a JWT-format token. The new Supabase signing-keys system
    // ships the service role as a non-JWT secret key, so we use the anon
    // key (which IS a JWT) as the Bearer. The anon key is safe to use
    // here — it only authorises the gateway hop; the called function
    // does its own work with its own service role key.
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const emailResp = await fetch(
      `${supabaseUrl}/functions/v1/send-transactional-email`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${anonKey}`,
          apikey: anonKey,
        },
        body: JSON.stringify({
          templateName: "account-deletion-request",
          // Recipient is overridden by the template's fixed `to` address,
          // but we still pass a value to satisfy the function's contract.
          recipientEmail: "gutsgainsfitness@gmail.com",
          idempotencyKey: `account-deletion-${ipHash}-${Date.now()}`,
          templateData: {
            email,
            name: name || undefined,
            reason: reason || undefined,
          },
        }),
      },
    );
    if (!emailResp.ok) {
      const errText = await emailResp.text().catch(() => "");
      console.error(
        "[request-account-deletion] send-transactional-email failed:",
        emailResp.status,
        errText,
      );
    }
  } catch (emailErr) {
    console.error("[request-account-deletion] Email error:", emailErr);
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
