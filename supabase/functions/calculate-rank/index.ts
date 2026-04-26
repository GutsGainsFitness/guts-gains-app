import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

/* Tier definitions for admin notifications. Mirror of src/lib/inviteTiers.ts. */
const INVITE_TIER_META: Record<string, { label: string; reward: string }> = {
  invite_bronze:   { label: "Bronze Recruiter", reward: "Shoutout op Instagram" },
  invite_silver:   { label: "Silver Connector", reward: "Gratis bootcamp sessie" },
  invite_gold:     { label: "Gold Scout",       reward: "Gratis 1-op-1 PT sessie" },
  invite_platinum: { label: "Platinum Mogul",   reward: "Merch pack + 3 PT sessies" },
};

/* ===== Scoring helpers (mirror of src/lib/rank.ts) ===== */
type Tier = "iron" | "bronze" | "silver" | "gold" | "platinum" | "diamond" | "master" | "elite" | "champion" | "olympian";
const TIERS: { key: Tier; min: number }[] = [
  { key: "iron", min: 0 }, { key: "bronze", min: 100 }, { key: "silver", min: 200 },
  { key: "gold", min: 300 }, { key: "platinum", min: 400 }, { key: "diamond", min: 500 },
  { key: "master", min: 600 }, { key: "elite", min: 700 }, { key: "champion", min: 800 },
  { key: "olympian", min: 900 },
];
const TIER_SPAN = 100;
const DIV_SPAN = TIER_SPAN / 3;

function scoreToRank(score: number): { tier: Tier; division: number } {
  const c = Math.max(0, Math.min(1000, score));
  let idx = 0;
  for (let i = TIERS.length - 1; i >= 0; i--) if (c >= TIERS[i].min) { idx = i; break; }
  const into = c - TIERS[idx].min;
  const division = Math.min(2, Math.floor(into / DIV_SPAN)) + 1;
  return { tier: TIERS[idx].key, division };
}

function epley(weight: number, reps: number): number {
  if (!weight || !reps || weight <= 0 || reps <= 0) return 0;
  return weight * (1 + reps / 30);
}

function wilksCoef(bw: number, gender: string): number {
  const male = { a: -216.0475144, b: 16.2606339, c: -0.002388645, d: -0.00113732, e: 7.01863e-6, f: -1.291e-8 };
  const female = { a: 594.31747775582, b: -27.23842536447, c: 0.82112226871, d: -0.00930733913, e: 4.731582e-5, f: -9.054e-8 };
  const k = gender === "vrouw" ? female : male;
  const x = Math.max(40, Math.min(200, bw));
  const denom = k.a + k.b * x + k.c * x * x + k.d * x ** 3 + k.e * x ** 4 + k.f * x ** 5;
  return 500 / denom;
}

function strengthScore(s: number, b: number, d: number, bw: number, gender: string): number {
  const total = (s || 0) + (b || 0) + (d || 0);
  if (total <= 0 || bw <= 0) return 0;
  const wilks = total * wilksCoef(bw, gender);
  return Math.max(0, Math.min(1000, (wilks / 700) * 1000));
}

function xpFromSet(weight: number | null, reps: number | null): number {
  const w = weight ?? 0, r = reps ?? 0;
  if (w > 0 && r > 0) return Math.round(w * r * 0.5);
  if (r > 0) return Math.round(r * 4); // bodyweight
  return 0;
}

function xpToScore(xp: number): number {
  if (xp <= 0) return 0;
  return Math.max(0, Math.min(1000, Math.log10(1 + xp / 50) * 250));
}

/* ===== Big-3 detection by exercise name (case-insensitive substring) ===== */
function classifyLift(name: string): "squat" | "bench" | "deadlift" | null {
  const n = (name || "").toLowerCase();
  if (/(front\s*squat|goblet|bulgarian|hack|pistol|sissy)/.test(n)) return null;
  if (/(incline|decline|close[-\s]?grip|floor|spoto|landmine)\s*bench/.test(n)) return null;
  if (/(romanian|stiff|sumo\s*deficit|deficit|trap[-\s]?bar)/.test(n)) return null;

  if (/(back[-\s]*)?squat/.test(n) && !/front/.test(n)) return "squat";
  if (/bench\s*press/.test(n)) return "bench";
  if (/deadlift/.test(n)) return "deadlift";
  return null;
}

/* ===== Streak helpers ===== */
function dateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function consecutiveDayStreak(dateSet: Set<string>): number {
  // Longest current streak ending today or yesterday (forgive today if not trained yet)
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  let cursor = dateSet.has(dateOnly(today)) ? new Date(today) : (dateSet.has(dateOnly(yesterday)) ? yesterday : null);
  if (!cursor) return 0;
  let streak = 0;
  while (dateSet.has(dateOnly(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function consecutiveWeekStreak(dateSet: Set<string>): number {
  // Count consecutive ISO-weeks (Mon-Sun) with at least one workout, ending this week or last
  const isoWeek = (d: Date): string => {
    const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const day = t.getUTCDay() || 7;
    t.setUTCDate(t.getUTCDate() + 4 - day);
    const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((+t - +yearStart) / 86400000) + 1) / 7);
    return `${t.getUTCFullYear()}-${weekNo}`;
  };
  const weekSet = new Set<string>();
  dateSet.forEach((iso) => weekSet.add(isoWeek(new Date(iso))));
  const today = new Date();
  const lastWeek = new Date();
  lastWeek.setDate(today.getDate() - 7);
  let cursor = weekSet.has(isoWeek(today)) ? new Date(today) : (weekSet.has(isoWeek(lastWeek)) ? lastWeek : null);
  if (!cursor) return 0;
  let streak = 0;
  while (weekSet.has(isoWeek(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 7);
  }
  return streak;
}

function distinctTrainingDaysIn(dateSet: Set<string>, days: number): number {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  let count = 0;
  dateSet.forEach((iso) => {
    if (new Date(iso) >= cutoff) count++;
  });
  return count;
}

/* ===== Achievement evaluation ===== */
interface AchievementContext {
  totalSessions: number;
  totalVolume: number;       // sum of weight*reps across all logged sets
  bestSquat: number;
  bestBench: number;
  bestDead: number;
  bodyweight: number;
  trainingDays: Set<string>; // ISO date strings of days a session ended
  invitedIntakes: number;    // # of invites of type=intake (any status)
  confirmedPurchases: number; // # of invites of type=purchase with status=confirmed
}

function evaluateAchievements(ctx: AchievementContext): string[] {
  const unlocked: string[] = [];

  // Workouts
  if (ctx.totalSessions >= 1)   unlocked.push("workout_first");
  if (ctx.totalSessions >= 10)  unlocked.push("workout_10");
  if (ctx.totalSessions >= 50)  unlocked.push("workout_50");
  if (ctx.totalSessions >= 100) unlocked.push("workout_100");
  if (ctx.totalSessions >= 250) unlocked.push("workout_250");

  // Volume
  if (ctx.totalVolume >= 1000)   unlocked.push("volume_1k");
  if (ctx.totalVolume >= 10000)  unlocked.push("volume_10k");
  if (ctx.totalVolume >= 50000)  unlocked.push("volume_50k");
  if (ctx.totalVolume >= 100000) unlocked.push("volume_100k");
  if (ctx.totalVolume >= 500000) unlocked.push("volume_500k");

  // Streaks
  if (consecutiveDayStreak(ctx.trainingDays) >= 7)  unlocked.push("streak_7");
  if (distinctTrainingDaysIn(ctx.trainingDays, 30) >= 30) unlocked.push("streak_30");
  if (consecutiveWeekStreak(ctx.trainingDays) >= 12) unlocked.push("streak_12w");

  // Strength milestones
  if (ctx.bestBench >= 100) unlocked.push("bench_100");
  if (ctx.bestSquat >= 150) unlocked.push("squat_150");
  if (ctx.bestDead  >= 200) unlocked.push("deadlift_200");
  if (ctx.bodyweight > 0) {
    const big3 = ctx.bestSquat + ctx.bestBench + ctx.bestDead;
    if (big3 >= 2 * ctx.bodyweight) unlocked.push("bw_2x");
    if (big3 >= 3 * ctx.bodyweight) unlocked.push("bw_3x");
  }

  // Social / referral tiers (Bronze/Silver intakes, Gold/Platinum purchases)
  if (ctx.invitedIntakes >= 1)     unlocked.push("invite_bronze");
  if (ctx.invitedIntakes >= 3)     unlocked.push("invite_silver");
  if (ctx.confirmedPurchases >= 1) unlocked.push("invite_gold");
  if (ctx.confirmedPurchases >= 5) unlocked.push("invite_platinum");

  return unlocked;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: auth } },
    });

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userId = userData.user.id;

    // Profile (gender + bodyweight)
    const { data: profile } = await supabase.from("profiles").select("geslacht, gewicht_kg").eq("user_id", userId).maybeSingle();
    const gender = (profile?.geslacht ?? "man") as string;
    const bw = Number(profile?.gewicht_kg ?? 0) || 75;

    // All ended sessions
    const { data: sessions } = await supabase
      .from("workout_sessions")
      .select("id, ended_at")
      .eq("user_id", userId)
      .not("ended_at", "is", null);
    const sessionList = (sessions ?? []) as Array<{ id: string; ended_at: string }>;
    const sessionIds = sessionList.map((s) => s.id);

    // Build training-day set (ISO date strings)
    const trainingDays = new Set<string>();
    for (const s of sessionList) {
      if (s.ended_at) trainingDays.add(s.ended_at.slice(0, 10));
    }

    let bestSquat = 0, bestBench = 0, bestDead = 0, totalXp = 0, totalVolume = 0;

    if (sessionIds.length > 0) {
      const { data: logs } = await supabase
        .from("workout_set_logs")
        .select("weight_kg, reps, exercises(name)")
        .in("session_id", sessionIds);

      for (const l of (logs ?? []) as Array<{ weight_kg: number | null; reps: number | null; exercises: { name: string } | null }>) {
        totalXp += xpFromSet(l.weight_kg, l.reps);
        if (l.weight_kg && l.reps) totalVolume += l.weight_kg * l.reps;
        const cls = classifyLift(l.exercises?.name ?? "");
        if (cls && l.weight_kg && l.reps) {
          const e = epley(l.weight_kg, l.reps);
          if (cls === "squat" && e > bestSquat) bestSquat = e;
          if (cls === "bench" && e > bestBench) bestBench = e;
          if (cls === "deadlift" && e > bestDead) bestDead = e;
        }
      }
      totalXp += sessionIds.length * 75;
    }

    const e1rmScore = strengthScore(bestSquat, bestBench, bestDead, bw, gender);
    const xpScore = xpToScore(totalXp);
    const total = Math.round(e1rmScore * 0.4 + xpScore * 0.6);
    const { tier, division } = scoreToRank(total);

    // Read previous rank for promotion detection
    const { data: prev } = await supabase.from("user_ranks").select("current_tier, current_division").eq("user_id", userId).maybeSingle();
    const promoted =
      prev &&
      ((TIERS.findIndex((t) => t.key === tier as Tier) > TIERS.findIndex((t) => t.key === prev.current_tier as Tier)) ||
        (prev.current_tier === tier && division > prev.current_division));

    const { error: upsertErr } = await supabase.from("user_ranks").upsert(
      {
        user_id: userId,
        current_tier: tier,
        current_division: division,
        total_score: total,
        e1rm_score: Math.round(e1rmScore),
        xp_score: Math.round(xpScore),
        xp_total: totalXp,
        best_squat_e1rm: bestSquat || null,
        best_bench_e1rm: bestBench || null,
        best_deadlift_e1rm: bestDead || null,
        bodyweight_snapshot: bw,
        last_calculated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

    if (upsertErr) {
      return new Response(JSON.stringify({ error: upsertErr.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (promoted && prev) {
      await supabase.from("rank_history").insert({
        user_id: userId,
        from_tier: prev.current_tier,
        from_division: prev.current_division,
        to_tier: tier,
        to_division: division,
        total_score: total,
      });
    }

    /* ===== Invite stats (for social achievements) ===== */
    const [{ count: intakeCount }, { count: purchaseCount }] = await Promise.all([
      supabase
        .from("invites")
        .select("*", { count: "exact", head: true })
        .eq("inviter_user_id", userId)
        .eq("invite_type", "intake"),
      supabase
        .from("invites")
        .select("*", { count: "exact", head: true })
        .eq("inviter_user_id", userId)
        .eq("invite_type", "purchase")
        .eq("status", "confirmed"),
    ]);

    /* ===== Achievement evaluation & unlock ===== */
    const earnedKeys = evaluateAchievements({
      totalSessions: sessionIds.length,
      totalVolume,
      bestSquat,
      bestBench,
      bestDead,
      bodyweight: bw,
      trainingDays,
      invitedIntakes: intakeCount ?? 0,
      confirmedPurchases: purchaseCount ?? 0,
    });

    let newAchievements: string[] = [];
    if (earnedKeys.length > 0) {
      // Find which ones the user doesn't already have
      const { data: existing } = await supabase
        .from("user_achievements")
        .select("achievement_key")
        .eq("user_id", userId);
      const existingKeys = new Set((existing ?? []).map((r: { achievement_key: string }) => r.achievement_key));
      newAchievements = earnedKeys.filter((k) => !existingKeys.has(k));
      if (newAchievements.length > 0) {
        await supabase.from("user_achievements").insert(
          newAchievements.map((k) => ({ user_id: userId, achievement_key: k })),
        );

        // Notify admin for any newly-unlocked invite tier (uses service role
        // so it can write to admin_notifications regardless of caller's role).
        const tierUnlocks = newAchievements.filter((k) => k in INVITE_TIER_META);
        if (tierUnlocks.length > 0) {
          const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
          const { data: prof } = await adminClient
            .from("profiles")
            .select("naam, email")
            .eq("user_id", userId)
            .maybeSingle();
          const inviterName = prof?.naam || prof?.email || "Een client";
          await adminClient.from("admin_notifications").insert(
            tierUnlocks.map((k) => {
              const meta = INVITE_TIER_META[k];
              return {
                type: "invite_tier_unlocked",
                title: `${inviterName} behaalde ${meta.label}!`,
                body: `Beloning: ${meta.reward}. Neem contact op om uit te delen.`,
                related_user_id: userId,
                metadata: {
                  tier_key: k,
                  tier_label: meta.label,
                  reward: meta.reward,
                  intakes: intakeCount ?? 0,
                  purchases: purchaseCount ?? 0,
                },
              };
            }),
          );
        }
      }
    }

    return new Response(
      JSON.stringify({
        tier, division, total_score: total, e1rm_score: e1rmScore, xp_score: xpScore, xp_total: totalXp,
        promoted: !!promoted,
        from_tier: prev?.current_tier ?? null,
        from_division: prev?.current_division ?? null,
        new_achievements: newAchievements,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
