/**
 * delete-account
 *
 * GDPR / Play Store-compliant hard delete of the calling user's data.
 *
 * Why an edge function:
 * - Removing rows from tables the user technically can't directly DELETE
 *   from (e.g. user_roles, user_achievements) requires service role.
 * - Removing files from the private `progress-photos` storage bucket
 *   needs admin privileges to clean up reliably.
 * - Deleting the auth.users row is admin-only and we want it to happen
 *   atomically with the data wipe, otherwise an orphan auth user stays
 *   behind.
 *
 * Security model:
 * - The client sends its own access token in the Authorization header.
 * - We verify the token by calling auth.getUser() with an anon client.
 * - The user can only ever delete THEIR OWN account — the user_id we
 *   wipe is taken from the verified JWT, never from the request body.
 *
 * Tables wiped (alphabetical, matching the project schema):
 *   body_measurements, invite_codes, invites (as inviter), progress_photos,
 *   pt_sessions, rank_history, runs, user_achievements, user_ranks,
 *   user_roles, workout_plans (user-owned), workout_sessions, profile.
 *
 * Tables intentionally LEFT in place (anonymized records, not personal):
 *   - intake_requests / pt_bookings / purchases — historical business records,
 *     identified only by email/booking ID, no auth foreign key. Pablo needs
 *     these for accounting and to honour pre-paid sessions even after the
 *     user deletes their app account.
 *   - admin_notifications — internal log only.
 *   - workout_set_logs — cascades automatically when workout_sessions rows
 *     are deleted (RLS policy joins via session_id) BUT there is no FK,
 *     so we explicitly delete by session_id list to avoid orphans.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // 1. Verify the caller via their JWT — never trust a user_id in the body
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!token) return json(401, { error: "Missing Authorization header" });

    const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userData, error: userErr } = await supabaseAuth.auth.getUser(token);
    if (userErr || !userData.user) return json(401, { error: "Invalid session" });

    const userId = userData.user.id;
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 2. Wipe storage objects (progress-photos bucket is private and uses
    //    the user_id as the first folder segment).
    try {
      const { data: photos } = await admin
        .from("progress_photos")
        .select("storage_path")
        .eq("user_id", userId);
      const paths = (photos ?? []).map((p) => p.storage_path).filter(Boolean) as string[];
      if (paths.length > 0) {
        const { error: storageErr } = await admin.storage.from("progress-photos").remove(paths);
        if (storageErr) console.warn("[delete-account] storage cleanup warning:", storageErr.message);
      }
    } catch (e) {
      console.warn("[delete-account] storage step skipped:", (e as Error).message);
    }

    // 3. Delete workout_set_logs first by joining via the user's sessions
    //    (no FK cascade exists, so we wipe them explicitly).
    const { data: sessions } = await admin
      .from("workout_sessions")
      .select("id")
      .eq("user_id", userId);
    const sessionIds = (sessions ?? []).map((s) => s.id);
    if (sessionIds.length > 0) {
      await admin.from("workout_set_logs").delete().in("session_id", sessionIds);
    }

    // 4. Wipe all user-scoped rows. Order chosen so that nothing references
    //    a deleted parent row in the middle of the operation.
    const tables: { name: string; column: string }[] = [
      { name: "workout_sessions", column: "user_id" },
      { name: "workout_plans", column: "user_id" }, // user-owned only; premade plans have user_id IS NULL
      { name: "body_measurements", column: "user_id" },
      { name: "progress_photos", column: "user_id" },
      { name: "pt_sessions", column: "user_id" },
      { name: "runs", column: "user_id" },
      { name: "rank_history", column: "user_id" },
      { name: "user_ranks", column: "user_id" },
      { name: "user_achievements", column: "user_id" },
      { name: "invite_codes", column: "user_id" },
      { name: "invites", column: "inviter_user_id" },
      { name: "client_packages", column: "user_id" },
      { name: "user_roles", column: "user_id" },
      { name: "profiles", column: "user_id" },
    ];

    for (const t of tables) {
      const { error } = await admin.from(t.name).delete().eq(t.column, userId);
      if (error) {
        console.error(`[delete-account] failed to wipe ${t.name}:`, error.message);
        return json(500, { error: `Failed to delete ${t.name}: ${error.message}` });
      }
    }

    // 5. Finally remove the auth user — this invalidates all their sessions.
    const { error: authDelErr } = await admin.auth.admin.deleteUser(userId);
    if (authDelErr) {
      console.error("[delete-account] auth.admin.deleteUser failed:", authDelErr.message);
      return json(500, { error: `Failed to delete auth user: ${authDelErr.message}` });
    }

    return json(200, { success: true });
  } catch (e) {
    console.error("[delete-account] unexpected error:", e);
    return json(500, { error: (e as Error).message ?? "Unknown error" });
  }
});
