import { useEffect, useRef } from "react";
import confetti from "canvas-confetti";
import { X, Sparkles, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import RankBadge from "./RankBadge";
import {
  RankTier, Division, ROMAN, tierLabel, TIER_STYLES,
} from "@/lib/rank";

interface RankUpCelebrationProps {
  tier: RankTier;
  division: Division;
  fromTier?: RankTier | null;
  fromDivision?: Division | null;
  totalScore?: number;
  onClose: () => void;
}

/**
 * Fullscreen rank-up celebration with confetti, dramatic badge reveal,
 * tier-themed lighting and a "claim" CTA. Replaces the toast-only feedback.
 */
const RankUpCelebration = ({
  tier, division, fromTier, fromDivision, totalScore, onClose,
}: RankUpCelebrationProps) => {
  const fired = useRef(false);
  const style = TIER_STYLES[tier];

  // Convert HSL string → tuple for confetti colors (canvas-confetti accepts hex/css)
  const colors = [style.primary, style.accent, style.glow, "#ffffff"];

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;

    // Initial burst — center
    const duration = 4500;
    const animationEnd = Date.now() + duration;

    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

    // Big opening burst
    confetti({
      particleCount: 180,
      spread: 90,
      startVelocity: 55,
      origin: { x: 0.5, y: 0.55 },
      colors,
      scalar: 1.1,
      ticks: 220,
    });

    // Side cannons
    setTimeout(() => {
      confetti({ particleCount: 80, angle: 60, spread: 70, origin: { x: 0, y: 0.7 }, colors, startVelocity: 50 });
      confetti({ particleCount: 80, angle: 120, spread: 70, origin: { x: 1, y: 0.7 }, colors, startVelocity: 50 });
    }, 250);

    // Continuous rain for a few seconds
    const interval = window.setInterval(() => {
      const timeLeft = animationEnd - Date.now();
      if (timeLeft <= 0) {
        window.clearInterval(interval);
        return;
      }
      const particleCount = 30 * (timeLeft / duration);
      confetti({
        particleCount,
        startVelocity: 30,
        spread: 360,
        ticks: 120,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
        colors,
        scalar: 0.9,
      });
      confetti({
        particleCount,
        startVelocity: 30,
        spread: 360,
        ticks: 120,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
        colors,
        scalar: 0.9,
      });
    }, 280);

    // Esc to close
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);

    // Lock scroll
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fromLabel = fromTier && fromDivision
    ? `${tierLabel(fromTier).toUpperCase()} ${ROMAN[fromDivision]}`
    : null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label="Rank up celebration"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 backdrop-blur-md"
        style={{ background: "hsl(0 0% 0% / 0.85)" }}
        onClick={onClose}
      />

      {/* Tier-colored radial glow behind card */}
      <div
        className="absolute inset-0 pointer-events-none animate-fade-in"
        style={{
          background: `radial-gradient(ellipse at 50% 45%, ${style.glow} 0%, transparent 55%)`,
          opacity: 0.35,
        }}
      />

      {/* Card */}
      <div
        className="relative max-w-lg w-full border-2 rounded-sm overflow-hidden animate-scale-in"
        style={{
          borderColor: style.primary,
          background: `linear-gradient(160deg, hsl(var(--card)) 0%, hsl(var(--card)) 55%, ${style.secondary} 220%)`,
          boxShadow: `0 0 60px ${style.glow}, 0 0 120px ${style.primary}55`,
        }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 p-1.5 rounded-sm text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
          aria-label="Sluiten"
        >
          <X size={18} />
        </button>

        {/* Content */}
        <div className="px-6 pt-10 pb-6 md:px-10 md:pt-12 md:pb-8 text-center">
          {/* Eyebrow */}
          <div className="flex items-center justify-center gap-2 mb-2">
            <Sparkles size={14} style={{ color: style.primary }} />
            <p className="text-[11px] font-heading tracking-[0.4em]" style={{ color: style.primary }}>
              RANK UP
            </p>
            <Sparkles size={14} style={{ color: style.primary }} />
          </div>

          {/* From → To */}
          {fromLabel && (
            <p className="text-xs font-heading tracking-wider text-muted-foreground mb-1">
              {fromLabel} <span style={{ color: style.primary }}>→</span>
            </p>
          )}

          {/* Tier name */}
          <h2 className="text-3xl md:text-5xl font-heading text-foreground leading-none break-words mb-1">
            {tierLabel(tier).toUpperCase()}{" "}
            <span style={{ color: style.primary }}>{ROMAN[division]}</span>
          </h2>
          <p className="text-xs text-muted-foreground mb-6">Promotie verdiend</p>

          {/* Big badge with float animation */}
          <div className="flex items-center justify-center mb-6 animate-fade-in" style={{ animationDelay: "200ms", animationFillMode: "backwards" }}>
            <div
              className="relative"
              style={{
                filter: `drop-shadow(0 0 24px ${style.glow})`,
                animation: "float 3s ease-in-out infinite",
              }}
            >
              <RankBadge tier={tier} division={division} size="xl" />
            </div>
          </div>

          {/* Score */}
          {typeof totalScore === "number" && (
            <div className="mb-6">
              <p className="text-[10px] font-heading tracking-[0.3em] text-muted-foreground mb-1">
                NIEUWE TOTAAL SCORE
              </p>
              <p className="text-2xl font-heading text-foreground">
                {Math.round(totalScore)} <span className="text-sm text-muted-foreground">/ 1000</span>
              </p>
            </div>
          )}

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/app/rank"
              onClick={onClose}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 text-xs font-heading tracking-wider rounded-sm transition-all hover:scale-[1.02]"
              style={{
                background: `linear-gradient(135deg, ${style.primary}, ${style.secondary})`,
                color: style.textOnBadge,
                boxShadow: `0 0 20px ${style.glow}`,
              }}
            >
              BEKIJK RANK <ArrowRight size={14} />
            </Link>
            <button
              onClick={onClose}
              className="text-xs font-heading tracking-wider text-muted-foreground hover:text-foreground transition-colors px-4 py-2"
            >
              SLUITEN
            </button>
          </div>
        </div>
      </div>

      {/* Local keyframe for float (no Tailwind config edit needed) */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
      `}</style>
    </div>
  );
};

export default RankUpCelebration;
