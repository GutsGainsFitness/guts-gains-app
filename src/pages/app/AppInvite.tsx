import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Copy,
  Check,
  Share2,
  Gift,
  UserPlus,
  ShoppingBag,
  Clock,
  CheckCircle2,
  MessageCircle,
  Mail,
  Trophy,
  Crown,
  Lock,
  Sparkles,
  Users,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import AppShell from "@/components/app/AppShell";
import { buildInviteUrl } from "@/lib/referral";
import { INVITE_TIERS, type InviteTier } from "@/lib/inviteTiers";
import { useLanguage } from "@/i18n/LanguageContext";
import { intlLocale } from "@/i18n/dateLocale";

interface InviteRow {
  id: string;
  invitee_name: string | null;
  invitee_email: string | null;
  invite_type: "intake" | "purchase";
  status: "pending" | "confirmed";
  created_at: string;
  confirmed_at: string | null;
}

const TIER_ICON_MAP = { UserPlus, Users, Trophy, Crown } as const;

const AppInvite = () => {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const intlLoc = intlLocale(language);
  const [code, setCode] = useState<string | null>(null);
  const [invites, setInvites] = useState<InviteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [codeRes, invitesRes] = await Promise.all([
        supabase.from("invite_codes").select("code").eq("user_id", user.id).maybeSingle(),
        supabase
          .from("invites")
          .select("id, invitee_name, invitee_email, invite_type, status, created_at, confirmed_at")
          .eq("inviter_user_id", user.id)
          .order("created_at", { ascending: false }),
      ]);
      setCode(codeRes.data?.code ?? null);
      setInvites((invitesRes.data as InviteRow[]) ?? []);
      setLoading(false);
    };
    load();
  }, [user]);

  const inviteUrl = useMemo(() => (code ? buildInviteUrl(code) : ""), [code]);

  const stats = useMemo(() => {
    const intakes = invites.filter((i) => i.invite_type === "intake").length;
    const purchases = invites.filter((i) => i.invite_type === "purchase" && i.status === "confirmed").length;
    return { intakes, purchases, total: invites.length };
  }, [invites]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      toast.success(t("app.invite.copied_toast"));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t("app.invite.copy_failed"));
    }
  };

  const shareViaWhatsApp = () => {
    const msg = encodeURIComponent(t("app.invite.wa_msg").replace("{url}", inviteUrl));
    window.open(`https://wa.me/?text=${msg}`, "_blank");
  };

  const shareViaEmail = () => {
    const subject = encodeURIComponent(t("app.invite.email_subject"));
    const body = encodeURIComponent(t("app.invite.email_body").replace("{url}", inviteUrl));
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  return (
    <AppShell>
      <div className="container mx-auto px-4 md:px-8 py-8 md:py-12 max-w-4xl">
        <Link
          to="/app"
          className="inline-flex items-center gap-2 text-xs font-heading tracking-wider text-muted-foreground hover:text-primary mb-6 transition-colors"
        >
          <ArrowLeft size={14} /> {t("app.invite.back")}
        </Link>

        <p className="text-xs font-heading tracking-[0.3em] text-primary mb-2">{t("app.invite.tag")}</p>
        <h1 className="text-4xl md:text-5xl font-heading text-foreground mb-3">{t("app.invite.title")}</h1>
        <p className="text-sm text-muted-foreground max-w-2xl mb-10">
          {t("app.invite.subtitle_a")}{" "}
          <span className="text-foreground font-heading">{t("app.invite.subtitle_b")}</span>{" "}
          {t("app.invite.subtitle_c")}
        </p>

        {loading ? (
          <div className="h-64 bg-card animate-pulse rounded-sm" />
        ) : !code ? (
          <div className="border border-dashed border-border rounded-sm p-8 text-center text-sm text-muted-foreground">
            {t("app.invite.no_code")}
          </div>
        ) : (
          <>
            <section className="relative overflow-hidden border-2 border-primary/40 rounded-sm bg-card p-6 md:p-8 mb-10">
              <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/10 blur-3xl rounded-full pointer-events-none" />
              <div className="relative">
                <div className="flex items-center gap-2 mb-4">
                  <Gift className="text-primary" size={18} />
                  <p className="text-xs font-heading tracking-[0.3em] text-primary">{t("app.invite.your_code")}</p>
                </div>
                <p className="text-4xl md:text-6xl font-heading text-foreground tracking-[0.15em] mb-6 break-all">
                  {code}
                </p>

                <label className="text-[10px] font-heading tracking-wider text-muted-foreground mb-1.5 block">
                  {t("app.invite.share_link")}
                </label>
                <div className="flex items-stretch gap-2 mb-5">
                  <input
                    readOnly
                    value={inviteUrl}
                    onFocus={(e) => e.currentTarget.select()}
                    className="flex-1 min-w-0 px-3 py-3 bg-background border border-border rounded-sm text-foreground text-xs md:text-sm font-mono focus:outline-none focus:border-primary"
                  />
                  <button
                    onClick={handleCopy}
                    className="shrink-0 px-4 bg-primary text-primary-foreground font-heading text-xs tracking-wider hover:bg-primary/90 transition-colors flex items-center gap-2 rounded-sm"
                    aria-label={t("app.invite.copy_aria")}
                  >
                    {copied ? <Check size={16} /> : <Copy size={16} />}
                    <span className="hidden sm:inline">{copied ? t("app.invite.copied") : t("app.invite.copy")}</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={shareViaWhatsApp}
                    className="flex items-center justify-center gap-2 px-4 py-3 border border-border bg-background hover:border-primary hover:text-primary transition-colors text-xs font-heading tracking-wider rounded-sm"
                  >
                    <MessageCircle size={14} /> {t("app.invite.whatsapp")}
                  </button>
                  <button
                    onClick={shareViaEmail}
                    className="flex items-center justify-center gap-2 px-4 py-3 border border-border bg-background hover:border-primary hover:text-primary transition-colors text-xs font-heading tracking-wider rounded-sm"
                  >
                    <Mail size={14} /> {t("app.invite.email")}
                  </button>
                </div>
              </div>
            </section>

            <section className="grid grid-cols-3 gap-3 md:gap-4 mb-10">
              <StatCard icon={Share2} label={t("app.invite.stat.invited")} value={stats.total} />
              <StatCard icon={UserPlus} label={t("app.invite.stat.intakes")} value={stats.intakes} />
              <StatCard icon={ShoppingBag} label={t("app.invite.stat.purchases")} value={stats.purchases} />
            </section>

            <section className="mb-12">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="text-primary" size={18} />
                <h2 className="text-xl font-heading text-foreground">{t("app.invite.tiers.title")}</h2>
              </div>
              <p className="text-xs text-muted-foreground mb-5">
                {t("app.invite.tiers.subtitle")}
              </p>
              <div className="grid sm:grid-cols-2 gap-3">
                {INVITE_TIERS.map((tier) => (
                  <TierCard
                    key={tier.key}
                    tier={tier}
                    intakes={stats.intakes}
                    purchases={stats.purchases}
                    t={t}
                  />
                ))}
              </div>
            </section>

            <section>
              <h2 className="text-xl font-heading text-foreground mb-1">{t("app.invite.list.title")}</h2>
              <p className="text-xs text-muted-foreground mb-4">
                {t("app.invite.list.subtitle")}
              </p>

              {invites.length === 0 ? (
                <div className="border border-dashed border-border rounded-sm p-8 text-center">
                  <Share2 className="text-muted-foreground mx-auto mb-3" size={28} />
                  <p className="text-sm text-muted-foreground">
                    {t("app.invite.list.empty")}
                  </p>
                </div>
              ) : (
                <ul className="space-y-2">
                  {invites.map((inv) => (
                    <InviteRowItem key={inv.id} invite={inv} t={t} intlLoc={intlLoc} />
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </div>
    </AppShell>
  );
};

function StatCard({ icon: Icon, label, value }: { icon: typeof Share2; label: string; value: number }) {
  return (
    <div className="border border-border rounded-sm bg-card p-4 md:p-5">
      <Icon className="text-primary mb-2" size={18} />
      <p className="text-3xl md:text-4xl font-heading text-foreground leading-none">{value}</p>
      <p className="text-[10px] font-heading tracking-wider text-muted-foreground mt-1">{label}</p>
    </div>
  );
}

function TierCard({
  tier,
  intakes,
  purchases,
  t,
}: {
  tier: InviteTier;
  intakes: number;
  purchases: number;
  t: (key: string) => string;
}) {
  const current = tier.metric === "intakes" ? intakes : purchases;
  const unlocked = current >= tier.threshold;
  const progress = Math.min(100, Math.round((current / tier.threshold) * 100));
  const Icon = TIER_ICON_MAP[tier.icon];
  const unitOne = tier.metric === "intakes" ? t("app.invite.tier.intake_one") : t("app.invite.tier.purchase_one");
  const unitMany = tier.metric === "intakes" ? t("app.invite.tier.intake_many") : t("app.invite.tier.purchase_many");

  return (
    <div
      className={`relative border rounded-sm p-4 transition-colors ${
        unlocked
          ? "border-primary/50 bg-primary/5"
          : "border-border bg-card"
      }`}
    >
      <div className="flex items-start gap-3 mb-3">
        <div
          className={`shrink-0 w-10 h-10 rounded-sm flex items-center justify-center ${
            unlocked ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
          }`}
        >
          {unlocked ? <Icon size={18} /> : <Lock size={16} />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-heading text-foreground truncate">{tier.label}</h3>
            {unlocked && (
              <span className="shrink-0 text-[9px] font-heading tracking-wider text-primary border border-primary/40 px-1.5 py-0.5 rounded-sm">
                {t("app.invite.tier.unlocked")}
              </span>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {tier.threshold} {tier.threshold > 1 ? unitMany : unitOne}
          </p>
        </div>
      </div>

      <div className="mb-2.5">
        <div className="h-1.5 bg-muted rounded-sm overflow-hidden">
          <div
            className={`h-full transition-all ${unlocked ? "bg-primary" : "bg-primary/40"}`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-[10px] font-heading tracking-wider text-muted-foreground mt-1.5">
          {current} / {tier.threshold}
        </p>
      </div>

      <div className="border-t border-border/60 pt-2.5">
        <p className="text-[10px] font-heading tracking-wider text-muted-foreground mb-0.5">
          {t("app.invite.tier.reward")}
        </p>
        <p className={`text-sm ${unlocked ? "text-foreground" : "text-muted-foreground"}`}>
          {tier.reward}
        </p>
      </div>
    </div>
  );
}

function InviteRowItem({ invite, t, intlLoc }: { invite: InviteRow; t: (key: string) => string; intlLoc: string }) {
  const isPurchase = invite.invite_type === "purchase";
  const Icon = isPurchase ? ShoppingBag : UserPlus;
  const date = new Date(invite.created_at).toLocaleDateString(intlLoc, { day: "numeric", month: "short", year: "numeric" });
  const isConfirmed = invite.status === "confirmed";

  return (
    <li className="border border-border rounded-sm bg-card p-4 flex items-center gap-4">
      <div
        className={`shrink-0 w-10 h-10 rounded-sm flex items-center justify-center ${
          isPurchase ? "bg-primary/10 text-primary" : "bg-muted text-foreground"
        }`}
      >
        <Icon size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-heading text-foreground truncate">
          {invite.invitee_name || invite.invitee_email || t("app.invite.row.anonymous")}
        </p>
        <p className="text-[11px] text-muted-foreground">
          {isPurchase ? t("app.invite.row.package") : t("app.invite.row.intake")} · {date}
        </p>
      </div>
      <div
        className={`shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-[10px] font-heading tracking-wider ${
          isConfirmed
            ? "bg-primary/15 text-primary border border-primary/30"
            : "bg-muted text-muted-foreground border border-border"
        }`}
      >
        {isConfirmed ? <CheckCircle2 size={11} /> : <Clock size={11} />}
        {isConfirmed ? t("app.invite.row.confirmed") : t("app.invite.row.pending")}
      </div>
    </li>
  );
}

export default AppInvite;
