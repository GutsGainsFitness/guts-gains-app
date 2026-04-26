import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Send, Calendar, CheckCircle, Info, Gift } from "lucide-react";
import DateSlotPicker from "@/components/DateSlotPicker";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import pabloPortrait from "@/assets/pablo-portrait.jpg";
import { useLanguage } from "@/i18n/LanguageContext";
import { getStoredRef, normaliseRefCode, registerInvite } from "@/lib/referral";

interface TimeSlot {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  label: string | null;
  is_active: boolean;
  specific_date: string | null;
  slot_type: string;
  notes: string | null;
}

const IntakeSection = () => {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const { t } = useLanguage();
  const [form, setForm] = useState({
    naam: "", email: "", telefoon: "", doel: "", voorkeur: "", bericht: "", selectedSlot: "", referrer: "",
  });

  // Prefill referrer from URL or stored localStorage on mount
  useEffect(() => {
    const stored = getStoredRef();
    if (stored) setForm((f) => ({ ...f, referrer: stored }));
  }, []);

  useEffect(() => {
    const fetchSlots = async () => {
      const today = new Date().toISOString().split("T")[0];
      const { data } = await supabase
        .from("available_time_slots").select("*")
        .eq("is_active", true).eq("slot_type", "intake")
        .gte("specific_date", today).order("specific_date").order("start_time");
      if (data) setTimeSlots(data as TimeSlot[]);
    };
    fetchSlots();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const refCode = normaliseRefCode(form.referrer);
    const intakeId = crypto.randomUUID();
    const { error } = await supabase.from("intake_requests").insert({
      id: intakeId,
      naam: form.naam, email: form.email, telefoon: form.telefoon,
      doel: form.doel || null, voorkeur: form.voorkeur || null,
      bericht: form.bericht || null, selected_time_slot: form.selectedSlot || null,
      referrer_code: refCode || null,
    });
    if (error) { setLoading(false); toast.error("Er ging iets mis. Probeer het opnieuw."); return; }
    if (refCode) {
      // Best-effort: register invite for the referrer (intake → unlocks invite_intake achievement)
      registerInvite({
        code: refCode,
        inviteType: "intake",
        inviteeName: form.naam,
        inviteeEmail: form.email,
        sourceIntakeId: intakeId,
      }).catch(() => {});
    }
    try {
      await supabase.functions.invoke("create-calendar-event", {
        body: { naam: form.naam, email: form.email, telefoon: form.telefoon, doel: form.doel, voorkeur: form.voorkeur, bericht: form.bericht, selectedSlot: form.selectedSlot, type: "intake", duration: 45 },
      });
    } catch (err) { console.error("Calendar event failed:", err); }
    // Notify owner + send confirmation to visitor
    try {
      const idem = `intake-${intakeId}`;
      await Promise.all([
        supabase.functions.invoke("send-transactional-email", {
          body: {
            templateName: "contact-notification",
            recipientEmail: "gutsgainsfitness@gmail.com",
            idempotencyKey: `${idem}-owner`,
            replyTo: form.email,
            templateData: {
              name: form.naam,
              email: form.email,
              phone: form.telefoon,
              subject: `Nieuwe intake-aanvraag${form.doel ? ` (${form.doel})` : ""}`,
              message: [
                form.doel ? `Doel: ${form.doel}` : "",
                form.voorkeur ? `Voorkeur: ${form.voorkeur}` : "",
                form.selectedSlot ? `Gekozen slot: ${form.selectedSlot}` : "",
                form.bericht ? `Bericht: ${form.bericht}` : "",
              ].filter(Boolean).join("\n") || "(geen extra info)",
            },
          },
        }),
        supabase.functions.invoke("send-transactional-email", {
          body: {
            templateName: "contact-confirmation",
            recipientEmail: form.email,
            idempotencyKey: `${idem}-user`,
            templateData: { name: form.naam, message: "Je intake-aanvraag is ontvangen. Pablo neemt binnen 24 uur contact met je op." },
          },
        }),
      ]);
    } catch (err) { console.error("Intake email failed:", err); }
    setLoading(false);
    setSubmitted(true);
  };

  const points = [t("intake.point1"), t("intake.point2"), t("intake.point3"), t("intake.point4")];

  return (
    <section id="intake" className="section-padding">
      <div className="container-tight">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-14">
          <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
            <p className="text-primary font-heading text-xs tracking-[0.35em] mb-3">{t("intake.tag")}</p>
            <h2 className="text-3xl md:text-5xl text-foreground mb-7">{t("intake.title")}</h2>
            <p className="text-muted-foreground leading-relaxed mb-7 text-base">{t("intake.desc")}</p>
            <div className="space-y-4 mb-8">
              {points.map((item) => (
                <div key={item} className="flex items-center gap-3">
                  <CheckCircle className="text-primary shrink-0" size={16} />
                  <span className="text-sm text-foreground">{item}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-3 p-5 rounded-sm bg-card border border-border mb-4">
              <Calendar className="text-primary" size={20} />
              <p className="text-sm text-muted-foreground">{t("intake.calendar_note")}</p>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-sm bg-card border border-border/50">
              <Info className="text-muted-foreground shrink-0 mt-0.5" size={14} />
              <p className="text-xs text-muted-foreground">{t("intake.night_note")}</p>
            </div>
            <div className="mt-8 hidden lg:block">
              <img src={pabloPortrait} alt="Pablo Ramos - Personal Trainer Den Haag" className="w-full max-w-sm h-auto object-contain rounded-sm" loading="lazy" />
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }}>
            {submitted ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-10 rounded-sm border border-primary/20 bg-primary/5">
                <CheckCircle className="text-primary mb-5" size={52} />
                <h3 className="text-2xl font-heading text-foreground mb-3">{t("intake.success_title")}</h3>
                <p className="text-muted-foreground">
                  {t("intake.success_msg")}
                  {form.selectedSlot && t("intake.success_cal")}
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5 p-7 md:p-9 rounded-sm border-2 border-primary/20 bg-card shadow-card">
                <h3 className="text-xl font-heading text-foreground mb-3">{t("intake.form_title")}</h3>
                {[
                  { key: "naam", label: t("intake.name"), type: "text", required: true },
                  { key: "email", label: t("intake.email"), type: "email", required: true },
                  { key: "telefoon", label: t("intake.phone"), type: "tel", required: true },
                ].map((field) => (
                  <div key={field.key}>
                    <label className="text-xs text-muted-foreground font-heading tracking-wider mb-1.5 block">{field.label}</label>
                    <input type={field.type} required={field.required} value={form[field.key as keyof typeof form]}
                      onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                      className="w-full px-4 py-3.5 bg-background border border-border rounded-sm text-foreground text-sm focus:outline-none focus:border-primary transition-colors"
                    />
                  </div>
                ))}
                <div>
                  <label className="text-xs text-muted-foreground font-heading tracking-wider mb-1.5 block">{t("intake.goal")}</label>
                  <select value={form.doel} onChange={(e) => setForm({ ...form, doel: e.target.value })}
                    className="w-full px-4 py-3.5 bg-background border border-border rounded-sm text-foreground text-sm focus:outline-none focus:border-primary transition-colors"
                  >
                    <option value="">{t("intake.goal_select")}</option>
                    <option value="afvallen">{t("intake.goal_lose")}</option>
                    <option value="spieropbouw">{t("intake.goal_muscle")}</option>
                    <option value="fitter-worden">{t("intake.goal_fit")}</option>
                    <option value="revalidatie">{t("intake.goal_rehab")}</option>
                    <option value="anders">{t("intake.goal_other")}</option>
                  </select>
                </div>
                <DateSlotPicker timeSlots={timeSlots} selectedSlot={form.selectedSlot} onSelectSlot={(val) => setForm({ ...form, selectedSlot: val })} />
                <div>
                  <label className="text-xs text-muted-foreground font-heading tracking-wider mb-1.5 block">{t("intake.pref")}</label>
                  <input type="text" value={form.voorkeur} onChange={(e) => setForm({ ...form, voorkeur: e.target.value })}
                    placeholder={t("intake.pref_placeholder")}
                    className="w-full px-4 py-3.5 bg-background border border-border rounded-sm text-foreground text-sm focus:outline-none focus:border-primary transition-colors placeholder:text-muted-foreground/50"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground font-heading tracking-wider mb-1.5 block">{t("intake.message")}</label>
                  <textarea value={form.bericht} onChange={(e) => setForm({ ...form, bericht: e.target.value })} rows={3}
                    className="w-full px-4 py-3.5 bg-background border border-border rounded-sm text-foreground text-sm focus:outline-none focus:border-primary transition-colors resize-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground font-heading tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Gift size={12} className="text-primary" /> UITGENODIGD DOOR (OPTIONEEL)
                  </label>
                  <input
                    type="text"
                    value={form.referrer}
                    onChange={(e) => setForm({ ...form, referrer: e.target.value.toUpperCase() })}
                    placeholder="Bijv. PABLO7K"
                    maxLength={12}
                    className="w-full px-4 py-3.5 bg-background border border-border rounded-sm text-foreground text-sm font-mono tracking-widest focus:outline-none focus:border-primary transition-colors placeholder:text-muted-foreground/40 placeholder:font-body placeholder:tracking-normal"
                  />
                </div>
                <button type="submit" disabled={loading}
                  className="w-full px-8 py-4.5 bg-primary text-primary-foreground font-heading text-sm tracking-wider hover:bg-primary/90 transition-all shadow-red hover:shadow-glow flex items-center justify-center gap-2 group disabled:opacity-50"
                >
                  <Send size={16} className="group-hover:translate-x-0.5 transition-transform" />
                  {loading ? t("intake.sending") : t("intake.submit")}
                </button>
              </form>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default IntakeSection;
