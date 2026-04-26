import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Send, CheckCircle, Info, ArrowLeft, User, Gift } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate, Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import DateSlotPicker from "@/components/DateSlotPicker";
import { useAuth } from "@/hooks/useAuth";
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
}

interface ClientPackage {
  id: string;
  package_type: "maandkaart" | "rittenkaart";
  package_name: string;
  sessions_per_week: number | null;
  total_sessions: number | null;
  used_sessions: number;
}

const BookingPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [pkg, setPkg] = useState<ClientPackage | null>(null);
  const [pkgLoading, setPkgLoading] = useState(true);
  const [weekUsed, setWeekUsed] = useState(0);
  const [form, setForm] = useState({
    naam: "",
    email: "",
    telefoon: "",
    bericht: "",
    selectedSlot: "",
    referrer: "",
  });

  useEffect(() => {
    const stored = getStoredRef();
    if (stored) setForm((f) => ({ ...f, referrer: stored }));
  }, []);

  useEffect(() => {
    const fetchSlots = async () => {
      const today = new Date().toISOString().split("T")[0];
      const { data } = await supabase
        .from("available_time_slots")
        .select("*")
        .eq("is_active", true)
        .eq("slot_type", "pt_sessie")
        .gte("specific_date", today)
        .order("specific_date")
        .order("start_time");
      if (data) setTimeSlots(data as TimeSlot[]);
    };
    fetchSlots();
  }, []);

  // Load package + profile for logged in user
  useEffect(() => {
    if (!user) {
      setPkgLoading(false);
      return;
    }
    const load = async () => {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
      const weekStartStr = weekStart.toISOString().split("T")[0];

      const [pkgRes, profileRes, weekRes] = await Promise.all([
        supabase.from("client_packages").select("*").eq("user_id", user.id).eq("status", "actief").order("created_at", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("profiles").select("naam, telefoon").eq("user_id", user.id).maybeSingle(),
        supabase.from("pt_sessions").select("id", { count: "exact", head: true }).eq("user_id", user.id).gte("session_date", weekStartStr).neq("status", "geannuleerd").eq("session_type", "pt_sessie"),
      ]);

      if (pkgRes.data) setPkg(pkgRes.data as ClientPackage);
      setWeekUsed(weekRes.count || 0);
      setForm((f) => ({
        ...f,
        naam: profileRes.data?.naam || "",
        email: user.email || "",
        telefoon: profileRes.data?.telefoon || "",
      }));
      setPkgLoading(false);
    };
    load();
  }, [user]);

  const canBook = (() => {
    if (!user) return true; // guests always can (gast/intake flow)
    if (!pkg) return false;
    if (pkg.package_type === "maandkaart") {
      return weekUsed < (pkg.sessions_per_week || 0);
    }
    return pkg.used_sessions < (pkg.total_sessions || 0);
  })();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.selectedSlot) {
      toast.error("Kies een beschikbaar tijdslot.");
      return;
    }
    if (user && !canBook) {
      toast.error("Geen beschikbare sessies in je pakket. Neem contact op.");
      return;
    }
    setLoading(true);

    const [date, startTime] = form.selectedSlot.split("|");
    const refCode = normaliseRefCode(form.referrer);
    const bookingId = crypto.randomUUID();

    // Always insert into pt_bookings (legacy intake)
    const { error: bookErr } = await supabase.from("pt_bookings").insert({
      id: bookingId,
      naam: form.naam,
      email: form.email,
      telefoon: form.telefoon,
      bericht: form.bericht || null,
      selected_date: date,
      selected_time_slot: form.selectedSlot,
      referrer_code: refCode || null,
    });

    if (bookErr) {
      setLoading(false);
      toast.error("Er ging iets mis. Probeer het opnieuw.");
      console.error("Booking error:", bookErr);
      return;
    }

    if (refCode) {
      registerInvite({
        code: refCode,
        inviteType: "intake",
        inviteeName: form.naam,
        inviteeEmail: form.email,
        sourceBookingId: bookingId,
      }).catch(() => {});
    }

    // For logged-in clients with active package: also insert into pt_sessions + decrement rittenkaart
    if (user && pkg) {
      const endHour = parseInt(startTime.split(":")[0]) + 1;
      const endTime = `${String(endHour).padStart(2, "0")}:${startTime.split(":")[1]}`;
      await supabase.from("pt_sessions").insert({
        user_id: user.id,
        package_id: pkg.id,
        session_type: "pt_sessie",
        session_date: date,
        start_time: startTime,
        end_time: endTime,
      });
      if (pkg.package_type === "rittenkaart") {
        await supabase
          .from("client_packages")
          .update({ used_sessions: pkg.used_sessions + 1 })
          .eq("id", pkg.id);
      }
    }

    try {
      const { error: calError } = await supabase.functions.invoke("create-calendar-event", {
        body: {
          naam: form.naam,
          email: form.email,
          telefoon: form.telefoon,
          bericht: form.bericht,
          selectedSlot: form.selectedSlot,
          type: "pt_sessie",
          duration: 60,
        },
      });
      if (calError) console.error("Calendar event error:", calError);
    } catch (err) {
      console.error("Calendar event failed:", err);
    }

    // Send confirmation email to the client
    try {
      const formattedDate = new Date(date).toLocaleDateString("nl-NL", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });
      await supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: "booking-confirmation",
          recipientEmail: form.email,
          idempotencyKey: `booking-confirm-${bookingId}`,
          templateData: {
            name: form.naam,
            date: formattedDate,
            time: startTime,
            location: "Den Haag",
          },
        },
      });
    } catch (mailErr) {
      console.error("Booking confirmation mail failed:", mailErr);
    }

    setLoading(false);
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-28 pb-20">
        <div className="max-w-2xl mx-auto px-6">
          <button
            onClick={() => navigate(user ? "/app" : "/")}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 text-sm"
          >
            <ArrowLeft size={16} /> {user ? "Terug naar dashboard" : "Terug naar home"}
          </button>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <p className="text-primary font-heading text-xs tracking-[0.35em] mb-3">BESTAANDE KLANT</p>
            <h1 className="text-3xl md:text-4xl font-heading text-foreground mb-4">BOEK JE PT-SESSIE</h1>
            <p className="text-muted-foreground mb-8 text-sm leading-relaxed">
              Plan je volgende personal training sessie (60 minuten) in. Kies een beschikbaar moment en ik ontvang direct een melding.
            </p>

            {!user && (
              <div className="flex items-start gap-3 p-4 rounded-sm bg-card border border-border/50 mb-6">
                <User className="text-primary shrink-0 mt-0.5" size={14} />
                <p className="text-xs text-muted-foreground">
                  Heb je al een klantaccount? <Link to="/app/login" className="text-primary hover:underline">Log in</Link> om je strippenkaart te gebruiken.
                </p>
              </div>
            )}

            {user && pkg && !pkgLoading && (
              <div className="p-4 rounded-sm bg-primary/5 border border-primary/20 mb-6">
                <p className="text-xs font-heading tracking-wider text-primary mb-1">JOUW PAKKET</p>
                <p className="text-sm text-foreground font-heading">{pkg.package_name}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {pkg.package_type === "maandkaart"
                    ? `${Math.max(0, (pkg.sessions_per_week || 0) - weekUsed)} sessies over deze week`
                    : `${Math.max(0, (pkg.total_sessions || 0) - pkg.used_sessions)} ritten over`}
                </p>
              </div>
            )}

            {user && !pkg && !pkgLoading && (
              <div className="p-4 rounded-sm bg-orange-500/10 border border-orange-500/30 mb-6 text-xs text-orange-200">
                Je hebt geen actief pakket. Neem contact op met Pablo om er een te activeren.
              </div>
            )}

            <div className="flex items-start gap-3 p-4 rounded-sm bg-card border border-border/50 mb-8">
              <Info className="text-muted-foreground shrink-0 mt-0.5" size={14} />
              <p className="text-xs text-muted-foreground">
                Nachtsessies (23:30–05:30) zijn beschikbaar op aanvraag tegen een nachttarief van €120 ex BTW (21%). Neem contact op om dit te bespreken.
              </p>
            </div>

            {submitted ? (
              <div className="flex flex-col items-center justify-center text-center p-10 rounded-sm border border-primary/20 bg-primary/5">
                <CheckCircle className="text-primary mb-5" size={52} />
                <h3 className="text-2xl font-heading text-foreground mb-3">SESSIE GEBOEKT</h3>
                <p className="text-muted-foreground mb-6">
                  Je PT-sessie is ingepland! Je ontvangt een bevestiging per e-mail.
                </p>
                {user && (
                  <Link to="/app" className="text-xs text-primary hover:underline font-heading tracking-wider">
                    NAAR MIJN DASHBOARD →
                  </Link>
                )}
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5 p-7 md:p-9 rounded-sm border-2 border-primary/20 bg-card shadow-card">
                {[
                  { key: "naam", label: "Naam *", type: "text", required: true },
                  { key: "email", label: "E-mail *", type: "email", required: true },
                  { key: "telefoon", label: "Telefoonnummer *", type: "tel", required: true },
                ].map((field) => (
                  <div key={field.key}>
                    <label className="text-xs text-muted-foreground font-heading tracking-wider mb-1.5 block">{field.label}</label>
                    <input
                      type={field.type}
                      required={field.required}
                      value={form[field.key as keyof typeof form]}
                      onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                      className="w-full px-4 py-3.5 bg-background border border-border rounded-sm text-foreground text-sm focus:outline-none focus:border-primary transition-colors"
                    />
                  </div>
                ))}

                <DateSlotPicker
                  timeSlots={timeSlots}
                  selectedSlot={form.selectedSlot}
                  onSelectSlot={(val) => setForm({ ...form, selectedSlot: val })}
                />

                <div>
                  <label className="text-xs text-muted-foreground font-heading tracking-wider mb-1.5 block">BERICHT (OPTIONEEL)</label>
                  <textarea
                    value={form.bericht}
                    onChange={(e) => setForm({ ...form, bericht: e.target.value })}
                    rows={3}
                    placeholder="Bijv. specifieke wensen voor deze sessie..."
                    className="w-full px-4 py-3.5 bg-background border border-border rounded-sm text-foreground text-sm focus:outline-none focus:border-primary transition-colors resize-none placeholder:text-muted-foreground/50"
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
                <button
                  type="submit"
                  disabled={loading || (user !== null && !canBook)}
                  className="w-full px-8 py-4.5 bg-primary text-primary-foreground font-heading text-sm tracking-wider hover:bg-primary/90 transition-all shadow-red hover:shadow-glow flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send size={16} className="group-hover:translate-x-0.5 transition-transform" />
                  {loading ? "BOEKEN..." : "SESSIE BOEKEN"}
                </button>
              </form>
            )}
          </motion.div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default BookingPage;
