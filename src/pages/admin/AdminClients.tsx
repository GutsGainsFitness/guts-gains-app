import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AppShell from "@/components/app/AppShell";
import AccountDeletionRequests from "@/components/admin/AccountDeletionRequests";
import { Plus, Mail, Calendar, Activity, X, Check } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

interface ClientProfile {
  id: string;
  user_id: string;
  naam: string | null;
  email: string | null;
  telefoon: string | null;
  created_at: string;
}

interface ClientPackage {
  id: string;
  user_id: string;
  package_type: "maandkaart" | "rittenkaart";
  package_name: string;
  sessions_per_week: number | null;
  total_sessions: number | null;
  used_sessions: number;
  status: string;
  end_date: string | null;
}

interface SessionRow {
  id: string;
  user_id: string;
  session_date: string;
  start_time: string;
  session_type: string;
  status: string;
}

const AdminClients = () => {
  const { isAdmin, loading: authLoading } = useAuth();
  const [clients, setClients] = useState<ClientProfile[]>([]);
  const [packages, setPackages] = useState<ClientPackage[]>([]);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ClientProfile | null>(null);
  const [showInvite, setShowInvite] = useState(false);
  const [showPkg, setShowPkg] = useState(false);
  const [showSession, setShowSession] = useState(false);

  const [inviteForm, setInviteForm] = useState({ naam: "", email: "" });
  const [pkgForm, setPkgForm] = useState({
    package_type: "maandkaart" as "maandkaart" | "rittenkaart",
    package_name: "",
    sessions_per_week: "",
    total_sessions: "",
    end_date: "",
  });
  const [sessionForm, setSessionForm] = useState({
    session_type: "pt_sessie",
    session_date: new Date().toISOString().split("T")[0],
    start_time: "09:00",
    end_time: "10:00",
  });

  const load = async () => {
    const [pRes, pkRes, sRes] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("client_packages").select("*"),
      supabase.from("pt_sessions").select("*").order("session_date", { ascending: false }).limit(500),
    ]);
    setClients((pRes.data as ClientProfile[]) || []);
    setPackages((pkRes.data as ClientPackage[]) || []);
    setSessions((sRes.data as SessionRow[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin]);

  if (authLoading) return null;
  if (!isAdmin) return <div className="p-10">Geen toegang.</div>;

  const inviteClient = async (e: React.FormEvent) => {
    e.preventDefault();
    // Send invite email via password reset (creates account if needed)
    const tempPwd = crypto.randomUUID();
    const { data, error } = await supabase.auth.signUp({
      email: inviteForm.email,
      password: tempPwd,
      options: {
        emailRedirectTo: `${window.location.origin}/app`,
        data: { naam: inviteForm.naam },
      },
    });
    if (error) {
      toast.error("Aanmaken mislukt: " + error.message);
      return;
    }
    // Trigger password reset so user gets a link
    await supabase.auth.resetPasswordForEmail(inviteForm.email, {
      redirectTo: `${window.location.origin}/app/reset-password`,
    });
    toast.success("Klant uitgenodigd! Ze ontvangen een e-mail om hun wachtwoord in te stellen.");
    setShowInvite(false);
    setInviteForm({ naam: "", email: "" });
    setTimeout(load, 1500);
  };

  const addPackage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    const { error } = await supabase.from("client_packages").insert({
      user_id: selected.user_id,
      package_type: pkgForm.package_type,
      package_name: pkgForm.package_name,
      sessions_per_week: pkgForm.package_type === "maandkaart" && pkgForm.sessions_per_week ? parseInt(pkgForm.sessions_per_week) : null,
      total_sessions: pkgForm.package_type === "rittenkaart" && pkgForm.total_sessions ? parseInt(pkgForm.total_sessions) : null,
      end_date: pkgForm.end_date || null,
    });
    if (error) toast.error("Pakket toevoegen mislukt");
    else {
      toast.success("Pakket toegevoegd");
      setShowPkg(false);
      setPkgForm({ package_type: "maandkaart", package_name: "", sessions_per_week: "", total_sessions: "", end_date: "" });
      load();
    }
  };

  const addSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    const { error } = await supabase.from("pt_sessions").insert({
      user_id: selected.user_id,
      session_type: sessionForm.session_type as "pt_sessie" | "lichaamsmeting" | "small_group",
      session_date: sessionForm.session_date,
      start_time: sessionForm.start_time,
      end_time: sessionForm.end_time,
    });
    if (error) toast.error("Toevoegen mislukt");
    else {
      toast.success("Sessie ingepland");
      setShowSession(false);
      load();
    }
  };

  const markSession = async (id: string, status: "voltooid" | "no_show") => {
    await supabase.from("pt_sessions").update({ status }).eq("id", id);
    load();
  };

  const deletePackage = async (id: string) => {
    if (!confirm("Pakket verwijderen?")) return;
    await supabase.from("client_packages").delete().eq("id", id);
    load();
  };

  const clientPackages = selected ? packages.filter((p) => p.user_id === selected.user_id) : [];
  const clientSessions = selected ? sessions.filter((s) => s.user_id === selected.user_id) : [];

  return (
    <AppShell>
      <div className="p-6 md:p-10 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-primary font-heading text-xs tracking-[0.35em] mb-2">ADMIN</p>
            <h1 className="text-3xl font-heading text-foreground">KLANTEN</h1>
          </div>
          <button onClick={() => setShowInvite(true)} className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground text-xs font-heading tracking-wider hover:bg-primary/90 transition-all shadow-red rounded-sm">
            <Plus size={14} /> KLANT TOEVOEGEN
          </button>
        </div>

        <AccountDeletionRequests />

        {loading ? (
          <div className="text-muted-foreground text-sm">Laden...</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Client list */}
            <div className="lg:col-span-1 space-y-2">
              <h2 className="text-xs font-heading tracking-wider text-muted-foreground mb-2">{clients.length} KLANTEN</h2>
              {clients.map((c) => {
                const pkgs = packages.filter((p) => p.user_id === c.user_id && p.status === "actief");
                return (
                  <button
                    key={c.id}
                    onClick={() => setSelected(c)}
                    className={`w-full text-left border p-4 rounded-sm transition-colors ${selected?.id === c.id ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/40"}`}
                  >
                    <p className="font-heading text-foreground">{c.naam || "—"}</p>
                    <p className="text-xs text-muted-foreground mt-1">{c.email}</p>
                    {pkgs.length > 0 && (
                      <p className="text-xs text-primary mt-2">{pkgs.map((p) => p.package_name).join(" • ")}</p>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Detail */}
            <div className="lg:col-span-2">
              {!selected ? (
                <div className="border border-border bg-card p-10 rounded-sm text-center text-muted-foreground text-sm">
                  Kies een klant om details te bekijken.
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="border-2 border-primary/20 bg-card p-6 rounded-sm">
                    <h2 className="text-2xl font-heading text-foreground mb-1">{selected.naam || "—"}</h2>
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1.5"><Mail size={12} /> {selected.email}</span>
                      {selected.telefoon && <span>{selected.telefoon}</span>}
                    </div>
                  </div>

                  {/* Packages */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-xs font-heading tracking-wider text-muted-foreground">PAKKETTEN</h3>
                      <button onClick={() => setShowPkg(true)} className="text-xs text-primary hover:underline flex items-center gap-1">
                        <Plus size={12} /> Toevoegen
                      </button>
                    </div>
                    {clientPackages.length === 0 ? (
                      <div className="text-sm text-muted-foreground border border-border bg-card p-4 rounded-sm">Geen pakketten.</div>
                    ) : (
                      <div className="space-y-2">
                        {clientPackages.map((p) => (
                          <div key={p.id} className="border border-border bg-card p-4 rounded-sm flex items-center justify-between">
                            <div>
                              <p className="font-heading text-foreground">{p.package_name}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {p.package_type === "maandkaart"
                                  ? `${p.sessions_per_week}x per week`
                                  : `${p.used_sessions}/${p.total_sessions} ritten gebruikt`}
                                {p.end_date && ` • t/m ${format(new Date(p.end_date), "d MMM yyyy", { locale: nl })}`}
                              </p>
                            </div>
                            <button onClick={() => deletePackage(p.id)} className="text-muted-foreground hover:text-primary p-2"><X size={16} /></button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Sessions */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-xs font-heading tracking-wider text-muted-foreground">SESSIES</h3>
                      <button onClick={() => setShowSession(true)} className="text-xs text-primary hover:underline flex items-center gap-1">
                        <Plus size={12} /> Inplannen
                      </button>
                    </div>
                    {clientSessions.length === 0 ? (
                      <div className="text-sm text-muted-foreground border border-border bg-card p-4 rounded-sm">Geen sessies.</div>
                    ) : (
                      <div className="space-y-2">
                        {clientSessions.slice(0, 20).map((s) => (
                          <div key={s.id} className="border border-border bg-card p-3 rounded-sm flex items-center justify-between text-sm">
                            <div>
                              <span className="font-heading text-foreground">{s.session_type === "pt_sessie" ? "PT" : s.session_type === "lichaamsmeting" ? "Meting" : "Small Group"}</span>
                              <span className="text-muted-foreground ml-3">{format(new Date(s.session_date), "d MMM yyyy", { locale: nl })} • {s.start_time.slice(0, 5)}</span>
                              <span className="text-xs text-muted-foreground ml-3">[{s.status}]</span>
                            </div>
                            {s.status === "gepland" && (
                              <div className="flex gap-1">
                                <button onClick={() => markSession(s.id, "voltooid")} className="p-1.5 text-green-500 hover:bg-green-500/10 rounded-sm"><Check size={14} /></button>
                                <button onClick={() => markSession(s.id, "no_show")} className="p-1.5 text-orange-500 hover:bg-orange-500/10 rounded-sm"><X size={14} /></button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Invite modal */}
        {showInvite && (
          <Modal title="KLANT UITNODIGEN" onClose={() => setShowInvite(false)}>
            <form onSubmit={inviteClient} className="space-y-4">
              <Field label="NAAM"><input required value={inviteForm.naam} onChange={(e) => setInviteForm({ ...inviteForm, naam: e.target.value })} className="input" /></Field>
              <Field label="E-MAIL"><input type="email" required value={inviteForm.email} onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })} className="input" /></Field>
              <p className="text-xs text-muted-foreground">De klant krijgt een e-mail om hun wachtwoord in te stellen.</p>
              <button type="submit" className="w-full py-3 bg-primary text-primary-foreground font-heading text-xs tracking-wider hover:bg-primary/90 rounded-sm">VERSTUREN</button>
            </form>
          </Modal>
        )}

        {showPkg && selected && (
          <Modal title="PAKKET TOEVOEGEN" onClose={() => setShowPkg(false)}>
            <form onSubmit={addPackage} className="space-y-4">
              <Field label="TYPE">
                <select value={pkgForm.package_type} onChange={(e) => setPkgForm({ ...pkgForm, package_type: e.target.value as "maandkaart" | "rittenkaart" })} className="input">
                  <option value="maandkaart">Maandkaart</option>
                  <option value="rittenkaart">Rittenkaart</option>
                </select>
              </Field>
              <Field label="NAAM"><input required value={pkgForm.package_name} onChange={(e) => setPkgForm({ ...pkgForm, package_name: e.target.value })} placeholder="bv. Maandkaart 3x p.w." className="input" /></Field>
              {pkgForm.package_type === "maandkaart" ? (
                <Field label="SESSIES PER WEEK"><input type="number" required value={pkgForm.sessions_per_week} onChange={(e) => setPkgForm({ ...pkgForm, sessions_per_week: e.target.value })} className="input" /></Field>
              ) : (
                <Field label="TOTAAL AANTAL RITTEN"><input type="number" required value={pkgForm.total_sessions} onChange={(e) => setPkgForm({ ...pkgForm, total_sessions: e.target.value })} className="input" /></Field>
              )}
              <Field label="EINDDATUM (OPTIONEEL)"><input type="date" value={pkgForm.end_date} onChange={(e) => setPkgForm({ ...pkgForm, end_date: e.target.value })} className="input" /></Field>
              <button type="submit" className="w-full py-3 bg-primary text-primary-foreground font-heading text-xs tracking-wider hover:bg-primary/90 rounded-sm">TOEVOEGEN</button>
            </form>
          </Modal>
        )}

        {showSession && selected && (
          <Modal title="SESSIE INPLANNEN" onClose={() => setShowSession(false)}>
            <form onSubmit={addSession} className="space-y-4">
              <Field label="TYPE">
                <select value={sessionForm.session_type} onChange={(e) => setSessionForm({ ...sessionForm, session_type: e.target.value })} className="input">
                  <option value="pt_sessie">PT Sessie</option>
                  <option value="lichaamsmeting">Lichaamsmeting</option>
                  <option value="small_group">Small Group</option>
                </select>
              </Field>
              <Field label="DATUM"><input type="date" required value={sessionForm.session_date} onChange={(e) => setSessionForm({ ...sessionForm, session_date: e.target.value })} className="input" /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="START"><input type="time" required value={sessionForm.start_time} onChange={(e) => setSessionForm({ ...sessionForm, start_time: e.target.value })} className="input" /></Field>
                <Field label="EIND"><input type="time" required value={sessionForm.end_time} onChange={(e) => setSessionForm({ ...sessionForm, end_time: e.target.value })} className="input" /></Field>
              </div>
              <button type="submit" className="w-full py-3 bg-primary text-primary-foreground font-heading text-xs tracking-wider hover:bg-primary/90 rounded-sm">INPLANNEN</button>
            </form>
          </Modal>
        )}
      </div>
    </AppShell>
  );
};

const Modal = ({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) => (
  <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
    <div className="bg-card border-2 border-primary/20 rounded-sm p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-heading text-foreground tracking-wider">{title}</h2>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
      </div>
      {children}
    </div>
  </div>
);

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <label className="text-xs font-heading tracking-wider text-muted-foreground mb-1.5 block">{label}</label>
    {children}
  </div>
);

export default AdminClients;
