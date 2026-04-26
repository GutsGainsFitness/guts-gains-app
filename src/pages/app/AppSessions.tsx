import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Calendar, Plus, Check, X as XIcon, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AppShell from "@/components/app/AppShell";
import { format } from "date-fns";
import { toast } from "sonner";
import { useLanguage } from "@/i18n/LanguageContext";
import { dateLocale } from "@/i18n/dateLocale";

interface Session {
  id: string;
  session_date: string;
  start_time: string;
  end_time: string | null;
  session_type: string;
  status: string;
  notes: string | null;
}

const AppSessions = () => {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const locale = dateLocale(language);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("pt_sessions")
      .select("*")
      .eq("user_id", user.id)
      .order("session_date", { ascending: false })
      .order("start_time", { ascending: false });
    setSessions((data as Session[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [user]);

  const cancelSession = async (id: string) => {
    if (!confirm(t("app.sessions.cancel_confirm"))) return;
    const { error } = await supabase.from("pt_sessions").update({ status: "geannuleerd" }).eq("id", id);
    if (error) toast.error(t("app.sessions.cancel_failed"));
    else {
      toast.success(t("app.sessions.cancelled"));
      load();
    }
  };

  const today = new Date().toISOString().split("T")[0];
  const upcoming = sessions.filter((s) => s.session_date >= today && s.status !== "geannuleerd");
  const past = sessions.filter((s) => s.session_date < today || s.status === "voltooid");

  const statusBadge = (status: string) => {
    const map: Record<string, { label: string; cls: string; icon: React.ElementType }> = {
      gepland: { label: t("app.sessions.status.planned"), cls: "bg-primary/10 text-primary border-primary/30", icon: Clock },
      voltooid: { label: t("app.sessions.status.completed"), cls: "bg-green-500/10 text-green-500 border-green-500/30", icon: Check },
      no_show: { label: t("app.sessions.status.no_show"), cls: "bg-orange-500/10 text-orange-500 border-orange-500/30", icon: XIcon },
      geannuleerd: { label: t("app.sessions.status.cancelled"), cls: "bg-muted text-muted-foreground border-border", icon: XIcon },
    };
    const s = map[status] || map.gepland;
    const Icon = s.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-heading tracking-wider border rounded-sm ${s.cls}`}>
        <Icon size={10} /> {s.label.toUpperCase()}
      </span>
    );
  };

  const typeLabel = (typ: string) => {
    if (typ === "pt_sessie") return t("app.sessions.type.pt");
    if (typ === "lichaamsmeting") return t("app.sessions.type.measurement");
    if (typ === "small_group") return t("app.sessions.type.small_group");
    return typ;
  };

  return (
    <AppShell>
      <div className="p-6 md:p-10 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-primary font-heading text-xs tracking-[0.35em] mb-2">{t("app.sessions.tag")}</p>
            <h1 className="text-3xl font-heading text-foreground">{t("app.sessions.title")}</h1>
          </div>
          <Link to="/boeken" className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground text-xs font-heading tracking-wider hover:bg-primary/90 transition-all shadow-red rounded-sm">
            <Plus size={14} /> {t("app.sessions.new")}
          </Link>
        </div>

        {loading ? (
          <div className="text-muted-foreground text-sm">{t("app.sessions.loading")}</div>
        ) : (
          <div className="space-y-10">
            <section>
              <h2 className="text-xs font-heading tracking-wider text-muted-foreground mb-3">{t("app.sessions.upcoming")}</h2>
              {upcoming.length === 0 ? (
                <div className="border border-border bg-card p-6 rounded-sm text-sm text-muted-foreground">
                  <Calendar className="inline mr-2" size={16} /> {t("app.sessions.no_upcoming")} <Link to="/boeken" className="text-primary hover:underline ml-1">{t("app.sessions.book_now")}</Link>.
                </div>
              ) : (
                <div className="space-y-3">
                  {upcoming.map((s) => (
                    <div key={s.id} className="border border-border bg-card p-5 rounded-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-4">
                        <div className="bg-primary/10 border border-primary/30 rounded-sm w-14 h-14 flex flex-col items-center justify-center shrink-0">
                          <span className="text-xs font-heading text-primary">{format(new Date(s.session_date), "MMM", { locale }).toUpperCase()}</span>
                          <span className="text-xl font-heading text-foreground leading-none">{format(new Date(s.session_date), "d")}</span>
                        </div>
                        <div>
                          <p className="text-sm font-heading text-foreground">{typeLabel(s.session_type).toUpperCase()}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {format(new Date(s.session_date), "EEEE", { locale })} • {s.start_time.slice(0, 5)}
                            {s.end_time ? ` - ${s.end_time.slice(0, 5)}` : ""}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        {statusBadge(s.status)}
                        {s.status === "gepland" && (
                          <button onClick={() => cancelSession(s.id)} className="text-xs text-muted-foreground hover:text-primary px-2 py-1">
                            {t("app.sessions.cancel")}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section>
              <h2 className="text-xs font-heading tracking-wider text-muted-foreground mb-3">{t("app.sessions.history")}</h2>
              {past.length === 0 ? (
                <div className="text-sm text-muted-foreground">{t("app.sessions.no_history")}</div>
              ) : (
                <div className="space-y-2">
                  {past.map((s) => (
                    <div key={s.id} className="border border-border/50 bg-card/50 p-4 rounded-sm flex items-center justify-between text-sm">
                      <div>
                        <span className="font-heading text-foreground">{typeLabel(s.session_type)}</span>
                        <span className="text-muted-foreground ml-3">
                          {format(new Date(s.session_date), "d MMM yyyy", { locale })} • {s.start_time.slice(0, 5)}
                        </span>
                      </div>
                      {statusBadge(s.status)}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </AppShell>
  );
};

export default AppSessions;
