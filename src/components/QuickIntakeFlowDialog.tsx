import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight, CheckCircle, Loader2, Target, User, CalendarClock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import DateSlotPicker from "@/components/DateSlotPicker";
import { useLanguage } from "@/i18n/LanguageContext";
import { getStoredRef, normaliseRefCode, registerInvite } from "@/lib/referral";

interface TimeSlot {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
  specific_date: string | null;
  slot_type: string;
  notes: string | null;
  label: string | null;
}

interface QuickIntakeFlowDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const QuickIntakeFlowDialog = ({ open, onOpenChange }: QuickIntakeFlowDialogProps) => {
  const { t } = useLanguage();
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [form, setForm] = useState({
    doel: "",
    naam: "",
    email: "",
    telefoon: "",
    selectedSlot: "",
    referrer: "",
  });

  // Reset on open
  useEffect(() => {
    if (open) {
      setStep(1);
      setSubmitted(false);
      const stored = getStoredRef();
      setForm({
        doel: "",
        naam: "",
        email: "",
        telefoon: "",
        selectedSlot: "",
        referrer: stored || "",
      });
    }
  }, [open]);

  // Fetch intake slots when dialog opens
  useEffect(() => {
    if (!open) return;
    const fetchSlots = async () => {
      const today = new Date().toISOString().split("T")[0];
      const [{ data: slotsData }, { data: bookingsData }] = await Promise.all([
        supabase
        .from("available_time_slots")
        .select("*")
        .eq("is_active", true)
        .eq("slot_type", "intake")
        .gte("specific_date", today)
        .order("specific_date")
          .order("start_time"),
        supabase
          .from("pt_bookings")
          .select("selected_date, selected_time_slot, status")
          .gte("selected_date", today)
          .neq("status", "geannuleerd"),
      ]);
      if (slotsData) setTimeSlots(slotsData as TimeSlot[]);
      if (bookingsData) {
        // Booking slots are stored as `YYYY-MM-DD|HH:MM-HH:MM` already.
        // Defensive: also accept legacy rows that might only contain time.
        const taken = bookingsData
          .map((b: { selected_date: string; selected_time_slot: string }) => {
            const slot = b.selected_time_slot || "";
            return slot.includes("|") ? slot : `${b.selected_date}|${slot}`;
          })
          .filter(Boolean);
        setBookedSlots(taken);
      }
    };
    fetchSlots();
  }, [open]);

  const totalSteps = 3;
  const progressValue = (step / totalSteps) * 100;

  const goalOptions = useMemo(
    () => [
      { value: "afvallen", label: t("intake.goal_lose") },
      { value: "spieropbouw", label: t("intake.goal_muscle") },
      { value: "fitter-worden", label: t("intake.goal_fit") },
      { value: "revalidatie", label: t("intake.goal_rehab") },
      { value: "anders", label: t("intake.goal_other") },
    ],
    [t]
  );

  const canContinueStep1 = form.doel.length > 0;
  const canContinueStep2 =
    form.naam.trim().length >= 2 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()) &&
    form.telefoon.trim().length >= 6;
  const canSubmit = !!form.selectedSlot;

  const handleSubmit = async () => {
    if (!canSubmit) {
      toast.error(t("quickintake.err_no_slot"));
      return;
    }
    if (bookedSlots.includes(form.selectedSlot)) {
      toast.error(t("quickintake.err_slot_taken"));
      // Refresh bookings so UI updates
      const today = new Date().toISOString().split("T")[0];
      const { data: bookingsData } = await supabase
        .from("pt_bookings")
        .select("selected_date, selected_time_slot, status")
        .gte("selected_date", today)
        .neq("status", "geannuleerd");
      if (bookingsData) {
        setBookedSlots(
          bookingsData
            .map((b: { selected_date: string; selected_time_slot: string }) => {
              const slot = b.selected_time_slot || "";
              return slot.includes("|") ? slot : `${b.selected_date}|${slot}`;
            })
            .filter(Boolean)
        );
      }
      setForm((f) => ({ ...f, selectedSlot: "" }));
      return;
    }
    setLoading(true);

    const refCode = normaliseRefCode(form.referrer);
    const intakeId = crypto.randomUUID();
    const bookingId = crypto.randomUUID();
    const [date, startTime] = form.selectedSlot.split("|");

    // Insert intake_requests (lead/CRM record)
    const { error: intakeErr } = await supabase.from("intake_requests").insert({
      id: intakeId,
      naam: form.naam,
      email: form.email,
      telefoon: form.telefoon,
      doel: form.doel || null,
      voorkeur: null,
      bericht: null,
      selected_time_slot: form.selectedSlot || null,
      referrer_code: refCode || null,
    });

    if (intakeErr) {
      setLoading(false);
      toast.error(t("quickintake.err_generic"));
      console.error("Intake error:", intakeErr);
      return;
    }

    // Insert pt_bookings (the actual booking)
    const { error: bookErr } = await supabase.from("pt_bookings").insert({
      id: bookingId,
      naam: form.naam,
      email: form.email,
      telefoon: form.telefoon,
      bericht: form.doel ? `Doel: ${form.doel}` : null,
      selected_date: date,
      selected_time_slot: form.selectedSlot,
      referrer_code: refCode || null,
    });

    if (bookErr) {
      setLoading(false);
      toast.error(t("quickintake.err_generic"));
      console.error("Booking error:", bookErr);
      return;
    }

    if (refCode) {
      registerInvite({
        code: refCode,
        inviteType: "intake",
        inviteeName: form.naam,
        inviteeEmail: form.email,
        sourceIntakeId: intakeId,
        sourceBookingId: bookingId,
      }).catch(() => {});
    }

    // Create calendar event
    try {
      await supabase.functions.invoke("create-calendar-event", {
        body: {
          naam: form.naam,
          email: form.email,
          telefoon: form.telefoon,
          doel: form.doel,
          selectedSlot: form.selectedSlot,
          type: "intake",
          duration: 45,
        },
      });
    } catch (err) {
      console.error("Calendar event failed:", err);
    }

    // Send confirmation email + owner notification
    try {
      const formattedDate = new Date(date).toLocaleDateString("nl-NL", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });
      const startOnly = startTime?.split("-")[0] || startTime;
      await Promise.all([
        supabase.functions.invoke("send-transactional-email", {
          body: {
            templateName: "booking-confirmation",
            recipientEmail: form.email,
            idempotencyKey: `quickintake-confirm-${bookingId}`,
            templateData: {
              name: form.naam,
              date: formattedDate,
              time: startOnly,
              location: "Den Haag",
            },
          },
        }),
        supabase.functions.invoke("send-transactional-email", {
          body: {
            templateName: "contact-notification",
            recipientEmail: "gutsgainsfitness@gmail.com",
            idempotencyKey: `quickintake-owner-${intakeId}`,
            replyTo: form.email,
            templateData: {
              name: form.naam,
              email: form.email,
              phone: form.telefoon,
              subject: `Nieuwe intake-aanvraag (${form.doel || "doel onbekend"})`,
              message: [
                `Doel: ${form.doel || "—"}`,
                `Gekozen slot: ${form.selectedSlot}`,
                `Bron: Quick intake flow (FAQ)`,
              ].join("\n"),
            },
          },
        }),
      ]);
    } catch (mailErr) {
      console.error("Email send failed:", mailErr);
    }

    setLoading(false);
    setSubmitted(true);
  };

  const stepIcons = [Target, User, CalendarClock];
  const StepIcon = stepIcons[step - 1];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto bg-card border-2 border-primary/30">
        {submitted ? (
          <div className="flex flex-col items-center text-center py-8 px-2">
            <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center mb-5">
              <CheckCircle className="text-primary" size={36} />
            </div>
            <h3 className="text-2xl font-heading text-foreground mb-3 tracking-wide">
              {t("quickintake.success_title")}
            </h3>
            <p className="text-sm font-body text-muted-foreground leading-relaxed mb-6 max-w-sm">
              {t("quickintake.success_msg")}
            </p>
            <Button
              onClick={() => onOpenChange(false)}
              className="bg-primary text-primary-foreground hover:bg-primary/90 font-heading text-xs tracking-[0.2em] rounded-sm"
            >
              {t("quickintake.close")}
            </Button>
          </div>
        ) : (
          <>
            <DialogHeader className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-sm bg-primary/10 border border-primary/30 flex items-center justify-center">
                  <StepIcon size={18} className="text-primary" />
                </div>
                <div className="text-left">
                  <p className="text-primary font-heading text-[10px] tracking-[0.35em]">
                    {t("quickintake.step")} {step} / {totalSteps}
                  </p>
                  <DialogTitle className="text-lg font-heading text-foreground tracking-wide">
                    {step === 1 && t("quickintake.step1_title")}
                    {step === 2 && t("quickintake.step2_title")}
                    {step === 3 && t("quickintake.step3_title")}
                  </DialogTitle>
                </div>
              </div>
              <Progress value={progressValue} className="h-1" />
              <DialogDescription className="text-xs font-body text-muted-foreground">
                {step === 1 && t("quickintake.step1_desc")}
                {step === 2 && t("quickintake.step2_desc")}
                {step === 3 && t("quickintake.step3_desc")}
              </DialogDescription>
            </DialogHeader>

            <div className="py-4 space-y-4">
              {step === 1 && (
                <div className="grid grid-cols-1 gap-2">
                  {goalOptions.map((opt) => {
                    const selected = form.doel === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setForm({ ...form, doel: opt.value })}
                        className={`text-left px-4 py-3.5 border-2 rounded-sm text-sm font-body transition-all ${
                          selected
                            ? "border-primary bg-primary/10 text-foreground"
                            : "border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground"
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-muted-foreground font-heading tracking-wider mb-1.5 block">
                      {t("intake.name")}
                    </label>
                    <Input
                      type="text"
                      value={form.naam}
                      onChange={(e) => setForm({ ...form, naam: e.target.value })}
                      maxLength={100}
                      className="bg-background border-border rounded-sm h-11"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground font-heading tracking-wider mb-1.5 block">
                      {t("intake.email")}
                    </label>
                    <Input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      maxLength={255}
                      className="bg-background border-border rounded-sm h-11"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground font-heading tracking-wider mb-1.5 block">
                      {t("intake.phone")}
                    </label>
                    <Input
                      type="tel"
                      value={form.telefoon}
                      onChange={(e) => setForm({ ...form, telefoon: e.target.value })}
                      maxLength={30}
                      className="bg-background border-border rounded-sm h-11"
                    />
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-3">
                  {timeSlots.length === 0 ? (
                    <p className="text-sm text-muted-foreground font-body p-4 border border-border rounded-sm bg-background">
                      {t("quickintake.no_slots")}
                    </p>
                  ) : (
                    <DateSlotPicker
                      timeSlots={timeSlots}
                      selectedSlot={form.selectedSlot}
                      onSelectSlot={(val) => setForm({ ...form, selectedSlot: val })}
                      bookedSlots={bookedSlots}
                    />
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 pt-2 border-t border-border">
              <Button
                type="button"
                variant="ghost"
                onClick={() => (step === 1 ? onOpenChange(false) : setStep(step - 1))}
                disabled={loading}
                className="text-muted-foreground hover:text-foreground font-heading text-xs tracking-[0.2em]"
              >
                <ArrowLeft size={14} className="mr-1.5" />
                {step === 1 ? t("quickintake.cancel") : t("quickintake.back")}
              </Button>

              {step < totalSteps ? (
                <Button
                  type="button"
                  onClick={() => setStep(step + 1)}
                  disabled={(step === 1 && !canContinueStep1) || (step === 2 && !canContinueStep2)}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 font-heading text-xs tracking-[0.2em] rounded-sm shadow-red"
                >
                  {t("quickintake.next")}
                  <ArrowRight size={14} className="ml-1.5" />
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!canSubmit || loading}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 font-heading text-xs tracking-[0.2em] rounded-sm shadow-red"
                >
                  {loading ? (
                    <>
                      <Loader2 size={14} className="mr-1.5 animate-spin" />
                      {t("quickintake.booking")}
                    </>
                  ) : (
                    <>
                      {t("quickintake.book")}
                      <CheckCircle size={14} className="ml-1.5" />
                    </>
                  )}
                </Button>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default QuickIntakeFlowDialog;