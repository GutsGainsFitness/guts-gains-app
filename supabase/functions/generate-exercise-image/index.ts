// Generate exercise illustration via Lovable AI Gateway and store in Supabase Storage
// Admin-only: requires admin role

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const BUCKET = "exercise-illustrations";

function buildPrompt(name: string, equipment: string, primaryMuscle: string): string {
  // Softer, safety-friendly phrasing — avoids anatomical language that triggers IMAGE_PROHIBITED_CONTENT
  const muscle = primaryMuscle.replace(/_/g, " ");
  return `Editorial fitness poster illustration of a stylized athletic silhouette demonstrating the "${name}" exercise with ${equipment}. Clean vector-style line art, mid-movement pose showing correct technique, side angle. Minimalist composition: matte black background, off-white figure with confident bold outlines, single crimson red (#E11D2A) highlight on the active ${muscle} area. Magazine cover aesthetic, dramatic top-left lighting, no text, no logos, no watermarks, no background scenery, centered figure with generous negative space. High contrast, refined, premium fitness brand. Square 1:1 composition.`;
}

type GenResult =
  | { ok: true; image_url: string }
  | { ok: false; reason: string; retryable: boolean };

async function callGateway(prompt: string): Promise<GenResult> {
  const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash-image",
      messages: [{ role: "user", content: prompt }],
      modalities: ["image", "text"],
    }),
  });

  if (aiResp.status === 429) {
    return { ok: false, reason: "RATE_LIMIT", retryable: true };
  }
  if (aiResp.status === 402) {
    return { ok: false, reason: "PAYMENT_REQUIRED", retryable: false };
  }
  if (!aiResp.ok) {
    const txt = await aiResp.text();
    console.error("AI gateway error", aiResp.status, txt.slice(0, 300));
    return { ok: false, reason: `GATEWAY_${aiResp.status}`, retryable: aiResp.status >= 500 };
  }

  const aiData = await aiResp.json();
  const choice = aiData?.choices?.[0];
  const innerErr = choice?.error;
  if (innerErr?.metadata?.error_type === "rate_limit_exceeded" || innerErr?.code === 429) {
    return { ok: false, reason: "RATE_LIMIT", retryable: true };
  }
  if (choice?.native_finish_reason === "IMAGE_PROHIBITED_CONTENT") {
    return { ok: false, reason: "PROHIBITED_CONTENT", retryable: false };
  }
  const imgUrl: string | undefined = choice?.message?.images?.[0]?.image_url?.url;
  if (!imgUrl || !imgUrl.startsWith("data:image")) {
    console.error("No image", JSON.stringify(aiData).slice(0, 400));
    return { ok: false, reason: "NO_IMAGE", retryable: false };
  }
  return { ok: true, image_url: imgUrl };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const json = (body: Record<string, unknown>, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    if (!LOVABLE_API_KEY) return json({ error: "LOVABLE_API_KEY not configured" }, 500);

    // Auth check — only admins
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "No auth header" }, 401);

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) return json({ error: "Admin only" }, 403);

    const { slug, force = false } = await req.json();
    if (!slug || typeof slug !== "string") return json({ error: "slug required" }, 400);

    const { data: ex, error: exErr } = await admin
      .from("exercises")
      .select("id, slug, name, equipment, primary_muscle, image_url")
      .eq("slug", slug)
      .maybeSingle();
    if (exErr || !ex) return json({ error: "Exercise not found" }, 404);

    if (ex.image_url && !force) {
      return json({ skipped: true, reason: "EXISTS", image_url: ex.image_url });
    }

    const prompt = buildPrompt(ex.name, ex.equipment, ex.primary_muscle);

    // Try up to 3 times for retryable errors (rate limits)
    let result: GenResult = { ok: false, reason: "INIT", retryable: false };
    for (let attempt = 0; attempt < 3; attempt++) {
      result = await callGateway(prompt);
      if (result.ok) break;
      if (!result.retryable) break;
      // Exponential backoff: 2s, 5s
      await new Promise((r) => setTimeout(r, attempt === 0 ? 2000 : 5000));
    }

    if (!result.ok) {
      // Always return 200 so client batch can continue. Front-end inspects `skipped` + `reason`.
      return json({ skipped: true, slug: ex.slug, reason: result.reason });
    }

    // Decode base64 and upload
    const [meta, b64] = result.image_url.split(",");
    const contentType = meta.match(/data:([^;]+);/)?.[1] || "image/png";
    const ext = contentType.split("/")[1] || "png";
    const binary = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

    const path = `${ex.slug}.${ext}`;
    const { error: upErr } = await admin.storage
      .from(BUCKET)
      .upload(path, binary, { contentType, upsert: true });
    if (upErr) return json({ skipped: true, slug: ex.slug, reason: `UPLOAD_${upErr.message}` });

    const { data: pub } = admin.storage.from(BUCKET).getPublicUrl(path);
    // Cache-bust on regenerate
    const publicUrl = `${pub.publicUrl}?v=${Date.now()}`;

    await admin.from("exercises").update({ image_url: publicUrl }).eq("id", ex.id);

    return json({ ok: true, slug: ex.slug, image_url: publicUrl });
  } catch (e) {
    console.error("Generate error", e);
    return json({ skipped: true, reason: "EXCEPTION", detail: String(e) });
  }
});
