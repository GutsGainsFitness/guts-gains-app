import { useEffect, useState } from "react";
import { Plus, Trash2, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AppShell from "@/components/app/AppShell";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { format } from "date-fns";
import { toast } from "sonner";
import { useLanguage } from "@/i18n/LanguageContext";
import { dateLocale } from "@/i18n/dateLocale";

interface Measurement {
  id: string;
  measurement_date: string;
  weight_kg: number | null;
  body_fat_pct: number | null;
  muscle_mass_kg: number | null;
  notes: string | null;
}

const AppMeasurements = () => {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const locale = dateLocale(language);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    measurement_date: new Date().toISOString().split("T")[0],
    weight_kg: "",
    body_fat_pct: "",
    muscle_mass_kg: "",
    notes: "",
  });

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("body_measurements")
      .select("*")
      .eq("user_id", user.id)
      .order("measurement_date", { ascending: false });
    setMeasurements((data as Measurement[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [user]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const { error } = await supabase.from("body_measurements").insert({
      user_id: user.id,
      measurement_date: form.measurement_date,
      weight_kg: form.weight_kg ? parseFloat(form.weight_kg) : null,
      body_fat_pct: form.body_fat_pct ? parseFloat(form.body_fat_pct) : null,
      muscle_mass_kg: form.muscle_mass_kg ? parseFloat(form.muscle_mass_kg) : null,
      notes: form.notes || null,
    });
    if (error) toast.error(t("app.meas.save_failed"));
    else {
      toast.success(t("app.meas.added"));
      setShowForm(false);
      setForm({ measurement_date: new Date().toISOString().split("T")[0], weight_kg: "", body_fat_pct: "", muscle_mass_kg: "", notes: "" });
      load();
    }
  };

  const remove = async (id: string) => {
    if (!confirm(t("app.meas.delete_confirm"))) return;
    await supabase.from("body_measurements").delete().eq("id", id);
    load();
  };

  const wKey = t("app.meas.chart.weight");
  const fKey = t("app.meas.chart.body_fat");
  const mKey = t("app.meas.chart.muscle");

  const chartData = [...measurements]
    .reverse()
    .map((m) => ({
      datum: format(new Date(m.measurement_date), "d MMM", { locale }),
      [wKey]: m.weight_kg,
      [fKey]: m.body_fat_pct,
      [mKey]: m.muscle_mass_kg,
    }));

  return (
    <AppShell>
      <div className="p-6 md:p-10 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-primary font-heading text-xs tracking-[0.35em] mb-2">{t("app.meas.tag")}</p>
            <h1 className="text-3xl font-heading text-foreground">{t("app.meas.title")}</h1>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground text-xs font-heading tracking-wider hover:bg-primary/90 transition-all shadow-red rounded-sm"
          >
            <Plus size={14} /> {t("app.meas.new")}
          </button>
        </div>

        {showForm && (
          <form onSubmit={submit} className="border-2 border-primary/20 bg-card p-6 rounded-sm mb-8 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-heading tracking-wider text-muted-foreground mb-1.5 block">{t("app.meas.date")}</label>
              <input type="date" required value={form.measurement_date} onChange={(e) => setForm({ ...form, measurement_date: e.target.value })} className="w-full px-3 py-2.5 bg-background border border-border rounded-sm text-sm" />
            </div>
            <div>
              <label className="text-xs font-heading tracking-wider text-muted-foreground mb-1.5 block">{t("app.meas.weight")}</label>
              <input type="number" step="0.1" value={form.weight_kg} onChange={(e) => setForm({ ...form, weight_kg: e.target.value })} className="w-full px-3 py-2.5 bg-background border border-border rounded-sm text-sm" />
            </div>
            <div>
              <label className="text-xs font-heading tracking-wider text-muted-foreground mb-1.5 block">{t("app.meas.body_fat")}</label>
              <input type="number" step="0.1" value={form.body_fat_pct} onChange={(e) => setForm({ ...form, body_fat_pct: e.target.value })} className="w-full px-3 py-2.5 bg-background border border-border rounded-sm text-sm" />
            </div>
            <div>
              <label className="text-xs font-heading tracking-wider text-muted-foreground mb-1.5 block">{t("app.meas.muscle")}</label>
              <input type="number" step="0.1" value={form.muscle_mass_kg} onChange={(e) => setForm({ ...form, muscle_mass_kg: e.target.value })} className="w-full px-3 py-2.5 bg-background border border-border rounded-sm text-sm" />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-heading tracking-wider text-muted-foreground mb-1.5 block">{t("app.meas.note_optional")}</label>
              <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} className="w-full px-3 py-2.5 bg-background border border-border rounded-sm text-sm resize-none" />
            </div>
            <div className="md:col-span-2 flex gap-3">
              <button type="submit" className="px-6 py-2.5 bg-primary text-primary-foreground font-heading text-xs tracking-wider hover:bg-primary/90 rounded-sm">{t("app.meas.save")}</button>
              <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2.5 border border-border text-muted-foreground hover:text-foreground text-xs font-heading tracking-wider rounded-sm">{t("app.meas.cancel")}</button>
            </div>
          </form>
        )}

        {loading ? (
          <div className="text-muted-foreground text-sm">{t("app.meas.loading")}</div>
        ) : measurements.length === 0 ? (
          <div className="border border-border bg-card p-10 rounded-sm text-center">
            <TrendingUp className="mx-auto text-muted-foreground mb-3" size={32} />
            <p className="text-muted-foreground text-sm">{t("app.meas.empty")}</p>
          </div>
        ) : (
          <div className="space-y-8">
            {chartData.length >= 2 && (
              <div className="border border-border bg-card p-6 rounded-sm">
                <h2 className="text-xs font-heading tracking-wider text-muted-foreground mb-4">{t("app.meas.progression")}</h2>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
                      <XAxis dataKey="datum" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", fontSize: 12 }} />
                      <Line type="monotone" dataKey={wKey} stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey={fKey} stroke="#fbbf24" strokeWidth={2} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey={mKey} stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <h2 className="text-xs font-heading tracking-wider text-muted-foreground mb-2">{t("app.meas.all")}</h2>
              {measurements.map((m) => (
                <div key={m.id} className="border border-border bg-card p-4 rounded-sm flex items-center justify-between gap-4">
                  <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">{t("app.meas.col.date")}</p>
                      <p className="font-heading text-foreground">{format(new Date(m.measurement_date), "d MMM yyyy", { locale })}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{t("app.meas.col.weight")}</p>
                      <p className="font-heading text-foreground">{m.weight_kg ?? "-"} {m.weight_kg !== null && "kg"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{t("app.meas.col.body_fat")}</p>
                      <p className="font-heading text-foreground">{m.body_fat_pct ?? "-"} {m.body_fat_pct !== null && "%"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{t("app.meas.col.muscle")}</p>
                      <p className="font-heading text-foreground">{m.muscle_mass_kg ?? "-"} {m.muscle_mass_kg !== null && "kg"}</p>
                    </div>
                  </div>
                  <button onClick={() => remove(m.id)} className="text-muted-foreground hover:text-primary p-2 shrink-0">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
};

export default AppMeasurements;
