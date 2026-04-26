import { Fragment, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, BarChart3, MousePointerClick, Smartphone, Tablet, Monitor, HelpCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

type Row = {
  cta_id: string;
  total_clicks: number;
  clicks_last_7d: number;
  clicks_last_24h: number;
  total_impressions: number;
  impressions_last_7d: number;
  impressions_last_24h: number;
  ctr_pct: number | null;
  ctr_pct_7d: number | null;
  last_click_at: string | null;
  last_impression_at: string | null;
};

type VariantRow = {
  cta_id: string;
  variant: string;
  total_clicks: number;
  total_impressions: number;
  ctr_pct: number | null;
};

const RANGES = [7, 30, 90] as const;

const friendlyLabel = (id: string) => {
  const map: Record<string, string> = {
    "hero.intake": "Hero · Plan gratis intake",
    "hero.pricing": "Hero · Bekijk tarieven",
    "hero.open_app": "Hero · Open app (ingelogd)",
    "navbar.intake.desktop": "Navbar · Intake (desktop)",
    "navbar.intake.mobile": "Navbar · Intake (mobile)",
    "appfeat.signup": "App-features · Maak account",
    "appfeat.open_app": "App-features · Open app",
    "appfeat.faq.intake": "App-FAQ · Plan intake",
    "appfeat.faq.pricing": "App-FAQ · Tarieven",
    "appfeat.faq.login": "App-FAQ · Inloggen",
    "appfeat.bottom.login": "App-features · Footer login",
    "pricing.intake_cta": "Tarieven · Plan intake",
    "pricing.checkout": "Tarieven · Kies pakket → checkout",
    "promo.app_signup": "Promo banner · App signup",
  };
  return map[id] ?? id;
};

const AdminCtaStats = () => {
  const { isAdmin, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [days, setDays] = useState<number>(30);
  const [rows, setRows] = useState<Row[]>([]);
  const [variantRows, setVariantRows] = useState<VariantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!isAdmin) return;

    let cancelled = false;
    setLoading(true);
    // Cast: rpc-types worden bijgewerkt na migration
    type RpcCall<T> = (
      fn: string,
      args: { _days: number },
    ) => Promise<{ data: T | null; error: { message: string } | null }>;
    const rpc = supabase.rpc as unknown as RpcCall<Row[] | VariantRow[]>;
    Promise.all([
      (rpc as RpcCall<Row[]>)("get_cta_stats", { _days: days }),
      (rpc as RpcCall<VariantRow[]>)("get_cta_variant_stats", { _days: days }),
    ]).then(([statsRes, variantRes]) => {
      if (cancelled) return;
      const err = statsRes.error || variantRes.error;
      if (err) {
        toast({
          title: "Kon statistieken niet laden",
          description: err.message,
          variant: "destructive",
        });
      } else {
        setRows(statsRes.data ?? []);
        setVariantRows(variantRes.data ?? []);
      }
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [days, isAdmin, authLoading, toast]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">
        Laden…
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">
        Geen toegang.
      </div>
    );
  }

  const totalClicks = rows.reduce((sum, r) => sum + r.total_clicks, 0);
  const totalImpressions = rows.reduce(
    (sum, r) => sum + (r.total_impressions ?? 0),
    0,
  );
  const overallCtr =
    totalImpressions > 0
      ? Math.round((totalClicks / totalImpressions) * 10000) / 100
      : null;

  const variantsByCta = variantRows.reduce<Record<string, VariantRow[]>>(
    (acc, v) => {
      (acc[v.cta_id] ||= []).push(v);
      return acc;
    },
    {},
  );

  const variantOrder = ["mobile", "tablet", "desktop", "unknown"];
  const variantMeta: Record<string, { label: string; icon: typeof Smartphone }> = {
    mobile: { label: "Mobiel (<768px)", icon: Smartphone },
    tablet: { label: "Tablet (768–1023px)", icon: Tablet },
    desktop: { label: "Desktop (≥1024px)", icon: Monitor },
    unknown: { label: "Onbekend", icon: HelpCircle },
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container-tight px-4 md:px-8 py-10">
        <Link
          to="/admin"
          className="inline-flex items-center gap-2 text-xs font-heading tracking-[0.2em] text-muted-foreground hover:text-primary transition-colors mb-8"
        >
          <ArrowLeft size={14} />
          Terug naar admin
        </Link>

        <div className="flex items-center gap-3 mb-2">
          <BarChart3 className="text-primary" size={24} />
          <h1 className="text-3xl md:text-4xl font-heading">CTA statistieken</h1>
        </div>
        <p className="text-sm text-muted-foreground mb-8 max-w-xl">
          Anonieme impressies en klikken op call-to-action knoppen, inclusief
          klik-through-rate (CTR). Geen IP, geen cookies — alleen tellers per knop.
        </p>

        <div className="flex flex-wrap items-center gap-2 mb-8">
          {RANGES.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDays(d)}
              className={`px-4 py-2 text-xs font-heading tracking-[0.2em] rounded-sm border transition-colors ${
                days === d
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:border-primary hover:text-foreground"
              }`}
            >
              Laatste {d} dagen
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <div className="p-5 rounded-sm border border-border bg-card">
            <p className="text-[10px] font-heading tracking-[0.3em] text-muted-foreground mb-2">
              Impressies ({days}d)
            </p>
            <p className="text-3xl font-heading">{totalImpressions.toLocaleString("nl-NL")}</p>
          </div>
          <div className="p-5 rounded-sm border border-border bg-card">
            <p className="text-[10px] font-heading tracking-[0.3em] text-muted-foreground mb-2">
              Kliks ({days}d)
            </p>
            <p className="text-3xl font-heading">{totalClicks.toLocaleString("nl-NL")}</p>
          </div>
          <div className="p-5 rounded-sm border border-border bg-card">
            <p className="text-[10px] font-heading tracking-[0.3em] text-muted-foreground mb-2">
              Gemiddelde CTR
            </p>
            <p className="text-3xl font-heading">
              {overallCtr !== null ? `${overallCtr.toLocaleString("nl-NL")}%` : "—"}
            </p>
          </div>
          <div className="p-5 rounded-sm border border-border bg-card">
            <p className="text-[10px] font-heading tracking-[0.3em] text-muted-foreground mb-2">
              Top CTA
            </p>
            <p className="text-base font-heading truncate" title={rows[0]?.cta_id}>
              {rows[0] ? friendlyLabel(rows[0].cta_id) : "—"}
            </p>
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Laden…</p>
        ) : rows.length === 0 ? (
          <div className="p-10 rounded-sm border border-dashed border-border bg-card text-center">
            <MousePointerClick className="text-muted-foreground mx-auto mb-3" size={28} />
            <p className="text-sm text-muted-foreground">
              Nog geen kliks geregistreerd in deze periode.
            </p>
          </div>
        ) : (
          <div className="rounded-sm border border-border bg-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-background/50 text-muted-foreground">
                <tr className="text-left">
                  <th className="px-4 py-3 font-heading text-[10px] tracking-[0.2em]">CTA</th>
                  <th className="px-4 py-3 font-heading text-[10px] tracking-[0.2em] text-right">
                    Impressies
                  </th>
                  <th className="px-4 py-3 font-heading text-[10px] tracking-[0.2em] text-right">
                    Kliks
                  </th>
                  <th className="px-4 py-3 font-heading text-[10px] tracking-[0.2em] text-right">
                    CTR
                  </th>
                  <th className="px-4 py-3 font-heading text-[10px] tracking-[0.2em] text-right">
                    7d (kliks/CTR)
                  </th>
                  <th className="px-4 py-3 font-heading text-[10px] tracking-[0.2em] text-right">
                    24u (kliks)
                  </th>
                  <th className="px-4 py-3 font-heading text-[10px] tracking-[0.2em]">
                    Laatste klik
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <Fragment key={r.cta_id}>
                  <tr
                    className="border-t border-border/60 cursor-pointer hover:bg-background/40 transition-colors"
                    onClick={() =>
                      setExpanded(expanded === r.cta_id ? null : r.cta_id)
                    }
                  >
                    <td className="px-4 py-3">
                      <div className="font-body text-foreground flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground/60">
                          {expanded === r.cta_id ? "▼" : "▶"}
                        </span>
                        {friendlyLabel(r.cta_id)}
                      </div>
                      <div className="text-[11px] text-muted-foreground/70 font-mono pl-4">
                        {r.cta_id}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground">
                      {(r.total_impressions ?? 0).toLocaleString("nl-NL")}
                    </td>
                    <td className="px-4 py-3 text-right font-heading">
                      {r.total_clicks.toLocaleString("nl-NL")}
                    </td>
                    <td className="px-4 py-3 text-right font-heading text-primary">
                      {r.ctr_pct !== null
                        ? `${r.ctr_pct.toLocaleString("nl-NL")}%`
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground">
                      {r.clicks_last_7d.toLocaleString("nl-NL")}
                      {r.ctr_pct_7d !== null && (
                        <span className="text-[11px] text-muted-foreground/70 ml-1">
                          ({r.ctr_pct_7d.toLocaleString("nl-NL")}%)
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground">
                      {r.clicks_last_24h.toLocaleString("nl-NL")}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {r.last_click_at
                        ? new Date(r.last_click_at).toLocaleString("nl-NL", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })
                        : "—"}
                    </td>
                  </tr>
                  {expanded === r.cta_id && (
                    <tr className="bg-background/30 border-t border-border/40">
                      <td colSpan={7} className="px-4 py-4">
                        <p className="text-[10px] font-heading tracking-[0.2em] text-muted-foreground mb-3">
                          Per device-variant ({days}d)
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                          {variantOrder
                            .map((v) =>
                              (variantsByCta[r.cta_id] || []).find(
                                (x) => x.variant === v,
                              ),
                            )
                            .filter((v): v is VariantRow => Boolean(v))
                            .map((v) => {
                              const meta =
                                variantMeta[v.variant] ?? variantMeta.unknown;
                              const Icon = meta.icon;
                              return (
                                <div
                                  key={v.variant}
                                  className="p-3 rounded-sm border border-border/60 bg-card/50"
                                >
                                  <div className="flex items-center gap-2 mb-2">
                                    <Icon
                                      size={14}
                                      className="text-muted-foreground"
                                    />
                                    <span className="text-[10px] font-heading tracking-[0.2em] text-muted-foreground">
                                      {meta.label}
                                    </span>
                                  </div>
                                  <div className="flex items-baseline gap-2">
                                    <span className="text-xl font-heading text-primary">
                                      {v.ctr_pct !== null
                                        ? `${v.ctr_pct.toLocaleString("nl-NL")}%`
                                        : "—"}
                                    </span>
                                    <span className="text-[11px] text-muted-foreground">
                                      CTR
                                    </span>
                                  </div>
                                  <div className="text-[11px] text-muted-foreground/80 mt-1">
                                    {v.total_clicks.toLocaleString("nl-NL")} kliks
                                    {" / "}
                                    {v.total_impressions.toLocaleString("nl-NL")} impressies
                                  </div>
                                </div>
                              );
                            })}
                          {!(variantsByCta[r.cta_id]?.length) && (
                            <p className="text-xs text-muted-foreground italic">
                              Nog geen variant-data voor deze CTA.
                            </p>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminCtaStats;
