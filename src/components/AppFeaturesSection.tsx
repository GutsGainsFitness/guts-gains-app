import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Dumbbell, Trophy, Camera, Crown, Award, ArrowRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/i18n/LanguageContext";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import QuickIntakeFlowDialog from "@/components/QuickIntakeFlowDialog";
import { trackCta, useCtaImpression } from "@/lib/ctaTracking";

const AppFeaturesSection = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [intakeOpen, setIntakeOpen] = useState(false);
  const ctaCardRef = useCtaImpression<HTMLAnchorElement>(
    user ? "appfeat.open_app" : "appfeat.signup",
  );
  const faqIntakeRef = useCtaImpression<HTMLButtonElement>("appfeat.faq.intake");
  const faqPricingRef = useCtaImpression<HTMLAnchorElement>("appfeat.faq.pricing");
  const faqLoginRef = useCtaImpression<HTMLAnchorElement>(
    user ? null : "appfeat.faq.login",
  );
  const bottomLoginRef = useCtaImpression<HTMLAnchorElement>(
    user ? null : "appfeat.bottom.login",
  );

  const FEATURES = [
    { icon: Dumbbell, title: t("appfeat.f1.title"), desc: t("appfeat.f1.desc") },
    { icon: Trophy, title: t("appfeat.f2.title"), desc: t("appfeat.f2.desc") },
    { icon: Camera, title: t("appfeat.f3.title"), desc: t("appfeat.f3.desc") },
    { icon: Crown, title: t("appfeat.f4.title"), desc: t("appfeat.f4.desc") },
    { icon: Award, title: t("appfeat.f5.title"), desc: t("appfeat.f5.desc") },
  ];

  return (
    <section
      id="app"
      className="relative py-24 md:py-32 bg-gradient-to-b from-background via-card/30 to-background overflow-hidden"
    >
      {/* Decorative accents */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 -left-32 w-64 h-64 bg-primary/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-1/4 -right-32 w-64 h-64 bg-primary/10 blur-[120px] rounded-full" />
      </div>

      <div className="container-tight px-4 md:px-8 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-16 md:mb-20"
        >
          <p className="text-primary font-heading text-xs tracking-[0.4em] mb-4">
            {t("appfeat.tag")}
          </p>
          <h2 className="text-4xl md:text-6xl font-heading text-foreground mb-6 leading-tight">
            {t("appfeat.title")}{" "}
            {t("appfeat.title_accent") && (
              <span className="text-primary">{t("appfeat.title_accent")}</span>
            )}
          </h2>
          <p className="text-base md:text-lg font-body text-muted-foreground leading-relaxed whitespace-pre-line">
            {t("appfeat.desc")}
          </p>
          <p className="mt-3 text-sm font-body text-muted-foreground/80 italic">
            {t("appfeat.subdesc")}
          </p>
          <div className="mt-8 max-w-2xl mx-auto border-l-2 border-primary bg-card/40 backdrop-blur-sm px-5 py-4 text-left">
            <p className="text-sm md:text-base font-body text-foreground leading-relaxed">
              {t("appfeat.pitch")}
            </p>
          </div>
        </motion.div>

        {/* Feature grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6 mb-16">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="group relative bg-card/60 backdrop-blur-sm border-2 border-border hover:border-primary/50 rounded-sm p-6 md:p-7 transition-all duration-300 hover:-translate-y-1 hover:shadow-glow"
            >
              <div className="w-12 h-12 rounded-sm bg-primary/10 border border-primary/30 flex items-center justify-center mb-5 group-hover:bg-primary/20 transition-colors">
                <f.icon size={22} className="text-primary" />
              </div>
              <h3 className="text-lg md:text-xl font-heading text-foreground mb-2 tracking-wide">
                {f.title.toUpperCase()}
              </h3>
              <p className="text-sm font-body text-muted-foreground leading-relaxed">
                {f.desc}
              </p>
            </motion.div>
          ))}

          {/* CTA card filling 6th slot */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.5, delay: FEATURES.length * 0.08 }}
            className="relative bg-gradient-to-br from-primary/20 via-primary/10 to-transparent border-2 border-primary rounded-sm p-6 md:p-7 flex flex-col justify-between"
          >
            <div>
              <p className="text-primary font-heading text-[10px] tracking-[0.35em] mb-3">
                {t("appfeat.cta.tag")}
              </p>
              <h3 className="text-xl md:text-2xl font-heading text-foreground leading-tight mb-3">
                {t("appfeat.cta.title")}
              </h3>
              <p className="text-sm font-body text-muted-foreground leading-relaxed mb-6">
                {t("appfeat.cta.desc")}
              </p>
            </div>
            <Link
              to={user ? "/app" : "/app/login"}
              ref={ctaCardRef}
              onClick={() => trackCta(user ? "appfeat.open_app" : "appfeat.signup")}
              className="inline-flex items-center justify-center gap-2 w-full px-5 py-3 bg-primary text-primary-foreground font-heading text-xs tracking-[0.2em] rounded-sm hover:bg-primary/90 transition-all shadow-red hover:shadow-glow"
            >
              {user ? t("appfeat.cta.open") : t("appfeat.cta.signup")}
              <ArrowRight size={14} />
            </Link>
          </motion.div>
        </div>

        {/* Mini FAQ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.6 }}
          className="max-w-3xl mx-auto mb-16"
        >
          <div className="text-center mb-8">
            <h3 className="text-2xl md:text-3xl font-heading text-foreground tracking-wide mb-2">
              {t("appfeat.faq.title")}
            </h3>
            <p className="text-sm font-body text-muted-foreground">
              {t("appfeat.faq.subtitle")}
            </p>
          </div>
          <Accordion type="single" collapsible className="w-full space-y-3">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <AccordionItem
                key={n}
                value={`faq-${n}`}
                className="bg-card/60 backdrop-blur-sm border-2 border-border data-[state=open]:border-primary/50 rounded-sm px-5 transition-colors"
              >
                <AccordionTrigger className="text-left text-sm md:text-base font-heading tracking-wide text-foreground hover:text-primary hover:no-underline py-4">
                  {t(`appfeat.faq.q${n}`)}
                </AccordionTrigger>
                <AccordionContent className="text-sm font-body text-muted-foreground leading-relaxed pb-4">
                  {t(`appfeat.faq.a${n}`)}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          {/* FAQ CTA */}
          <div className="mt-10 text-center bg-gradient-to-br from-primary/15 via-primary/5 to-transparent border border-primary/30 rounded-sm px-6 py-8">
            <h4 className="text-xl md:text-2xl font-heading text-foreground mb-2">
              {t("appfeat.faq.cta_title")}
            </h4>
            <p className="text-sm font-body text-muted-foreground mb-6">
              {t("appfeat.faq.cta_desc")}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-center">
              <button
                type="button"
                ref={faqIntakeRef}
                onClick={() => {
                  trackCta("appfeat.faq.intake");
                  setIntakeOpen(true);
                }}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-heading text-xs tracking-[0.2em] rounded-sm hover:bg-primary/90 transition-all shadow-red hover:shadow-glow"
              >
                {t("appfeat.faq.cta_primary")}
                <ArrowRight size={14} />
              </button>
              <a
                href="#tarieven"
                ref={faqPricingRef}
                onClick={(e) => {
                  e.preventDefault();
                  trackCta("appfeat.faq.pricing");
                  document.getElementById("tarieven")?.scrollIntoView({ behavior: "smooth" });
                }}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 border-2 border-primary/60 text-foreground font-heading text-xs tracking-[0.2em] rounded-sm hover:border-primary hover:bg-primary/10 transition-all"
              >
                {t("appfeat.faq.cta_pricing")}
                <ArrowRight size={14} />
              </a>
              {!user && (
                <Link
                  to="/app/login"
                  ref={faqLoginRef}
                  onClick={() => trackCta("appfeat.faq.login")}
                  className="text-sm font-body text-muted-foreground hover:text-primary transition-colors underline-offset-4 hover:underline"
                >
                  {t("appfeat.faq.cta_secondary")}
                </Link>
              )}
            </div>
            <p className="mt-5 text-xs font-body text-muted-foreground/80 max-w-md mx-auto leading-relaxed">
              {t("appfeat.faq.pricing_hint")}
            </p>
          </div>
        </motion.div>

        {/* Bottom CTA strip */}
        {!user && (
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="text-center"
          >
            <p className="text-sm font-body text-muted-foreground">
              {t("appfeat.bottom_q")}{" "}
              <Link
                to="/app/login"
                ref={bottomLoginRef}
                onClick={() => trackCta("appfeat.bottom.login")}
                className="text-primary hover:text-primary/80 font-heading tracking-wider transition-colors"
              >
                {t("appfeat.bottom_login")}
              </Link>
            </p>
          </motion.div>
        )}
      </div>

      <QuickIntakeFlowDialog open={intakeOpen} onOpenChange={setIntakeOpen} />
    </section>
  );
};

export default AppFeaturesSection;
