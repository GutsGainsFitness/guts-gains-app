import { motion } from "framer-motion";
import { Shield, Lock, Sliders, Apple, Crosshair, TrendingUp } from "lucide-react";
import gymBenches from "@/assets/gym-benches.jpg";
import { useLanguage } from "@/i18n/LanguageContext";

const WhySection = () => {
  const { t } = useLanguage();

  const points = [
    { icon: Shield, title: t("why.p1.title"), desc: t("why.p1.desc") },
    { icon: Lock, title: t("why.p2.title"), desc: t("why.p2.desc") },
    { icon: Sliders, title: t("why.p3.title"), desc: t("why.p3.desc") },
    { icon: Apple, title: t("why.p4.title"), desc: t("why.p4.desc") },
    { icon: Crosshair, title: t("why.p5.title"), desc: t("why.p5.desc") },
    { icon: TrendingUp, title: t("why.p6.title"), desc: t("why.p6.desc") },
  ];

  return (
    <section className="relative section-padding overflow-hidden">
      <div className="absolute inset-0">
        <img src={gymBenches} alt="" className="w-full h-full object-cover opacity-[0.06]" aria-hidden="true" />
      </div>
      <div className="relative container-tight">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-14">
          <p className="text-primary font-heading text-xs tracking-[0.35em] mb-3">{t("why.tag")}</p>
          <h2 className="text-3xl md:text-5xl text-foreground">{t("why.title")}</h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {points.map((point, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }} className="text-center group">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-sm bg-primary/10 mb-5 group-hover:bg-primary/20 group-hover:scale-110 transition-all duration-300">
                <point.icon className="text-primary" size={24} />
              </div>
              <h3 className="font-heading text-foreground mb-3 text-lg">{point.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{point.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WhySection;
