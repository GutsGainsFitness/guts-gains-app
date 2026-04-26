import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Calendar, TrendingUp, Camera, Plus, ArrowRight, Activity, Flame, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AppShell from "@/components/app/AppShell";
import { format, startOfWeek, endOfWeek, differenceInCalendarDays, subWeeks } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import RankHeroCard from "@/components/app/RankHeroCard";
import { useLanguage } from "@/i18n/LanguageContext";
import { dateLocale, intlLocale } from "@/i18n/dateLocale";

/**
 * Compute current & longest training streak from session_dates (YYYY-MM-DD).
 * Rest-day tolerance: per 7-day window mag er 1 rustdag overbrugd worden.
 * Concreet: gaten van 1 dag (= 1 rustdag tussen 2 trainingsdagen) breken de streak NIET,
 * mits er in elk rollend window van 7 trainingsdagen niet meer dan 1 zo'n gat zit.
 */
function computeStreaks(dates: string[]): { current: number; longest: number; lastDate: string | null; restDaysUsed: number } {
  if (dates.length === 0) return { current: 0, longest: 0, lastDate: null, restDaysUsed: 0 };
  const uniq = Array.from(new Set(dates)).sort();

  // Helper: extend a run by `gap` calendar-day diff between two consecutive training days.
  // gap === 1  → trained back-to-back (no rest day used)
  // gap === 2  → exactly one rest day in between (allowed if budget available)
  // gap >= 3   → break
  let longest = 1;
  let run = 1;
  let restInWindow: number[] = []; // indexes of rest-days used inside current run (0-based within run)

  for (let i = 1; i < uniq.length; i++) {
    const gap = differenceInCalendarDays(new Date(uniq[i]), new Date(uniq[i - 1]));
    if (gap === 1) {
      run += 1;
    } else if (gap === 2) {
      // Drop rest-days outside the rolling 7-training-day window
      restInWindow = restInWindow.filter((idx) => run - idx < 7);
      if (restInWindow.length < 1) {
        restInWindow.push(run);
        run += 1;
      } else {
        run = 1;
        restInWindow = [];
      }
    } else {
      run = 1;
      restInWindow = [];
    }
    if (run > longest) longest = run;
  }

  // Current streak: walk back from the most recent session, allowing 1 rest day per 7 trained days.
  const today = new Date();
  const last = new Date(uniq[uniq.length - 1]);
  const gapToToday = differenceInCalendarDays(today, last);
  let current = 0;
  let curRestUsed = 0;
  // Streak is alive if last session was today, yesterday, or 2 days ago (one allowed rest day).
  if (gapToToday <= 2) {
    if (gapToToday === 2) curRestUsed = 1; // count today's missed day as the allowed rest
    current = 1;
    let trainedSinceRest = 1;
    for (let i = uniq.length - 1; i > 0; i--) {
      const d = differenceInCalendarDays(new Date(uniq[i]), new Date(uniq[i - 1]));
      if (d === 1) {
        current += 1;
        trainedSinceRest += 1;
      } else if (d === 2 && curRestUsed < Math.max(1, Math.floor(trainedSinceRest / 7) + 1)) {
        // Allow 1 rest day per 7 consecutive trained days
        current += 1;
        curRestUsed += 1;
        trainedSinceRest += 1;
      } else {
        break;
      }
    }
  }
  return { current, longest, lastDate: uniq[uniq.length - 1], restDaysUsed: curRestUsed };
}

/** Aggregate weekly volume (kg×reps) per primary muscle group, merging current and previous week. */
function aggregateMuscleVolume(
  current: { weight_kg: number; reps: number; exercises: { primary_muscle: string } | null }[],
  previous: { weight_kg: number; reps: number; exercises: { primary_muscle: string } | null }[],
): { muscle: string; volume: number; prevVolume: number }[] {
  const sum = (rows: typeof current) => {
    const agg: Record<string, number> = {};
    for (const l of rows) {
      if (!l.weight_kg || !l.reps || !l.exercises?.primary_muscle) continue;
      agg[l.exercises.primary_muscle] = (agg[l.exercises.primary_muscle] ?? 0) + l.weight_kg * l.reps;
    }
    return agg;
  };
  const cur = sum(current);
  const prev = sum(previous);
  const muscles = new Set([...Object.keys(cur), ...Object.keys(prev)]);
  return Array.from(muscles)
    .map((m) => ({ muscle: m, volume: Math.round(cur[m] ?? 0), prevVolume: Math.round(prev[m] ?? 0) }))
    .sort((a, b) => Math.max(b.volume, b.prevVolume) - Math.max(a.volume, a.prevVolume));
}

// Map muscle keys to translation keys (used with t())
const MUSCLE_KEYS: Record<string, string> = {
  chest: "app.dash.muscle.chest", back: "app.dash.muscle.back", shoulders: "app.dash.muscle.shoulders",
  biceps: "app.dash.muscle.biceps", triceps: "app.dash.muscle.triceps", forearms: "app.dash.muscle.forearms",
  abs: "app.dash.muscle.abs", obliques: "app.dash.muscle.obliques", glutes: "app.dash.muscle.glutes",
  quads: "app.dash.muscle.quads", hamstrings: "app.dash.muscle.hamstrings", calves: "app.dash.muscle.calves",
  traps: "app.dash.muscle.traps", lats: "app.dash.muscle.lats", lower_back: "app.dash.muscle.lower_back",
  full_body: "app.dash.muscle.full_body", cardio: "app.dash.muscle.cardio",
};

interface Pkg {
  id: string;
  package_type: "maandkaart" | "rittenkaart";
  package_name: string;
  sessions_per_week: number | null;
  total_sessions: number | null;
  used_sessions: number;
  end_date: string | null;
  status: string;
}

interface Session {
  id: string;
  session_date: string;
  start_time: string;
  session_type: string;
  status: string;
}

interface Measurement {
  measurement_date: string;
  weight_kg: number | null;
  body_fat_pct: number | null;
}

interface RecentPR {
  exerciseId: string;
  exerciseName: string;
  weight: number;
  reps: number;
  e1rm: number;
  date: string;
}

/** Walk set logs chronologically; emit a PR each time e1RM beats the previous best for that exercise. Return last N. */
function extractRecentPRs(
  logs: { weight_kg: number; reps: number; completed_at: string; exercise_id: string; exercises: { name: string } | null }[],
  limit = 3,
): RecentPR[] {
  const sorted = [...logs].sort((a, b) => a.completed_at.localeCompare(b.completed_at));
  const best: Record<string, number> = {};
  const prs: RecentPR[] = [];
  for (const l of sorted) {
    if (!l.weight_kg || !l.reps || l.weight_kg <= 0 || l.reps <= 0) continue;
    const e1rm = l.weight_kg * (1 + l.reps / 30);
    const prev = best[l.exercise_id] ?? 0;
    if (e1rm > prev + 0.01) {
      best[l.exercise_id] = e1rm;
      prs.push({
        exerciseId: l.exercise_id,
        exerciseName: l.exercises?.name ?? "—",
        weight: l.weight_kg,
        reps: l.reps,
        e1rm: Math.round(e1rm * 10) / 10,
        date: l.completed_at,
      });
    }
  }
  return prs.reverse().slice(0, limit);
}

const AppDashboard = () => {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const locale = dateLocale(language);
  const intlLoc = intlLocale(language);
  const muscleLabel = (key: string) => t(MUSCLE_KEYS[key] ?? key);
  const navigate = useNavigate();
  const [profile, setProfile] = useState<{ naam: string | null } | null>(null);
  const [packages, setPackages] = useState<Pkg[]>([]);
  const [upcomingSessions, setUpcomingSessions] = useState<Session[]>([]);
  const [weekSessionsCount, setWeekSessionsCount] = useState(0);
  const [latestMeasurement, setLatestMeasurement] = useState<Measurement | null>(null);
  const [streak, setStreak] = useState({ current: 0, longest: 0, lastDate: null as string | null, restDaysUsed: 0 });
  const [recentPRs, setRecentPRs] = useState<RecentPR[]>([]);
  const [muscleVolume, setMuscleVolume] = useState<{ muscle: string; volume: number; prevVolume: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const today = new Date().toISOString().split("T")[0];
      const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 }).toISOString().split("T")[0];
      const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 }).toISOString().split("T")[0];
      const weekStartIso = startOfWeek(new Date(), { weekStartsOn: 1 }).toISOString();
      const prevWeekStartIso = startOfWeek(subWeeks(new Date(), 1), { weekStartsOn: 1 }).toISOString();
      const prevWeekEndIso = endOfWeek(subWeeks(new Date(), 1), { weekStartsOn: 1 }).toISOString();

      // Get user's session ids first so we can scope set logs
      const sessionIdsRes = await supabase.from("workout_sessions").select("id").eq("user_id", user.id);
      const sessionIds = (sessionIdsRes.data ?? []).map((s) => s.id);

      const [profileRes, pkgRes, sessRes, weekSessRes, measRes, streakRes, prRes, volRes, prevVolRes] = await Promise.all([
        supabase.from("profiles").select("naam").eq("user_id", user.id).maybeSingle(),
        supabase.from("client_packages").select("*").eq("user_id", user.id).eq("status", "actief").order("created_at", { ascending: false }),
        supabase.from("pt_sessions").select("*").eq("user_id", user.id).gte("session_date", today).neq("status", "geannuleerd").order("session_date").order("start_time").limit(5),
        supabase.from("pt_sessions").select("id", { count: "exact", head: true }).eq("user_id", user.id).gte("session_date", weekStart).lte("session_date", weekEnd).neq("status", "geannuleerd").eq("session_type", "pt_sessie"),
        supabase.from("body_measurements").select("measurement_date, weight_kg, body_fat_pct").eq("user_id", user.id).order("measurement_date", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("workout_sessions").select("session_date").eq("user_id", user.id).not("ended_at", "is", null).order("session_date", { ascending: true }),
        sessionIds.length > 0
          ? supabase
              .from("workout_set_logs")
              .select("weight_kg, reps, completed_at, exercise_id, exercises(name)")
              .in("session_id", sessionIds)
              .gt("weight_kg", 0)
              .gt("reps", 0)
              .order("completed_at", { ascending: true })
          : Promise.resolve({ data: [] as any[] }),
        sessionIds.length > 0
          ? supabase
              .from("workout_set_logs")
              .select("weight_kg, reps, exercises(primary_muscle)")
              .in("session_id", sessionIds)
              .gte("completed_at", weekStartIso)
              .gt("weight_kg", 0)
              .gt("reps", 0)
          : Promise.resolve({ data: [] as any[] }),
        sessionIds.length > 0
          ? supabase
              .from("workout_set_logs")
              .select("weight_kg, reps, exercises(primary_muscle)")
              .in("session_id", sessionIds)
              .gte("completed_at", prevWeekStartIso)
              .lt("completed_at", prevWeekEndIso)
              .gt("weight_kg", 0)
              .gt("reps", 0)
          : Promise.resolve({ data: [] as any[] }),
      ]);

      setProfile(profileRes.data);
      setPackages((pkgRes.data as Pkg[]) || []);
      setUpcomingSessions((sessRes.data as Session[]) || []);
      setWeekSessionsCount(weekSessRes.count || 0);
      setLatestMeasurement(measRes.data);
      setStreak(computeStreaks((streakRes.data ?? []).map((r: any) => r.session_date)));
      setRecentPRs(extractRecentPRs((prRes.data ?? []) as any, 3));
      setMuscleVolume(aggregateMuscleVolume((volRes.data ?? []) as any, (prevVolRes.data ?? []) as any));
      setLoading(false);
    };
    load();
  }, [user]);

  const nextPT = upcomingSessions.find((s) => s.session_type === "pt_sessie");
  const nextMeas = upcomingSessions.find((s) => s.session_type === "lichaamsmeting");

  return (
    <AppShell>
      <div className="p-6 md:p-10 max-w-6xl mx-auto bg-background">
        {/* Subtle red glow that fades up from the bottom on launch — gives a
            native-app "screen warming up" feel without distracting from
            content. Hidden when prefers-reduced-motion is on. */}
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-x-0 bottom-0 h-64 -z-0 motion-reduce:hidden"
          style={{
            background:
              "radial-gradient(ellipse at 50% 100%, hsl(0 72% 51% / 0.10), transparent 70%)",
          }}
        />
        <div className="mb-8">
          <p className="text-primary font-heading text-xs tracking-[0.35em] mb-2">{t("app.dash.welcome_back")}</p>
          <h1 className="text-3xl md:text-4xl font-heading text-foreground">
            {profile?.naam ? `${t("app.dash.hey")} ${profile.naam.toUpperCase()}` : t("app.dash.my_dashboard")}
          </h1>
        </div>

        {loading ? (
          <div className="text-muted-foreground text-sm">{t("app.dash.loading")}</div>
        ) : (
          <div className="space-y-6">
            {/* Rank hero */}
            <RankHeroCard />

            {/* Top stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Next PT */}
              <div className="border-2 border-primary/20 bg-card p-6 rounded-sm">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-heading tracking-wider text-muted-foreground">{t("app.dash.next_pt")}</p>
                  <Calendar className="text-primary" size={18} />
                </div>
                {nextPT ? (
                  <>
                    <p className="text-2xl font-heading text-foreground">
                      {format(new Date(nextPT.session_date), "d MMM", { locale })}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">{nextPT.start_time.slice(0, 5)} {t("app.dash.hour_short")}</p>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground mb-3">{t("app.dash.no_session")}</p>
                    <Link to="/boeken" className="inline-flex items-center gap-2 text-xs font-heading tracking-wider text-primary hover:underline">
                      {t("app.dash.book_now")} <ArrowRight size={12} />
                    </Link>
                  </>
                )}
              </div>

              {/* Next measurement */}
              <div className="border border-border bg-card p-6 rounded-sm">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-heading tracking-wider text-muted-foreground">{t("app.dash.next_meas")}</p>
                  <Activity className="text-primary" size={18} />
                </div>
                {nextMeas ? (
                  <>
                    <p className="text-2xl font-heading text-foreground">
                      {format(new Date(nextMeas.session_date), "d MMM", { locale })}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">{nextMeas.start_time.slice(0, 5)} {t("app.dash.hour_short")}</p>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">{t("app.dash.no_meas")}</p>
                )}
              </div>
            </div>

            {/* Streak tracker */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border-2 border-primary/30 bg-gradient-to-br from-card to-primary/10 p-6 rounded-sm">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-heading tracking-wider text-primary">{t("app.dash.current_streak")}</p>
                  <Flame className="text-primary" size={18} />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-heading text-foreground">{streak.current}</span>
                  <span className="text-sm text-muted-foreground">{streak.current === 1 ? t("app.dash.day") : t("app.dash.days")} {t("app.dash.day_in_a_row")}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  {streak.current === 0
                    ? t("app.dash.streak_start")
                    : streak.lastDate && new Date(streak.lastDate).toDateString() === new Date().toDateString()
                      ? t("app.dash.streak_today")
                      : streak.restDaysUsed > 0
                        ? t("app.dash.streak_rest")
                        : t("app.dash.streak_keep")}
                </p>
                <p className="text-[10px] text-muted-foreground/70 mt-1">{t("app.dash.streak_rule")}</p>
              </div>
              <div className="border border-border bg-card p-6 rounded-sm">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-heading tracking-wider text-muted-foreground">{t("app.dash.longest_streak")}</p>
                  <Trophy className="text-primary" size={18} />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-heading text-foreground">{streak.longest}</span>
                  <span className="text-sm text-muted-foreground">{streak.longest === 1 ? t("app.dash.day") : t("app.dash.days")}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  {streak.longest === 0 ? t("app.dash.no_workouts_logged") : t("app.dash.pr_break_record")}
                </p>
              </div>
            </div>

            {/* Recente PRs */}
            {recentPRs.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-xs font-heading tracking-wider text-muted-foreground">{t("app.dash.recent_prs")}</h2>
                  <Link to="/app/records" className="text-xs text-primary hover:underline flex items-center gap-1">
                    {t("app.dash.all_records")} <ArrowRight size={10} />
                  </Link>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {recentPRs.map((pr, i) => (
                    <Link
                      key={i}
                      to={`/app/records?exercise=${pr.exerciseId}`}
                      className="group border border-border bg-card p-5 rounded-sm hover:border-primary/60 hover:bg-card/80 transition-colors block"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <Trophy className="text-primary" size={16} />
                        <span className="text-[10px] font-heading tracking-wider text-muted-foreground">
                          {format(new Date(pr.date), "d MMM", { locale })}
                        </span>
                      </div>
                      <p className="text-sm font-heading text-foreground mb-1 line-clamp-1 group-hover:text-primary transition-colors">{pr.exerciseName.toUpperCase()}</p>
                      <p className="text-2xl font-heading text-primary">
                        {pr.weight}<span className="text-sm text-muted-foreground"> kg</span> × {pr.reps}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-1">~{pr.e1rm} kg {t("app.dash.estimated_1rm")}</p>
                      <p className="text-[10px] text-primary/70 font-heading tracking-wider mt-2 inline-flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {t("app.dash.view_progress")} <ArrowRight size={10} />
                      </p>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Volume per spiergroep deze week */}
            {muscleVolume.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-xs font-heading tracking-wider text-muted-foreground">{t("app.dash.volume_week")}</h2>
                  <div className="flex items-center gap-3 text-[10px] text-muted-foreground/70">
                    <span className="flex items-center gap-1.5">
                      <span className="inline-block w-2.5 h-2.5 bg-primary rounded-sm" /> {t("app.dash.this_week")}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="inline-block w-2.5 h-2.5 bg-muted-foreground/30 rounded-sm" /> {t("app.dash.last_week")}
                    </span>
                  </div>
                </div>
                <div className="border border-border bg-card p-5 rounded-sm">
                  <ResponsiveContainer width="100%" height={Math.max(180, muscleVolume.length * 38)}>
                    <BarChart
                      data={muscleVolume}
                      layout="vertical"
                      margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                      barGap={-14}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                      <XAxis type="number" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 10 }} />
                      <YAxis
                        type="category"
                        dataKey="muscle"
                        stroke="hsl(var(--muted-foreground))"
                        tick={{ fontSize: 11 }}
                        width={90}
                        tickFormatter={(v) => muscleLabel(v)}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: 4,
                          fontSize: 12,
                        }}
                        formatter={(v: number, name) => [
                          `${(v ?? 0).toLocaleString(intlLoc)} kg`,
                          name === "volume" ? t("app.dash.this_week") : t("app.dash.last_week"),
                        ]}
                        labelFormatter={(v) => muscleLabel(v as string)}
                      />
                      {/* Achtergrond: vorige week (dunne grijze bar) */}
                      <Bar
                        dataKey="prevVolume"
                        fill="hsl(var(--muted-foreground) / 0.3)"
                        radius={[0, 2, 2, 0]}
                        barSize={20}
                        cursor="pointer"
                        onClick={(d: any) => d?.muscle && navigate(`/app/workouts?muscle=${d.muscle}`)}
                      />
                      {/* Voorgrond: deze week */}
                      <Bar
                        dataKey="volume"
                        fill="hsl(var(--primary))"
                        radius={[0, 2, 2, 0]}
                        barSize={10}
                        cursor="pointer"
                        onClick={(d: any) => d?.muscle && navigate(`/app/workouts?muscle=${d.muscle}`)}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                  <p className="text-[10px] text-muted-foreground/70 mt-2">
                    {t("app.dash.click_muscle")}
                  </p>
                </div>
              </div>
            )}

            <div>
              <h2 className="text-xs font-heading tracking-wider text-muted-foreground mb-3">{t("app.dash.my_package")}</h2>
              {packages.length === 0 ? (
                <div className="border border-border bg-card p-6 rounded-sm text-sm text-muted-foreground">
                  {t("app.dash.no_package")}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {packages.map((pkg) => {
                    if (pkg.package_type === "maandkaart") {
                      const max = pkg.sessions_per_week || 0;
                      const used = weekSessionsCount;
                      const remaining = Math.max(0, max - used);
                      const pct = max > 0 ? (used / max) * 100 : 0;
                      return (
                        <div key={pkg.id} className="border-2 border-primary/30 bg-gradient-to-br from-card to-primary/5 p-6 rounded-sm">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-heading tracking-wider text-primary">{t("app.dash.monthly_card")}</p>
                            <span className="text-xs text-muted-foreground">{t("app.dash.this_week_label")}</span>
                          </div>
                          <p className="text-lg font-heading text-foreground mb-4">{pkg.package_name}</p>
                          <div className="flex items-baseline gap-2 mb-2">
                            <span className="text-4xl font-heading text-foreground">{remaining}</span>
                            <span className="text-sm text-muted-foreground">/ {max} {t("app.dash.left")}</span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                          </div>
                          <p className="text-xs text-muted-foreground mt-3">
                            {used} {t("app.dash.of")} {max} {t("app.dash.sessions_used_week")}
                          </p>
                        </div>
                      );
                    } else {
                      const total = pkg.total_sessions || 0;
                      const used = pkg.used_sessions;
                      const remaining = Math.max(0, total - used);
                      const pct = total > 0 ? (used / total) * 100 : 0;
                      return (
                        <div key={pkg.id} className="border-2 border-primary/30 bg-gradient-to-br from-card to-primary/5 p-6 rounded-sm">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-heading tracking-wider text-primary">{t("app.dash.session_card")}</p>
                          </div>
                          <p className="text-lg font-heading text-foreground mb-4">{pkg.package_name}</p>
                          <div className="flex items-baseline gap-2 mb-2">
                            <span className="text-4xl font-heading text-foreground">{remaining}</span>
                            <span className="text-sm text-muted-foreground">/ {total} {t("app.dash.rides_left")}</span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                          </div>
                          <p className="text-xs text-muted-foreground mt-3">
                            {used} {t("app.dash.of")} {total} {t("app.dash.rides_used")}
                          </p>
                        </div>
                      );
                    }
                  })}
                </div>
              )}
            </div>

            {/* Latest measurement */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-heading tracking-wider text-muted-foreground">{t("app.dash.last_meas")}</h2>
                <Link to="/app/metingen" className="text-xs text-primary hover:underline flex items-center gap-1">
                  {t("app.dash.see_all")} <ArrowRight size={10} />
                </Link>
              </div>
              {latestMeasurement ? (
                <div className="border border-border bg-card p-6 rounded-sm grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">{t("app.dash.date")}</p>
                    <p className="text-lg font-heading text-foreground">
                      {format(new Date(latestMeasurement.measurement_date), "d MMM yyyy", { locale })}
                    </p>
                  </div>
                  {latestMeasurement.weight_kg !== null && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">{t("app.dash.weight")}</p>
                      <p className="text-lg font-heading text-foreground">{latestMeasurement.weight_kg} kg</p>
                    </div>
                  )}
                  {latestMeasurement.body_fat_pct !== null && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">{t("app.dash.body_fat")}</p>
                      <p className="text-lg font-heading text-foreground">{latestMeasurement.body_fat_pct}%</p>
                    </div>
                  )}
                </div>
              ) : (
                <Link to="/app/metingen" className="block border border-border bg-card p-6 rounded-sm text-sm text-muted-foreground hover:border-primary/50 transition-colors">
                  <Plus size={16} className="inline mr-2" /> {t("app.dash.add_first_meas")}
                </Link>
              )}
            </div>

            {/* Quick actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
              <Link to="/boeken" className="border border-border bg-card p-5 rounded-sm hover:border-primary/50 transition-colors flex items-center gap-3">
                <Calendar className="text-primary" size={20} />
                <span className="text-sm font-body text-foreground">{t("app.dash.book_session")}</span>
              </Link>
              <Link to="/app/metingen" className="border border-border bg-card p-5 rounded-sm hover:border-primary/50 transition-colors flex items-center gap-3">
                <TrendingUp className="text-primary" size={20} />
                <span className="text-sm font-body text-foreground">{t("app.dash.add_meas")}</span>
              </Link>
              <Link to="/app/fotos" className="border border-border bg-card p-5 rounded-sm hover:border-primary/50 transition-colors flex items-center gap-3">
                <Camera className="text-primary" size={20} />
                <span className="text-sm font-body text-foreground">{t("app.dash.upload_photo")}</span>
              </Link>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
};

export default AppDashboard;
