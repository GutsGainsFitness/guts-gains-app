import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { CheckCircle, ExternalLink } from "lucide-react";
import heroImage from "@/assets/pablo-portrait.jpg";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { trackCta, useCtaImpression } from "@/lib/ctaTracking";

const HeroSection = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const trustItems = [t("hero.trust1"), t("hero.trust2"), t("hero.trust3")];
  const openAppRef = useCtaImpression<HTMLAnchorElement>(
    user ? "hero.open_app" : null,
  );
  const intakeRef = useCtaImpression<HTMLAnchorElement>(
    user ? null : "hero.intake",
  );
  const pricingRef = useCtaImpression<HTMLAnchorElement>(
    user ? null : "hero.pricing",
  );

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      <div className="absolute inset-0">
        <img
          src={heroImage}
          alt="Personal training bij Guts & Gains Fitness Den Haag"
          className="w-full h-full object-cover"
          style={{ objectPosition: '50% 15%' }}
          width={1920}
          height={1080}
          loading="eager"
          fetchPriority="high"
          decoding="async"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/90 to-background/30" />
        <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent mx-0" />
      </div>

      <div className="relative container-tight px-4 md:px-8 pt-28 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: "easeOut" }}
          className="max-w-2xl"
        >
          <p className="text-primary font-heading text-xs md:text-sm tracking-[0.35em] mb-5">{t("hero.tag")}</p>
          <div className="w-12 h-[2px] bg-primary mb-6" />
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-heading leading-[1.02] text-foreground mb-7">
            {t("hero.title1")}<br />
            <span className="text-primary">{t("hero.title2")}</span>
          </h1>
          <p className="text-muted-foreground text-base md:text-lg leading-relaxed mb-10 max-w-lg font-body">
            {t("hero.desc")}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 mb-10">
            {user ? (
              <Link
                to="/app"
                ref={openAppRef}
                onClick={() => trackCta("hero.open_app")}
                className="px-10 py-4 bg-primary text-primary-foreground font-heading text-sm tracking-wider text-center hover:bg-primary/90 transition-all shadow-red hover:shadow-glow flex items-center justify-center gap-2"
              >
                <ExternalLink size={16} />
                {t("hero.openApp")}
              </Link>
            ) : (
              <>
                <Link
                  to="/#intake"
                  ref={intakeRef}
                  onClick={() => {
                    trackCta("hero.intake");
                    document.getElementById("intake")?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="px-10 py-4 bg-primary text-primary-foreground font-heading text-sm tracking-wider text-center hover:bg-primary/90 transition-all shadow-red hover:shadow-glow"
                >
                  {t("hero.cta1")}
                </Link>
                <Link
                  to="/#tarieven"
                  ref={pricingRef}
                  onClick={() => {
                    trackCta("hero.pricing");
                    document.getElementById("tarieven")?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="px-10 py-4 border border-foreground/20 text-foreground font-heading text-sm tracking-wider text-center hover:bg-foreground/5 hover:border-foreground/30 transition-all"
                >
                  {t("hero.cta2")}
                </Link>
              </>
            )}
          </div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            className="flex flex-wrap gap-x-6 gap-y-2"
          >
            {trustItems.map((item) => (
              <div key={item} className="flex items-center gap-2">
                <CheckCircle className="text-primary" size={14} />
                <span className="text-xs text-muted-foreground font-body">{item}</span>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
