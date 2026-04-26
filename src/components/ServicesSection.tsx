import { motion } from "framer-motion";
import { User, Users, TreePine, Apple, ClipboardList, MessageCircle, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import coachingSession from "@/assets/coaching-session.jpg";
import gymRacks from "@/assets/gym-racks.jpg";
import bootcampOutdoor from "@/assets/bootcamp-outdoor.jpg";
import gymDumbbells from "@/assets/gym-dumbbells.jpg";
import mealPrep from "@/assets/meal-prep.png";
import { useLanguage } from "@/i18n/LanguageContext";

const ServicesSection = () => {
  const { t } = useLanguage();

  const services = [
    { icon: User, title: t("services.pt.title"), description: t("services.pt.desc"), image: coachingSession },
    { icon: Users, title: t("services.sg.title"), description: t("services.sg.desc"), image: gymRacks },
    { icon: TreePine, title: t("services.bc.title"), description: t("services.bc.desc"), image: bootcampOutdoor },
    { icon: Apple, title: t("services.food.title"), description: t("services.food.desc"), image: mealPrep },
    { icon: ClipboardList, title: t("services.schema.title"), description: t("services.schema.desc"), image: null },
    { icon: MessageCircle, title: t("services.wa.title"), description: t("services.wa.desc"), image: null },
  ];

  return (
    <section id="diensten" className="section-padding">
      <div className="container-tight">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-14">
          <p className="text-primary font-heading text-xs tracking-[0.35em] mb-3">{t("services.tag")}</p>
          <h2 className="text-3xl md:text-5xl text-foreground mb-5">{t("services.title")}</h2>
          <p className="text-muted-foreground max-w-xl mx-auto text-base">{t("services.desc")}</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {services.map((service, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}
              className="bg-card border border-border rounded-sm overflow-hidden group hover:border-primary/30 transition-all hover:shadow-card"
            >
              {service.image && (
                <div className="overflow-hidden relative">
                  <img src={service.image} alt={service.title} className="w-full h-auto object-contain group-hover:scale-105 transition-transform duration-700" loading="lazy" width={800} height={400} />
                  <div className="absolute inset-0 bg-gradient-to-t from-card/60 to-transparent" />
                </div>
              )}
              <div className="p-7">
                <service.icon className="text-primary mb-4" size={24} />
                <h3 className="text-lg font-heading text-foreground mb-3">{service.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">{service.description}</p>
                <Link to="/#intake" onClick={() => document.getElementById("intake")?.scrollIntoView({ behavior: "smooth" })}
                  className="inline-flex items-center gap-2 text-xs text-primary font-heading tracking-wider hover:gap-3 transition-all"
                >
                  {t("services.plan_intake")} <ArrowRight size={14} />
                </Link>
              </div>
            </motion.div>
          ))}
        </div>

        <p className="text-center text-sm text-muted-foreground mt-10">{t("services.location")}</p>
      </div>
    </section>
  );
};

export default ServicesSection;
