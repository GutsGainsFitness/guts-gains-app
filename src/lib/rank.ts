/**
 * Rank-systeem: hybride scoring (40% e1RM via Wilks, 60% XP).
 * 10 tiers × 3 divisions = 30 ranks (Iron I → Olympian III).
 */

export type RankTier =
  | "iron"
  | "bronze"
  | "silver"
  | "gold"
  | "platinum"
  | "diamond"
  | "master"
  | "elite"
  | "champion"
  | "olympian";

export type Division = 1 | 2 | 3;

export const TIERS: { key: RankTier; label: string; min: number }[] = [
  { key: "iron", label: "Iron", min: 0 },
  { key: "bronze", label: "Bronze", min: 100 },
  { key: "silver", label: "Silver", min: 200 },
  { key: "gold", label: "Gold", min: 300 },
  { key: "platinum", label: "Platinum", min: 400 },
  { key: "diamond", label: "Diamond", min: 500 },
  { key: "master", label: "Master", min: 600 },
  { key: "elite", label: "Elite", min: 700 },
  { key: "champion", label: "Champion", min: 800 },
  { key: "olympian", label: "Olympian", min: 900 },
];

const TIER_SPAN = 100; // each tier covers 100 score points
const DIV_SPAN = TIER_SPAN / 3; // ~33.33 per division

/** Map a 0-1000 score → tier + division (I/II/III). Higher division = higher rank within tier. */
export function scoreToRank(score: number): { tier: RankTier; division: Division; nextThreshold: number; tierProgress: number } {
  const clamped = Math.max(0, Math.min(1000, score));
  let tierIdx = 0;
  for (let i = TIERS.length - 1; i >= 0; i--) {
    if (clamped >= TIERS[i].min) {
      tierIdx = i;
      break;
    }
  }
  const tier = TIERS[tierIdx];
  const into = clamped - tier.min;
  const division = (Math.min(2, Math.floor(into / DIV_SPAN)) + 1) as Division;
  const nextThreshold =
    tierIdx === TIERS.length - 1 && division === 3
      ? 1000
      : division < 3
        ? tier.min + division * DIV_SPAN
        : TIERS[tierIdx + 1].min;
  const prevThreshold = division === 1 ? tier.min : tier.min + (division - 1) * DIV_SPAN;
  const tierProgress = (clamped - prevThreshold) / (nextThreshold - prevThreshold);
  return { tier: tier.key, division, nextThreshold, tierProgress: Math.max(0, Math.min(1, tierProgress)) };
}

export const ROMAN: Record<Division, string> = { 1: "I", 2: "II", 3: "III" };

const TIER_LABELS_BY_LANG: Record<string, Record<RankTier, string>> = {
  nl: { iron: "Iron", bronze: "Bronze", silver: "Silver", gold: "Gold", platinum: "Platinum", diamond: "Diamond", master: "Master", elite: "Elite", champion: "Champion", olympian: "Olympian" },
  en: { iron: "Iron", bronze: "Bronze", silver: "Silver", gold: "Gold", platinum: "Platinum", diamond: "Diamond", master: "Master", elite: "Elite", champion: "Champion", olympian: "Olympian" },
  es: { iron: "Hierro", bronze: "Bronce", silver: "Plata", gold: "Oro", platinum: "Platino", diamond: "Diamante", master: "Maestro", elite: "Élite", champion: "Campeón", olympian: "Olímpico" },
};

export function tierLabel(tier: RankTier, language: string = "nl"): string {
  return TIER_LABELS_BY_LANG[language]?.[tier] ?? TIER_LABELS_BY_LANG.nl[tier] ?? "Iron";
}

/* ================== Epley e1RM ================== */
export function epley1RM(weightKg: number, reps: number): number {
  if (!weightKg || !reps || weightKg <= 0 || reps <= 0) return 0;
  return weightKg * (1 + reps / 30);
}

/* ================== Wilks (simplified, gender-aware) ==================
 * Coefficient curve approximating Wilks 2020. Returns multiplier for total kg.
 * Result: Wilks = totalKg × coefficient(bodyweightKg, gender).
 */
function wilksCoefficient(bw: number, gender: "man" | "vrouw" | "anders"): number {
  // Coefficients from old Wilks formula (close enough for ranking purposes)
  const male = { a: -216.0475144, b: 16.2606339, c: -0.002388645, d: -0.00113732, e: 7.01863e-6, f: -1.291e-8 };
  const female = { a: 594.31747775582, b: -27.23842536447, c: 0.82112226871, d: -0.00930733913, e: 4.731582e-5, f: -9.054e-8 };
  const k = gender === "vrouw" ? female : male;
  const x = Math.max(40, Math.min(200, bw));
  const denom = k.a + k.b * x + k.c * x * x + k.d * x * x * x + k.e * x * x * x * x + k.f * x * x * x * x * x;
  return 500 / denom;
}

/** Wilks-normalized strength score (0-1000) from best e1RMs of squat/bench/deadlift. */
export function strengthScore(
  bestSquat: number,
  bestBench: number,
  bestDead: number,
  bodyweightKg: number,
  gender: "man" | "vrouw" | "anders",
): number {
  const total = (bestSquat || 0) + (bestBench || 0) + (bestDead || 0);
  if (total <= 0 || bodyweightKg <= 0) return 0;
  const wilks = total * wilksCoefficient(bodyweightKg, gender);
  // Wilks scale: ~200 = beginner, ~400 = intermediate, ~500+ = advanced, ~600+ = elite, 700+ = world class
  // Map: Wilks 0 → 0, Wilks 700 → 1000 (linear with mild compression at top)
  return Math.max(0, Math.min(1000, (wilks / 700) * 1000));
}

/* ================== XP ================== */
/** XP from a single set: weight × reps × intensity factor. */
export function xpFromSet(weightKg: number, reps: number): number {
  if (!weightKg || !reps) return 0;
  return Math.round(weightKg * reps * 0.5);
}

/** XP from a bodyweight set (no weight): reps × 4. */
export function xpFromBodyweightSet(reps: number): number {
  return Math.round((reps || 0) * 4);
}

/** Bonus XP per completed session. */
export const XP_SESSION_BONUS = 75;

/** Total XP → 0-1000 score (logarithmic curve so progression slows down). */
export function xpToScore(xpTotal: number): number {
  if (xpTotal <= 0) return 0;
  // 50k XP ≈ 1000 score, log curve
  const score = Math.log10(1 + xpTotal / 50) * 250;
  return Math.max(0, Math.min(1000, score));
}

/* ================== Hybrid total ================== */
export const E1RM_WEIGHT = 0.4;
export const XP_WEIGHT = 0.6;

export function totalScore(e1rmScore: number, xpScore: number): number {
  return Math.round(e1rmScore * E1RM_WEIGHT + xpScore * XP_WEIGHT);
}

/* ================== Tier styling tokens (semantic, for badges) ================== */
export interface TierStyle {
  primary: string; // main fill HSL
  secondary: string; // gradient stop HSL
  accent: string; // outline / shine
  glow: string; // outer glow
  textOnBadge: string;
}

export const TIER_STYLES: Record<RankTier, TierStyle> = {
  iron: { primary: "hsl(220 8% 38%)", secondary: "hsl(220 6% 22%)", accent: "hsl(220 10% 60%)", glow: "hsl(220 8% 30%)", textOnBadge: "hsl(0 0% 95%)" },
  bronze: { primary: "hsl(28 55% 48%)", secondary: "hsl(20 60% 28%)", accent: "hsl(34 75% 65%)", glow: "hsl(28 70% 35%)", textOnBadge: "hsl(30 30% 96%)" },
  silver: { primary: "hsl(210 12% 72%)", secondary: "hsl(210 10% 45%)", accent: "hsl(210 25% 92%)", glow: "hsl(210 15% 60%)", textOnBadge: "hsl(220 20% 15%)" },
  gold: { primary: "hsl(45 85% 55%)", secondary: "hsl(38 75% 35%)", accent: "hsl(50 100% 78%)", glow: "hsl(45 90% 50%)", textOnBadge: "hsl(40 60% 12%)" },
  platinum: { primary: "hsl(190 35% 78%)", secondary: "hsl(200 25% 50%)", accent: "hsl(180 60% 92%)", glow: "hsl(190 50% 65%)", textOnBadge: "hsl(200 30% 15%)" },
  diamond: { primary: "hsl(195 90% 65%)", secondary: "hsl(220 70% 40%)", accent: "hsl(180 100% 88%)", glow: "hsl(195 100% 60%)", textOnBadge: "hsl(220 50% 12%)" },
  master: { primary: "hsl(280 60% 55%)", secondary: "hsl(265 55% 30%)", accent: "hsl(290 80% 78%)", glow: "hsl(280 80% 50%)", textOnBadge: "hsl(0 0% 98%)" },
  elite: { primary: "hsl(310 70% 55%)", secondary: "hsl(290 60% 30%)", accent: "hsl(320 90% 78%)", glow: "hsl(310 90% 55%)", textOnBadge: "hsl(0 0% 98%)" },
  champion: { primary: "hsl(48 95% 58%)", secondary: "hsl(20 80% 35%)", accent: "hsl(52 100% 82%)", glow: "hsl(40 100% 55%)", textOnBadge: "hsl(20 70% 12%)" },
  olympian: { primary: "hsl(0 85% 55%)", secondary: "hsl(0 0% 8%)", accent: "hsl(15 100% 70%)", glow: "hsl(0 100% 50%)", textOnBadge: "hsl(0 0% 98%)" },
};

export function fullRankLabel(tier: RankTier, division: Division, language: string = "nl"): string {
  return `${tierLabel(tier, language)} ${ROMAN[division]}`;
}
