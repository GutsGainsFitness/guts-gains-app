import { useEffect, useState } from "react";
import { Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  AchievementMeta,
  AchievementCategory,
  ICON_MAP,
  RARITY_STYLES,
  CATEGORY_LABELS,
} from "@/lib/achievements";
import { useLanguage } from "@/i18n/LanguageContext";
import { pickLocalized } from "@/i18n/localized";

interface AchievementsSectionProps {
  userId: string;
}

interface UnlockRow {
  achievement_key: string;
  unlocked_at: string;
}

interface AchievementRow extends AchievementMeta {
  name_en: string | null;
  name_es: string | null;
  description_en: string | null;
  description_es: string | null;
}

const AchievementsSection = ({ userId }: AchievementsSectionProps) => {
  const { language } = useLanguage();
  const [catalog, setCatalog] = useState<AchievementRow[]>([]);
  const [unlocks, setUnlocks] = useState<Record<string, string>>({}); // key → unlocked_at
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [catRes, unlockRes] = await Promise.all([
        supabase
          .from("achievements")
          .select("key, name, name_en, name_es, description, description_en, description_es, category, icon, threshold, rarity")
          .order("position", { ascending: true }),
        supabase
          .from("user_achievements")
          .select("achievement_key, unlocked_at")
          .eq("user_id", userId),
      ]);
      setCatalog((catRes.data ?? []) as AchievementRow[]);
      const map: Record<string, string> = {};
      ((unlockRes.data ?? []) as UnlockRow[]).forEach((u) => {
        map[u.achievement_key] = u.unlocked_at;
      });
      setUnlocks(map);
      setLoading(false);
    };
    load();
  }, [userId]);

  if (loading) {
    return (
      <section className="mb-12">
        <h3 className="text-2xl font-heading text-foreground mb-1">ACHIEVEMENTS</h3>
        <div className="h-32 bg-card rounded-sm animate-pulse mt-4" />
      </section>
    );
  }

  // Group catalog by category preserving order
  const grouped = new Map<AchievementCategory, AchievementRow[]>();
  catalog.forEach((a) => {
    const list = grouped.get(a.category) ?? [];
    list.push(a);
    grouped.set(a.category, list);
  });

  const dateLoc = language === "es" ? "es-ES" : language === "en" ? "en-US" : "nl-NL";

  const totalUnlocked = Object.keys(unlocks).length;
  const totalAvailable = catalog.length;

  return (
    <section className="mb-12">
      <div className="flex items-baseline justify-between mb-1 gap-3">
        <h3 className="text-2xl font-heading text-foreground">ACHIEVEMENTS</h3>
        <span className="text-xs font-heading tracking-wider text-muted-foreground shrink-0">
          {totalUnlocked}/{totalAvailable} ONTGRENDELD
        </span>
      </div>
      <p className="text-xs text-muted-foreground mb-6">
        Mijlpalen verdiend door consistent trainen. Hoger = zeldzamer.
      </p>

      <div className="space-y-6">
        {Array.from(grouped.entries()).map(([cat, items]) => (
          <div key={cat}>
            <p className="text-xs font-heading tracking-[0.25em] text-muted-foreground mb-3">
              {CATEGORY_LABELS[cat].toUpperCase()}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {items.map((a) => {
                const Icon = ICON_MAP[a.icon] ?? ICON_MAP.Award;
                const isUnlocked = !!unlocks[a.key];
                const rarity = RARITY_STYLES[a.rarity];
                const name = pickLocalized(a as unknown as Record<string, unknown>, "name", language);
                const description = pickLocalized(a as unknown as Record<string, unknown>, "description", language);
                const date = isUnlocked
                  ? new Date(unlocks[a.key]).toLocaleDateString(dateLoc, {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })
                  : null;

                return (
                  <div
                    key={a.key}
                    className={`relative group border-2 rounded-sm p-3 transition-all ${
                      isUnlocked
                        ? `${rarity.ring} bg-card hover:scale-[1.02]`
                        : "border-border/40 bg-card/40"
                    }`}
                    style={
                      isUnlocked
                        ? { boxShadow: `0 0 20px ${rarity.glow}` }
                        : undefined
                    }
                    title={description}
                  >
                    {/* Rarity ribbon */}
                    {isUnlocked && (
                      <span
                        className="absolute -top-2 right-2 text-[8px] font-heading tracking-[0.15em] px-1.5 py-0.5 rounded-sm bg-background border"
                        style={{ color: rarity.text, borderColor: rarity.text }}
                      >
                        {rarity.label}
                      </span>
                    )}

                    <div className="flex items-center gap-3 mb-2">
                      <div
                        className={`flex items-center justify-center w-10 h-10 rounded-sm shrink-0 ${
                          isUnlocked ? "" : "grayscale opacity-50"
                        }`}
                        style={
                          isUnlocked
                            ? { background: rarity.glow, color: rarity.text }
                            : { background: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))" }
                        }
                      >
                        {isUnlocked ? <Icon size={20} /> : <Lock size={16} />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p
                          className={`text-sm font-heading leading-tight truncate ${
                            isUnlocked ? "text-foreground" : "text-muted-foreground"
                          }`}
                        >
                          {name}
                        </p>
                        {date && (
                          <p className="text-[9px] font-body text-muted-foreground tracking-wider mt-0.5">
                            {date}
                          </p>
                        )}
                      </div>
                    </div>
                    <p
                      className={`text-[10px] font-body leading-snug ${
                        isUnlocked ? "text-muted-foreground" : "text-muted-foreground/70"
                      }`}
                    >
                      {description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default AchievementsSection;
