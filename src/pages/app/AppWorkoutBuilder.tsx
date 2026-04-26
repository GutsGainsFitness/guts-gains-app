import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, X, Search } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AppShell from "@/components/app/AppShell";
import { Database } from "@/integrations/supabase/types";
import { toast } from "sonner";

type Exercise = Database["public"]["Tables"]["exercises"]["Row"];
type Focus = Database["public"]["Enums"]["workout_focus"];
type Difficulty = Database["public"]["Enums"]["exercise_difficulty"];

interface Item {
  exercise: Exercise;
  target_sets: number;
  target_reps: string;
  rest_seconds: number;
}

const AppWorkoutBuilder = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [focus, setFocus] = useState<Focus>("full_body");
  const [difficulty, setDifficulty] = useState<Difficulty>("beginner");
  const [estDuration, setEstDuration] = useState(45);
  const [items, setItems] = useState<Item[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [search, setSearch] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from("exercises").select("*").order("name").then(({ data }) => {
      setExercises((data as Exercise[]) || []);
    });
  }, []);

  const addExercise = (ex: Exercise) => {
    setItems((prev) => [...prev, { exercise: ex, target_sets: 3, target_reps: "10", rest_seconds: 75 }]);
    setPickerOpen(false);
    setSearch("");
  };

  const updateItem = (idx: number, patch: Partial<Item>) => {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  };

  const removeItem = (idx: number) => setItems((prev) => prev.filter((_, i) => i !== idx));

  const filteredExercises = exercises.filter(
    (e) => !items.some((i) => i.exercise.id === e.id) && (search === "" || e.name.toLowerCase().includes(search.toLowerCase()))
  );

  const save = async () => {
    if (!user) return;
    if (!name.trim()) return toast.error("Geef je workout een naam");
    if (items.length === 0) return toast.error("Voeg minstens 1 oefening toe");
    setSaving(true);

    const { data: planData, error: planErr } = await supabase
      .from("workout_plans")
      .insert({
        name: name.trim(),
        description: description.trim() || null,
        focus,
        difficulty,
        estimated_duration_min: estDuration,
        is_premade: false,
        user_id: user.id,
      })
      .select()
      .single();

    if (planErr || !planData) {
      setSaving(false);
      return toast.error("Opslaan mislukt");
    }

    const { error: exErr } = await supabase.from("workout_plan_exercises").insert(
      items.map((it, idx) => ({
        plan_id: planData.id,
        exercise_id: it.exercise.id,
        position: idx,
        target_sets: it.target_sets,
        target_reps: it.target_reps || null,
        rest_seconds: it.rest_seconds,
      }))
    );

    setSaving(false);
    if (exErr) return toast.error("Oefeningen opslaan mislukt");
    toast.success("Workout opgeslagen");
    navigate(`/app/workouts/${planData.id}`);
  };

  return (
    <AppShell>
      <div className="p-6 md:p-10 max-w-4xl mx-auto">
        <Link to="/app/workouts" className="inline-flex items-center gap-2 text-xs font-heading tracking-wider text-muted-foreground hover:text-primary mb-6">
          <ArrowLeft size={14} /> WORKOUTS
        </Link>

        <div className="mb-8">
          <p className="text-primary font-heading text-xs tracking-[0.35em] mb-2">EIGEN WORKOUT</p>
          <h1 className="text-3xl font-heading text-foreground">NIEUWE WORKOUT</h1>
        </div>

        <div className="space-y-6">
          {/* Meta */}
          <div className="border border-border bg-card p-5 rounded-sm space-y-4">
            <div>
              <label className="text-xs font-heading tracking-wider text-muted-foreground mb-1.5 block">NAAM</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Bijv. Mijn Booty Booster"
                className="input"
              />
            </div>
            <div>
              <label className="text-xs font-heading tracking-wider text-muted-foreground mb-1.5 block">OMSCHRIJVING (OPTIONEEL)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="input resize-none"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-heading tracking-wider text-muted-foreground mb-1.5 block">FOCUS</label>
                <select value={focus} onChange={(e) => setFocus(e.target.value as Focus)} className="input">
                  {["booty","chest","back","legs","shoulders","arms","push","pull","full_body","core","cardio"].map((f) => (
                    <option key={f} value={f}>{f.replace("_"," ")}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-heading tracking-wider text-muted-foreground mb-1.5 block">NIVEAU</label>
                <select value={difficulty} onChange={(e) => setDifficulty(e.target.value as Difficulty)} className="input">
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Gevorderd</option>
                  <option value="advanced">Expert</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-heading tracking-wider text-muted-foreground mb-1.5 block">DUUR (MIN)</label>
                <input type="number" min={10} max={180} value={estDuration} onChange={(e) => setEstDuration(parseInt(e.target.value) || 0)} className="input" />
              </div>
            </div>
          </div>

          {/* Exercises */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-heading tracking-wider text-muted-foreground">OEFENINGEN ({items.length})</h2>
              <button
                onClick={() => setPickerOpen((o) => !o)}
                className="px-4 py-2 border border-primary/40 text-primary font-heading text-xs tracking-wider rounded-sm hover:bg-primary/10 transition-colors flex items-center gap-2"
              >
                <Plus size={14} /> OEFENING TOEVOEGEN
              </button>
            </div>

            {pickerOpen && (
              <div className="border-2 border-primary/30 bg-card p-4 rounded-sm mb-4">
                <div className="relative mb-3">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    autoFocus
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Zoek oefening..."
                    className="input pl-9"
                  />
                </div>
                <div className="max-h-72 overflow-y-auto space-y-1">
                  {filteredExercises.slice(0, 50).map((ex) => (
                    <button
                      key={ex.id}
                      onClick={() => addExercise(ex)}
                      className="w-full text-left px-3 py-2 hover:bg-muted rounded-sm flex items-center justify-between group"
                    >
                      <span className="text-sm text-foreground">{ex.name}</span>
                      <span className="text-xs text-muted-foreground capitalize">{ex.primary_muscle.replace("_"," ")}</span>
                    </button>
                  ))}
                  {filteredExercises.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-4">Geen oefeningen gevonden</p>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-2">
              {items.map((it, idx) => (
                <div key={`${it.exercise.id}-${idx}`} className="border border-border bg-card p-4 rounded-sm">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-sm bg-primary/10 text-primary font-heading flex items-center justify-center text-sm">{idx + 1}</div>
                    <p className="font-heading text-foreground flex-1">{it.exercise.name}</p>
                    <button onClick={() => removeItem(idx)} className="text-muted-foreground hover:text-destructive">
                      <X size={16} />
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] font-heading tracking-wider text-muted-foreground mb-1 block">SETS</label>
                      <input type="number" min={1} max={20} value={it.target_sets} onChange={(e) => updateItem(idx, { target_sets: parseInt(e.target.value) || 1 })} className="input" />
                    </div>
                    <div>
                      <label className="text-[10px] font-heading tracking-wider text-muted-foreground mb-1 block">REPS</label>
                      <input value={it.target_reps} onChange={(e) => updateItem(idx, { target_reps: e.target.value })} placeholder="10 of 8-12" className="input" />
                    </div>
                    <div>
                      <label className="text-[10px] font-heading tracking-wider text-muted-foreground mb-1 block">RUST (S)</label>
                      <input type="number" min={0} max={600} value={it.rest_seconds} onChange={(e) => updateItem(idx, { rest_seconds: parseInt(e.target.value) || 0 })} className="input" />
                    </div>
                  </div>
                </div>
              ))}
              {items.length === 0 && (
                <div className="border border-dashed border-border rounded-sm p-8 text-center text-sm text-muted-foreground">
                  Nog geen oefeningen toegevoegd
                </div>
              )}
            </div>
          </div>

          <button
            onClick={save}
            disabled={saving}
            className="w-full py-3.5 bg-primary text-primary-foreground font-heading text-sm tracking-wider rounded-sm hover:bg-primary/90 transition-all shadow-red disabled:opacity-50"
          >
            {saving ? "OPSLAAN..." : "WORKOUT OPSLAAN"}
          </button>
        </div>
      </div>
    </AppShell>
  );
};

export default AppWorkoutBuilder;
