import { useEffect, useState } from "react";
import AppShell from "@/components/app/AppShell";
import RankBadge from "@/components/app/RankBadge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { fullRankLabel, RankTier, Division, TIER_STYLES } from "@/lib/rank";
import { Trophy, Medal, Award, Users, Globe, User, UserRound, Footprints, Dumbbell } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { intlLocale } from "@/i18n/dateLocale";

interface StrengthRow {
  rank_position: number;
  first_name: string;
  current_tier: RankTier;
  current_division: number;
  total_score: number;
}

interface RunRow {
  rank_position: number;
  first_name: string;
  total_km: number;
  run_count: number;
  best_pace_seconds: number | null;
}

type Discipline = "strength" | "running";
type GenderFilter = "all" | "man" | "vrouw";

const RANK_ICONS: Record<number, { icon: typeof Trophy; color: string; bg: string }> = {
  1: { icon: Trophy, color: "hsl(45 95% 60%)", bg: "hsl(45 95% 60% / 0.15)" },
  2: { icon: Medal, color: "hsl(210 15% 78%)", bg: "hsl(210 15% 78% / 0.15)" },
  3: { icon: Award, color: "hsl(28 70% 55%)", bg: "hsl(28 70% 55% / 0.15)" },
};

const formatPace = (s: number | null) => {
  if (!s) return "—";
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}/km`;
};

const AppLeaderboard = () => {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const intlLoc = intlLocale(language);
  const [discipline, setDiscipline] = useState<Discipline>("strength");
  const [filter, setFilter] = useState<GenderFilter>("all");
  const [strengthRows, setStrengthRows] = useState<StrengthRow[]>([]);
  const [runRows, setRunRows] = useState<RunRow[]>([]);
  const [myRank, setMyRank] = useState<{ score: number; tier: RankTier; division: Division; gender: string | null } | null>(null);
  const [loading, setLoading] = useState(true);

  const monthLabel = () =>
    new Date().toLocaleDateString(intlLoc, { month: "long", year: "numeric" });

  const DISCIPLINES: { key: Discipline; label: string; icon: typeof Dumbbell }[] = [
    { key: "strength", label: t("app.lb.disc.strength"), icon: Dumbbell },
    { key: "running", label: t("app.lb.disc.running"), icon: Footprints },
  ];

  const GENDER_TABS: { key: GenderFilter; label: string; short: string; icon: typeof Globe }[] = [
    { key: "all", label: t("app.lb.gender.all"), short: t("app.lb.gender.all_short"), icon: Globe },
    { key: "man", label: t("app.lb.gender.men"), short: t("app.lb.gender.men_short"), icon: User },
    { key: "vrouw", label: t("app.lb.gender.women"), short: t("app.lb.gender.women_short"), icon: UserRound },
  ];

  useEffect(() => {
    if (!user) return;
    const loadMe = async () => {
      const [{ data: rank }, { data: prof }] = await Promise.all([
        supabase
          .from("user_ranks")
          .select("total_score, current_tier, current_division")
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase
          .from("profiles")
          .select("geslacht")
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);
      if (rank) {
        setMyRank({
          score: Math.round(rank.total_score ?? 0),
          tier: rank.current_tier as RankTier,
          division: rank.current_division as Division,
          gender: (prof?.geslacht as string | null) ?? null,
        });
      }
    };
    loadMe();
  }, [user]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      if (discipline === "strength") {
        const { data } = await supabase.rpc("get_leaderboard", {
          _gender: filter === "all" ? null : filter,
        });
        setStrengthRows((data as StrengthRow[]) ?? []);
      } else {
        const { data } = await supabase.rpc("get_running_leaderboard", {
          _gender: filter === "all" ? null : filter,
        });
        setRunRows((data as RunRow[]) ?? []);
      }
      setLoading(false);
    };
    load();
  }, [discipline, filter]);

  const activeGender = GENDER_TABS.find((tt) => tt.key === filter)!;
  const isStrength = discipline === "strength";
  const rows = isStrength ? strengthRows : runRows;

  return (
    <AppShell>
      <div className="px-4 md:px-12 py-6 md:py-12 max-w-5xl mx-auto">
        <div className="mb-6 md:mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Trophy size={28} className="text-primary" />
            <h1 className="text-3xl md:text-5xl font-heading text-foreground">{t("app.lb.title")}</h1>
          </div>
          <p className="font-body text-muted-foreground">
            {isStrength
              ? t("app.lb.subtitle.strength")
              : t("app.lb.subtitle.running").replace("{month}", monthLabel())}
          </p>
        </div>

        <div className="mb-4 flex items-center gap-1 p-1 rounded-sm border-2 border-primary/30 bg-card w-full md:w-auto md:inline-flex">
          {DISCIPLINES.map((d) => {
            const Icon = d.icon;
            const active = discipline === d.key;
            return (
              <button
                key={d.key}
                onClick={() => setDiscipline(d.key)}
                className={`flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 md:px-6 py-2.5 rounded-sm font-heading text-xs md:text-sm tracking-wider uppercase transition-all ${
                  active
                    ? "bg-primary text-primary-foreground shadow-[0_0_12px_hsl(var(--primary)/0.4)]"
                    : "text-muted-foreground hover:text-foreground hover:bg-background/40"
                }`}
                aria-pressed={active}
              >
                <Icon size={15} />
                {d.label}
              </button>
            );
          })}
        </div>

        <div className="mb-6 flex items-center gap-1 p-1 rounded-sm border-2 border-border bg-card w-full md:w-auto md:inline-flex">
          {GENDER_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = filter === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={`flex-1 md:flex-initial flex items-center justify-center gap-2 px-3 md:px-5 py-2 rounded-sm font-heading text-xs md:text-sm tracking-wider uppercase transition-all ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-[0_0_12px_hsl(var(--primary)/0.4)]"
                    : "text-muted-foreground hover:text-foreground hover:bg-background/40"
                }`}
                aria-pressed={isActive}
              >
                <Icon size={14} />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.short}</span>
              </button>
            );
          })}
        </div>

        {isStrength && myRank && (
          <div
            className="mb-6 p-4 md:p-5 rounded-sm border-2 flex items-center gap-4"
            style={{
              borderColor: TIER_STYLES[myRank.tier].primary,
              background: `linear-gradient(135deg, hsl(0 0% 0% / 0.4), ${TIER_STYLES[myRank.tier].secondary})`,
            }}
          >
            <RankBadge tier={myRank.tier} division={myRank.division} size="md" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-body text-muted-foreground uppercase tracking-wider">{t("app.lb.your_pos")}</p>
              <p
                className="text-xl md:text-2xl font-heading truncate"
                style={{ color: TIER_STYLES[myRank.tier].accent }}
              >
                {fullRankLabel(myRank.tier, myRank.division)}
              </p>
              <p className="text-sm font-body text-muted-foreground">{myRank.score} {t("app.lb.pts")}</p>
            </div>
          </div>
        )}

        <p className="text-[11px] font-heading tracking-[0.25em] text-muted-foreground uppercase mb-3">
          {isStrength ? t("app.lb.ranking") : `${monthLabel()}`} · {activeGender.label}
        </p>

        {loading ? (
          <div className="text-center py-16 font-body text-muted-foreground">{t("app.lb.loading")}</div>
        ) : rows.length === 0 ? (
          <div className="border-2 border-border rounded-sm p-12 text-center">
            {isStrength ? (
              <Users size={48} className="mx-auto mb-4 text-muted-foreground" />
            ) : (
              <Footprints size={48} className="mx-auto mb-4 text-muted-foreground" />
            )}
            <p className="font-heading text-xl text-foreground mb-2">{t("app.lb.empty.title")}</p>
            <p className="font-body text-sm text-muted-foreground">
              {isStrength
                ? filter === "all"
                  ? t("app.lb.empty.strength_all")
                  : t("app.lb.empty.strength_filtered").replace("{gender}", activeGender.label.toLowerCase())
                : t("app.lb.empty.running")}
            </p>
          </div>
        ) : isStrength ? (
          <div className="space-y-2">
            {strengthRows.map((row) => {
              const tier = row.current_tier;
              const division = row.current_division as Division;
              const style = TIER_STYLES[tier];
              const podium = RANK_ICONS[row.rank_position];
              const PodiumIcon = podium?.icon;
              return (
                <div
                  key={row.rank_position}
                  className="flex items-center gap-3 md:gap-4 p-3 md:p-4 rounded-sm border-2 border-border bg-card transition-all hover:border-primary/40"
                  style={
                    podium
                      ? {
                          borderColor: podium.color,
                          background: `linear-gradient(90deg, ${podium.bg}, transparent 60%)`,
                        }
                      : undefined
                  }
                >
                  <div className="flex items-center justify-center w-10 md:w-12 shrink-0">
                    {PodiumIcon ? (
                      <PodiumIcon size={28} style={{ color: podium.color }} />
                    ) : (
                      <span className="text-lg md:text-xl font-heading text-muted-foreground">
                        {row.rank_position}
                      </span>
                    )}
                  </div>
                  <div className="shrink-0">
                    <RankBadge tier={tier} division={division} size="sm" showDivision />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-base md:text-lg font-heading text-foreground truncate">
                      {row.first_name}
                    </p>
                    <p className="text-xs md:text-sm font-body truncate" style={{ color: style.accent }}>
                      {fullRankLabel(tier, division)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-lg md:text-2xl font-heading text-primary leading-none">
                      {Math.round(row.total_score)}
                    </p>
                    <p className="text-[10px] md:text-xs font-body text-muted-foreground uppercase tracking-wider mt-1">
                      {t("app.lb.pts")}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-2">
            {runRows.map((row) => {
              const podium = RANK_ICONS[row.rank_position];
              const PodiumIcon = podium?.icon;
              return (
                <div
                  key={row.rank_position}
                  className="flex items-center gap-3 md:gap-4 p-3 md:p-4 rounded-sm border-2 border-border bg-card transition-all hover:border-primary/40"
                  style={
                    podium
                      ? {
                          borderColor: podium.color,
                          background: `linear-gradient(90deg, ${podium.bg}, transparent 60%)`,
                        }
                      : undefined
                  }
                >
                  <div className="flex items-center justify-center w-10 md:w-12 shrink-0">
                    {PodiumIcon ? (
                      <PodiumIcon size={28} style={{ color: podium.color }} />
                    ) : (
                      <span className="text-lg md:text-xl font-heading text-muted-foreground">
                        {row.rank_position}
                      </span>
                    )}
                  </div>
                  <div className="w-10 h-10 rounded-sm bg-primary/10 flex items-center justify-center shrink-0">
                    <Footprints size={18} className="text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-base md:text-lg font-heading text-foreground truncate">
                      {row.first_name}
                    </p>
                    <p className="text-xs md:text-sm font-body text-muted-foreground truncate">
                      {row.run_count} {row.run_count === 1 ? t("app.lb.run_one") : t("app.lb.run_many")} · {t("app.lb.best_pace")} {formatPace(row.best_pace_seconds)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-lg md:text-2xl font-heading text-primary leading-none tabular-nums">
                      {Number(row.total_km).toFixed(1)}
                    </p>
                    <p className="text-[10px] md:text-xs font-body text-muted-foreground uppercase tracking-wider mt-1">
                      {t("app.lb.km")}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <p className="mt-8 text-xs font-body text-muted-foreground text-center">
          {isStrength ? t("app.lb.footer.strength") : t("app.lb.footer.running")}
        </p>
      </div>
    </AppShell>
  );
};

export default AppLeaderboard;
