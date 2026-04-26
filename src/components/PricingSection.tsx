import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Star, ArrowRight } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";
import { trackCta, useCtaImpression } from "@/lib/ctaTracking";

const monthly = [
  { name: "Optie 1", freqKey: "pricing.opt1_freq", price: "280", popular: false, priceId: "maandkaart_1x_pt_4wk" },
  { name: "Optie 2", freqKey: "pricing.opt2_freq", price: "520", popular: true, priceId: "maandkaart_2x_pt_4wk" },
  { name: "Optie 3", freqKey: "pricing.opt3_freq", price: "720", popular: false, priceId: "maandkaart_3x_pt_4wk" },
  { name: "Optie 4", freqKey: "pricing.opt4_freq", price: "880", popular: false, priceId: "maandkaart_4x_pt_4wk" },
];

const packs = [
  { name: "Power-Up Pack", sessions: 5, price: "350", perSession: "70,00", priceId: "rittenkaart_power_up_5" },
  { name: "Warrior Pack", sessions: 10, price: "665", perSession: "66,50", priceId: "rittenkaart_warrior_10" },
  { name: "HIIT Pack", sessions: 20, price: "1.260", perSession: "63,00", priceId: "rittenkaart_hiit_20" },
  { name: "Guts Regiment", sessions: 25, price: "1.522,50", perSession: "60,90", priceId: "rittenkaart_guts_25" },
  { name: "Saiyan Training", sessions: 36, price: "2.142", perSession: "59,50", priceId: "rittenkaart_saiyan_36" },
];

const sgPricePerSession = [{ people: 2, price: 35 }];

const sgFrequencyKeys = ["pricing.freq1", "pricing.freq2", "pricing.freq3"];
const sgFrequencies = [
  { timesPerWeek: 1, sessions: 4 },
  { timesPerWeek: 2, sessions: 8 },
  { timesPerWeek: 3, sessions: 12 },
];

function getPriceId(people: number, timesPerWeek: number) {
  return `small_group_${people}p_${timesPerWeek}x_4wk`;
}

function formatPrice(amount: number) {
  return amount.toLocaleString("nl-NL");
}

const PricingSection = () => {
  const [sgFreq, setSgFreq] = useState(1);
  const navigate = useNavigate();
  const { t } = useLanguage();
  const currentFreq = sgFrequencies[sgFreq];
  // Eén impressie zodra de pakkettengrid in beeld komt
  const checkoutImpressionRef = useCtaImpression<HTMLDivElement>("pricing.checkout");
  const intakeCtaRef = useCtaImpression<HTMLAnchorElement>("pricing.intake_cta");

  const included = [
    t("pricing.incl1"), t("pricing.incl2"), t("pricing.incl3"),
    t("pricing.incl4"), t("pricing.incl5"),
  ];

  const goToCheckout = (priceId: string) => {
    trackCta("pricing.checkout", { priceId });
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    navigate(`/checkout?price=${priceId}`);
  };

  return (
    <section id="tarieven" className="section-padding bg-card">
      <div className="container-tight">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-14">
          <p className="text-primary font-heading text-xs tracking-[0.35em] mb-3">{t("pricing.tag")}</p>
          <h2 className="text-3xl md:text-5xl lg:text-6xl text-foreground mb-5">{t("pricing.title")}</h2>
          <p className="text-muted-foreground max-w-xl mx-auto text-base">{t("pricing.desc")}</p>
        </motion.div>

        {/* Monthly */}
        <div className="mb-20" ref={checkoutImpressionRef}>
          <h3 className="text-xl font-heading text-foreground mb-8">{t("pricing.monthly")}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {monthly.map((opt) => (
              <motion.div key={opt.name} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                className={`relative p-7 rounded-sm border transition-all flex flex-col ${
                  opt.popular ? "border-primary bg-primary/5 shadow-glow scale-[1.02]" : "border-border bg-background hover:border-primary/30 hover:shadow-card"
                }`}
              >
                {opt.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-primary text-primary-foreground text-xs font-heading tracking-wider rounded-sm flex items-center gap-1">
                    <Star size={10} /> {t("pricing.popular")}
                  </div>
                )}
                <p className="text-xs text-muted-foreground font-heading tracking-wider mb-1">{opt.name}</p>
                <p className="text-sm text-foreground mb-5">{t(opt.freqKey)}</p>
                <p className="text-4xl font-heading text-foreground mb-1">€{opt.price}<span className="text-sm text-muted-foreground">,-</span></p>
                <p className="text-xs text-muted-foreground mb-6">{t("pricing.per4w")}</p>
                <button
                  type="button"
                  onClick={() => goToCheckout(opt.priceId)}
                  className={`mt-auto block w-full text-center py-3 font-heading text-sm tracking-wider transition-all ${
                    opt.popular ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-red" : "border border-border text-foreground hover:border-primary hover:text-primary"
                  }`}
                >
                  {t("pricing.choose")}
                </button>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Packs */}
        <div className="mb-20">
          <h3 className="text-xl font-heading text-foreground mb-8">{t("pricing.packs")}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {packs.map((pack) => (
              <div key={pack.name} className="p-7 rounded-sm border border-border bg-background hover:border-primary/30 transition-all hover:shadow-card flex flex-col">
                <p className="font-heading text-foreground text-lg mb-1">{pack.name}</p>
                <p className="text-xs text-muted-foreground mb-5">{pack.sessions} {t("pricing.sessions")}</p>
                <p className="text-3xl font-heading text-foreground mb-1">€{pack.price}</p>
                <p className="text-xs text-muted-foreground mb-6">€{pack.perSession} {t("pricing.perSession")}</p>
                <button
                  type="button"
                  onClick={() => goToCheckout(pack.priceId)}
                  className="mt-auto block w-full text-center py-3 border border-border text-foreground hover:border-primary hover:text-primary font-heading text-sm tracking-wider transition-all"
                >
                  {t("pricing.choose")}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Small group */}
        <div className="mb-20">
          <h3 className="text-xl font-heading text-foreground mb-8">{t("pricing.sg_title")}</h3>
          <div className="flex flex-wrap gap-3 mb-8">
            {sgFrequencyKeys.map((key, idx) => (
              <button key={key} onClick={() => setSgFreq(idx)}
                className={`px-5 py-2.5 font-heading text-xs tracking-wider rounded-sm transition-all ${
                  sgFreq === idx ? "bg-primary text-primary-foreground shadow-red" : "border border-border text-muted-foreground hover:border-primary hover:text-foreground"
                }`}
              >{t(key)}</button>
            ))}
          </div>
          <div className="grid grid-cols-1 max-w-md mx-auto gap-5">
            {sgPricePerSession.map((sg) => {
              const total = sg.price * currentFreq.sessions;
              const priceId = getPriceId(sg.people, currentFreq.timesPerWeek);
              return (
                <motion.div key={`${sg.people}-${currentFreq.timesPerWeek}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className="p-7 rounded-sm border border-border bg-background hover:border-primary/30 transition-all hover:shadow-card text-center flex flex-col"
                >
                  <p className="font-heading text-foreground text-lg mb-1">{sg.people} {t("pricing.people")}</p>
                  <p className="text-xs text-muted-foreground mb-4">{currentFreq.sessions} {t("pricing.sessions")} ({t(sgFrequencyKeys[sgFreq])})</p>
                  <p className="text-3xl font-heading text-foreground">€{formatPrice(total)}</p>
                  <p className="text-xs text-muted-foreground mt-1 mb-1">{t("pricing.perPerson4w")}</p>
                  <p className="text-xs text-muted-foreground mb-4">€{sg.price},00 {t("pricing.perSession")}</p>
                  <p className="text-[11px] text-muted-foreground/70 italic mb-6">{t("pricing.sg_note")}</p>
                  <button
                    type="button"
                    onClick={() => goToCheckout(priceId)}
                    className="mt-auto block w-full text-center py-3 border border-border text-foreground hover:border-primary hover:text-primary font-heading text-sm tracking-wider transition-all"
                  >
                    {t("pricing.choose")}
                  </button>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Included */}
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="p-8 md:p-10 rounded-sm border border-primary/20 bg-primary/5 mb-14"
        >
          <h3 className="text-lg font-heading text-foreground mb-6">{t("pricing.included_title")}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {included.map((item) => (
              <div key={item} className="flex items-center gap-3">
                <Check className="text-primary shrink-0" size={16} />
                <span className="text-sm text-foreground">{item}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center">
          <p className="text-lg text-foreground font-heading mb-5">{t("pricing.ready")}</p>
          <Link
            to="/#intake"
            ref={intakeCtaRef}
            onClick={() => {
              trackCta("pricing.intake_cta");
              document.getElementById("intake")?.scrollIntoView({ behavior: "smooth" });
            }}
            className="inline-flex items-center gap-3 px-10 py-4 bg-primary text-primary-foreground font-heading text-sm tracking-wider hover:bg-primary/90 transition-all shadow-red hover:shadow-glow"
          >
            {t("pricing.ready_cta")} <ArrowRight size={16} />
          </Link>
        </motion.div>
      </div>
    </section>
  );
};

export default PricingSection;
