import { useState } from "react";
import { motion } from "framer-motion";
import { Phone, Mail, MapPin, Instagram, Linkedin } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import ContactFormDialog from "@/components/ContactFormDialog";

const ContactSection = () => {
  const { t } = useLanguage();
  const [formOpen, setFormOpen] = useState(false);

  return (
    <section id="contact" className="section-padding">
      <div className="container-tight">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-14">
          <p className="text-primary font-heading text-xs tracking-[0.35em] mb-3">{t("contact.tag")}</p>
          <h2 className="text-3xl md:text-5xl text-foreground">{t("contact.title")}</h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-12">
          <a href="tel:0652887988" className="flex flex-col items-center p-9 rounded-sm border border-border bg-card hover:border-primary/30 hover:shadow-card transition-all text-center group">
            <Phone className="text-primary mb-5 group-hover:scale-110 transition-transform" size={32} />
            <p className="font-heading text-foreground mb-2 text-lg">{t("contact.call")}</p>
            <p className="text-sm text-muted-foreground">06 528 879 88</p>
          </a>
          <button
            type="button"
            onClick={() => setFormOpen(true)}
            className="flex flex-col items-center p-9 rounded-sm border border-border bg-card hover:border-primary/30 hover:shadow-card transition-all text-center group cursor-pointer"
          >
            <Mail className="text-primary mb-5 group-hover:scale-110 transition-transform" size={32} />
            <p className="font-heading text-foreground mb-2 text-lg">{t("contact.mail")}</p>
            <p className="text-sm text-muted-foreground">Stuur direct een bericht</p>
          </button>
          <a href="https://instagram.com/gutsngainsfitness" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center p-9 rounded-sm border border-border bg-card hover:border-primary/30 hover:shadow-card transition-all text-center group">
            <Instagram className="text-primary mb-5 group-hover:scale-110 transition-transform" size={32} />
            <p className="font-heading text-foreground mb-2 text-lg">{t("contact.instagram")}</p>
            <p className="text-sm text-muted-foreground">@gutsngainsfitness</p>
          </a>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="p-9 rounded-sm border border-border bg-card">
            <MapPin className="text-primary mb-5" size={28} />
            <h3 className="font-heading text-foreground mb-3 text-lg">{t("contact.location_title")}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              UpShape<br />Hofwijckstraat 351<br />2515 RN Den Haag
            </p>
          </div>
          <div className="p-9 rounded-sm border border-border bg-card">
            <Linkedin className="text-primary mb-5" size={28} />
            <h3 className="font-heading text-foreground mb-3 text-lg">{t("contact.social_title")}</h3>
            <div className="space-y-2.5 text-sm text-muted-foreground">
              <a href="https://instagram.com/gutsngainsfitness" target="_blank" rel="noopener noreferrer" className="block hover:text-foreground transition-colors">Instagram: @gutsngainsfitness</a>
              <a href="https://instagram.com/Pablo__1997" target="_blank" rel="noopener noreferrer" className="block hover:text-foreground transition-colors">Instagram: @Pablo__1997</a>
              <a href="https://www.linkedin.com/in/pablo-ramos-6109912b7/" target="_blank" rel="noopener noreferrer" className="block hover:text-foreground transition-colors">LinkedIn: Pablo Ramos</a>
            </div>
          </div>
        </div>
      </div>

      <ContactFormDialog open={formOpen} onOpenChange={setFormOpen} />
    </section>
  );
};

export default ContactSection;

