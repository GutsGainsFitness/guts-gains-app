/**
 * Achievement catalog mirror — keep keys in sync with seed data in DB
 * and the calculate-rank edge function.
 */
import { Dumbbell, Weight, Flame, Award, UserPlus, Trophy, type LucideIcon } from "lucide-react";

export type AchievementCategory = "workouts" | "volume" | "streak" | "strength" | "social";
export type AchievementRarity = "common" | "rare" | "epic" | "legendary";

export interface AchievementMeta {
  key: string;
  name: string;
  description: string;
  category: AchievementCategory;
  icon: string; // lucide icon name (matches seed)
  threshold: number | null;
  rarity: AchievementRarity;
}

export const ICON_MAP: Record<string, LucideIcon> = {
  Dumbbell,
  Weight,
  Flame,
  Award,
  UserPlus,
  Trophy,
};

export const RARITY_STYLES: Record<AchievementRarity, { ring: string; label: string; glow: string; text: string }> = {
  common: {
    ring: "border-muted-foreground/40",
    label: "COMMON",
    glow: "hsl(0 0% 60% / 0.25)",
    text: "hsl(0 0% 75%)",
  },
  rare: {
    ring: "border-[hsl(195_85%_60%)]",
    label: "RARE",
    glow: "hsl(195 85% 55% / 0.5)",
    text: "hsl(195 85% 70%)",
  },
  epic: {
    ring: "border-[hsl(280_70%_60%)]",
    label: "EPIC",
    glow: "hsl(280 70% 55% / 0.55)",
    text: "hsl(280 70% 75%)",
  },
  legendary: {
    ring: "border-[hsl(45_95%_60%)]",
    label: "LEGENDARY",
    glow: "hsl(45 95% 55% / 0.6)",
    text: "hsl(45 95% 70%)",
  },
};

export const CATEGORY_LABELS: Record<AchievementCategory, string> = {
  workouts: "Workouts",
  volume: "Volume",
  streak: "Streaks",
  strength: "Strength",
  social: "Community",
};
