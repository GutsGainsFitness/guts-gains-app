import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Calendar, Dumbbell, Flame, HeartPulse, Info, Timer, TrendingUp } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { format, parseISO } from "date-fns";
import AppShell from "@/components/app/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { calculateCalories, calculateAge, type ActivityKey } from "@/lib/calories";
import { caloriesFromHeartRate } from "@/lib/heartRate";
import { useLanguage } from "@/i18n/LanguageContext";
import { dateLocale, intlLocale } from "@/i18n/dateLocale";

interface SessionRow {
  id: string;
  session_date: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  training_mode: ActivityKey;
  plan_name_snapshot: string | null;
  avg_heart_rate: number | null;
  max_heart_rate: number | null;
  hr_source: string | null;
}

interface SetLog {
  id: string;
  session_id: string;
  exercise_id: string;
  set_number: number;
  reps: number | null;
  weight_kg: number | null;
  completed_at: string;
}

interface ExerciseLite {
  id: string;
  name: string;
  name_en: string | null;
  name_es: string | null;
  slug: string;
}

const AppHistory = () => {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const locale = dateLocale(language);
  const intlLoc = intlLocale(language);
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [setLogs, setSetLogs] = useState<SetLog[]>([]);
  const [exercises, setExercises] = useState<ExerciseLite[]>([]);
  const [weightKg, setWeightKg] = useState<number>(75);
  const [ageYears, setAgeYears] = useState<number>(30);
  const [gender, setGender] = useState<"man" | "vrouw" | "anders">("man");
  const [selectedExercise, setSelectedExercise] = useState<string>("");

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoading(true);

      const [profileRes, sessionsRes, exercisesRes] = await Promise.all([
        supabase.from("profiles").select("gewicht_kg, geboortedatum, geslacht").eq("user_id", user.id).maybeSingle(),
        supabase
          .from("workout_sessions")
          .select("id, session_date, started_at, ended_at, duration_seconds, training_mode, plan_name_snapshot, avg_heart_rate, max_heart_rate, hr_source")
          .eq("user_id", user.id)
          .not("ended_at", "is", null)
          .order("started_at", { ascending: false }),
        supabase.from("exercises").select("id, name, name_en, name_es, slug"),
      ]);

      if (profileRes.data?.gewicht_kg) setWeightKg(Number(profileRes.data.gewicht_kg));
      const age = calculateAge(profileRes.data?.geboortedatum ?? null);
      if (age) setAgeYears(age);
      if (profileRes.data?.geslacht) setGender(profileRes.data.geslacht);

      const sess = (sessionsRes.data as SessionRow[]) || [];
      setSessions(sess);
      setExercises((exercisesRes.data as ExerciseLite[]) || []);

      if (sess.length > 0) {
        const sessionIds = sess.map((s) => s.id);
        const { data: logsData } = await supabase
          .from("workout_set_logs")
          .select("id, session_id, exercise_id, set_number, reps, weight_kg, completed_at")
          .in("session_id", sessionIds)
          .not("weight_kg", "is", null);
        const logs = (logsData as SetLog[]) || [];
        setSetLogs(logs);

        const counts = new Map<string, number>();
        logs.forEach((l) => counts.set(l.exercise_id, (counts.get(l.exercise_id) || 0) + 1));
        const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
        if (top) setSelectedExercise(top[0]);
      }

      setLoading(false);
    };
    load();
  }, [user]);

  const exerciseName = (e: ExerciseLite) => {
    if (language === "en") return e.name_en || e.name;
    if (language === "es") return e.name_es || e.name;
    return e.name;
  };

  const kcalForSession = (s: SessionRow): number => {
    const dur = s.duration_seconds || 0;
    if (s.avg_heart_rate && s.avg_heart_rate >= 30) {
      return caloriesFromHeartRate({
        avgHeartRate: s.avg_heart_rate,
        weightKg,
        ageYears,
        gender,
        durationSeconds: dur,
      });
    }
    return calculateCalories(s.training_mode, weightKg, dur);
  };

  const stats = useMemo(() => {
    const total = sessions.length;
    const totalDuration = sessions.reduce((acc, s) => acc + (s.duration_seconds || 0), 0);
    const avgDurationMin = total ? Math.round(totalDuration / total / 60) : 0;
    const totalKcal = sessions.reduce((acc, s) => acc + kcalForSession(s), 0);
    const sessionsWithHR = sessions.filter((s) => s.avg_heart_rate).length;
    return { total, totalKcal, avgDurationMin, sessionsWithHR };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessions, weightKg, ageYears, gender]);

  const exerciseOptions = useMemo(() => {
    const exIds = new Set(setLogs.map((l) => l.exercise_id));
    return exercises.filter((e) => exIds.has(e.id));
  }, [exercises, setLogs]);

  const chartData = useMemo(() => {
    if (!selectedExercise) return [];
    const bySession = new Map<string, { date: string; maxWeight: number; topReps: number }>();
    setLogs
      .filter((l) => l.exercise_id === selectedExercise && l.weight_kg != null)
      .forEach((l) => {
        const sess = sessions.find((s) => s.id === l.session_id);
        if (!sess) return;
        const existing = bySession.get(l.session_id);
        const w = Number(l.weight_kg);
        if (!existing || w > existing.maxWeight) {
          bySession.set(l.session_id, {
            date: sess.session_date,
            maxWeight: w,
            topReps: l.reps || 0,
          });
        }
      });
    return [...bySession.values()]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((d) => ({
        date: format(parseISO(d.date), "d MMM", { locale }),
        gewicht: d.maxWeight,
        reps: d.topReps,
      }));
  }, [selectedExercise, setLogs, sessions, locale]);

  const coverageMsg = t("app.history.disclaimer.coverage")
    .replace("{n}", String(stats.sessionsWithHR))
    .replace("{total}", String(stats.total));

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto p-6 md:p-10">
        <Link
          to="/app"
          className="inline-flex items-center gap-2 text-xs font-heading tracking-wider text-muted-foreground hover:text-primary mb-6"
        >
          <ArrowLeft size={14} /> {t("app.history.back")}
        </Link>

        <div className="mb-8">
          <p className="text-primary font-heading text-xs tracking-[0.35em] mb-2">{t("app.history.tag")}</p>
          <h1 className="text-3xl md:text-4xl font-heading text-foreground">{t("app.history.title")}</h1>
          <p className="text-sm text-muted-foreground mt-2">{t("app.history.subtitle")}</p>
        </div>

        {loading ? (
          <p className="text-muted-foreground text-sm">{t("app.history.loading")}</p>
        ) : sessions.length === 0 ? (
          <div className="border border-border bg-card rounded-sm p-10 text-center">
            <Dumbbell size={32} className="mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground text-sm mb-4">{t("app.history.empty")}</p>
            <Link
              to="/app/workouts"
              className="inline-block px-5 h-11 leading-[44px] bg-primary text-primary-foreground font-heading text-sm tracking-wider rounded-sm hover:bg-primary/90"
            >
              {t("app.history.to_workouts")}
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-3">
              <KpiCard icon={Dumbbell} label={t("app.history.kpi.sessions")} value={String(stats.total)} />
              <KpiCard icon={Flame} label={t("app.history.kpi.kcal")} value={stats.totalKcal.toLocaleString(intlLoc)} />
              <KpiCard icon={Timer} label={t("app.history.kpi.avg_dur")} value={`${stats.avgDurationMin} min`} />
            </div>

            <div className="border border-border bg-card/40 rounded-sm p-4 mb-8 flex items-start gap-3">
              <Info size={16} className="text-primary mt-0.5 flex-shrink-0" />
              <div className="text-xs text-muted-foreground leading-relaxed">
                <span className="text-foreground font-heading tracking-wider">{t("app.history.disclaimer.title")}</span>{" "}
                {t("app.history.disclaimer.body")}{" "}
                <span className="inline-flex items-center gap-1 text-primary">
                  <HeartPulse size={12} />❤
                </span>{" "}
                {t("app.history.disclaimer.use_hr")}
                {stats.sessionsWithHR > 0 && (
                  <span className="text-foreground"> {coverageMsg}</span>
                )}
              </div>
            </div>

            <div className="border border-border bg-card rounded-sm p-5 md:p-6 mb-8">
              <div className="flex items-start justify-between flex-wrap gap-4 mb-5">
                <div className="flex items-center gap-3">
                  <TrendingUp size={18} className="text-primary" />
                  <div>
                    <p className="text-xs font-heading tracking-wider text-muted-foreground">{t("app.history.progression")}</p>
                    <h2 className="text-lg font-heading text-foreground">{t("app.history.max_per_session")}</h2>
                  </div>
                </div>
                <select
                  value={selectedExercise}
                  onChange={(e) => setSelectedExercise(e.target.value)}
                  className="bg-background border border-border rounded-sm px-3 py-2 text-sm font-body text-foreground focus:outline-none focus:border-primary"
                >
                  {exerciseOptions.length === 0 && <option value="">{t("app.history.no_weight_ex")}</option>}
                  {exerciseOptions.map((ex) => (
                    <option key={ex.id} value={ex.id}>
                      {exerciseName(ex)}
                    </option>
                  ))}
                </select>
              </div>

              {chartData.length === 0 ? (
                <p className="text-muted-foreground text-sm py-10 text-center">
                  {t("app.history.empty_chart")}
                </p>
              ) : chartData.length === 1 ? (
                <p className="text-muted-foreground text-sm py-10 text-center">
                  {t("app.history.one_session")}
                </p>
              ) : (
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis
                        dataKey="date"
                        stroke="hsl(var(--muted-foreground))"
                        style={{ fontSize: "11px" }}
                      />
                      <YAxis
                        stroke="hsl(var(--muted-foreground))"
                        style={{ fontSize: "11px" }}
                        unit=" kg"
                      />
                      <Tooltip
                        contentStyle={{
                          background: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "2px",
                          fontSize: "12px",
                        }}
                        labelStyle={{ color: "hsl(var(--foreground))" }}
                      />
                      <Line
                        type="monotone"
                        dataKey="gewicht"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2.5}
                        dot={{ fill: "hsl(var(--primary))", r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div className="border border-border bg-card rounded-sm overflow-hidden">
              <div className="px-5 md:px-6 py-4 border-b border-border flex items-center gap-3">
                <Calendar size={18} className="text-primary" />
                <div>
                  <p className="text-xs font-heading tracking-wider text-muted-foreground">{t("app.history.logbook")}</p>
                  <h2 className="text-lg font-heading text-foreground">{t("app.history.completed_sessions")}</h2>
                </div>
              </div>
              <ul className="divide-y divide-border">
                {sessions.map((s) => {
                  const kcal = kcalForSession(s);
                  const minutes = Math.round((s.duration_seconds || 0) / 60);
                  const setsInSession = setLogs.filter((l) => l.session_id === s.id).length;
                  const hasHR = !!s.avg_heart_rate;
                  return (
                    <li key={s.id} className="px-5 md:px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
                      <div className="min-w-0 flex-1">
                        <p className="font-heading text-foreground text-sm md:text-base truncate">
                          {s.plan_name_snapshot || t("app.history.workout")}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {format(parseISO(s.session_date), "EEEE d MMM yyyy", { locale })} •{" "}
                          <span className="capitalize">{s.training_mode.replace("_", " ")}</span>
                          {hasHR && (
                            <span className="text-primary ml-2">• ❤ {s.avg_heart_rate} bpm</span>
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-4 text-xs font-heading tracking-wider">
                        <span className="text-muted-foreground">
                          <Dumbbell size={12} className="inline mr-1" />
                          {setsInSession} {t("app.history.sets")}
                        </span>
                        <span className="text-muted-foreground">
                          <Timer size={12} className="inline mr-1" />
                          {minutes} {t("app.history.min")}
                        </span>
                        <span className="text-primary" title={hasHR ? t("app.history.tt_hr_exact") : t("app.history.tt_hr_est")}>
                          <Flame size={12} className="inline mr-1" />
                          {hasHR ? "" : "~"}{kcal} {t("app.history.kcal")}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
};

const KpiCard = ({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Dumbbell;
  label: string;
  value: string;
}) => (
  <div className="border border-border bg-card rounded-sm p-5">
    <div className="flex items-center gap-2 text-muted-foreground mb-2">
      <Icon size={14} />
      <p className="text-[10px] font-heading tracking-[0.2em]">{label}</p>
    </div>
    <p className="text-3xl font-heading text-foreground">{value}</p>
  </div>
);

export default AppHistory;
