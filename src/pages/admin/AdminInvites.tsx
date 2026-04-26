import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AppShell from "@/components/app/AppShell";
import { toast } from "sonner";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Trophy,
  Users,
  ShoppingBag,
  UserPlus,
  Search,
  Bell,
  X,
  Gift,
  Undo2,
} from "lucide-react";
import { INVITE_TIERS, type InviteTierKey } from "@/lib/inviteTiers";

interface InviteRow {
  id: string;
  inviter_user_id: string;
  invitee_name: string | null;
  invitee_email: string | null;
  invite_type: "intake" | "purchase";
  status: "pending" | "confirmed";
  created_at: string;
  confirmed_at: string | null;
  source_intake_id: string | null;
  source_booking_id: string | null;
  source_purchase_id: string | null;
}

interface InviterInfo {
  user_id: string;
  naam: string | null;
  email: string | null;
  code: string | null;
}

interface AdminNotification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  metadata: Record<string, unknown> | null;
  related_user_id: string | null;
  read_at: string | null;
  created_at: string;
}

interface RewardRow {
  id: string;
  user_id: string;
  achievement_key: InviteTierKey;
  unlocked_at: string;
  claimed_at: string | null;
}

type FilterStatus = "all" | "pending" | "confirmed";
type FilterType = "all" | "intake" | "purchase";

const AdminInvites = () => {
  const { isAdmin, loading: authLoading } = useAuth();
  const [invites, setInvites] = useState<InviteRow[]>([]);
  const [inviters, setInviters] = useState<Map<string, InviterInfo>>(new Map());
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [rewards, setRewards] = useState<RewardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    const tierKeys = INVITE_TIERS.map((t) => t.key);
    const [invRes, notifRes, rewardRes] = await Promise.all([
      supabase.from("invites").select("*").order("created_at", { ascending: false }),
      supabase
        .from("admin_notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("user_achievements")
        .select("id, user_id, achievement_key, unlocked_at, claimed_at")
        .in("achievement_key", tierKeys)
        .order("unlocked_at", { ascending: false }),
    ]);

    if (invRes.error) {
      toast.error("Kon invites niet laden");
      setLoading(false);
      return;
    }
    const list = (invRes.data as InviteRow[]) ?? [];
    setInvites(list);
    setNotifications((notifRes.data as AdminNotification[]) ?? []);
    setRewards((rewardRes.data as RewardRow[]) ?? []);

    // Fetch inviter profiles + invite codes — include reward owners so all names render.
    const ids = Array.from(
      new Set([
        ...list.map((i) => i.inviter_user_id),
        ...((rewardRes.data as RewardRow[] | null) ?? []).map((r) => r.user_id),
      ]),
    );
    if (ids.length > 0) {
      const [profRes, codeRes] = await Promise.all([
        supabase.from("profiles").select("user_id, naam, email").in("user_id", ids),
        supabase.from("invite_codes").select("user_id, code").in("user_id", ids),
      ]);
      const codeMap = new Map<string, string>(
        (codeRes.data ?? []).map((r: { user_id: string; code: string }) => [r.user_id, r.code]),
      );
      const map = new Map<string, InviterInfo>();
      for (const p of (profRes.data ?? []) as Array<{ user_id: string; naam: string | null; email: string | null }>) {
        map.set(p.user_id, {
          user_id: p.user_id,
          naam: p.naam,
          email: p.email,
          code: codeMap.get(p.user_id) ?? null,
        });
      }
      setInviters(map);
    }
    setLoading(false);
  };

  const markRead = async (id: string) => {
    const { error } = await supabase
      .from("admin_notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      toast.error("Markeren mislukt");
      return;
    }
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)));
  };

  const markAllRead = async () => {
    const unread = notifications.filter((n) => !n.read_at).map((n) => n.id);
    if (unread.length === 0) return;
    const { error } = await supabase
      .from("admin_notifications")
      .update({ read_at: new Date().toISOString() })
      .in("id", unread);
    if (error) {
      toast.error("Markeren mislukt");
      return;
    }
    const now = new Date().toISOString();
    setNotifications((prev) => prev.map((n) => (unread.includes(n.id) ? { ...n, read_at: now } : n)));
    toast.success("Alles gelezen");
  };

  const toggleClaim = async (rewardId: string, currentlyClaimed: boolean) => {
    setClaiming(rewardId);
    const newValue = currentlyClaimed ? null : new Date().toISOString();
    const { error } = await supabase
      .from("user_achievements")
      .update({ claimed_at: newValue })
      .eq("id", rewardId);
    setClaiming(null);
    if (error) {
      toast.error(currentlyClaimed ? "Heropenen mislukt" : "Markeren mislukt");
      return;
    }
    setRewards((prev) => prev.map((r) => (r.id === rewardId ? { ...r, claimed_at: newValue } : r)));
    toast.success(currentlyClaimed ? "Beloning heropend" : "Beloning uitgedeeld");
  };

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin]);

  const handleConfirm = async (inviteId: string) => {
    setConfirming(inviteId);
    const { error } = await supabase.rpc("confirm_invite", { _invite_id: inviteId });
    if (error) {
      toast.error("Bevestigen mislukt");
      setConfirming(null);
      return;
    }

    // Recompute tiers for the inviter (mirrors webhook logic, covers both purchase + intake).
    const inv = invites.find((i) => i.id === inviteId);
    if (inv) {
      const [{ count: purchaseCount }, { count: intakeCount }] = await Promise.all([
        supabase
          .from("invites")
          .select("*", { count: "exact", head: true })
          .eq("inviter_user_id", inv.inviter_user_id)
          .eq("invite_type", "purchase")
          .eq("status", "confirmed"),
        supabase
          .from("invites")
          .select("*", { count: "exact", head: true })
          .eq("inviter_user_id", inv.inviter_user_id)
          .eq("invite_type", "intake"),
      ]);

      const tiers: string[] = [];
      if ((intakeCount ?? 0) >= 1) tiers.push("invite_bronze");
      if ((intakeCount ?? 0) >= 3) tiers.push("invite_silver");
      if ((purchaseCount ?? 0) >= 1) tiers.push("invite_gold");
      if ((purchaseCount ?? 0) >= 5) tiers.push("invite_platinum");

      if (tiers.length > 0) {
        const { data: existing } = await supabase
          .from("user_achievements")
          .select("achievement_key")
          .eq("user_id", inv.inviter_user_id)
          .in("achievement_key", tiers);
        const have = new Set((existing ?? []).map((r: { achievement_key: string }) => r.achievement_key));
        const toInsert = tiers.filter((k) => !have.has(k));
        if (toInsert.length > 0) {
          await supabase.from("user_achievements").insert(
            toInsert.map((k) => ({ user_id: inv.inviter_user_id, achievement_key: k })),
          );

          // Admin notification per newly-granted tier.
          const tierMap = new Map(INVITE_TIERS.map((t) => [t.key, t]));
          const inviterInfo = inviters.get(inv.inviter_user_id);
          const inviterName = inviterInfo?.naam || inviterInfo?.email || "Een client";
          const notifs = toInsert
            .map((k) => tierMap.get(k as typeof INVITE_TIERS[number]["key"]))
            .filter((t): t is typeof INVITE_TIERS[number] => Boolean(t))
            .map((t) => ({
              type: "invite_tier_unlocked",
              title: `${inviterName} behaalde ${t.label}!`,
              body: `Beloning: ${t.reward}. Neem contact op om uit te delen.`,
              related_user_id: inv.inviter_user_id,
              metadata: {
                tier_key: t.key,
                tier_label: t.label,
                reward: t.reward,
                source: "manual_confirm",
                invite_id: inv.id,
              },
            }));
          if (notifs.length > 0) {
            await supabase.from("admin_notifications").insert(notifs);
          }
        }
      }
    }

    toast.success("Invite bevestigd");
    setConfirming(null);
    await load();
  };

  // Top inviters leaderboard (computed client-side from already-loaded data).
  const leaderboard = useMemo(() => {
    const tally = new Map<string, { intakes: number; purchases: number; total: number }>();
    for (const inv of invites) {
      const cur = tally.get(inv.inviter_user_id) ?? { intakes: 0, purchases: 0, total: 0 };
      if (inv.invite_type === "intake") cur.intakes += 1;
      if (inv.invite_type === "purchase" && inv.status === "confirmed") cur.purchases += 1;
      cur.total = cur.intakes + cur.purchases;
      tally.set(inv.inviter_user_id, cur);
    }
    return Array.from(tally.entries())
      .map(([user_id, stats]) => ({ user_id, ...stats, info: inviters.get(user_id) }))
      .sort((a, b) => b.purchases - a.purchases || b.total - a.total)
      .slice(0, 10);
  }, [invites, inviters]);

  const stats = useMemo(() => {
    const intakes = invites.filter((i) => i.invite_type === "intake").length;
    const pendingPurchases = invites.filter((i) => i.invite_type === "purchase" && i.status === "pending").length;
    const confirmedPurchases = invites.filter(
      (i) => i.invite_type === "purchase" && i.status === "confirmed",
    ).length;
    return { intakes, pendingPurchases, confirmedPurchases, total: invites.length };
  }, [invites]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return invites.filter((inv) => {
      if (filterStatus !== "all" && inv.status !== filterStatus) return false;
      if (filterType !== "all" && inv.invite_type !== filterType) return false;
      if (!q) return true;
      const info = inviters.get(inv.inviter_user_id);
      const haystack = [
        inv.invitee_name,
        inv.invitee_email,
        info?.naam,
        info?.email,
        info?.code,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [invites, inviters, filterStatus, filterType, search]);

  if (authLoading) return null;
  if (!isAdmin) {
    return (
      <AppShell>
        <div className="container mx-auto p-8">
          <p className="text-muted-foreground">Geen toegang.</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="container mx-auto px-4 md:px-8 py-8 max-w-6xl">
        <Link
          to="/admin/klanten"
          className="inline-flex items-center gap-2 text-xs font-heading tracking-wider text-muted-foreground hover:text-primary mb-6 transition-colors"
        >
          <ArrowLeft size={14} /> ADMIN
        </Link>

        <p className="text-xs font-heading tracking-[0.3em] text-primary mb-2">ADMIN · INVITES</p>
        <h1 className="text-3xl md:text-4xl font-heading text-foreground mb-2">REFERRAL OVERZICHT</h1>
        <p className="text-sm text-muted-foreground mb-8">
          Beheer alle referrals, bevestig cash-betalingen handmatig en zie wie de top-inviters zijn.
        </p>

        {/* Notifications */}
        {notifications.length > 0 && (
          <section className="mb-8 border border-primary/30 rounded-sm bg-primary/5 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Bell className="text-primary" size={16} />
                <h2 className="text-sm font-heading tracking-wider text-foreground">
                  MELDINGEN
                  {notifications.some((n) => !n.read_at) && (
                    <span className="ml-2 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-primary text-primary-foreground text-[10px] font-heading">
                      {notifications.filter((n) => !n.read_at).length}
                    </span>
                  )}
                </h2>
              </div>
              {notifications.some((n) => !n.read_at) && (
                <button
                  onClick={markAllRead}
                  className="text-[10px] font-heading tracking-wider text-muted-foreground hover:text-primary transition-colors"
                >
                  ALLES GELEZEN
                </button>
              )}
            </div>
            <ul className="space-y-2 max-h-72 overflow-y-auto">
              {notifications.slice(0, 8).map((n) => {
                const isUnread = !n.read_at;
                const date = new Date(n.created_at).toLocaleDateString("nl-NL", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                });
                return (
                  <li
                    key={n.id}
                    className={`flex items-start gap-3 p-3 rounded-sm border ${
                      isUnread ? "border-primary/40 bg-card" : "border-border bg-card/40 opacity-70"
                    }`}
                  >
                    <Trophy
                      size={16}
                      className={isUnread ? "text-primary mt-0.5 shrink-0" : "text-muted-foreground mt-0.5 shrink-0"}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-heading text-foreground">{n.title}</p>
                      {n.body && <p className="text-xs text-muted-foreground mt-0.5">{n.body}</p>}
                      <p className="text-[10px] text-muted-foreground mt-1 tracking-wider">{date}</p>
                    </div>
                    {isUnread && (
                      <button
                        onClick={() => markRead(n.id)}
                        className="shrink-0 text-muted-foreground hover:text-primary transition-colors p-1"
                        aria-label="Markeer als gelezen"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {/* Beloningen — claim flow */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Gift className="text-primary" size={18} />
              <h2 className="text-xl font-heading text-foreground">BELONINGEN</h2>
              {rewards.filter((r) => !r.claimed_at).length > 0 && (
                <span className="ml-1 inline-flex items-center justify-center min-w-[22px] h-5 px-1.5 rounded-full bg-primary text-primary-foreground text-[10px] font-heading">
                  {rewards.filter((r) => !r.claimed_at).length}
                </span>
              )}
            </div>
            <p className="text-[10px] font-heading tracking-wider text-muted-foreground">
              {rewards.filter((r) => r.claimed_at).length} / {rewards.length} UITGEDEELD
            </p>
          </div>
          {loading ? (
            <div className="h-32 bg-card animate-pulse rounded-sm" />
          ) : rewards.length === 0 ? (
            <p className="text-sm text-muted-foreground border border-dashed border-border rounded-sm p-6 text-center">
              Nog geen tier-beloningen ontgrendeld.
            </p>
          ) : (
            <ul className="space-y-2">
              {rewards.map((r) => {
                const tier = INVITE_TIERS.find((t) => t.key === r.achievement_key);
                if (!tier) return null;
                const info = inviters.get(r.user_id);
                const isClaimed = !!r.claimed_at;
                const unlockedDate = new Date(r.unlocked_at).toLocaleDateString("nl-NL", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                });
                const claimedDate = r.claimed_at
                  ? new Date(r.claimed_at).toLocaleDateString("nl-NL", { day: "numeric", month: "short" })
                  : null;
                return (
                  <li
                    key={r.id}
                    className={`border rounded-sm p-4 flex flex-col md:flex-row md:items-center gap-3 md:gap-4 ${
                      isClaimed ? "border-border bg-card/40 opacity-70" : "border-primary/30 bg-card"
                    }`}
                  >
                    <div
                      className={`shrink-0 w-10 h-10 rounded-sm flex items-center justify-center ${
                        isClaimed ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary"
                      }`}
                    >
                      <Trophy size={18} />
                    </div>
                    <div className="flex-1 min-w-0 grid md:grid-cols-2 gap-1 md:gap-4">
                      <div className="min-w-0">
                        <p className="text-[10px] font-heading tracking-wider text-muted-foreground">
                          {tier.label.toUpperCase()}
                        </p>
                        <p className="text-sm font-heading text-foreground truncate">
                          {info?.naam || info?.email || r.user_id.slice(0, 8)}
                          {info?.code && (
                            <span className="ml-1.5 text-[10px] text-primary tracking-wider">
                              · {info.code}
                            </span>
                          )}
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {info?.email ?? "—"}
                        </p>
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-heading tracking-wider text-muted-foreground">
                          BELONING
                        </p>
                        <p className="text-sm text-foreground">{tier.reward}</p>
                        <p className="text-[11px] text-muted-foreground">
                          Unlocked {unlockedDate}
                          {claimedDate && ` · uitgedeeld ${claimedDate}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-[10px] font-heading tracking-wider border ${
                          isClaimed
                            ? "bg-muted text-muted-foreground border-border"
                            : "bg-primary/15 text-primary border-primary/30"
                        }`}
                      >
                        {isClaimed ? <CheckCircle2 size={11} /> : <Clock size={11} />}
                        {isClaimed ? "UITGEDEELD" : "OPEN"}
                      </span>
                      <button
                        onClick={() => toggleClaim(r.id, isClaimed)}
                        disabled={claiming === r.id}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-heading tracking-wider rounded-sm transition-colors disabled:opacity-50 ${
                          isClaimed
                            ? "border border-border text-muted-foreground hover:text-primary hover:border-primary"
                            : "bg-primary text-primary-foreground hover:bg-primary/90"
                        }`}
                      >
                        {claiming === r.id ? (
                          "..."
                        ) : isClaimed ? (
                          <>
                            <Undo2 size={11} /> HEROPEN
                          </>
                        ) : (
                          <>
                            <Gift size={11} /> MARKEER UITGEDEELD
                          </>
                        )}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Stat row */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
          <StatCard icon={Users} label="TOTAAL" value={stats.total} />
          <StatCard icon={UserPlus} label="INTAKES" value={stats.intakes} />
          <StatCard icon={Clock} label="PURCH. PENDING" value={stats.pendingPurchases} accent />
          <StatCard icon={ShoppingBag} label="PURCH. BEVESTIGD" value={stats.confirmedPurchases} />
        </section>

        {/* Leaderboard */}
        <section className="mb-12">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="text-primary" size={18} />
            <h2 className="text-xl font-heading text-foreground">TOP INVITERS</h2>
          </div>
          {loading ? (
            <div className="h-32 bg-card animate-pulse rounded-sm" />
          ) : leaderboard.length === 0 ? (
            <p className="text-sm text-muted-foreground border border-dashed border-border rounded-sm p-6 text-center">
              Nog geen referrals geregistreerd.
            </p>
          ) : (
            <ol className="border border-border rounded-sm bg-card divide-y divide-border">
              {leaderboard.map((row, idx) => (
                <li key={row.user_id} className="flex items-center gap-4 px-4 py-3">
                  <span
                    className={`shrink-0 w-8 text-center font-heading text-lg ${
                      idx === 0 ? "text-primary" : "text-muted-foreground"
                    }`}
                  >
                    #{idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-heading text-foreground truncate">
                      {row.info?.naam || row.info?.email || row.user_id.slice(0, 8)}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {row.info?.code ? `Code ${row.info.code} · ` : ""}
                      {row.info?.email ?? "—"}
                    </p>
                  </div>
                  <div className="hidden sm:flex items-center gap-3 text-[11px] text-muted-foreground">
                    <span>{row.intakes} intakes</span>
                    <span className="text-primary font-heading">{row.purchases} purchases</span>
                  </div>
                  <span className="shrink-0 text-2xl font-heading text-foreground tabular-nums">
                    {row.total}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>

        {/* Filters */}
        <section className="mb-4 flex flex-col md:flex-row md:items-center gap-3">
          <div className="relative flex-1">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Zoek op naam, email of code…"
              className="w-full pl-9 pr-3 py-2.5 bg-background border border-border rounded-sm text-sm text-foreground focus:outline-none focus:border-primary"
            />
          </div>
          <div className="flex gap-2">
            <FilterPill
              label="ALLE"
              active={filterType === "all"}
              onClick={() => setFilterType("all")}
            />
            <FilterPill
              label="INTAKES"
              active={filterType === "intake"}
              onClick={() => setFilterType("intake")}
            />
            <FilterPill
              label="PURCHASES"
              active={filterType === "purchase"}
              onClick={() => setFilterType("purchase")}
            />
          </div>
          <div className="flex gap-2">
            <FilterPill
              label="STATUS: ALLE"
              active={filterStatus === "all"}
              onClick={() => setFilterStatus("all")}
            />
            <FilterPill
              label="PENDING"
              active={filterStatus === "pending"}
              onClick={() => setFilterStatus("pending")}
            />
            <FilterPill
              label="BEVESTIGD"
              active={filterStatus === "confirmed"}
              onClick={() => setFilterStatus("confirmed")}
            />
          </div>
        </section>

        {/* Invite list */}
        {loading ? (
          <div className="h-64 bg-card animate-pulse rounded-sm" />
        ) : filtered.length === 0 ? (
          <div className="border border-dashed border-border rounded-sm p-10 text-center">
            <p className="text-sm text-muted-foreground">Geen invites gevonden voor deze filters.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {filtered.map((inv) => {
              const info = inviters.get(inv.inviter_user_id);
              const isPurchase = inv.invite_type === "purchase";
              const isConfirmed = inv.status === "confirmed";
              const date = new Date(inv.created_at).toLocaleDateString("nl-NL", {
                day: "numeric",
                month: "short",
                year: "numeric",
              });
              return (
                <li
                  key={inv.id}
                  className="border border-border rounded-sm bg-card p-4 flex flex-col md:flex-row md:items-center gap-3 md:gap-4"
                >
                  <div
                    className={`shrink-0 w-10 h-10 rounded-sm flex items-center justify-center ${
                      isPurchase ? "bg-primary/10 text-primary" : "bg-muted text-foreground"
                    }`}
                  >
                    {isPurchase ? <ShoppingBag size={18} /> : <UserPlus size={18} />}
                  </div>
                  <div className="flex-1 min-w-0 grid md:grid-cols-2 gap-1 md:gap-4">
                    <div className="min-w-0">
                      <p className="text-[10px] font-heading tracking-wider text-muted-foreground">
                        UITGENODIGDE
                      </p>
                      <p className="text-sm font-heading text-foreground truncate">
                        {inv.invitee_name || inv.invitee_email || "Anoniem"}
                      </p>
                      {inv.invitee_email && inv.invitee_name && (
                        <p className="text-[11px] text-muted-foreground truncate">
                          {inv.invitee_email}
                        </p>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-heading tracking-wider text-muted-foreground">
                        UITGENODIGD DOOR
                      </p>
                      <p className="text-sm font-heading text-foreground truncate">
                        {info?.naam || info?.email || inv.inviter_user_id.slice(0, 8)}
                        {info?.code && (
                          <span className="ml-1.5 text-[10px] text-primary tracking-wider">
                            · {info.code}
                          </span>
                        )}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {isPurchase ? "Pakket / rittenkaart" : "Intake aanvraag"} · {date}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-[10px] font-heading tracking-wider border ${
                        isConfirmed
                          ? "bg-primary/15 text-primary border-primary/30"
                          : "bg-muted text-muted-foreground border-border"
                      }`}
                    >
                      {isConfirmed ? <CheckCircle2 size={11} /> : <Clock size={11} />}
                      {isConfirmed ? "BEVESTIGD" : "WACHT"}
                    </span>
                    {!isConfirmed && (
                      <button
                        onClick={() => handleConfirm(inv.id)}
                        disabled={confirming === inv.id}
                        className="px-3 py-1.5 bg-primary text-primary-foreground text-[10px] font-heading tracking-wider rounded-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
                      >
                        {confirming === inv.id ? "..." : "BEVESTIG"}
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </AppShell>
  );
};

function StatCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof Users;
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div
      className={`border rounded-sm bg-card p-4 ${
        accent ? "border-primary/40" : "border-border"
      }`}
    >
      <Icon className={accent ? "text-primary mb-2" : "text-muted-foreground mb-2"} size={16} />
      <p className="text-2xl md:text-3xl font-heading text-foreground leading-none">{value}</p>
      <p className="text-[10px] font-heading tracking-wider text-muted-foreground mt-1">{label}</p>
    </div>
  );
}

function FilterPill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-2 text-[10px] font-heading tracking-wider rounded-sm border transition-colors ${
        active
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-background text-muted-foreground border-border hover:border-primary hover:text-primary"
      }`}
    >
      {label}
    </button>
  );
}

export default AdminInvites;
