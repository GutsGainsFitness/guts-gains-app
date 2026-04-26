import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Plus, Clock, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AppShell from "@/components/app/AppShell";
import { Database } from "@/integrations/supabase/types";
import { useLanguage } from "@/i18n/LanguageContext";
import { pickLocalized } from "@/i18n/localized";
import type { Language } from "@/i18n/translations";

type Plan = Database["public"]["Tables"]["workout_plans"]["Row"];
type Focus = Database["public"]["Enums"]["workout_focus"];

/** Map a primary muscle group to the most relevant workout focus filter. */
const MUSCLE_TO_FOCUS: Record<string, Focus> = {
  chest: "chest", back: "back", lats: "back", lower_back: "back", traps: "back",
  shoulders: "shoulders", biceps: "arms", triceps: "arms", forearms: "arms",
  quads: "legs", hamstrings: "legs", calves: "legs", glutes: "booty",
  abs: "core", obliques: "core", full_body: "full_body", cardio: "cardio",
};

const AppWorkouts = () => {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const [searchParams] = useSearchParams();
  const [premade, setPremade] = useState<Plan[]>([]);
  const [mine, setMine] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Focus | "all">("all");

  // Pre-select filter based on ?muscle= query param (from dashboard volume bar click)
  useEffect(() => {
    const muscle = searchParams.get("muscle");
    if (muscle && MUSCLE_TO_FOCUS[muscle]) {
      setFilter(MUSCLE_TO_FOCUS[muscle]);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [pre, own] = await Promise.all([
        supabase.from("workout_plans").select("*").eq("is_premade", true).order("name"),
        supabase.from("workout_plans").select("*").eq("user_id", user.id).eq("is_premade", false).order("created_at", { ascending: false }),
      ]);
      setPremade((pre.data as Plan[]) || []);
      setMine((own.data as Plan[]) || []);
      setLoading(false);
    };
    load();
  }, [user]);

  const filtered = filter === "all" ? premade : premade.filter((p) => p.focus === filter);
  const focuses = Array.from(new Set(premade.map((p) => p.focus)));

  return (
    <AppShell>
      <div className="p-6 md:p-10 max-w-6xl mx-auto">
        <div className="flex items-start justify-between mb-8 flex-wrap gap-4">
          <div>
            <p className="text-primary font-heading text-xs tracking-[0.35em] mb-2">{t("app.workouts.tag")}</p>
            <h1 className="text-3xl md:text-4xl font-heading text-foreground">{t("app.workouts.title")}</h1>
          </div>
          <Link
            to="/app/workouts/nieuw"
            className="px-5 py-3 bg-primary text-primary-foreground font-heading text-sm tracking-wider rounded-sm hover:bg-primary/90 transition-colors flex items-center gap-2"
          >
            <Plus size={16} /> {t("app.workouts.own")}
          </Link>
        </div>

        {loading ? (
          <div className="text-muted-foreground text-sm">{t("app.dash.loading")}</div>
        ) : (
          <div className="space-y-10">
            {/* Mine */}
            {mine.length > 0 && (
              <section>
                <h2 className="text-xs font-heading tracking-wider text-muted-foreground mb-4">{t("app.workouts.mine")}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {mine.map((p) => <PlanCard key={p.id} plan={p} t={t} language={language} />)}
                </div>
              </section>
            )}

            {/* Premade */}
            <section>
              <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                <h2 className="text-xs font-heading tracking-wider text-muted-foreground">{t("app.workouts.premade")}</h2>
                <div className="flex gap-2 flex-wrap">
                  <FilterPill active={filter === "all"} onClick={() => setFilter("all")}>{t("app.workouts.all")}</FilterPill>
                  {focuses.map((f) => (
                    <FilterPill key={f} active={filter === f} onClick={() => setFilter(f)}>
                      {t(`app.focus.${f}`).toUpperCase()}
                    </FilterPill>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map((p) => <PlanCard key={p.id} plan={p} t={t} language={language} />)}
              </div>
            </section>
          </div>
        )}
      </div>
    </AppShell>
  );
};

const FilterPill = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
  <button
    onClick={onClick}
    className={`px-3 py-1.5 text-[10px] font-heading tracking-wider rounded-sm border transition-colors ${
      active
        ? "bg-primary text-primary-foreground border-primary"
        : "bg-card text-muted-foreground border-border hover:border-primary hover:text-foreground"
    }`}
  >
    {children}
  </button>
);

const PlanCard = ({ plan, t, language }: { plan: Plan; t: (key: string) => string; language: Language }) => {
  const name = pickLocalized(plan as unknown as Record<string, unknown>, "name", language);
  const description = pickLocalized(plan as unknown as Record<string, unknown>, "description", language);
  return (
  <Link
    to={`/app/workouts/${plan.id}`}
    className="border-2 border-primary/15 bg-card p-5 rounded-sm hover:border-primary/50 transition-all group"
  >
    <div className="flex items-center justify-between mb-3">
      <span className="text-[10px] font-heading tracking-wider text-primary px-2 py-1 bg-primary/10 rounded-sm">
        {t(`app.focus.${plan.focus}`)?.toUpperCase()}
      </span>
      <span className="text-[10px] text-muted-foreground">{t(`app.diff.${plan.difficulty}`)}</span>
    </div>
    <h3 className="text-lg font-heading text-foreground mb-1">{name}</h3>
    {description && (
      <p className="text-xs text-muted-foreground mb-4 line-clamp-2">{description}</p>
    )}
    <div className="flex items-center justify-between text-xs text-muted-foreground">
      <span className="flex items-center gap-1.5">
        <Clock size={12} /> {plan.estimated_duration_min || "—"} {t("app.workouts.min")}
      </span>
      <ArrowRight size={14} className="text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  </Link>
  );
};

export default AppWorkouts;
