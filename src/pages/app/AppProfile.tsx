import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AppShell from "@/components/app/AppShell";
import { toast } from "sonner";
import { Database } from "@/integrations/supabase/types";
import { useLanguage } from "@/i18n/LanguageContext";
import DeleteAccountSection from "@/components/app/DeleteAccountSection";

type Gender = Database["public"]["Enums"]["gender"];

const AppProfile = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    naam: "",
    email: "",
    telefoon: "",
    geboortedatum: "",
    geslacht: "" as Gender | "",
    lengte_cm: "",
    gewicht_kg: "",
    doel: "",
  });

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle();
      if (data) {
        setForm({
          naam: data.naam || "",
          email: data.email || user.email || "",
          telefoon: data.telefoon || "",
          geboortedatum: data.geboortedatum || "",
          geslacht: (data.geslacht as Gender) || "",
          lengte_cm: data.lengte_cm?.toString() || "",
          gewicht_kg: data.gewicht_kg?.toString() || "",
          doel: data.doel || "",
        });
      } else {
        setForm((f) => ({ ...f, email: user.email || "" }));
      }
      setLoading(false);
    };
    load();
  }, [user]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").upsert(
      {
        user_id: user.id,
        naam: form.naam,
        email: form.email,
        telefoon: form.telefoon,
        geboortedatum: form.geboortedatum || null,
        geslacht: form.geslacht || null,
        lengte_cm: form.lengte_cm ? parseInt(form.lengte_cm) : null,
        gewicht_kg: form.gewicht_kg ? parseFloat(form.gewicht_kg) : null,
        doel: form.doel,
      },
      { onConflict: "user_id" }
    );
    setSaving(false);
    if (error) toast.error(t("app.profile.save_failed"));
    else toast.success(t("app.profile.saved"));
  };

  return (
    <AppShell>
      <div className="p-6 md:p-10 max-w-2xl mx-auto">
        <div className="mb-8">
          <p className="text-primary font-heading text-xs tracking-[0.35em] mb-2">{t("app.profile.tag")}</p>
          <h1 className="text-3xl font-heading text-foreground">{t("app.profile.title")}</h1>
          <p className="text-sm text-muted-foreground mt-2">{t("app.profile.subtitle")}</p>
        </div>

        {loading ? (
          <div className="text-muted-foreground text-sm">{t("app.profile.loading")}</div>
        ) : (
          <form onSubmit={submit} className="border-2 border-primary/20 bg-card p-7 rounded-sm space-y-4">
            <Field label={t("app.profile.name")}><input type="text" value={form.naam} onChange={(e) => setForm({...form, naam: e.target.value})} className="input" /></Field>
            <Field label={t("app.profile.email")}><input type="email" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} className="input" /></Field>
            <Field label={t("app.profile.phone")}><input type="tel" value={form.telefoon} onChange={(e) => setForm({...form, telefoon: e.target.value})} className="input" /></Field>
            <Field label={t("app.profile.dob")}><input type="date" value={form.geboortedatum} onChange={(e) => setForm({...form, geboortedatum: e.target.value})} className="input" /></Field>

            <div className="grid grid-cols-3 gap-3">
              <Field label={t("app.profile.gender")}>
                <select value={form.geslacht} onChange={(e) => setForm({...form, geslacht: e.target.value as Gender | ""})} className="input">
                  <option value="">—</option>
                  <option value="man">{t("app.profile.gender.man")}</option>
                  <option value="vrouw">{t("app.profile.gender.vrouw")}</option>
                  <option value="anders">{t("app.profile.gender.anders")}</option>
                </select>
              </Field>
              <Field label={t("app.profile.height")}>
                <input type="number" min={100} max={250} value={form.lengte_cm} onChange={(e) => setForm({...form, lengte_cm: e.target.value})} className="input" />
              </Field>
              <Field label={t("app.profile.weight")}>
                <input type="number" step="0.1" min={30} max={250} value={form.gewicht_kg} onChange={(e) => setForm({...form, gewicht_kg: e.target.value})} className="input" />
              </Field>
            </div>

            <Field label={t("app.profile.goal")}>
              <textarea value={form.doel} onChange={(e) => setForm({...form, doel: e.target.value})} rows={3} placeholder={t("app.profile.goal_placeholder")} className="input resize-none" />
            </Field>

            <button type="submit" disabled={saving} className="w-full py-3.5 bg-primary text-primary-foreground font-heading text-sm tracking-wider hover:bg-primary/90 transition-all shadow-red disabled:opacity-50 rounded-sm">
              {saving ? t("app.profile.saving") : t("app.profile.save")}
            </button>
          </form>
        )}

        {/* GDPR / Play Store-required hard delete */}
        <DeleteAccountSection />
      </div>
    </AppShell>
  );
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <label className="text-xs font-heading tracking-wider text-muted-foreground mb-1.5 block">{label}</label>
    {children}
  </div>
);

export default AppProfile;
