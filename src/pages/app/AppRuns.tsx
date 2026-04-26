import { useEffect, useMemo, useState } from "react";
import { Footprints, Plus, Trash2, MapPin, Calendar, Clock, TrendingUp, X } from "lucide-react";
import AppShell from "@/components/app/AppShell";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useLanguage } from "@/i18n/LanguageContext";
import { intlLocale } from "@/i18n/dateLocale";

interface Run {
  id: string;
  run_date: string;
  distance_km: number;
  duration_seconds: number;
  pace_seconds_per_km: number | null;
  route_name: string | null;
  notes: string | null;
  perceived_effort: number | null;
}

const formatPace = (secondsPerKm: number | null) => {
  if (!secondsPerKm) return "—";
  const m = Math.floor(secondsPerKm / 60);
  const s = secondsPerKm % 60;
  return `${m}:${s.toString().padStart(2, "0")}/km`;
};

const formatDuration = (seconds: number) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}u ${m}m`;
  return `${m}m ${s.toString().padStart(2, "0")}s`;
};

const AppRuns = () => {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form fields
  const [distance, setDistance] = useState("");
  const [minutes, setMinutes] = useState("");
  const [seconds, setSeconds] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [routeName, setRouteName] = useState("");
  const [effort, setEffort] = useState<number>(7);
  const [notes, setNotes] = useState("");

  const loadRuns = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("runs")
      .select("*")
      .eq("user_id", user.id)
      .order("run_date", { ascending: false })
      .limit(50);
    setRuns((data as Run[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    loadRuns();
  }, [user]);

  const stats = useMemo(() => {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const yearStart = new Date(monthStart.getFullYear(), 0, 1);

    const month = runs.filter((r) => new Date(r.run_date) >= monthStart);
    const year = runs.filter((r) => new Date(r.run_date) >= yearStart);
    const all = runs;

    const sum = (arr: Run[]) => arr.reduce((a, b) => a + Number(b.distance_km), 0);
    const bestPace = all
      .map((r) => r.pace_seconds_per_km)
      .filter((p): p is number => p !== null && p > 0)
      .sort((a, b) => a - b)[0];

    return {
      monthKm: sum(month).toFixed(1),
      yearKm: sum(year).toFixed(1),
      totalKm: sum(all).toFixed(1),
      monthRuns: month.length,
      bestPace,
    };
  }, [runs]);

  const resetForm = () => {
    setDistance("");
    setMinutes("");
    setSeconds("");
    setRouteName("");
    setNotes("");
    setEffort(7);
    setDate(new Date().toISOString().slice(0, 10));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const km = parseFloat(distance);
    const totalSec = (parseInt(minutes || "0") * 60) + parseInt(seconds || "0");
    if (!km || km <= 0) {
      toast.error(t("app.runs.invalid_distance"));
      return;
    }
    if (!totalSec || totalSec <= 0) {
      toast.error(t("app.runs.invalid_time"));
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("runs").insert({
      user_id: user.id,
      distance_km: km,
      duration_seconds: totalSec,
      run_date: date,
      route_name: routeName || null,
      notes: notes || null,
      perceived_effort: effort,
    });
    setSubmitting(false);
    if (error) {
      toast.error(t("app.runs.save_failed"));
    } else {
      toast.success(t("app.runs.saved"));
      resetForm();
      setShowForm(false);
      loadRuns();
    }
  };

  const deleteRun = async (id: string) => {
    if (!confirm(t("app.runs.delete_confirm"))) return;
    const { error } = await supabase.from("runs").delete().eq("id", id);
    if (error) toast.error(t("app.runs.delete_failed"));
    else {
      toast.success(t("app.runs.deleted"));
      loadRuns();
    }
  };

  return (
    <AppShell>
      <div className="p-6 md:p-10 max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <p className="text-primary font-heading text-xs tracking-[0.35em] mb-2">{t("app.runs.tag")}</p>
            <h1 className="text-3xl font-heading text-foreground flex items-center gap-3">
              <Footprints size={28} className="text-primary" />
              {t("app.runs.title")}
            </h1>
            <p className="text-sm text-muted-foreground mt-2">
              {t("app.runs.desc")}
            </p>
          </div>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="shrink-0 inline-flex items-center gap-2 px-4 h-11 bg-primary text-primary-foreground font-heading text-xs tracking-wider rounded-sm hover:bg-primary/90"
            >
              <Plus size={16} /> {t("app.runs.log_run")}
            </button>
          )}
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <StatCard label={t("app.runs.this_month")} value={`${stats.monthKm}`} unit="km" highlight />
          <StatCard label={t("app.runs.this_year")} value={`${stats.yearKm}`} unit="km" />
          <StatCard label={t("app.runs.all_time")} value={`${stats.totalKm}`} unit="km" />
          <StatCard label={t("app.runs.best_pace")} value={formatPace(stats.bestPace ?? null)} unit="" />
        </div>

        {/* Add run form */}
        {showForm && (
          <form onSubmit={submit} className="mb-6 border-2 border-primary/30 bg-card p-6 rounded-sm">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-heading tracking-[0.3em] text-primary">{t("app.runs.new_run")}</p>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {/* Distance */}
              <div>
                <label className="text-[10px] font-heading tracking-wider text-muted-foreground">{t("app.runs.distance_km")}</label>
                <input
                  type="number"
                  step="0.01"
                  value={distance}
                  onChange={(e) => setDistance(e.target.value)}
                  placeholder="5.00"
                  className="w-full mt-1 px-3 h-11 bg-background border border-border rounded-sm text-foreground font-heading text-lg tabular-nums focus:border-primary outline-none"
                  required
                />
              </div>

              {/* Time */}
              <div>
                <label className="text-[10px] font-heading tracking-wider text-muted-foreground">{t("app.runs.time")}</label>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="number"
                    value={minutes}
                    onChange={(e) => setMinutes(e.target.value)}
                    placeholder="25"
                    min="0"
                    max="600"
                    className="flex-1 px-3 h-11 bg-background border border-border rounded-sm text-foreground font-heading text-lg tabular-nums focus:border-primary outline-none"
                    required
                  />
                  <span className="text-xs font-heading text-muted-foreground">{t("app.runs.min_short")}</span>
                  <input
                    type="number"
                    value={seconds}
                    onChange={(e) => setSeconds(e.target.value)}
                    placeholder="30"
                    min="0"
                    max="59"
                    className="flex-1 px-3 h-11 bg-background border border-border rounded-sm text-foreground font-heading text-lg tabular-nums focus:border-primary outline-none"
                  />
                  <span className="text-xs font-heading text-muted-foreground">{t("app.runs.sec_short")}</span>
                </div>
              </div>

              {/* Date */}
              <div>
                <label className="text-[10px] font-heading tracking-wider text-muted-foreground">{t("app.runs.date")}</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  max={new Date().toISOString().slice(0, 10)}
                  className="w-full mt-1 px-3 h-11 bg-background border border-border rounded-sm text-foreground font-body focus:border-primary outline-none"
                  required
                />
              </div>

              {/* Route */}
              <div>
                <label className="text-[10px] font-heading tracking-wider text-muted-foreground">{t("app.runs.route_optional")}</label>
                <input
                  type="text"
                  value={routeName}
                  onChange={(e) => setRouteName(e.target.value)}
                  placeholder={t("app.runs.route_placeholder")}
                  maxLength={80}
                  className="w-full mt-1 px-3 h-11 bg-background border border-border rounded-sm text-foreground font-body focus:border-primary outline-none"
                />
              </div>

              {/* Effort */}
              <div className="md:col-span-2">
                <label className="text-[10px] font-heading tracking-wider text-muted-foreground">
                  {t("app.runs.effort")}: <span className="text-primary font-heading">{effort}/10</span>
                </label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={effort}
                  onChange={(e) => setEffort(parseInt(e.target.value))}
                  className="w-full mt-2 accent-primary"
                />
                <div className="flex justify-between text-[9px] text-muted-foreground font-heading tracking-wider mt-1">
                  <span>{t("app.runs.easy")}</span>
                  <span>{t("app.runs.solid")}</span>
                  <span>{t("app.runs.all_out")}</span>
                </div>
              </div>

              {/* Notes */}
              <div className="md:col-span-2">
                <label className="text-[10px] font-heading tracking-wider text-muted-foreground">{t("app.runs.note_optional")}</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t("app.runs.note_placeholder")}
                  rows={2}
                  maxLength={500}
                  className="w-full mt-1 px-3 py-2 bg-background border border-border rounded-sm text-foreground font-body focus:border-primary outline-none resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
                className="flex-1 h-11 border border-border rounded-sm text-muted-foreground hover:text-foreground font-heading text-xs tracking-wider"
              >
                {t("app.runs.cancel")}
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 h-11 bg-primary text-primary-foreground rounded-sm font-heading text-xs tracking-wider hover:bg-primary/90 disabled:opacity-50"
              >
                {submitting ? t("app.runs.saving") : t("app.runs.save")}
              </button>
            </div>
          </form>
        )}

        {/* Future GPS hint */}
        <div className="mb-6 p-3 bg-card/50 border border-dashed border-border rounded-sm">
          <p className="text-[11px] text-muted-foreground font-body">
            🛰️ <span className="text-foreground font-heading tracking-wide">{t("app.runs.coming_soon")}</span>{" "}
            {t("app.runs.coming_soon_desc")}
          </p>
        </div>

        {/* Runs list */}
        <div>
          <p className="text-xs font-heading tracking-[0.3em] text-muted-foreground mb-3">{t("app.runs.your_runs")}</p>
          {loading ? (
            <p className="text-center py-12 text-muted-foreground">{t("app.runs.loading")}</p>
          ) : runs.length === 0 ? (
            <div className="border-2 border-dashed border-border rounded-sm p-12 text-center">
              <Footprints size={40} className="mx-auto text-muted-foreground mb-3" />
              <p className="font-heading text-foreground mb-1">{t("app.runs.empty_title")}</p>
              <p className="text-xs text-muted-foreground">{t("app.runs.empty_desc")}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {runs.map((r) => (
                <div
                  key={r.id}
                  className="border border-border bg-card rounded-sm p-4 hover:border-primary/40 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap">
                        <p className="text-2xl font-heading text-foreground tabular-nums">
                          {Number(r.distance_km).toFixed(2)}
                          <span className="text-xs text-muted-foreground ml-1">km</span>
                        </p>
                        <span className="text-muted-foreground">·</span>
                        <p className="text-sm font-body text-foreground inline-flex items-center gap-1">
                          <Clock size={12} className="text-muted-foreground" />
                          {formatDuration(r.duration_seconds)}
                        </p>
                        <span className="text-muted-foreground">·</span>
                        <p className="text-sm font-body text-primary inline-flex items-center gap-1">
                          <TrendingUp size={12} />
                          {formatPace(r.pace_seconds_per_km)}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
                        <span className="inline-flex items-center gap-1">
                          <Calendar size={11} />
                          {new Date(r.run_date).toLocaleDateString(intlLocale(language), { day: "numeric", month: "short", year: "numeric" })}
                        </span>
                        {r.route_name && (
                          <span className="inline-flex items-center gap-1">
                            <MapPin size={11} />
                            {r.route_name}
                          </span>
                        )}
                        {r.perceived_effort && (
                          <span className="inline-flex items-center gap-1">
                            🔥 {r.perceived_effort}/10
                          </span>
                        )}
                      </div>
                      {r.notes && <p className="text-xs text-muted-foreground mt-2 italic">{r.notes}</p>}
                    </div>
                    <button
                      onClick={() => deleteRun(r.id)}
                      className="text-muted-foreground hover:text-destructive p-1.5 shrink-0"
                      aria-label={t("app.runs.delete")}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
};

const StatCard = ({ label, value, unit, highlight }: { label: string; value: string; unit: string; highlight?: boolean }) => (
  <div
    className={`p-4 rounded-sm border ${
      highlight ? "border-primary/40 bg-primary/5" : "border-border bg-card"
    }`}
  >
    <p className="text-[10px] font-heading tracking-wider text-muted-foreground">{label}</p>
    <p className="text-2xl font-heading text-foreground tabular-nums mt-1">
      {value}
      {unit && <span className="text-xs text-muted-foreground ml-1">{unit}</span>}
    </p>
  </div>
);

export default AppRuns;
