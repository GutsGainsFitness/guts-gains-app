import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Zap, Dumbbell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/i18n/LanguageContext";
import { intlLocale } from "@/i18n/dateLocale";
import RankBadge from "./RankBadge";
import {
  RankTier, Division, scoreToRank, fullRankLabel, tierLabel, ROMAN, TIERS, TIER_STYLES,
} from "@/lib/rank";

interface UserRankRow {
  current_tier: RankTier;
  current_division: number;
  total_score: number;
  e1rm_score: number;
  xp_score: number;
  xp_total: number;
  best_squat_e1rm: number | null;
  best_bench_e1rm: number | null;
  best_deadlift_e1rm: number | null;
}

const RankHeroCard = () => {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const [rank, setRank] = useState<UserRankRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from("user_ranks")
        .select("current_tier, current_division, total_score, e1rm_score, xp_score, xp_total, best_squat_e1rm, best_bench_e1rm, best_deadlift_e1rm")
        .eq("user_id", user.id)
        .maybeSingle();
      setRank((data as UserRankRow) ?? null);
      setLoading(false);
    };
    load();
  }, [user]);

  // Derive everything from total_score so it stays consistent if backfill differs
  const score = rank?.total_score ?? 0;
  const { tier, division, nextThreshold, tierProgress } = scoreToRank(score);
  const style = TIER_STYLES[tier];

  // Find next rank label
  const tierIdx = TIERS.findIndex((t) => t.key === tier);
  const isMaxRank = tierIdx === TIERS.length - 1 && division === 3;
  const nextLabel = isMaxRank
    ? t("app.rank.max_rank")
    : division < 3
      ? fullRankLabel(tier, (division + 1) as Division)
      : fullRankLabel(TIERS[tierIdx + 1].key, 1);

  if (loading) {
    return (
      <div className="border-2 border-primary/20 bg-card p-6 rounded-sm h-[180px] animate-pulse" />
    );
  }

  // No rank yet → invite to start
  if (!rank || score === 0) {
    return (
      <div className="border-2 border-primary/30 bg-gradient-to-br from-card via-card to-primary/5 p-6 rounded-sm">
        <div className="flex items-center gap-5">
          <RankBadge tier="iron" division={1} size="lg" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-heading tracking-[0.3em] text-primary mb-1">{t("app.rank.your")}</p>
            <h2 className="text-2xl md:text-3xl font-heading text-foreground mb-1">{t("app.rank.unranked")}</h2>
            <p className="text-sm text-muted-foreground mb-4">
              {t("app.rank.unranked_cta")}
            </p>
            <Link
              to="/app/workouts"
              className="inline-flex items-center gap-2 text-xs font-heading tracking-wider text-primary hover:underline"
            >
              {t("app.rank.start_workout")} <ArrowRight size={12} />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Link
      to="/app/rank"
      className="group relative border-2 rounded-sm overflow-hidden p-6 block transition-all hover:scale-[1.005] hover:shadow-lg"
      style={{
        borderColor: style.primary,
        background: `linear-gradient(135deg, hsl(var(--card)) 0%, hsl(var(--card)) 50%, ${style.secondary} 200%)`,
      }}
    >
      {/* Glow accent */}
      <div
        className="absolute -top-20 -right-20 w-60 h-60 rounded-full opacity-20 blur-3xl pointer-events-none group-hover:opacity-30 transition-opacity"
        style={{ background: style.glow }}
      />

      <div className="relative flex flex-col md:flex-row gap-5 md:items-center">
        {/* Badge */}
        <div className="flex-shrink-0 flex items-center justify-center md:justify-start">
          <RankBadge tier={tier} division={division as Division} size="lg" />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-heading tracking-[0.3em] mb-1" style={{ color: style.primary }}>
            {t("app.rank.your")}
          </p>
          <h2 className="text-3xl md:text-4xl font-heading text-foreground mb-1 leading-none">
            {tierLabel(tier).toUpperCase()} <span style={{ color: style.primary }}>{ROMAN[division]}</span>
          </h2>
          <p className="text-xs text-muted-foreground mb-4">
            {t("app.rank.total_score")} <span className="text-foreground font-heading">{Math.round(score)}</span> / 1000
          </p>

          {/* Progress bar */}
          <div className="mb-3">
            <div className="flex items-center justify-between text-[10px] font-heading tracking-wider text-muted-foreground mb-1.5">
              <span>{fullRankLabel(tier, division as Division)}</span>
              <span>{nextLabel}</span>
            </div>
            <div className="h-2 bg-muted/40 rounded-sm overflow-hidden">
              <div
                className="h-full transition-all duration-700"
                style={{
                  width: `${Math.round(tierProgress * 100)}%`,
                  background: `linear-gradient(90deg, ${style.secondary}, ${style.primary}, ${style.accent})`,
                  boxShadow: `0 0 10px ${style.glow}`,
                }}
              />
            </div>
            {!isMaxRank && (
              <p className="text-[10px] text-muted-foreground mt-1.5">
                {t("app.rank.points_to")
                  .replace("{n}", String(Math.max(0, Math.ceil(nextThreshold - score))))
                  .replace("{label}", nextLabel)}
              </p>
            )}
          </div>

          {/* Sub-stats */}
          <div className="flex items-center gap-4 text-[11px] font-heading tracking-wider text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Dumbbell size={12} className="text-primary" />
              <span>{t("app.rank.strength")} <span className="text-foreground">{Math.round(rank.e1rm_score)}</span></span>
            </div>
            <div className="flex items-center gap-1.5">
              <Zap size={12} className="text-primary" />
              <span>{t("app.rank.xp")} <span className="text-foreground">{Math.round(rank.xp_total).toLocaleString(intlLocale(language))}</span></span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default RankHeroCard;
