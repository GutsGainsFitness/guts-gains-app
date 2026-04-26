import { motion } from "framer-motion";
import { Award, Target, Clock, Shield } from "lucide-react";
import gymInterior from "@/assets/gym-interior.jpg";
import coachingSession from "@/assets/coaching-session.jpg";
import gymDumbbells from "@/assets/gym-dumbbells.jpg";
import gymEquipment from "@/assets/gym-equipment.jpg";
import gymRowers from "@/assets/gym-rowers.jpg";
import gymRacks from "@/assets/gym-racks.jpg";
import gymBenches from "@/assets/gym-benches.jpg";
import gymFreeweights from "@/assets/gym-freeweights.jpg";
import gymBenchPress from "@/assets/gym-bench-press.jpg";
import gymPlatforms from "@/assets/gym-platforms.jpg";
import pabloDumbbells from "@/assets/pablo-dumbbells.jpg";
import pabloUpshape from "@/assets/pablo-upshape.jpg";
import pabloSeated from "@/assets/pablo-seated.jpg";
import { useLanguage } from "@/i18n/LanguageContext";

const aboutImages = [
  { src: coachingSession, alt: "Coaching sessie bij Guts & Gains" },
  { src: pabloDumbbells, alt: "Pablo bij de dumbbells" },
  { src: pabloUpshape, alt: "Pablo bij UpShape" },
  { src: pabloSeated, alt: "Pablo Ramos - Personal Trainer" },
];

const gymImages = [
  { src: gymInterior, alt: "Gym interieur UpShape Den Haag" },
  { src: gymDumbbells, alt: "Dumbbells en equipment" },
  { src: gymEquipment, alt: "Professioneel trainingsmateriaal" },
  { src: gymRowers, alt: "Concept2 roeiers" },
  { src: gymRacks, alt: "Squat racks" },
  { src: gymBenches, alt: "Trainingsbanken" },
  { src: gymFreeweights, alt: "Vrije gewichten" },
  { src: gymBenchPress, alt: "Bench press station" },
  { src: gymPlatforms, alt: "Deadlift platforms" },
];

const AboutSection = () => {
  const { t } = useLanguage();

  const badges = [
    { icon: Clock, label: t("about.exp") },
    { icon: Award, label: t("about.cert") },
    { icon: Target, label: t("about.result") },
    { icon: Shield, label: t("about.personal") },
  ];

  return (
    <section id="over-mij" className="section-padding bg-card">
      <div className="container-tight">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
          <p className="text-primary font-heading text-xs tracking-[0.35em] mb-3">{t("about.tag")}</p>
          <h2 className="text-3xl md:text-5xl lg:text-6xl text-foreground mb-10">{t("about.name")}</h2>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 items-center mb-16">
          <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
            <p className="text-muted-foreground leading-relaxed mb-6 text-base">{t("about.p1")}</p>
            <p className="text-muted-foreground leading-relaxed mb-10 text-base">{t("about.p2")}</p>
            <div className="grid grid-cols-2 gap-5">
              {badges.map((item) => (
                <div key={item.label} className="flex items-center gap-3 py-3 px-4 rounded-sm bg-background border border-border">
                  <item.icon className="text-primary shrink-0" size={20} />
                  <span className="text-sm text-foreground">{item.label}</span>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.2 }} className="grid grid-cols-2 gap-3">
            {aboutImages.map((img, i) => (
              <div key={i} className="overflow-hidden rounded-sm">
                <img src={img.src} alt={img.alt} className="w-full h-auto object-contain hover:scale-105 transition-transform duration-500" loading="lazy" width={400} height={400} />
              </div>
            ))}
          </motion.div>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
          <p className="text-primary font-heading text-xs tracking-[0.35em] mb-4">{t("about.gym_tag")}</p>
          <h3 className="text-2xl md:text-3xl text-foreground mb-8">{t("about.gym_name")}</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {gymImages.map((img, i) => (
              <div key={i} className="overflow-hidden rounded-sm aspect-square">
                <img src={img.src} alt={img.alt} className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" loading="lazy" width={400} height={400} />
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default AboutSection;
