import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, Dumbbell, Zap, Trophy, ChevronUp, Lock, HelpCircle, Calculator, Flame, Target } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AppShell from "@/components/app/AppShell";
import RankBadge from "@/components/app/RankBadge";
import RankUpCelebration from "@/components/app/RankUpCelebration";
import AchievementsSection from "@/components/app/AchievementsSection";
import {
  RankTier, Division, scoreToRank, fullRankLabel, tierLabel, ROMAN,
  TIERS, TIER_STYLES,
} from "@/lib/rank";
import { useLanguage } from "@/i18n/LanguageContext";
import { intlLocale } from "@/i18n/dateLocale";

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
  bodyweight_snapshot: number | null;
  last_calculated_at: string;
}

interface RankHistoryRow {
  id: string;
  from_tier: RankTier | null;
  from_division: number | null;
  to_tier: RankTier;
  to_division: number;
  total_score: number;
  created_at: string;
}

const DIVISIONS: Division[] = [3, 2, 1]; // display top → bottom within tier

const VALID_TIERS: RankTier[] = ["iron","bronze","silver","gold","platinum","diamond","master","elite","champion","olympian"];

function parseRankParam(v: string | null): { tier: RankTier; division: Division } | null {
  if (!v) return null;
  const [t, d] = v.split("-");
  const tier = VALID_TIERS.includes(t as RankTier) ? (t as RankTier) : null;
  const div = Number(d);
  if (!tier || ![1, 2, 3].includes(div)) return null;
  return { tier, division: div as Division };
}

const AppRank = () => {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const intlLoc = intlLocale(language);
  const [rank, setRank] = useState<UserRankRow | null>(null);
  const [history, setHistory] = useState<RankHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();

  // Parse celebration params (set when redirected from a workout that triggered a promotion)
  const celebrate = useMemo(() => {
    if (searchParams.get("celebrate") !== "1") return null;
    const to = parseRankParam(searchParams.get("to"));
    if (!to) return null;
    const from = parseRankParam(searchParams.get("from"));
    const score = Number(searchParams.get("score"));
    return { ...to, fromTier: from?.tier ?? null, fromDivision: from?.division ?? null, score: Number.isFinite(score) ? score : undefined };
  }, [searchParams]);

  const [showCelebration, setShowCelebration] = useState(false);
  useEffect(() => {
    if (celebrate) setShowCelebration(true);
  }, [celebrate]);

  const closeCelebration = () => {
    setShowCelebration(false);
    // Clean URL so a refresh won't replay the celebration
    const next = new URLSearchParams(searchParams);
    ["celebrate", "to", "from", "score"].forEach((k) => next.delete(k));
    setSearchParams(next, { replace: true });
  };

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [{ data: r }, { data: h }] = await Promise.all([
        supabase
          .from("user_ranks")
          .select(
            "current_tier, current_division, total_score, e1rm_score, xp_score, xp_total, best_squat_e1rm, best_bench_e1rm, best_deadlift_e1rm, bodyweight_snapshot, last_calculated_at",
          )
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase
          .from("rank_history")
          .select("id, from_tier, from_division, to_tier, to_division, total_score, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(20),
      ]);
      setRank((r as UserRankRow) ?? null);
      setHistory((h as RankHistoryRow[]) ?? []);
      setLoading(false);
    };
    load();
  }, [user]);

  const score = rank?.total_score ?? 0;
  const { tier, division, nextThreshold, tierProgress } = scoreToRank(score);
  const style = TIER_STYLES[tier];
  const tierIdx = TIERS.findIndex((t) => t.key === tier);
  const isMaxRank = tierIdx === TIERS.length - 1 && division === 3;
  const nextLabel = isMaxRank
    ? "MAX RANK"
    : division < 3
      ? fullRankLabel(tier, (division + 1) as Division)
      : fullRankLabel(TIERS[tierIdx + 1].key, 1);

  // Best big-3 lifts
  const big3 = [
    { key: "squat", label: "Back Squat", value: rank?.best_squat_e1rm },
    { key: "bench", label: "Bench Press", value: rank?.best_bench_e1rm },
    { key: "deadlift", label: "Deadlift", value: rank?.best_deadlift_e1rm },
  ];
  const totalBig3 = big3.reduce((s, l) => s + (l.value ?? 0), 0);

  return (
    <AppShell>
      <div className="container mx-auto px-4 md:px-8 py-8 md:py-12 max-w-5xl">
        <Link
          to="/app"
          className="inline-flex items-center gap-2 text-xs font-heading tracking-wider text-muted-foreground hover:text-primary mb-6 transition-colors"
        >
          <ArrowLeft size={14} /> TERUG NAAR DASHBOARD
        </Link>

        <p className="text-xs font-heading tracking-[0.3em] text-primary mb-2">RANK SYSTEEM</p>
        <h1 className="text-4xl md:text-5xl font-heading text-foreground mb-8">JOUW PROGRESSIE</h1>

        {loading ? (
          <div className="h-96 bg-card rounded-sm animate-pulse" />
        ) : (
          <>
            {/* Hero ===== */}
            <section
              className="relative border-2 rounded-sm overflow-hidden p-8 md:p-12 mb-12"
              style={{
                borderColor: style.primary,
                background: `linear-gradient(135deg, hsl(var(--card)) 0%, hsl(var(--card)) 50%, ${style.secondary} 200%)`,
              }}
            >
              <div
                className="absolute -top-32 -right-32 w-96 h-96 rounded-full opacity-20 blur-3xl pointer-events-none"
                style={{ background: style.glow }}
              />
              <div
                className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full opacity-10 blur-3xl pointer-events-none"
                style={{ background: style.primary }}
              />

              <div className="relative flex flex-col lg:flex-row items-center lg:items-start gap-6 lg:gap-12">
                <div className="flex-shrink-0">
                  <div className="hidden lg:block"><RankBadge tier={tier} division={division as Division} size="xl" /></div>
                  <div className="lg:hidden"><RankBadge tier={tier} division={division as Division} size="lg" /></div>
                </div>
                <div className="flex-1 min-w-0 text-center lg:text-left w-full">
                  <p className="text-xs font-heading tracking-[0.3em] mb-2" style={{ color: style.primary }}>
                    HUIDIGE RANK
                  </p>
                  <h2 className="text-4xl sm:text-5xl lg:text-6xl font-heading text-foreground mb-2 leading-none break-words">
                    {tierLabel(tier).toUpperCase()}{" "}
                    <span style={{ color: style.primary }}>{ROMAN[division as Division]}</span>
                  </h2>
                  <p className="text-sm text-muted-foreground mb-6">
                    Totaal score <span className="text-foreground font-heading">{Math.round(score)}</span> / 1000
                  </p>

                  <div className="mb-4">
                    <div className="flex items-center justify-between text-[10px] font-heading tracking-wider text-muted-foreground mb-1.5">
                      <span>{fullRankLabel(tier, division as Division)}</span>
                      <span>{nextLabel}</span>
                    </div>
                    <div className="h-3 bg-muted/40 rounded-sm overflow-hidden">
                      <div
                        className="h-full transition-all duration-700"
                        style={{
                          width: `${Math.round(tierProgress * 100)}%`,
                          background: `linear-gradient(90deg, ${style.secondary}, ${style.primary}, ${style.accent})`,
                          boxShadow: `0 0 12px ${style.glow}`,
                        }}
                      />
                    </div>
                    {!isMaxRank && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Nog{" "}
                        <span className="text-foreground font-heading">
                          {Math.max(0, Math.ceil(nextThreshold - score))}
                        </span>{" "}
                        punten tot {nextLabel}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 text-[11px] font-heading tracking-wider text-muted-foreground pt-2">
                    <div className="flex items-center gap-1.5">
                      <Dumbbell size={12} className="text-primary" />
                      <span>
                        STRENGTH <span className="text-foreground">{Math.round(rank?.e1rm_score ?? 0)}</span>
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Zap size={12} className="text-primary" />
                      <span>
                        XP{" "}
                        <span className="text-foreground">
                          {Math.round(rank?.xp_total ?? 0).toLocaleString("nl-NL")}
                        </span>
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Trophy size={12} className="text-primary" />
                      <span>
                        XP-SCORE <span className="text-foreground">{Math.round(rank?.xp_score ?? 0)}</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Big-3 breakdown ===== */}
            <section className="mb-12">
              <h3 className="text-2xl font-heading text-foreground mb-1">POWERLIFTING BIG 3</h3>
              <p className="text-xs text-muted-foreground mb-6">
                Geschatte 1RM (Epley) van je beste set per lift. Wilks-genormaliseerd op {" "}
                <span className="text-foreground">{rank?.bodyweight_snapshot ?? 75} kg</span> bodyweight.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {big3.map((lift) => {
                  const value = lift.value ?? 0;
                  const pct = totalBig3 > 0 ? (value / totalBig3) * 100 : 0;
                  return (
                    <div
                      key={lift.key}
                      className="border border-border rounded-sm p-5 bg-card hover:border-primary/50 transition-colors"
                    >
                      <p className="text-xs font-heading tracking-wider text-muted-foreground mb-2">
                        {lift.label.toUpperCase()}
                      </p>
                      <p className="text-3xl font-heading text-foreground leading-none mb-1">
                        {value > 0 ? Math.round(value) : "—"}
                        {value > 0 && <span className="text-sm text-muted-foreground ml-1">kg e1RM</span>}
                      </p>
                      {value > 0 ? (
                        <>
                          <div className="h-1 bg-muted/40 rounded-sm overflow-hidden mt-3">
                            <div
                              className="h-full bg-primary transition-all duration-700"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-1.5">
                            {pct.toFixed(0)}% van Big-3 totaal
                          </p>
                        </>
                      ) : (
                        <p className="text-[11px] text-muted-foreground mt-2">
                          Nog niet gelogd. Train deze lift om je strength score te boosten.
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              {totalBig3 > 0 && (
                <div className="mt-4 border border-border rounded-sm p-4 bg-card flex items-center justify-between">
                  <span className="text-xs font-heading tracking-wider text-muted-foreground">
                    BIG-3 TOTAAL
                  </span>
                  <span className="text-xl font-heading text-foreground">
                    {Math.round(totalBig3)} <span className="text-sm text-muted-foreground">kg</span>
                  </span>
                </div>
              )}
            </section>

            {/* Achievements ===== */}
            {user && <AchievementsSection userId={user.id} />}

            {/* Tier ladder ===== */}
            <section className="mb-12">
              <h3 className="text-2xl font-heading text-foreground mb-1">TIER LADDER</h3>
              <p className="text-xs text-muted-foreground mb-6">
                30 ranks van Iron I tot Olympian III. Jouw huidige positie is gemarkeerd.
              </p>

              <div className="space-y-3">
                {[...TIERS].reverse().map((t) => {
                  const tIdx = TIERS.findIndex((x) => x.key === t.key);
                  const isUnlocked = tIdx <= tierIdx;
                  const tStyle = TIER_STYLES[t.key];

                  return (
                    <div
                      key={t.key}
                      className={`border rounded-sm p-4 transition-all ${
                        t.key === tier
                          ? "border-primary bg-card shadow-[0_0_20px_hsl(var(--primary)/0.15)]"
                          : isUnlocked
                            ? "border-border bg-card"
                            : "border-border/50 bg-card/50 opacity-50"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-4 mb-3">
                        <div className="flex items-center gap-3">
                          <span
                            className="text-xl font-heading tracking-wider"
                            style={{ color: isUnlocked ? tStyle.primary : "hsl(var(--muted-foreground))" }}
                          >
                            {t.label.toUpperCase()}
                          </span>
                          <span className="text-[10px] font-heading text-muted-foreground tracking-wider">
                            {t.min} – {t.min + 100}
                          </span>
                          {!isUnlocked && <Lock size={12} className="text-muted-foreground" />}
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        {DIVISIONS.map((div) => {
                          const isCurrent = t.key === tier && div === division;
                          return (
                            <div
                              key={div}
                              className={`flex flex-col items-center gap-2 p-3 rounded-sm border transition-all ${
                                isCurrent
                                  ? "border-primary bg-primary/5"
                                  : isUnlocked
                                    ? "border-border/60 bg-background/50"
                                    : "border-border/30"
                              }`}
                            >
                              <RankBadge
                                tier={t.key}
                                division={div}
                                size="sm"
                                className={!isUnlocked ? "grayscale opacity-40" : ""}
                              />
                              <span className="text-[10px] font-heading tracking-wider text-muted-foreground">
                                {t.label.toUpperCase()} {ROMAN[div]}
                              </span>
                              {isCurrent && (
                                <span className="text-[9px] font-heading tracking-[0.2em] text-primary">
                                  HIER
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* History timeline ===== */}
            <section>
              <h3 className="text-2xl font-heading text-foreground mb-1">RANK GESCHIEDENIS</h3>
              <p className="text-xs text-muted-foreground mb-6">
                Tijdlijn van al je promoties. Elke rank-up is verdiend door consistent trainen.
              </p>

              {history.length === 0 ? (
                <div className="border border-dashed border-border rounded-sm p-8 text-center">
                  <Trophy size={28} className="text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">
                    Nog geen promoties geregistreerd. Je eerste rank-up komt eraan!
                  </p>
                </div>
              ) : (
                <ol className="relative border-l-2 border-border pl-6 space-y-6">
                  {history.map((h) => {
                    const toStyle = TIER_STYLES[h.to_tier];
                    const date = new Date(h.created_at).toLocaleDateString("nl-NL", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    });
                    return (
                      <li key={h.id} className="relative">
                        <span
                          className="absolute -left-[33px] top-1 w-4 h-4 rounded-full border-2 border-background"
                          style={{ background: toStyle.primary, boxShadow: `0 0 10px ${toStyle.glow}` }}
                        />
                        <div className="border border-border rounded-sm p-4 bg-card flex items-center justify-between gap-4">
                          <div className="flex items-center gap-4">
                            <RankBadge tier={h.to_tier} division={h.to_division as Division} size="sm" />
                            <div>
                              <div className="flex items-center gap-2 text-xs font-heading tracking-wider text-muted-foreground mb-0.5">
                                {h.from_tier && (
                                  <>
                                    <span>
                                      {tierLabel(h.from_tier).toUpperCase()} {ROMAN[h.from_division as Division]}
                                    </span>
                                    <ChevronUp size={12} className="text-primary rotate-90" />
                                  </>
                                )}
                              </div>
                              <p className="text-lg font-heading" style={{ color: toStyle.primary }}>
                                {tierLabel(h.to_tier).toUpperCase()} {ROMAN[h.to_division as Division]}
                              </p>
                              <p className="text-[10px] text-muted-foreground">{date}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] font-heading tracking-wider text-muted-foreground">SCORE</p>
                            <p className="text-xl font-heading text-foreground">{Math.round(h.total_score)}</p>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
            </section>

            {/* How it works ===== */}
            <section className="mt-12">
              <h3 className="text-2xl font-heading text-foreground mb-1">HOE WERKT HET RANK SYSTEEM?</h3>
              <p className="text-xs text-muted-foreground mb-6">
                Klik om uit te klappen. Geen geheimen — je weet precies hoe je rank wordt opgebouwd.
              </p>

              <Accordion type="single" collapsible className="border border-border rounded-sm bg-card divide-y divide-border">
                <AccordionItem value="scoring" className="border-b-0 px-5">
                  <AccordionTrigger className="hover:no-underline py-4">
                    <div className="flex items-center gap-3 text-left">
                      <Calculator size={18} className="text-primary shrink-0" />
                      <div>
                        <p className="font-heading tracking-wider text-foreground text-sm">SCORING FORMULE</p>
                        <p className="text-[11px] text-muted-foreground font-normal normal-case tracking-normal">
                          40% kracht (Wilks) + 60% XP
                        </p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground space-y-3 pb-5">
                    <p>
                      Je <span className="text-foreground font-heading">totaal score</span> (0–1000) bepaalt je rank en bestaat uit twee componenten:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="border border-border rounded-sm p-3 bg-background/40">
                        <p className="text-[10px] font-heading tracking-[0.2em] text-primary mb-1">STRENGTH · 40%</p>
                        <p className="text-xs">
                          Wilks-genormaliseerde Big-3 e1RM. Houdt rekening met je bodyweight zodat lichte en zware lifters eerlijk vergeleken worden.
                        </p>
                      </div>
                      <div className="border border-border rounded-sm p-3 bg-background/40">
                        <p className="text-[10px] font-heading tracking-[0.2em] text-primary mb-1">XP · 60%</p>
                        <p className="text-xs">
                          Logaritmische curve over totaal verdiende XP. Beloont consistentie boven één-time PR's.
                        </p>
                      </div>
                    </div>
                    <p className="text-xs">
                      <span className="font-heading text-foreground">Totaal score</span> = (Strength score × 0.40) + (XP score × 0.60)
                    </p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="big3" className="border-b-0 px-5">
                  <AccordionTrigger className="hover:no-underline py-4">
                    <div className="flex items-center gap-3 text-left">
                      <Dumbbell size={18} className="text-primary shrink-0" />
                      <div>
                        <p className="font-heading tracking-wider text-foreground text-sm">BIG-3 LIFTS &amp; e1RM</p>
                        <p className="text-[11px] text-muted-foreground font-normal normal-case tracking-normal">
                          Squat, Bench, Deadlift met Epley-formule
                        </p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground space-y-3 pb-5">
                    <p>
                      Je strength score komt uit drie hoofdlifts: <span className="text-foreground">Back Squat</span>,{" "}
                      <span className="text-foreground">Bench Press</span> en{" "}
                      <span className="text-foreground">Deadlift</span>. Per lift wordt je beste set automatisch omgerekend naar een geschatte 1-rep-max.
                    </p>
                    <div className="border border-border rounded-sm p-3 bg-background/40 font-mono text-xs">
                      e1RM = gewicht × (1 + reps / 30)
                    </div>
                    <p className="text-xs">
                      Voorbeeld: 100kg × 5 reps = 100 × (1 + 5/30) ≈ <span className="text-foreground font-heading">117 kg e1RM</span>.
                    </p>
                    <p className="text-xs">
                      De som van je drie e1RM's wordt vermenigvuldigd met je <span className="text-foreground">Wilks-coëfficiënt</span> — een formule die je sterkte normaliseert op je lichaamsgewicht en geslacht.
                    </p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="xp" className="border-b-0 px-5">
                  <AccordionTrigger className="hover:no-underline py-4">
                    <div className="flex items-center gap-3 text-left">
                      <Zap size={18} className="text-primary shrink-0" />
                      <div>
                        <p className="font-heading tracking-wider text-foreground text-sm">XP VERDIENEN</p>
                        <p className="text-[11px] text-muted-foreground font-normal normal-case tracking-normal">
                          Per set + bonus per voltooide sessie
                        </p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground space-y-3 pb-5">
                    <p>Elke gelogde set levert XP op:</p>
                    <ul className="space-y-2 text-xs">
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-0.5">›</span>
                        <span>
                          <span className="text-foreground font-heading">Gewicht-set:</span>{" "}
                          <span className="font-mono">gewicht (kg) × reps × 0.5</span>
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-0.5">›</span>
                        <span>
                          <span className="text-foreground font-heading">Bodyweight-set:</span>{" "}
                          <span className="font-mono">reps × 4</span>
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-0.5">›</span>
                        <span>
                          <span className="text-foreground font-heading">Sessie-bonus:</span>{" "}
                          <span className="font-mono">+75 XP</span> per voltooide workout
                        </span>
                      </li>
                    </ul>
                    <p className="text-xs">
                      Je totale XP wordt via een logaritmische curve omgezet naar een 0–1000 XP-score. Dit zorgt dat de eerste levels snel gaan, maar de top-ranks écht verdiend moeten worden.
                    </p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="tiers" className="border-b-0 px-5">
                  <AccordionTrigger className="hover:no-underline py-4">
                    <div className="flex items-center gap-3 text-left">
                      <Trophy size={18} className="text-primary shrink-0" />
                      <div>
                        <p className="font-heading tracking-wider text-foreground text-sm">10 TIERS · 30 RANKS</p>
                        <p className="text-[11px] text-muted-foreground font-normal normal-case tracking-normal">
                          Iron I tot Olympian III
                        </p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground space-y-3 pb-5">
                    <p>
                      Elke tier (Iron, Bronze, Silver, Gold, Platinum, Diamond, Master, Elite, Champion, Olympian) heeft drie divisions:{" "}
                      <span className="text-foreground font-heading">III → II → I</span>. Je klimt automatisch op zodra je score een drempel passeert.
                    </p>
                    <p className="text-xs">
                      Elke tier dekt 100 score-punten, elke division ~33 punten. Een rank-up triggert automatisch een celebration na je workout.
                    </p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="tips" className="border-b-0 px-5">
                  <AccordionTrigger className="hover:no-underline py-4">
                    <div className="flex items-center gap-3 text-left">
                      <Flame size={18} className="text-primary shrink-0" />
                      <div>
                        <p className="font-heading tracking-wider text-foreground text-sm">SNELLER OPKLIMMEN</p>
                        <p className="text-[11px] text-muted-foreground font-normal normal-case tracking-normal">
                          Praktische tips
                        </p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground space-y-2 pb-5">
                    <ul className="space-y-2 text-xs">
                      <li className="flex items-start gap-2">
                        <Target size={12} className="text-primary mt-1 shrink-0" />
                        <span>Train de Big-3 wekelijks — elke kg op je squat/bench/deadlift telt direct mee.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Target size={12} className="text-primary mt-1 shrink-0" />
                        <span>Log élke set, ook accessory-werk. Volume = XP.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Target size={12} className="text-primary mt-1 shrink-0" />
                        <span>Maak je sessies áf: de +75 XP bonus stapelt snel op bij meerdere workouts per week.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Target size={12} className="text-primary mt-1 shrink-0" />
                        <span>Houd je bodyweight up-to-date in je profiel — Wilks rekent dit mee.</span>
                      </li>
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              <p className="text-[10px] text-muted-foreground mt-4 flex items-center gap-1.5">
                <HelpCircle size={11} /> Vragen over je rank? Vraag het Pablo tijdens je volgende sessie.
              </p>
            </section>
          </>
        )}
      </div>

      {showCelebration && celebrate && (
        <RankUpCelebration
          tier={celebrate.tier}
          division={celebrate.division}
          fromTier={celebrate.fromTier}
          fromDivision={celebrate.fromDivision}
          totalScore={celebrate.score}
          onClose={closeCelebration}
        />
      )}
    </AppShell>
  );
};

export default AppRank;
