import { useEffect, useState } from "react";
import { Database } from "@/integrations/supabase/types";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type MuscleGroup = Database["public"]["Enums"]["muscle_group"];
type Gender = Database["public"]["Enums"]["gender"];

interface Props {
  activeMuscles: MuscleGroup[];
  className?: string;
  gender?: Gender;
}

/**
 * Premium fitness body map.
 * - Semi-realistic athletic silhouette built from smooth SVG curves.
 * - Muscle groups are clean, recognizable regions that fill red when active.
 * - Dark grey base body, strong red active state with subtle inner glow.
 * - Adapts proportions for male/female profiles.
 */
const BodyDiagram = ({ activeMuscles, className = "", gender: genderProp }: Props) => {
  const { user } = useAuth();
  const [gender, setGender] = useState<Gender>(genderProp ?? "man");

  useEffect(() => {
    if (genderProp) {
      setGender(genderProp);
      return;
    }
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("geslacht")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data?.geslacht) setGender(data.geslacht);
    })();
  }, [user, genderProp]);

  const isActive = (m: MuscleGroup) =>
    activeMuscles.includes(m) || activeMuscles.includes("full_body");
  const isFemale = gender === "vrouw";

  // Color tokens for SVG — sharper contrast for premium look
  const BODY_BASE = "hsl(0 0% 11%)";
  const BODY_FILL = "hsl(0 0% 17%)";
  const BODY_LINE = "hsl(0 0% 32%)";
  const BODY_EDGE = "hsl(0 0% 55%)";
  const MUSCLE_INACTIVE = "hsl(0 0% 22%)";

  // Proportion factors — slight differences between male / female silhouette
  const shoulderW = isFemale ? 0.92 : 1;   // narrower shoulders for female
  const waistW = isFemale ? 0.95 : 1;      // slimmer waist
  const hipW = isFemale ? 1.06 : 1;        // wider hips

  const sx = (x: number, factor: number) => +(50 + (x - 50) * factor).toFixed(2);

  type Region = { id: MuscleGroup; d: string };

  // ===================== FRONT =====================

  // Head + neck
  const headFront =
    "M 50 5 C 43 5 38 10 38 17 C 38 24 43 30 50 30 C 57 30 62 24 62 17 C 62 10 57 5 50 5 Z " +
    "M 46 30 L 54 30 L 55 36 L 45 36 Z";

  // Athletic V-taper torso + arms + legs as one continuous silhouette
  const bodyFront = `
    M ${sx(45, 1)} 36
    L ${sx(55, 1)} 36
    C ${sx(60, 1)} 36 ${sx(64, shoulderW)} 38 ${sx(68, shoulderW)} 40
    C ${sx(74, shoulderW)} 42 ${sx(78, shoulderW)} 46 ${sx(78, shoulderW)} 52
    C ${sx(80, shoulderW)} 60 ${sx(80, shoulderW)} 70 ${sx(78, shoulderW)} 78
    C ${sx(82, shoulderW)} 86 ${sx(83, shoulderW)} 96 ${sx(80, shoulderW)} 104
    C ${sx(78, shoulderW)} 110 ${sx(76, shoulderW)} 112 ${sx(73, shoulderW)} 112
    C ${sx(72, shoulderW)} 110 ${sx(72, shoulderW)} 106 ${sx(72, shoulderW)} 102
    C ${sx(70, shoulderW)} 96 ${sx(70, shoulderW)} 88 ${sx(72, shoulderW)} 80
    L ${sx(70, shoulderW)} 78
    C ${sx(68, waistW)} 84 ${sx(66, waistW)} 90 ${sx(64, waistW)} 96
    C ${sx(66, hipW)} 102 ${sx(68, hipW)} 108 ${sx(67, hipW)} 114
    C ${sx(66, hipW)} 126 ${sx(64, hipW)} 138 ${sx(62, hipW)} 148
    C ${sx(62, hipW)} 158 ${sx(60, hipW)} 168 ${sx(58, hipW)} 176
    L ${sx(54, hipW)} 176
    C ${sx(54, hipW)} 162 ${sx(53, hipW)} 148 ${sx(52, hipW)} 134
    C ${sx(51, hipW)} 124 ${sx(50.5, hipW)} 118 ${sx(50, hipW)} 114
    C ${sx(49.5, hipW)} 118 ${sx(49, hipW)} 124 ${sx(48, hipW)} 134
    C ${sx(47, hipW)} 148 ${sx(46, hipW)} 162 ${sx(46, hipW)} 176
    L ${sx(42, hipW)} 176
    C ${sx(40, hipW)} 168 ${sx(38, hipW)} 158 ${sx(38, hipW)} 148
    C ${sx(36, hipW)} 138 ${sx(34, hipW)} 126 ${sx(33, hipW)} 114
    C ${sx(32, hipW)} 108 ${sx(34, hipW)} 102 ${sx(36, hipW)} 96
    C ${sx(34, waistW)} 90 ${sx(32, waistW)} 84 ${sx(30, waistW)} 78
    L ${sx(28, shoulderW)} 80
    C ${sx(30, shoulderW)} 88 ${sx(30, shoulderW)} 96 ${sx(28, shoulderW)} 102
    C ${sx(28, shoulderW)} 106 ${sx(28, shoulderW)} 110 ${sx(27, shoulderW)} 112
    C ${sx(24, shoulderW)} 112 ${sx(22, shoulderW)} 110 ${sx(20, shoulderW)} 104
    C ${sx(17, shoulderW)} 96 ${sx(18, shoulderW)} 86 ${sx(22, shoulderW)} 78
    C ${sx(20, shoulderW)} 70 ${sx(20, shoulderW)} 60 ${sx(22, shoulderW)} 52
    C ${sx(22, shoulderW)} 46 ${sx(26, shoulderW)} 42 ${sx(32, shoulderW)} 40
    C ${sx(36, 1)} 38 ${sx(40, 1)} 36 ${sx(45, 1)} 36 Z
  `;

  // Front muscle regions
  const frontRegions: Region[] = [
    // Traps (between neck and shoulders)
    { id: "traps", d: `M ${sx(43, shoulderW)} 36 L ${sx(57, shoulderW)} 36 L ${sx(56, shoulderW)} 41 L ${sx(44, shoulderW)} 41 Z` },
    // Shoulders (deltoid caps — rounded)
    { id: "shoulders", d: `M ${sx(30, shoulderW)} 40 C ${sx(24, shoulderW)} 42 ${sx(22, shoulderW)} 48 ${sx(24, shoulderW)} 54 C ${sx(28, shoulderW)} 54 ${sx(33, shoulderW)} 50 ${sx(34, shoulderW)} 44 Z` },
    { id: "shoulders", d: `M ${sx(70, shoulderW)} 40 C ${sx(76, shoulderW)} 42 ${sx(78, shoulderW)} 48 ${sx(76, shoulderW)} 54 C ${sx(72, shoulderW)} 54 ${sx(67, shoulderW)} 50 ${sx(66, shoulderW)} 44 Z` },
    // Chest (pec major — fan shape)
    { id: "chest", d: `M ${sx(36, shoulderW)} 42 C ${sx(33, shoulderW)} 46 ${sx(33, shoulderW)} 54 ${sx(38, shoulderW)} 58 L ${sx(49, shoulderW)} 58 L ${sx(49, shoulderW)} 42 Z` },
    { id: "chest", d: `M ${sx(64, shoulderW)} 42 C ${sx(67, shoulderW)} 46 ${sx(67, shoulderW)} 54 ${sx(62, shoulderW)} 58 L ${sx(51, shoulderW)} 58 L ${sx(51, shoulderW)} 42 Z` },
    // Biceps
    { id: "biceps", d: `M ${sx(22, shoulderW)} 54 C ${sx(20, shoulderW)} 60 ${sx(20, shoulderW)} 68 ${sx(22, shoulderW)} 74 L ${sx(28, shoulderW)} 74 C ${sx(29, shoulderW)} 68 ${sx(29, shoulderW)} 60 ${sx(28, shoulderW)} 54 Z` },
    { id: "biceps", d: `M ${sx(78, shoulderW)} 54 C ${sx(80, shoulderW)} 60 ${sx(80, shoulderW)} 68 ${sx(78, shoulderW)} 74 L ${sx(72, shoulderW)} 74 C ${sx(71, shoulderW)} 68 ${sx(71, shoulderW)} 60 ${sx(72, shoulderW)} 54 Z` },
    // Forearms
    { id: "forearms", d: `M ${sx(20, shoulderW)} 80 C ${sx(18, shoulderW)} 88 ${sx(18, shoulderW)} 98 ${sx(22, shoulderW)} 106 L ${sx(28, shoulderW)} 106 C ${sx(28, shoulderW)} 98 ${sx(28, shoulderW)} 88 ${sx(27, shoulderW)} 80 Z` },
    { id: "forearms", d: `M ${sx(80, shoulderW)} 80 C ${sx(82, shoulderW)} 88 ${sx(82, shoulderW)} 98 ${sx(78, shoulderW)} 106 L ${sx(72, shoulderW)} 106 C ${sx(72, shoulderW)} 98 ${sx(72, shoulderW)} 88 ${sx(73, shoulderW)} 80 Z` },
    // Abs (six-pack — 3 rows × 2)
    { id: "abs", d: `M ${sx(45, waistW)} 60 L ${sx(49, waistW)} 60 L ${sx(49, waistW)} 67 L ${sx(45, waistW)} 67 Z` },
    { id: "abs", d: `M ${sx(51, waistW)} 60 L ${sx(55, waistW)} 60 L ${sx(55, waistW)} 67 L ${sx(51, waistW)} 67 Z` },
    { id: "abs", d: `M ${sx(45, waistW)} 69 L ${sx(49, waistW)} 69 L ${sx(49, waistW)} 76 L ${sx(45, waistW)} 76 Z` },
    { id: "abs", d: `M ${sx(51, waistW)} 69 L ${sx(55, waistW)} 69 L ${sx(55, waistW)} 76 L ${sx(51, waistW)} 76 Z` },
    { id: "abs", d: `M ${sx(45, waistW)} 78 L ${sx(49, waistW)} 78 L ${sx(48, waistW)} 88 L ${sx(46, waistW)} 88 Z` },
    { id: "abs", d: `M ${sx(51, waistW)} 78 L ${sx(55, waistW)} 78 L ${sx(54, waistW)} 88 L ${sx(52, waistW)} 88 Z` },
    // Obliques (flanks)
    { id: "obliques", d: `M ${sx(38, waistW)} 62 C ${sx(36, waistW)} 72 ${sx(38, waistW)} 84 ${sx(43, waistW)} 88 L ${sx(43, waistW)} 64 Z` },
    { id: "obliques", d: `M ${sx(62, waistW)} 62 C ${sx(64, waistW)} 72 ${sx(62, waistW)} 84 ${sx(57, waistW)} 88 L ${sx(57, waistW)} 64 Z` },
    // Quads
    { id: "quads", d: `M ${sx(36, hipW)} 114 C ${sx(33, hipW)} 124 ${sx(34, hipW)} 138 ${sx(38, hipW)} 146 L ${sx(48, hipW)} 146 L ${sx(48, hipW)} 114 Z` },
    { id: "quads", d: `M ${sx(64, hipW)} 114 C ${sx(67, hipW)} 124 ${sx(66, hipW)} 138 ${sx(62, hipW)} 146 L ${sx(52, hipW)} 146 L ${sx(52, hipW)} 114 Z` },
    // Calves
    { id: "calves", d: `M ${sx(38, hipW)} 152 C ${sx(35, hipW)} 160 ${sx(36, hipW)} 168 ${sx(40, hipW)} 174 L ${sx(47, hipW)} 174 L ${sx(47, hipW)} 152 Z` },
    { id: "calves", d: `M ${sx(62, hipW)} 152 C ${sx(65, hipW)} 160 ${sx(64, hipW)} 168 ${sx(60, hipW)} 174 L ${sx(53, hipW)} 174 L ${sx(53, hipW)} 152 Z` },
  ];

  // ===================== BACK =====================
  const headBack = headFront;
  const bodyBack = bodyFront;

  const backRegions: Region[] = [
    // Traps (large diamond from neck down between shoulder blades)
    { id: "traps", d: `M ${sx(50, shoulderW)} 36 L ${sx(60, shoulderW)} 40 L ${sx(58, shoulderW)} 48 L ${sx(42, shoulderW)} 48 L ${sx(40, shoulderW)} 40 Z` },
    // Rear shoulders
    { id: "shoulders", d: `M ${sx(30, shoulderW)} 40 C ${sx(24, shoulderW)} 42 ${sx(22, shoulderW)} 48 ${sx(24, shoulderW)} 54 C ${sx(28, shoulderW)} 54 ${sx(33, shoulderW)} 50 ${sx(34, shoulderW)} 44 Z` },
    { id: "shoulders", d: `M ${sx(70, shoulderW)} 40 C ${sx(76, shoulderW)} 42 ${sx(78, shoulderW)} 48 ${sx(76, shoulderW)} 54 C ${sx(72, shoulderW)} 54 ${sx(67, shoulderW)} 50 ${sx(66, shoulderW)} 44 Z` },
    // Mid back / rhomboids
    { id: "back", d: `M ${sx(42, shoulderW)} 50 L ${sx(58, shoulderW)} 50 L ${sx(58, shoulderW)} 62 L ${sx(42, shoulderW)} 62 Z` },
    // Lats (V-taper wings)
    { id: "lats", d: `M ${sx(34, shoulderW)} 50 C ${sx(30, shoulderW)} 60 ${sx(32, shoulderW)} 74 ${sx(40, shoulderW)} 80 L ${sx(46, shoulderW)} 64 L ${sx(46, shoulderW)} 50 Z` },
    { id: "lats", d: `M ${sx(66, shoulderW)} 50 C ${sx(70, shoulderW)} 60 ${sx(68, shoulderW)} 74 ${sx(60, shoulderW)} 80 L ${sx(54, shoulderW)} 64 L ${sx(54, shoulderW)} 50 Z` },
    // Lower back (twin erector spinae columns)
    { id: "lower_back", d: `M ${sx(44, waistW)} 82 L ${sx(48, waistW)} 82 L ${sx(48, waistW)} 96 L ${sx(45, waistW)} 96 Z` },
    { id: "lower_back", d: `M ${sx(52, waistW)} 82 L ${sx(56, waistW)} 82 L ${sx(55, waistW)} 96 L ${sx(52, waistW)} 96 Z` },
    // Triceps (back of upper arm)
    { id: "triceps", d: `M ${sx(22, shoulderW)} 54 C ${sx(20, shoulderW)} 60 ${sx(20, shoulderW)} 68 ${sx(22, shoulderW)} 74 L ${sx(28, shoulderW)} 74 C ${sx(29, shoulderW)} 68 ${sx(29, shoulderW)} 60 ${sx(28, shoulderW)} 54 Z` },
    { id: "triceps", d: `M ${sx(78, shoulderW)} 54 C ${sx(80, shoulderW)} 60 ${sx(80, shoulderW)} 68 ${sx(78, shoulderW)} 74 L ${sx(72, shoulderW)} 74 C ${sx(71, shoulderW)} 68 ${sx(71, shoulderW)} 60 ${sx(72, shoulderW)} 54 Z` },
    // Forearms (back)
    { id: "forearms", d: `M ${sx(20, shoulderW)} 80 C ${sx(18, shoulderW)} 88 ${sx(18, shoulderW)} 98 ${sx(22, shoulderW)} 106 L ${sx(28, shoulderW)} 106 C ${sx(28, shoulderW)} 98 ${sx(28, shoulderW)} 88 ${sx(27, shoulderW)} 80 Z` },
    { id: "forearms", d: `M ${sx(80, shoulderW)} 80 C ${sx(82, shoulderW)} 88 ${sx(82, shoulderW)} 98 ${sx(78, shoulderW)} 106 L ${sx(72, shoulderW)} 106 C ${sx(72, shoulderW)} 98 ${sx(72, shoulderW)} 88 ${sx(73, shoulderW)} 80 Z` },
    // Glutes
    { id: "glutes", d: `M ${sx(36, hipW)} 100 C ${sx(32, hipW)} 106 ${sx(33, hipW)} 116 ${sx(40, hipW)} 118 L ${sx(49, hipW)} 118 L ${sx(49, hipW)} 100 Z` },
    { id: "glutes", d: `M ${sx(64, hipW)} 100 C ${sx(68, hipW)} 106 ${sx(67, hipW)} 116 ${sx(60, hipW)} 118 L ${sx(51, hipW)} 118 L ${sx(51, hipW)} 100 Z` },
    // Hamstrings
    { id: "hamstrings", d: `M ${sx(36, hipW)} 122 C ${sx(33, hipW)} 132 ${sx(34, hipW)} 144 ${sx(38, hipW)} 150 L ${sx(48, hipW)} 150 L ${sx(48, hipW)} 122 Z` },
    { id: "hamstrings", d: `M ${sx(64, hipW)} 122 C ${sx(67, hipW)} 132 ${sx(66, hipW)} 144 ${sx(62, hipW)} 150 L ${sx(52, hipW)} 150 L ${sx(52, hipW)} 122 Z` },
    // Calves
    { id: "calves", d: `M ${sx(38, hipW)} 154 C ${sx(35, hipW)} 162 ${sx(36, hipW)} 170 ${sx(40, hipW)} 174 L ${sx(47, hipW)} 174 L ${sx(47, hipW)} 154 Z` },
    { id: "calves", d: `M ${sx(62, hipW)} 154 C ${sx(65, hipW)} 162 ${sx(64, hipW)} 170 ${sx(60, hipW)} 174 L ${sx(53, hipW)} 174 L ${sx(53, hipW)} 154 Z` },
  ];

  const renderAvatar = (
    regions: Region[],
    body: string,
    head: string,
    view: "front" | "back",
  ) => {
    const gradId = `${view}-active`;
    const innerId = `${view}-inner`;
    const rimId = `${view}-rim`;
    const glowId = `${view}-glow`;
    return (
      <svg
        viewBox="0 0 100 180"
        className="w-full h-full"
        aria-hidden="true"
        shapeRendering="geometricPrecision"
      >
        <defs>
          <linearGradient id={rimId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(0 0% 26%)" />
            <stop offset="50%" stopColor="hsl(0 0% 17%)" />
            <stop offset="100%" stopColor="hsl(0 0% 8%)" />
          </linearGradient>
          <radialGradient id={gradId} cx="50%" cy="35%" r="75%">
            <stop offset="0%" stopColor="hsl(0 100% 65%)" />
            <stop offset="50%" stopColor="hsl(0 92% 52%)" />
            <stop offset="100%" stopColor="hsl(0 85% 32%)" />
          </radialGradient>
          <radialGradient id={innerId} cx="50%" cy="40%" r="65%">
            <stop offset="0%" stopColor="hsl(0 0% 100% / 0.35)" />
            <stop offset="60%" stopColor="hsl(0 0% 100% / 0.05)" />
            <stop offset="100%" stopColor="hsl(0 0% 0% / 0.25)" />
          </radialGradient>
          <filter id={glowId} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="0.5" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Head + neck */}
        <path d={head} fill={`url(#${rimId})`} stroke={BODY_EDGE} strokeWidth="0.5" strokeLinejoin="round" />
        {/* Athletic body silhouette */}
        <path d={body} fill={`url(#${rimId})`} stroke={BODY_EDGE} strokeWidth="0.5" strokeLinejoin="round" />

        {/* Inactive muscle plates — sharper definition */}
        {regions.map((r, i) =>
          !isActive(r.id) ? (
            <path
              key={`bg-${i}`}
              d={r.d}
              fill={MUSCLE_INACTIVE}
              stroke={BODY_LINE}
              strokeWidth="0.45"
              strokeLinejoin="round"
            />
          ) : null,
        )}

        {/* Active muscles — sharp red with inner glow */}
        {regions.map((r, i) =>
          isActive(r.id) ? (
            <g key={`act-${i}`} className="muscle-fill" filter={`url(#${glowId})`}>
              <path d={r.d} fill={`url(#${gradId})`} stroke="hsl(0 85% 30%)" strokeWidth="0.4" strokeLinejoin="round" />
              <path d={r.d} fill={`url(#${innerId})`} style={{ mixBlendMode: "overlay" }} />
            </g>
          ) : null,
        )}
      </svg>
    );
  };

  return (
    <div className={`w-full ${className}`}>
      <style>{`
        @keyframes muscle-fill-pulse {
          0%, 100% { opacity: 1; filter: brightness(1); }
          50%      { opacity: 0.92; filter: brightness(1.12); }
        }
        .muscle-fill { animation: muscle-fill-pulse 2.4s ease-in-out infinite; transform-origin: center; }
      `}</style>

      <div className="grid grid-cols-2 gap-2 sm:gap-4">
        <div className="flex flex-col items-center">
          <p className="text-[10px] sm:text-xs font-heading tracking-[0.25em] text-muted-foreground mb-1">
            VOOR
          </p>
          <div className="relative w-full max-w-[260px] aspect-[10/18]">
            {renderAvatar(frontRegions, bodyFront, headFront, "front")}
          </div>
        </div>

        <div className="flex flex-col items-center">
          <p className="text-[10px] sm:text-xs font-heading tracking-[0.25em] text-muted-foreground mb-1">
            ACHTER
          </p>
          <div className="relative w-full max-w-[260px] aspect-[10/18]">
            {renderAvatar(backRegions, bodyBack, headBack, "back")}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BodyDiagram;
