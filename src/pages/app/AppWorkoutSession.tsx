import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Check, Flame, Clock, HeartPulse, Bluetooth, BluetoothOff, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AppShell from "@/components/app/AppShell";
import RestTimer from "@/components/app/RestTimer";
import ExerciseMedia from "@/components/app/ExerciseMedia";
import { Database } from "@/integrations/supabase/types";
import { toast } from "sonner";
import { calculateCalories, calculateAge } from "@/lib/calories";
import {
  caloriesFromHeartRate,
  connectHeartRateMonitor,
  isWebBluetoothSupported,
  type HRMonitorHandle,
} from "@/lib/heartRate";
type Plan = Database["public"]["Tables"]["workout_plans"]["Row"];
type PlanExercise = Database["public"]["Tables"]["workout_plan_exercises"]["Row"];
type Exercise = Database["public"]["Tables"]["exercises"]["Row"];
type TrainingMode = Database["public"]["Enums"]["training_mode"];

interface Item extends PlanExercise {
  exercise: Exercise;
}

interface SetEntry {
  reps: string;
  weight: string;
  done: boolean;
}

const MODES: { key: TrainingMode; label: string }[] = [
  { key: "hypertrofie", label: "HYPERTROFIE" },
  { key: "powerlift", label: "POWERLIFT" },
  { key: "uithoudingsvermogen", label: "UITHOUDING" },
];

const AppWorkoutSession = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [mode, setMode] = useState<TrainingMode>("hypertrofie");
  const [currentIdx, setCurrentIdx] = useState(0);
  const [sets, setSets] = useState<Record<string, SetEntry[]>>({});
  const [startedAt] = useState(new Date());
  const [tick, setTick] = useState(0);
  const [profileWeight, setProfileWeight] = useState<number>(75);
  const [profileAge, setProfileAge] = useState<number>(30);
  const [profileGender, setProfileGender] = useState<"man" | "vrouw" | "anders">("man");
  const [finishing, setFinishing] = useState(false);

  // Personal records: best weight × reps + best e1RM per exercise_id (loaded once at start)
  const [prMap, setPrMap] = useState<Record<string, { weight: number; reps: number; e1rm: number }>>({});

  // Heart rate state
  const [currentHR, setCurrentHR] = useState<number | null>(null);
  const [hrSamples, setHrSamples] = useState<number[]>([]);
  const [hrConnected, setHrConnected] = useState(false);
  const [hrDeviceName, setHrDeviceName] = useState<string>("");
  const [hrConnecting, setHrConnecting] = useState(false);
  const hrHandleRef = useRef<HRMonitorHandle | null>(null);

  // Load plan + items + start session
  useEffect(() => {
    if (!id || !user) return;
    const init = async () => {
      const [planRes, itemsRes, profileRes] = await Promise.all([
        supabase.from("workout_plans").select("*").eq("id", id).maybeSingle(),
        supabase.from("workout_plan_exercises").select("*, exercise:exercises(*)").eq("plan_id", id).order("position"),
        supabase.from("profiles").select("gewicht_kg, geboortedatum, geslacht").eq("user_id", user.id).maybeSingle(),
      ]);
      const p = planRes.data as Plan;
      const its = (itemsRes.data as unknown as Item[]) || [];
      setPlan(p);
      setItems(its);
      if (profileRes.data?.gewicht_kg) setProfileWeight(Number(profileRes.data.gewicht_kg));
      const age = calculateAge(profileRes.data?.geboortedatum ?? null);
      if (age) setProfileAge(age);
      if (profileRes.data?.geslacht) setProfileGender(profileRes.data.geslacht);

      // Init sets
      const init: Record<string, SetEntry[]> = {};
      its.forEach((i) => {
        init[i.id] = Array.from({ length: i.target_sets }, () => ({ reps: "", weight: "", done: false }));
      });
      setSets(init);

      // Create session
      const { data: sess } = await supabase
        .from("workout_sessions")
        .insert({
          user_id: user.id,
          plan_id: p?.id ?? null,
          plan_name_snapshot: p?.name ?? "Workout",
          training_mode: "hypertrofie",
        })
        .select()
        .single();
      if (sess) setSessionId(sess.id);

      // Load existing PRs for the exercises in this plan
      const exerciseIds = its.map((i) => i.exercise.id);
      if (exerciseIds.length > 0) {
        const { data: prevSessions } = await supabase
          .from("workout_sessions")
          .select("id")
          .eq("user_id", user.id);
        const prevIds = (prevSessions ?? []).map((s) => s.id).filter((sid) => sid !== sess?.id);
        if (prevIds.length > 0) {
          const { data: logs } = await supabase
            .from("workout_set_logs")
            .select("exercise_id, reps, weight_kg")
            .in("session_id", prevIds)
            .in("exercise_id", exerciseIds)
            .not("weight_kg", "is", null)
            .not("reps", "is", null)
            .gt("weight_kg", 0)
            .gt("reps", 0);
          const map: Record<string, { weight: number; reps: number; e1rm: number }> = {};
          (logs ?? []).forEach((l) => {
            const w = Number(l.weight_kg);
            const r = Number(l.reps);
            const e1rm = w * (1 + r / 30);
            const cur = map[l.exercise_id];
            if (!cur || e1rm > cur.e1rm) {
              map[l.exercise_id] = { weight: w, reps: r, e1rm };
            }
          });
          setPrMap(map);
        }
      }
    };
    init();
  }, [id, user]);

  // Tick for elapsed timer
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const elapsedSec = Math.floor((Date.now() - startedAt.getTime()) / 1000);
  const avgHRSoFar = useMemo(
    () => (hrSamples.length > 0 ? Math.round(hrSamples.reduce((a, b) => a + b, 0) / hrSamples.length) : null),
    [hrSamples]
  );
  const maxHRSoFar = useMemo(
    () => (hrSamples.length > 0 ? Math.max(...hrSamples) : null),
    [hrSamples]
  );
  const calories = useMemo(() => {
    if (avgHRSoFar) {
      return caloriesFromHeartRate({
        avgHeartRate: avgHRSoFar,
        weightKg: profileWeight,
        ageYears: profileAge,
        gender: profileGender,
        durationSeconds: elapsedSec,
      });
    }
    return calculateCalories(mode, profileWeight, elapsedSec);
  }, [avgHRSoFar, mode, profileWeight, profileAge, profileGender, elapsedSec]);

  // Cleanup HR connection on unmount
  useEffect(() => {
    return () => {
      hrHandleRef.current?.disconnect();
    };
  }, []);

  const handleConnectHR = async () => {
    if (!isWebBluetoothSupported()) {
      toast.error("Web Bluetooth wordt niet ondersteund. Gebruik Chrome of Edge op desktop of Android.");
      return;
    }
    setHrConnecting(true);
    try {
      const handle = await connectHeartRateMonitor(
        (bpm) => {
          setCurrentHR(bpm);
          setHrSamples((prev) => [...prev, bpm]);
        },
        () => {
          setHrConnected(false);
          setCurrentHR(null);
          toast.warning("Hartslagband verbroken");
        }
      );
      hrHandleRef.current = handle;
      setHrConnected(true);
      setHrDeviceName(handle.deviceName);
      toast.success(`Verbonden met ${handle.deviceName}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Verbinden mislukt";
      if (!msg.includes("cancelled") && !msg.includes("User cancelled")) {
        toast.error(msg);
      }
    } finally {
      setHrConnecting(false);
    }
  };

  const handleDisconnectHR = () => {
    hrHandleRef.current?.disconnect();
    hrHandleRef.current = null;
    setHrConnected(false);
    setCurrentHR(null);
  };

  const current = items[currentIdx];

  const toggleSet = async (itemId: string, setIdx: number) => {
    const item = items.find((i) => i.id === itemId);
    if (!item || !sessionId) return;
    const entry = sets[itemId][setIdx];
    const wasDone = entry.done;

    setSets((prev) => ({
      ...prev,
      [itemId]: prev[itemId].map((s, i) => (i === setIdx ? { ...s, done: !s.done } : s)),
    }));

    if (!wasDone) {
      // Fallback: if reps left empty, use the lower bound of target_reps (e.g. "6-8" → 6)
      const fallbackReps = item.target_reps ? parseInt(item.target_reps.split("-")[0]) : null;
      const reps = entry.reps ? parseInt(entry.reps) : fallbackReps;
      const weight = entry.weight ? parseFloat(entry.weight) : null;

      // Log it
      await supabase.from("workout_set_logs").insert({
        session_id: sessionId,
        exercise_id: item.exercise.id,
        exercise_position: item.position,
        set_number: setIdx + 1,
        reps,
        weight_kg: weight,
        rest_seconds: item.rest_seconds,
      });

      // Personal record check (Epley e1RM)
      if (weight && reps && weight > 0 && reps > 0) {
        const e1rm = weight * (1 + reps / 30);
        const exId = item.exercise.id;
        const prev = prMap[exId];
        if (!prev) {
          // First record for this exercise
          toast.success(`🏆 EERSTE RECORD: ${item.exercise.name}`, {
            description: `${weight} kg × ${reps} reps`,
          });
          setPrMap((m) => ({ ...m, [exId]: { weight, reps, e1rm } }));
        } else if (e1rm > prev.e1rm + 0.01) {
          const diff = Math.round((e1rm - prev.e1rm) * 10) / 10;
          toast.success(`🏆 NIEUWE PR: ${item.exercise.name}`, {
            description: `${weight} kg × ${reps} (~${Math.round(e1rm * 10) / 10} kg 1RM, +${diff} kg)`,
          });
          setPrMap((m) => ({ ...m, [exId]: { weight, reps, e1rm } }));
        }
      }
    }
  };

  const updateSet = (itemId: string, setIdx: number, patch: Partial<SetEntry>) => {
    setSets((prev) => ({
      ...prev,
      [itemId]: prev[itemId].map((s, i) => (i === setIdx ? { ...s, ...patch } : s)),
    }));
  };

  const finishWorkout = async () => {
    if (!sessionId || finishing) return;
    setFinishing(true);

    const validAvg = avgHRSoFar && avgHRSoFar >= 30 && avgHRSoFar <= 250 ? avgHRSoFar : null;
    const validMax = maxHRSoFar && maxHRSoFar >= 30 && maxHRSoFar <= 250 ? maxHRSoFar : null;
    const hrSource = validAvg ? "bluetooth" : null;

    // Disconnect BLE before navigating away
    hrHandleRef.current?.disconnect();
    hrHandleRef.current = null;

    await supabase
      .from("workout_sessions")
      .update({
        ended_at: new Date().toISOString(),
        duration_seconds: elapsedSec,
        training_mode: mode,
        avg_heart_rate: validAvg,
        max_heart_rate: validMax,
        hr_source: hrSource,
      })
      .eq("id", sessionId);

    // Recalculate rank in the background. If promoted → redirect to rank page with celebration params.
    const { data: rankData, error: rankErr } = await supabase.functions.invoke("calculate-rank");

    toast.success("Workout afgerond! 🔥");

    if (!rankErr && rankData?.promoted) {
      const params = new URLSearchParams({
        celebrate: "1",
        to: `${rankData.tier}-${rankData.division}`,
        score: String(Math.round(rankData.total_score ?? 0)),
      });
      if (rankData.from_tier) params.set("from", `${rankData.from_tier}-${rankData.from_division}`);
      navigate(`/app/rank?${params.toString()}`);
    } else {
      navigate("/app/workouts");
    }
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  if (!plan || items.length === 0) {
    return (
      <AppShell>
        <div className="p-6 text-muted-foreground text-sm">Laden...</div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="p-4 md:p-8 max-w-5xl mx-auto pb-32">
        <Link to={`/app/workouts/${id}`} className="inline-flex items-center gap-2 text-xs font-heading tracking-wider text-muted-foreground hover:text-primary mb-4">
          <ArrowLeft size={14} /> TERUG
        </Link>

        <div className="mb-6">
          <p className="text-primary font-heading text-xs tracking-[0.35em] mb-2">LIVE WORKOUT</p>
          <h1 className="text-2xl md:text-3xl font-heading text-foreground">{plan.name}</h1>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <div className="border border-border bg-card p-3 rounded-sm">
            <p className="text-[10px] font-heading tracking-wider text-muted-foreground flex items-center gap-1"><Clock size={10} />TIJD</p>
            <p className="text-xl font-heading text-foreground tabular-nums mt-1">{formatTime(elapsedSec)}</p>
          </div>
          <div className="border border-border bg-card p-3 rounded-sm">
            <p className="text-[10px] font-heading tracking-wider text-muted-foreground flex items-center gap-1">
              <Flame size={10} />KCAL{!avgHRSoFar && <span className="text-muted-foreground/60">~</span>}
            </p>
            <p className="text-xl font-heading text-foreground tabular-nums mt-1">{calories}</p>
          </div>
          <div className={`border p-3 rounded-sm ${hrConnected ? "border-primary bg-primary/5" : "border-border bg-card"}`}>
            <p className="text-[10px] font-heading tracking-wider text-muted-foreground flex items-center gap-1">
              <HeartPulse size={10} className={hrConnected ? "text-primary" : ""} />HARTSLAG
            </p>
            <p className="text-xl font-heading text-foreground tabular-nums mt-1">
              {currentHR ? `${currentHR}` : <span className="text-muted-foreground/40 text-sm">—</span>}
              {currentHR && <span className="text-[10px] text-muted-foreground ml-1">bpm</span>}
            </p>
          </div>
          <div className="border border-border bg-card p-3 rounded-sm">
            <p className="text-[10px] font-heading tracking-wider text-muted-foreground">VOORTGANG</p>
            <p className="text-xl font-heading text-foreground tabular-nums mt-1">{currentIdx + 1}/{items.length}</p>
          </div>
        </div>

        {/* HR connect button */}
        <div className="mb-6">
          {hrConnected ? (
            <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-primary/5 border border-primary/30 rounded-sm">
              <div className="flex items-center gap-2 text-xs">
                <Bluetooth size={14} className="text-primary" />
                <span className="text-foreground font-heading tracking-wider">{hrDeviceName.toUpperCase()}</span>
                <span className="text-muted-foreground">verbonden — exacte kcal actief</span>
              </div>
              <button
                onClick={handleDisconnectHR}
                className="text-[10px] font-heading tracking-wider text-muted-foreground hover:text-primary inline-flex items-center gap-1"
              >
                <BluetoothOff size={12} /> ONTKOPPEL
              </button>
            </div>
          ) : (
            <button
              onClick={handleConnectHR}
              disabled={hrConnecting || !isWebBluetoothSupported()}
              className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-border bg-card hover:border-primary text-foreground font-heading text-xs tracking-wider rounded-sm disabled:opacity-50 transition-colors"
              title={!isWebBluetoothSupported() ? "Web Bluetooth niet ondersteund — gebruik Chrome/Edge of Android" : ""}
            >
              <HeartPulse size={14} className="text-primary" />
              {hrConnecting ? "VERBINDEN..." : "HARTSLAGBAND KOPPELEN (POLAR / GARMIN / WAHOO)"}
            </button>
          )}
        </div>

        {/* Mode selector */}
        <div className="mb-6">
          <p className="text-xs font-heading tracking-wider text-muted-foreground mb-2">TRAININGSMODUS (RUSTPRESETS)</p>
          <div className="flex gap-2 flex-wrap">
            {MODES.map((m) => (
              <button
                key={m.key}
                onClick={() => setMode(m.key)}
                className={`px-4 py-2 text-xs font-heading tracking-wider rounded-sm border transition-colors ${
                  mode === m.key
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-muted-foreground border-border hover:border-primary"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Exercise nav */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          {items.map((it, idx) => {
            const allDone = sets[it.id]?.every((s) => s.done);
            return (
              <button
                key={it.id}
                onClick={() => setCurrentIdx(idx)}
                className={`px-3 py-1.5 text-[10px] font-heading tracking-wider rounded-sm whitespace-nowrap border transition-colors ${
                  idx === currentIdx
                    ? "bg-primary text-primary-foreground border-primary"
                    : allDone
                    ? "bg-card text-foreground border-primary/40"
                    : "bg-card text-muted-foreground border-border"
                }`}
              >
                {idx + 1}. {it.exercise.name}
                {allDone && <Check size={10} className="inline ml-1" />}
              </button>
            );
          })}
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Current exercise */}
          {current && (
            <div className="border-2 border-primary/30 bg-card p-5 rounded-sm">
              <div className="mb-4 flex gap-4">
                {current.exercise.image_url && (
                  <img
                    src={current.exercise.image_url}
                    alt={current.exercise.name}
                    loading="lazy"
                    className="w-24 h-24 object-cover rounded-sm border border-border flex-shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-heading tracking-wider text-primary">OEFENING {currentIdx + 1}</p>
                  <h2 className="text-xl font-heading text-foreground mt-1">{current.exercise.name}</h2>
                  <p className="text-xs text-muted-foreground capitalize mt-1">
                    {current.exercise.primary_muscle.replace("_"," ")} • doel {current.target_sets} × {current.target_reps || "—"}
                  </p>
                  {prMap[current.exercise.id] && (
                    <p className="text-[10px] font-heading tracking-wider text-primary/80 mt-2 inline-flex items-center gap-1">
                      <Trophy size={10} /> JOUW PR: {prMap[current.exercise.id].weight}KG × {prMap[current.exercise.id].reps}
                    </p>
                  )}
                </div>
              </div>
              {/* Thumbnail + lazy-loaded loop-video's (gedragen zich als GIFs) */}
              <ExerciseMedia
                key={current.exercise.id}
                exerciseName={current.exercise.name}
                imageUrl={(current.exercise as Exercise & { image_url?: string | null }).image_url ?? null}
                videoUrl1={(current.exercise as Exercise & { video_url_1?: string | null }).video_url_1 ?? null}
                videoUrl2={(current.exercise as Exercise & { video_url_2?: string | null }).video_url_2 ?? null}
              />
              {current.exercise.description && (
                <p className="text-sm font-heading text-foreground mb-2 leading-relaxed">{current.exercise.description}</p>
              )}
              {current.exercise.instructions && (
                <p className="text-xs text-muted-foreground mb-3 leading-relaxed">{current.exercise.instructions}</p>
              )}
              {current.exercise.tips && (
                <p className="text-xs text-primary/80 mb-4 leading-relaxed border-l-2 border-primary/40 pl-3">
                  <span className="font-heading tracking-wider text-[10px] text-primary block mb-1">TIP</span>
                  {current.exercise.tips}
                </p>
              )}

              <div className="space-y-2">
                <div className="grid grid-cols-12 gap-2 text-[10px] font-heading tracking-wider text-muted-foreground px-1">
                  <div className="col-span-1">SET</div>
                  <div className="col-span-4">REPS</div>
                  <div className="col-span-5">GEWICHT (KG)</div>
                  <div className="col-span-2 text-right">OK</div>
                </div>
                {sets[current.id]?.map((s, i) => (
                  <div key={i} className={`grid grid-cols-12 gap-2 items-center p-2 rounded-sm ${s.done ? "bg-primary/10" : "bg-background"}`}>
                    <div className="col-span-1 text-sm font-heading text-foreground">{i + 1}</div>
                    <input
                      type="number"
                      value={s.reps}
                      onChange={(e) => updateSet(current.id, i, { reps: e.target.value })}
                      placeholder={current.target_reps?.split("-")[0] || "10"}
                      className="col-span-4 px-2 py-1.5 bg-background border border-border rounded-sm text-sm focus:outline-none focus:border-primary"
                    />
                    <input
                      type="number"
                      step="0.5"
                      value={s.weight}
                      onChange={(e) => updateSet(current.id, i, { weight: e.target.value })}
                      placeholder="0"
                      className="col-span-5 px-2 py-1.5 bg-background border border-border rounded-sm text-sm focus:outline-none focus:border-primary"
                    />
                    <button
                      onClick={() => toggleSet(current.id, i)}
                      className={`col-span-2 h-9 rounded-sm flex items-center justify-center transition-colors ${
                        s.done ? "bg-primary text-primary-foreground" : "border border-border hover:border-primary text-muted-foreground"
                      }`}
                    >
                      <Check size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Rest timer */}
          <div className="space-y-4">
            <RestTimer mode={mode} defaultRest={current?.rest_seconds ?? undefined} />
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
                disabled={currentIdx === 0}
                className="flex-1 py-3 border border-border text-muted-foreground font-heading text-xs tracking-wider rounded-sm hover:border-primary disabled:opacity-40"
              >
                VORIGE
              </button>
              <button
                onClick={() => setCurrentIdx((i) => Math.min(items.length - 1, i + 1))}
                disabled={currentIdx === items.length - 1}
                className="flex-1 py-3 bg-primary text-primary-foreground font-heading text-xs tracking-wider rounded-sm hover:bg-primary/90 disabled:opacity-40"
              >
                VOLGENDE
              </button>
            </div>
          </div>
        </div>

        {/* Finish bar */}
        <div className="fixed bottom-0 left-0 right-0 md:left-64 bg-card border-t border-border p-4 z-30">
          <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
            <div className="text-xs">
              <p className="text-muted-foreground">
                Tijd: <span className="text-foreground tabular-nums">{formatTime(elapsedSec)}</span> •{" "}
                <span className="text-foreground">{calories}</span> kcal
                {avgHRSoFar && <span className="text-primary"> • ❤ {avgHRSoFar} bpm</span>}
              </p>
            </div>
            <button
              onClick={finishWorkout}
              disabled={finishing}
              className="px-6 py-3 bg-primary text-primary-foreground font-heading text-sm tracking-wider rounded-sm hover:bg-primary/90 shadow-red disabled:opacity-50"
            >
              {finishing ? "OPSLAAN..." : "WORKOUT AFRONDEN"}
            </button>
          </div>
        </div>
      </div>
    </AppShell>
  );
};

export default AppWorkoutSession;
