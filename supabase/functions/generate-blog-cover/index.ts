// Generate blog cover image via Lovable AI Gateway and store in Supabase Storage
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

const BUCKET = "blog-covers";

function buildPrompt(title: string, category: string, customPrompt?: string): string {
  if (customPrompt && customPrompt.trim().length > 0) {
    return `Editorial fitness magazine cover photo, 16:9 widescreen composition. ${customPrompt.trim()}. Premium dark aesthetic: matte black background with deep shadows, single crimson red (#E11D2A) accent lighting, cinematic mood. No text, no logos, no watermarks. High contrast, sharp detail, magazine cover quality. Guts & Gains Fitness brand style.`;
  }
  return `Editorial fitness magazine cover photo about "${title}" (category: ${category}). 16:9 widescreen composition. Premium dark aesthetic: matte black background with deep shadows, athletic subject or symbolic gym imagery, single crimson red (#E11D2A) accent lighting, cinematic dramatic mood. No text, no logos, no watermarks. High contrast, sharp detail, magazine cover quality. Guts & Gains Fitness brand style.`;
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

  if (aiResp.status === 429) return { ok: false, reason: "RATE_LIMIT", retryable: true };
  if (aiResp.status === 402) return { ok: false, reason: "PAYMENT_REQUIRED", retryable: false };
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

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60) || "blog";
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

    const { title, category, slug, customPrompt } = await req.json();
    if (!title || typeof title !== "string") return json({ error: "title required" }, 400);

    const prompt = buildPrompt(title, category || "Algemeen", customPrompt);

    let result: GenResult = { ok: false, reason: "INIT", retryable: false };
    for (let attempt = 0; attempt < 3; attempt++) {
      result = await callGateway(prompt);
      if (result.ok) break;
      if (!result.retryable) break;
      await new Promise((r) => setTimeout(r, attempt === 0 ? 2000 : 5000));
    }

    if (!result.ok) return json({ error: result.reason }, 502);

    const [meta, b64] = result.image_url.split(",");
    const contentType = meta.match(/data:([^;]+);/)?.[1] || "image/png";
    const ext = contentType.split("/")[1] || "png";
    const binary = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

    const baseSlug = slugify(slug || title);
    const path = `${baseSlug}-${Date.now()}.${ext}`;

    const { error: upErr } = await admin.storage
      .from(BUCKET)
      .upload(path, binary, { contentType, upsert: false });
    if (upErr) return json({ error: `UPLOAD_${upErr.message}` }, 500);

    const { data: pub } = admin.storage.from(BUCKET).getPublicUrl(path);
    return json({ ok: true, image_url: pub.publicUrl, path });
  } catch (e) {
    console.error("Generate blog cover error", e);
    return json({ error: "EXCEPTION", detail: String(e) }, 500);
  }
});