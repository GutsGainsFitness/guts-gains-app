import { Link } from "react-router-dom";
import { Instagram, Linkedin, Phone, Mail, MapPin } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

const Footer = () => {
  const { t } = useLanguage();

  const navItems = [
    { label: t("nav.about"), href: "/#over-mij" },
    { label: t("nav.services"), href: "/#diensten" },
    { label: t("nav.pricing"), href: "/#tarieven" },
    { label: t("nav.reviews"), href: "/#reviews" },
    { label: t("nav.faq"), href: "/#faq" },
    { label: t("nav.contact"), href: "/#contact" },
  ];

  return (
    <footer className="bg-card border-t border-border">
      <div className="container-tight section-padding pb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-14 mb-14">
          <div>
            <h3 className="text-2xl mb-5 text-foreground font-heading tracking-wider">
              GUTS <span className="text-primary">&</span> GAINS
            </h3>
            <p className="text-muted-foreground text-sm leading-relaxed">{t("footer.desc")}</p>
          </div>
          <div>
            <h4 className="text-sm font-heading tracking-wider mb-5 text-foreground">{t("footer.nav")}</h4>
            <div className="flex flex-col gap-2.5">
              {navItems.map((item) => (
                <Link key={item.href} to={item.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">{item.label}</Link>
              ))}
              <Link to="/algemene-voorwaarden" className="text-sm text-muted-foreground hover:text-foreground transition-colors">{t("footer.terms")}</Link>
              <Link to="/privacy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">{t("footer.privacy")}</Link>
              <Link to="/account-verwijderen" className="text-sm text-muted-foreground hover:text-foreground transition-colors">{t("footer.delete_account")}</Link>
            </div>
          </div>
          <div>
            <h4 className="text-sm font-heading tracking-wider mb-5 text-foreground">{t("footer.contact")}</h4>
            <div className="flex flex-col gap-3.5 text-sm text-muted-foreground">
              <a href="tel:0652887988" className="flex items-center gap-3 hover:text-foreground transition-colors"><Phone size={15} /> 06 528 879 88</a>
              <a href="mailto:gutsgainsfitness@gmail.com" className="flex items-center gap-3 hover:text-foreground transition-colors"><Mail size={15} /> gutsgainsfitness@gmail.com</a>
              <span className="flex items-center gap-3"><MapPin size={15} /> UpShape, Hofwijckstraat 351, Den Haag</span>
              <div className="flex gap-5 mt-3">
                <a href="https://instagram.com/gutsngainsfitness" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors"><Instagram size={20} /></a>
                <a href="https://www.linkedin.com/in/pablo-ramos-6109912b7/" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors"><Linkedin size={20} /></a>
              </div>
            </div>
          </div>
        </div>
        <div className="border-t border-border pt-7 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Guts & Gains Fitness. {t("footer.rights")}
        </div>
      </div>
    </footer>
  );
};

export default Footer;
