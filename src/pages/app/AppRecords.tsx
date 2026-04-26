import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Trophy, TrendingUp, Dumbbell, ChevronRight } from "lucide-react";
import AppShell from "@/components/app/AppShell";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { useLanguage } from "@/i18n/LanguageContext";
import { intlLocale } from "@/i18n/dateLocale";

interface SetLog {
  id: string;
  exercise_id: string;
  reps: number | null;
  weight_kg: number | null;
  completed_at: string;
}

interface Exercise {
  id: string;
  name: string;
  primary_muscle: string;
  slug: string;
}

interface PR {
  exercise: Exercise;
  bestWeight: number;
  bestReps: number;
  best1RM: number;
  bestVolume: number;
  totalSets: number;
  lastDate: string;
  history: { date: string; weight: number; reps: number; e1rm: number }[];
}

// Epley formula: weight × (1 + reps/30)
const estimate1RM = (weight: number, reps: number): number => {
  if (reps <= 0 || weight <= 0) return 0;
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30) * 10) / 10;
};

const AppRecords = () => {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const intlLoc = intlLocale(language);
  const [searchParams] = useSearchParams();
  const initialExerciseId = searchParams.get("exercise");
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<PR[]>([]);
  const [selectedExercise, setSelectedExercise] = useState<string | null>(initialExerciseId);
  const [muscleFilter, setMuscleFilter] = useState<string>("all");

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      // Get user's session ids
      const { data: sessions } = await supabase
        .from("workout_sessions")
        .select("id")
        .eq("user_id", user.id);

      const sessionIds = (sessions ?? []).map((s) => s.id);
      if (sessionIds.length === 0) {
        setLoading(false);
        return;
      }

      // Get all logged sets with weight + reps
      const { data: logs } = await supabase
        .from("workout_set_logs")
        .select("id, exercise_id, reps, weight_kg, completed_at")
        .in("session_id", sessionIds)
        .not("weight_kg", "is", null)
        .not("reps", "is", null)
        .gt("weight_kg", 0)
        .gt("reps", 0)
        .order("completed_at", { ascending: true });

      const setLogs = (logs ?? []) as SetLog[];
      if (setLogs.length === 0) {
        setLoading(false);
        return;
      }

      const exerciseIds = Array.from(new Set(setLogs.map((l) => l.exercise_id)));
      const { data: exercises } = await supabase
        .from("exercises")
        .select("id, name, primary_muscle, slug")
        .in("id", exerciseIds);

      const exerciseMap = new Map<string, Exercise>(
        (exercises ?? []).map((e) => [e.id, e as Exercise])
      );

      // Group by exercise
      const grouped = new Map<string, SetLog[]>();
      setLogs.forEach((log) => {
        const arr = grouped.get(log.exercise_id) ?? [];
        arr.push(log);
        grouped.set(log.exercise_id, arr);
      });

      const prs: PR[] = [];
      grouped.forEach((logs, exId) => {
        const ex = exerciseMap.get(exId);
        if (!ex) return;

        let bestWeight = 0;
        let bestWeightReps = 0;
        let best1RM = 0;
        let bestVolume = 0;

        const history = logs.map((l) => {
          const w = Number(l.weight_kg);
          const r = Number(l.reps);
          const e1rm = estimate1RM(w, r);
          if (w > bestWeight || (w === bestWeight && r > bestWeightReps)) {
            bestWeight = w;
            bestWeightReps = r;
          }
          if (e1rm > best1RM) best1RM = e1rm;
          const vol = w * r;
          if (vol > bestVolume) bestVolume = vol;
          return {
            date: l.completed_at.split("T")[0],
            weight: w,
            reps: r,
            e1rm,
          };
        });

        prs.push({
          exercise: ex,
          bestWeight,
          bestReps: bestWeightReps,
          best1RM,
          bestVolume,
          totalSets: logs.length,
          lastDate: logs[logs.length - 1].completed_at.split("T")[0],
          history,
        });
      });

      // Sort by best 1RM descending
      prs.sort((a, b) => b.best1RM - a.best1RM);
      setRecords(prs);
      if (prs.length > 0 && !selectedExercise) setSelectedExercise(prs[0].exercise.id);
      setLoading(false);
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const muscles = useMemo(() => {
    const set = new Set(records.map((r) => r.exercise.primary_muscle));
    return ["all", ...Array.from(set).sort()];
  }, [records]);

  const filtered = useMemo(() => {
    return muscleFilter === "all"
      ? records
      : records.filter((r) => r.exercise.primary_muscle === muscleFilter);
  }, [records, muscleFilter]);

  const selected = useMemo(
    () => filtered.find((r) => r.exercise.id === selectedExercise) ?? filtered[0],
    [filtered, selectedExercise]
  );

  if (loading) {
    return (
      <AppShell>
        <div className="p-6 text-muted-foreground text-sm">{t("app.records.loading")}</div>
      </AppShell>
    );
  }

  if (records.length === 0) {
    return (
      <AppShell>
        <div className="p-6 md:p-10 max-w-4xl mx-auto">
          <div className="mb-8">
            <p className="text-primary font-heading text-xs tracking-[0.35em] mb-2">{t("app.records.tag")}</p>
            <h1 className="text-3xl font-heading text-foreground">{t("app.records.title")}</h1>
          </div>
          <div className="border border-border bg-card p-8 rounded-sm text-center">
            <Trophy className="mx-auto text-muted-foreground/40 mb-3" size={48} />
            <p className="text-foreground font-heading mb-2">{t("app.records.empty_title")}</p>
            <p className="text-sm text-muted-foreground mb-4">
              {t("app.records.empty_desc")}
            </p>
            <Link
              to="/app/workouts"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground font-heading text-xs tracking-wider rounded-sm hover:bg-primary/90"
            >
              <Dumbbell size={14} /> {t("app.records.start_workout")}
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="p-6 md:p-10 max-w-6xl mx-auto pb-20">
        <div className="mb-8">
          <p className="text-primary font-heading text-xs tracking-[0.35em] mb-2">{t("app.records.tag")}</p>
          <h1 className="text-3xl font-heading text-foreground">{t("app.records.title")}</h1>
          <p className="text-sm text-muted-foreground mt-2">
            {t("app.records.subtitle")}
          </p>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <Kpi label={t("app.records.exercises")} value={records.length.toString()} />
          <Kpi label={t("app.records.total_sets")} value={records.reduce((s, r) => s + r.totalSets, 0).toString()} />
          <Kpi
            label={t("app.records.heaviest_lift")}
            value={`${Math.max(...records.map((r) => r.bestWeight))} kg`}
          />
          <Kpi
            label={t("app.records.highest_1rm")}
            value={`${Math.max(...records.map((r) => r.best1RM))} kg`}
          />
        </div>

        {/* Muscle filter */}
        <div className="flex gap-2 flex-wrap mb-6">
          {muscles.map((m) => (
            <button
              key={m}
              onClick={() => setMuscleFilter(m)}
              className={`px-3 py-1.5 text-[10px] font-heading tracking-wider rounded-sm border transition-colors ${
                muscleFilter === m
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground border-border hover:border-primary"
              }`}
            >
              {m === "all" ? t("app.records.all_filter") : m.replace("_", " ").toUpperCase()}
            </button>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Exercise list */}
          <div className="space-y-2 lg:col-span-1">
            <p className="text-[10px] font-heading tracking-wider text-muted-foreground mb-2">
              {t("app.records.exercises")} ({filtered.length})
            </p>
            {filtered.map((r) => {
              const isSelected = selected?.exercise.id === r.exercise.id;
              return (
                <button
                  key={r.exercise.id}
                  onClick={() => setSelectedExercise(r.exercise.id)}
                  className={`w-full text-left p-3 rounded-sm border transition-colors ${
                    isSelected
                      ? "bg-primary/5 border-primary"
                      : "bg-card border-border hover:border-primary/50"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-heading text-foreground truncate">
                        {r.exercise.name}
                      </p>
                      <p className="text-[10px] text-muted-foreground capitalize mt-0.5">
                        {r.exercise.primary_muscle.replace("_", " ")} • {r.totalSets} {t("app.records.sets")}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-heading text-primary tabular-nums">
                        {r.bestWeight}kg
                      </p>
                      <p className="text-[10px] text-muted-foreground tabular-nums">
                        × {r.bestReps}
                      </p>
                    </div>
                    <ChevronRight
                      size={14}
                      className={isSelected ? "text-primary" : "text-muted-foreground/40"}
                    />
                  </div>
                </button>
              );
            })}
          </div>

          {/* Detail */}
          {selected && (
            <div className="lg:col-span-2 space-y-4">
              <div className="border border-border bg-card p-5 rounded-sm">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div>
                    <p className="text-[10px] font-heading tracking-wider text-primary">
                      {selected.exercise.primary_muscle.replace("_", " ").toUpperCase()}
                    </p>
                    <h2 className="text-2xl font-heading text-foreground mt-1">
                      {selected.exercise.name}
                    </h2>
                  </div>
                  <Trophy className="text-primary flex-shrink-0" size={24} />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <RecordStat
                    label={t("app.records.heaviest_set")}
                    value={`${selected.bestWeight} kg`}
                    sub={`× ${selected.bestReps} ${t("app.records.reps")}`}
                    highlight
                  />
                  <RecordStat
                    label={t("app.records.estimated_1rm_card")}
                    value={`${selected.best1RM} kg`}
                    sub={t("app.records.epley")}
                  />
                  <RecordStat
                    label={t("app.records.best_volume")}
                    value={`${selected.bestVolume.toLocaleString(intlLoc)} kg`}
                    sub={t("app.records.kg_x_reps")}
                  />
                  <RecordStat
                    label={t("app.records.last_set")}
                    value={new Date(selected.lastDate).toLocaleDateString(intlLoc, {
                      day: "numeric",
                      month: "short",
                    })}
                    sub={`${selected.totalSets} ${t("app.records.sets_total")}`}
                  />
                </div>
              </div>

              {/* Progressie chart */}
              {selected.history.length >= 2 && (
                <div className="border border-border bg-card p-5 rounded-sm">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-xs font-heading tracking-wider text-foreground flex items-center gap-2">
                      <TrendingUp size={14} className="text-primary" />
                      {t("app.records.progression")}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {selected.history.length} {t("app.records.loggings")}
                    </p>
                  </div>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={selected.history}>
                        <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                          tickFormatter={(d) =>
                            new Date(d).toLocaleDateString(intlLoc, { day: "numeric", month: "short" })
                          }
                        />
                        <YAxis
                          tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                          unit="kg"
                          width={40}
                        />
                        <Tooltip
                          contentStyle={{
                            background: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: 4,
                            fontSize: 11,
                          }}
                          labelFormatter={(d) =>
                            new Date(d).toLocaleDateString(intlLoc, {
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                            })
                          }
                          formatter={(val: number, key: string) => {
                            if (key === "e1rm") return [`${val} kg`, t("app.records.tt_1rm")];
                            if (key === "weight") return [`${val} kg`, t("app.records.tt_weight")];
                            if (key === "reps") return [val, t("app.records.tt_reps")];
                            return [val, key];
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="e1rm"
                          stroke="hsl(var(--primary))"
                          strokeWidth={2}
                          dot={{ r: 3, fill: "hsl(var(--primary))" }}
                          activeDot={{ r: 5 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Recent sets */}
              <div className="border border-border bg-card p-5 rounded-sm">
                <p className="text-xs font-heading tracking-wider text-foreground mb-3">
                  {t("app.records.last_10_sets")}
                </p>
                <div className="space-y-1.5">
                  {[...selected.history]
                    .reverse()
                    .slice(0, 10)
                    .map((h, i) => {
                      const isPR = h.weight === selected.bestWeight && h.reps === selected.bestReps;
                      return (
                        <div
                          key={i}
                          className={`flex items-center justify-between text-xs px-3 py-2 rounded-sm ${
                            isPR ? "bg-primary/10 border border-primary/30" : "bg-background"
                          }`}
                        >
                          <span className="text-muted-foreground tabular-nums">
                            {new Date(h.date).toLocaleDateString(intlLoc, {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </span>
                          <span className="text-foreground font-heading tabular-nums">
                            {h.weight}kg × {h.reps}
                            {isPR && <Trophy size={10} className="inline ml-2 text-primary" />}
                          </span>
                          <span className="text-muted-foreground tabular-nums text-[10px]">
                            ~{h.e1rm}kg 1RM
                          </span>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
};

const Kpi = ({ label, value }: { label: string; value: string }) => (
  <div className="border border-border bg-card p-3 rounded-sm">
    <p className="text-[10px] font-heading tracking-wider text-muted-foreground">{label}</p>
    <p className="text-xl font-heading text-foreground tabular-nums mt-1">{value}</p>
  </div>
);

const RecordStat = ({
  label,
  value,
  sub,
  highlight,
}: {
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
}) => (
  <div className={`p-3 rounded-sm ${highlight ? "bg-primary/5 border border-primary/30" : "bg-background border border-border"}`}>
    <p className="text-[10px] font-heading tracking-wider text-muted-foreground">{label}</p>
    <p className={`text-lg font-heading tabular-nums mt-1 ${highlight ? "text-primary" : "text-foreground"}`}>
      {value}
    </p>
    {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
  </div>
);

export default AppRecords;
