import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Play, Clock, Dumbbell, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AppShell from "@/components/app/AppShell";
import BodyDiagram from "@/components/app/BodyDiagram";
import { Database } from "@/integrations/supabase/types";
import { toast } from "sonner";
import { useLanguage } from "@/i18n/LanguageContext";
import { pickLocalized } from "@/i18n/localized";

type Plan = Database["public"]["Tables"]["workout_plans"]["Row"];
type PlanExercise = Database["public"]["Tables"]["workout_plan_exercises"]["Row"];
type Exercise = Database["public"]["Tables"]["exercises"]["Row"];
type MuscleGroup = Database["public"]["Enums"]["muscle_group"];

interface Item extends PlanExercise {
  exercise: Exercise;
}

const AppWorkoutDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      const [planRes, itemsRes] = await Promise.all([
        supabase.from("workout_plans").select("*").eq("id", id).maybeSingle(),
        supabase.from("workout_plan_exercises").select("*, exercise:exercises(*)").eq("plan_id", id).order("position"),
      ]);
      setPlan(planRes.data as Plan);
      setItems((itemsRes.data as unknown as Item[]) || []);
      setLoading(false);
    };
    load();
  }, [id]);

  const muscles: MuscleGroup[] = Array.from(
    new Set(items.flatMap((i) => [i.exercise.primary_muscle, ...(i.exercise.secondary_muscles || [])]))
  );

  const isOwn = plan && !plan.is_premade && plan.user_id === user?.id;

  const handleDelete = async () => {
    if (!plan || !confirm("Weet je zeker dat je dit plan wilt verwijderen?")) return;
    const { error } = await supabase.from("workout_plans").delete().eq("id", plan.id);
    if (error) toast.error("Verwijderen mislukt");
    else {
      toast.success("Plan verwijderd");
      navigate("/app/workouts");
    }
  };

  return (
    <AppShell>
      <div className="p-6 md:p-10 max-w-5xl mx-auto">
        <Link to="/app/workouts" className="inline-flex items-center gap-2 text-xs font-heading tracking-wider text-muted-foreground hover:text-primary mb-6">
          <ArrowLeft size={14} /> WORKOUTS
        </Link>

        {loading ? (
          <div className="text-muted-foreground text-sm">Laden...</div>
        ) : !plan ? (
          <div className="text-muted-foreground text-sm">Plan niet gevonden</div>
        ) : (
          <>
            <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
              <div>
                <p className="text-primary font-heading text-xs tracking-[0.35em] mb-2">{plan.is_premade ? "KANT-EN-KLAAR" : "EIGEN PLAN"}</p>
                <h1 className="text-3xl md:text-4xl font-heading text-foreground">{pickLocalized(plan as unknown as Record<string, unknown>, "name", language)}</h1>
                {pickLocalized(plan as unknown as Record<string, unknown>, "description", language) && <p className="text-sm text-muted-foreground mt-2 max-w-xl">{pickLocalized(plan as unknown as Record<string, unknown>, "description", language)}</p>}
                <div className="flex gap-4 mt-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5"><Clock size={12} /> {plan.estimated_duration_min || "—"} min</span>
                  <span className="flex items-center gap-1.5"><Dumbbell size={12} /> {items.length} oefeningen</span>
                </div>
              </div>
              <div className="flex gap-2">
                {isOwn && (
                  <button
                    onClick={handleDelete}
                    className="w-11 h-11 border border-border rounded-sm hover:border-destructive text-muted-foreground hover:text-destructive transition-colors flex items-center justify-center"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
                <Link
                  to={`/app/workouts/${plan.id}/start`}
                  className="px-5 py-3 bg-primary text-primary-foreground font-heading text-sm tracking-wider rounded-sm hover:bg-primary/90 transition-colors flex items-center gap-2 shadow-red"
                >
                  <Play size={16} /> START WORKOUT
                </Link>
              </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-3">
                <h2 className="text-xs font-heading tracking-wider text-muted-foreground mb-2">OEFENINGEN</h2>
                {items.map((item, idx) => {
                  const exName = pickLocalized(item.exercise as unknown as Record<string, unknown>, "name", language);
                  return (
                  <div key={item.id} className="border border-border bg-card p-3 rounded-sm flex items-center gap-3">
                    {item.exercise.image_url ? (
                      <img
                        src={item.exercise.image_url}
                        alt={exName}
                        loading="lazy"
                        className="w-14 h-14 object-cover rounded-sm flex-shrink-0"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-sm bg-primary/10 text-primary font-heading flex items-center justify-center text-sm flex-shrink-0">
                        {idx + 1}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-heading text-foreground truncate">{exName}</p>
                      <p className="text-xs text-muted-foreground capitalize mt-0.5 truncate">
                        {item.exercise.primary_muscle.replace("_", " ")} • {item.exercise.equipment}
                      </p>
                    </div>
                    <div className="text-right text-xs text-muted-foreground whitespace-nowrap">
                      <p className="font-heading text-foreground text-sm">{item.target_sets} × {item.target_reps || "—"}</p>
                      <p>{item.rest_seconds}s rust</p>
                    </div>
                  </div>
                  );
                })}
              </div>

              <div>
                <h2 className="text-xs font-heading tracking-wider text-muted-foreground mb-2">SPIERGROEPEN</h2>
                <div className="border border-border bg-card p-4 rounded-sm">
                  <BodyDiagram activeMuscles={muscles} />
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
};

export default AppWorkoutDetail;
