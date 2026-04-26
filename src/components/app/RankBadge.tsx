import { RankTier, Division, ROMAN, TIER_STYLES } from "@/lib/rank";

interface RankBadgeProps {
  tier: RankTier;
  division: Division;
  size?: "sm" | "md" | "lg" | "xl";
  showDivision?: boolean;
  className?: string;
}

const SIZES: Record<NonNullable<RankBadgeProps["size"]>, number> = {
  sm: 48,
  md: 80,
  lg: 128,
  xl: 192,
};

/**
 * Original SVG badge per tier. Shape evolves through the tiers:
 * - Iron→Silver: shield
 * - Gold→Diamond: faceted hexagon-shield
 * - Master→Elite: star-shield with crown notch
 * - Champion: laurel wreath shield
 * - Olympian: flame shield (brand red/black)
 */
const RankBadge = ({ tier, division, size = "md", showDivision = true, className }: RankBadgeProps) => {
  const px = SIZES[size];
  const style = TIER_STYLES[tier];
  const uid = `rb-${tier}-${division}-${size}`;

  // Tier shape variant
  const variant: "shield" | "facet" | "star" | "laurel" | "flame" =
    tier === "olympian" ? "flame"
      : tier === "champion" ? "laurel"
        : tier === "master" || tier === "elite" ? "star"
          : tier === "gold" || tier === "platinum" || tier === "diamond" ? "facet"
            : "shield";

  return (
    <svg
      width={px}
      height={px}
      viewBox="0 0 100 110"
      className={className}
      shapeRendering="geometricPrecision"
      role="img"
      aria-label={`Rank badge ${tier} ${ROMAN[division]}`}
    >
      <defs>
        <linearGradient id={`${uid}-fill`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={style.accent} />
          <stop offset="45%" stopColor={style.primary} />
          <stop offset="100%" stopColor={style.secondary} />
        </linearGradient>
        <linearGradient id={`${uid}-shine`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="hsl(0 0% 100% / 0.55)" />
          <stop offset="50%" stopColor="hsl(0 0% 100% / 0)" />
        </linearGradient>
        <radialGradient id={`${uid}-glow`} cx="50%" cy="55%" r="60%">
          <stop offset="0%" stopColor={style.glow} stopOpacity="0.55" />
          <stop offset="100%" stopColor={style.glow} stopOpacity="0" />
        </radialGradient>
        <filter id={`${uid}-drop`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="1.4" />
          <feOffset dy="1.2" />
          <feComponentTransfer><feFuncA type="linear" slope="0.55" /></feComponentTransfer>
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* outer glow */}
      <circle cx="50" cy="52" r="48" fill={`url(#${uid}-glow)`} />

      {/* badge body shape */}
      <g filter={`url(#${uid}-drop)`}>
        {variant === "shield" && (
          <path
            d="M50 8 L86 18 L84 56 C84 76 70 90 50 98 C30 90 16 76 16 56 L14 18 Z"
            fill={`url(#${uid}-fill)`}
            stroke={style.accent}
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        )}
        {variant === "facet" && (
          <>
            <path
              d="M50 6 L88 22 L92 54 C92 74 76 92 50 100 C24 92 8 74 8 54 L12 22 Z"
              fill={`url(#${uid}-fill)`}
              stroke={style.accent}
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            {/* facet lines for "cut gem" feel */}
            <path d="M50 6 L50 100" stroke={style.accent} strokeWidth="0.5" opacity="0.5" />
            <path d="M12 22 L50 50 L88 22" fill="none" stroke={style.accent} strokeWidth="0.5" opacity="0.5" />
            <path d="M12 22 L50 100 L88 22" fill="none" stroke={style.accent} strokeWidth="0.4" opacity="0.35" />
          </>
        )}
        {variant === "star" && (
          <>
            <path
              d="M50 4 L60 16 L88 18 L86 50 C86 72 72 90 50 100 C28 90 14 72 14 50 L12 18 L40 16 Z"
              fill={`url(#${uid}-fill)`}
              stroke={style.accent}
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            {/* center star */}
            <path
              d="M50 32 L54 44 L66 44 L56 52 L60 64 L50 56 L40 64 L44 52 L34 44 L46 44 Z"
              fill={style.accent}
              opacity="0.85"
            />
          </>
        )}
        {variant === "laurel" && (
          <>
            {/* shield */}
            <path
              d="M50 8 L80 18 L78 54 C78 74 66 88 50 96 C34 88 22 74 22 54 L20 18 Z"
              fill={`url(#${uid}-fill)`}
              stroke={style.accent}
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            {/* laurel branches */}
            <g fill="none" stroke={style.accent} strokeWidth="2" strokeLinecap="round">
              <path d="M14 60 Q8 48 12 32" />
              <path d="M86 60 Q92 48 88 32" />
              <path d="M16 56 L10 52" />
              <path d="M14 48 L8 44" />
              <path d="M14 40 L9 36" />
              <path d="M84 56 L90 52" />
              <path d="M86 48 L92 44" />
              <path d="M86 40 L91 36" />
            </g>
            {/* star */}
            <path
              d="M50 38 L54 48 L64 48 L56 55 L59 65 L50 59 L41 65 L44 55 L36 48 L46 48 Z"
              fill={style.accent}
              opacity="0.9"
            />
          </>
        )}
        {variant === "flame" && (
          <>
            {/* dark base shield */}
            <path
              d="M50 6 L86 18 L84 56 C84 78 68 92 50 100 C32 92 16 78 16 56 L14 18 Z"
              fill={style.secondary}
              stroke={style.primary}
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            {/* inner flame */}
            <path
              d="M50 22 C42 32 38 40 38 50 C38 58 42 64 46 66 C44 62 46 58 50 56 C52 60 50 64 52 68 C58 66 64 60 64 50 C64 42 58 32 50 22 Z"
              fill={`url(#${uid}-fill)`}
              stroke={style.accent}
              strokeWidth="0.8"
            />
            {/* inner glow */}
            <circle cx="50" cy="58" r="6" fill={style.accent} opacity="0.6" />
          </>
        )}

        {/* top shine highlight */}
        <path
          d="M22 18 Q50 8 78 18 L76 30 Q50 22 24 30 Z"
          fill={`url(#${uid}-shine)`}
          opacity="0.7"
        />
      </g>

      {/* division strip at bottom */}
      {showDivision && (
        <g>
          <rect x="34" y="86" width="32" height="16" rx="2" fill="hsl(0 0% 0% / 0.55)" stroke={style.accent} strokeWidth="0.8" />
          <text
            x="50"
            y="98"
            textAnchor="middle"
            fontSize="11"
            fontWeight="700"
            letterSpacing="2"
            fontFamily="'Oswald', sans-serif"
            fill={style.accent}
          >
            {ROMAN[division]}
          </text>
        </g>
      )}
    </svg>
  );
};

export default RankBadge;
