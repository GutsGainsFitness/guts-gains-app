import { ReactNode, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, Calendar, Activity, Camera, User as UserIcon, LogOut, Users, Menu, X, Dumbbell, Timer, TrendingUp, Trophy, Shield, Crown, Gift, Footprints, Home } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import RankBadge from "@/components/app/RankBadge";
import { fullRankLabel, RankTier, Division, TIER_STYLES } from "@/lib/rank";
import { useLanguage } from "@/i18n/LanguageContext";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import logoImage from "@/assets/logo-gutsandgains.png";
import { useSwipeBack } from "@/hooks/useSwipeBack";
import IOSAppComingBanner from "@/components/IOSAppComingBanner";
import BottomNav from "@/components/app/BottomNav";
import { isNative } from "@/lib/native";

interface MiniRank {
  tier: RankTier;
  division: Division;
  score: number;
  name: string | null;
}

const AppShell = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, isAdmin, user } = useAuth();
  const { t, language } = useLanguage();
  const [open, setOpen] = useState(false);
  const [rank, setRank] = useState<MiniRank | null>(null);

  // Native-feeling swipe-back gesture on mobile (left edge → right)
  useSwipeBack();

  useEffect(() => {
    if (!user) {
      setRank(null);
      return;
    }
    let cancelled = false;
    const load = async () => {
      const [rankRes, profileRes] = await Promise.all([
        supabase
          .from("user_ranks")
          .select("current_tier, current_division, total_score")
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase
          .from("profiles")
          .select("naam")
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);
      if (cancelled) return;
      const r = rankRes.data;
      setRank({
        tier: (r?.current_tier as RankTier) ?? "iron",
        division: ((r?.current_division as Division) ?? 1) as Division,
        score: Math.round(r?.total_score ?? 0),
        name: profileRes.data?.naam ?? null,
      });
    };
    load();

    // Realtime: refresh when user_ranks changes (e.g. after a workout)
    const channel = supabase
      .channel(`user_ranks_${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_ranks", filter: `user_id=eq.${user.id}` },
        () => load(),
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [user]);

  const navItems = [
    { label: t("app.nav.dashboard"), href: "/app", icon: LayoutDashboard },
    { label: t("app.nav.workouts"), href: "/app/workouts", icon: Dumbbell },
    { label: t("app.nav.interval"), href: "/app/interval", icon: Timer },
    { label: t("app.nav.running"), href: "/app/hardlopen", icon: Footprints },
    { label: t("app.nav.history"), href: "/app/historie", icon: TrendingUp },
    { label: t("app.nav.records"), href: "/app/records", icon: Trophy },
    { label: t("app.nav.rank"), href: "/app/rank", icon: Shield },
    { label: t("app.nav.leaderboard"), href: "/app/leaderboard", icon: Crown },
    { label: t("app.nav.invite"), href: "/app/invite", icon: Gift },
    { label: t("app.nav.sessions"), href: "/app/sessies", icon: Calendar },
    { label: t("app.nav.measurements"), href: "/app/metingen", icon: Activity },
    { label: t("app.nav.photos"), href: "/app/fotos", icon: Camera },
    { label: t("app.nav.profile"), href: "/app/profiel", icon: UserIcon },
  ];

  const adminItem = { label: t("app.nav.manage_clients"), href: "/admin/klanten", icon: Users };

  const handleLogout = async () => {
    await signOut();
    navigate("/app/login");
  };

  const isActive = (href: string) => location.pathname === href;

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Mobile top bar */}
      <div className="md:hidden flex items-center justify-between px-4 pb-3 pt-3 safe-pt border-b border-border bg-background sticky top-0 z-40">
        <Link to="/app" className="flex items-center">
          <img
            src={logoImage}
            alt="Guts & Gains"
            className="h-10 w-auto drop-shadow-[0_0_3px_rgba(255,255,255,0.9)]"
          />
        </Link>
        <div className="flex items-center gap-1">
          {/* Hide "back to website" link inside the native app — there's
              no public website inside the installed app context. */}
          {!isNative() && (
            <Link
              to="/"
              className="text-muted-foreground hover:text-primary p-2 transition-colors"
              aria-label={t("app.nav.website")}
              title={t("app.nav.website")}
            >
              <Home size={20} />
            </Link>
          )}
          <button
            onClick={handleLogout}
            className="text-muted-foreground hover:text-primary p-2 transition-colors"
            aria-label={t("app.nav.logout")}
            title={t("app.nav.logout")}
          >
            <LogOut size={20} />
          </button>
          <button onClick={() => setOpen(!open)} className="text-foreground p-2" aria-label="Menu">
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Sidebar */}
      <aside
        className={`${
          open ? "flex" : "hidden"
        } md:flex flex-col md:w-64 md:min-h-screen border-r border-border bg-card md:sticky md:top-0 md:h-screen md:max-h-screen overflow-y-auto overscroll-contain`}
      >
        <div className="hidden md:flex items-center justify-center py-8 border-b border-border shrink-0">
          <Link to="/app">
            <img
              src={logoImage}
              alt="Guts & Gains"
              className="h-14 w-auto drop-shadow-[0_0_3px_rgba(255,255,255,0.9)]"
            />
          </Link>
        </div>

        {/* Prominent "Back to website" CTA — visible on desktop too */}
        <Link
          to="/"
          onClick={() => setOpen(false)}
          className="hidden md:flex items-center justify-center gap-2 mx-4 mt-4 px-4 py-2.5 rounded-sm border border-primary/40 bg-primary/5 text-primary text-xs font-heading tracking-wider uppercase hover:bg-primary/15 transition-colors shrink-0"
        >
          <Home size={14} />
          {t("app.nav.website")}
        </Link>

        {/* Mini rank card — always visible across pages */}
        {rank && (
          <Link
            to="/app/rank"
            onClick={() => setOpen(false)}
            className="mx-4 mt-4 flex items-center gap-3 p-3 rounded-sm border-2 transition-all hover:scale-[1.02] hover:shadow-md shrink-0"
            style={{
              borderColor: TIER_STYLES[rank.tier].primary,
              background: `linear-gradient(135deg, hsl(0 0% 0% / 0.4), ${TIER_STYLES[rank.tier].secondary})`,
            }}
            aria-label={`${t("app.rank.label")}: ${fullRankLabel(rank.tier, rank.division, language)}`}
          >
            <RankBadge tier={rank.tier} division={rank.division} size="sm" />
            <div className="flex flex-col min-w-0 flex-1">
              {rank.name && (
                <span className="text-xs font-body text-muted-foreground truncate">
                  {rank.name.split(" ")[0]}
                </span>
              )}
              <span
                className="text-sm font-heading tracking-wide truncate"
                style={{ color: TIER_STYLES[rank.tier].accent }}
              >
                {fullRankLabel(rank.tier, rank.division, language)}
              </span>
              <span className="text-[10px] font-body text-muted-foreground">
                {rank.score} {t("app.rank.points")}
              </span>
            </div>
          </Link>
        )}
        <nav className="p-4 flex flex-col gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-sm text-sm font-body transition-colors ${
                  isActive(item.href)
                    ? "bg-primary/10 text-primary border-l-2 border-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}

          {isAdmin && (
            <>
              <div className="mt-4 mb-2 px-4 text-xs font-heading text-muted-foreground tracking-wider">{t("app.nav.admin")}</div>
              <Link
                to={adminItem.href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-sm text-sm font-body transition-colors ${
                  isActive(adminItem.href)
                    ? "bg-primary/10 text-primary border-l-2 border-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                <Users size={18} />
                {adminItem.label}
              </Link>
            </>
          )}

          <div className="mt-4 px-4 py-3 flex items-center justify-between border-t border-border/50">
            <span className="text-xs font-heading text-muted-foreground tracking-wider uppercase">
              {t("language.label")}
            </span>
            <LanguageSwitcher />
          </div>

          <Link
            to="/"
            onClick={() => setOpen(false)}
            className="mt-2 flex items-center gap-3 px-4 py-3 rounded-sm text-sm font-body text-muted-foreground hover:text-primary hover:bg-muted/50 transition-colors"
          >
            <Home size={18} />
            {t("app.nav.website")}
          </Link>

          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 rounded-sm text-sm font-body text-muted-foreground hover:text-primary hover:bg-muted/50 transition-colors"
          >
            <LogOut size={18} />
            {t("app.nav.logout")}
          </button>
        </nav>
      </aside>

      {/*
        Re-key on pathname so the launch-in animation replays on every
        /app/* route change, giving the PWA a consistent native-feeling
        screen transition. motion-reduce disables it for users who prefer
        reduced motion.
      */}
      <main
        key={location.pathname}
        className="flex-1 min-w-0 animate-launch-in motion-reduce:animate-none origin-top pb-bottomnav md:pb-0"
      >
        <IOSAppComingBanner variant="member" />
        {children}
      </main>

      {/* App-first bottom tab bar — mobile only */}
      <BottomNav />
    </div>
  );
};

export default AppShell;
