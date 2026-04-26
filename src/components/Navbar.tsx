import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, User } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import logoImage from "@/assets/logo-gutsandgains.png";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import AppPromoBanner from "@/components/AppPromoBanner";
import IOSAppComingBanner from "@/components/IOSAppComingBanner";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState<string>("");
  const location = useLocation();
  const { t } = useLanguage();
  const { user } = useAuth();

  const navItems = [
    { label: t("nav.home"), href: "/" },
    { label: t("nav.about"), href: "/#over-mij" },
    { label: t("nav.services"), href: "/#diensten" },
    { label: t("nav.app"), href: "/#app" },
    { label: t("nav.reviews"), href: "/#reviews" },
    { label: t("nav.pricing"), href: "/#tarieven" },
    { label: t("nav.blog"), href: "/blog" },
    { label: t("nav.booking"), href: "/boeken" },
    { label: t("nav.faq"), href: "/#faq" },
    { label: t("nav.contact"), href: "/#contact" },
  ];

  // Determine if a nav item is currently active (route or visible section)
  const isItemActive = (href: string): boolean => {
    if (href === "/") {
      return location.pathname === "/" && activeSection === "";
    }
    if (href.startsWith("/#")) {
      const id = href.replace("/#", "");
      return location.pathname === "/" && activeSection === id;
    }
    // Plain route: match exact or nested (e.g. /blog/post-1 → highlight Blog)
    return location.pathname === href || location.pathname.startsWith(href + "/");
  };


  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Track which section is in view (only on the home page)
  useEffect(() => {
    if (location.pathname !== "/") {
      setActiveSection("");
      return;
    }

    const sectionIds = ["over-mij", "diensten", "app", "tarieven", "reviews", "faq", "contact", "intake"];
    const elements = sectionIds
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);

    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Pick the entry closest to the top of the viewport that is intersecting
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) {
          setActiveSection(visible[0].target.id);
        } else {
          // None intersecting → if scrolled near top, clear (Home active)
          if (window.scrollY < 200) setActiveSection("");
        }
      },
      { rootMargin: "-30% 0px -55% 0px", threshold: 0 }
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [location.pathname]);

  const handleNavClick = (href: string) => {
    setIsOpen(false);
    if (href.startsWith("/#")) {
      const id = href.replace("/#", "");
      if (location.pathname === "/") {
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
      } else {
        window.location.href = href;
      }
    }
  };

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? "bg-background/95 backdrop-blur-md shadow-card" : "bg-background/80 backdrop-blur-sm"} border-b border-border/50`}>
      <IOSAppComingBanner variant="public" />
      <AppPromoBanner />
      <div className="container-tight flex items-center justify-between h-20 md:h-24 px-4 md:px-8">
        <Link to="/" className="flex items-center pl-1 md:pl-2 mr-3 md:mr-6">
          <img
            src={logoImage}
            alt="Guts & Gains Fitness"
            className="h-14 w-auto drop-shadow-[0_0_3px_rgba(255,255,255,0.9)]"
            loading="eager"
            fetchPriority="high"
          />
        </Link>

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-5 lg:gap-8">
          {navItems.map((item) => {
            const active = isItemActive(item.href);
            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => handleNavClick(item.href)}
                className={`relative text-xs lg:text-sm font-body transition-colors whitespace-nowrap ${
                  active
                    ? "text-primary after:absolute after:left-0 after:right-0 after:-bottom-1 after:h-px after:bg-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
          <LanguageSwitcher />
          {user ? (
            <Link
              to="/app"
              className="flex items-center gap-1.5 text-xs lg:text-sm font-body text-muted-foreground hover:text-primary transition-colors whitespace-nowrap"
              title={t("nav.account_title")}
            >
              <User size={14} />
              <span className="hidden lg:inline">{t("nav.account")}</span>
            </Link>
          ) : (
            <Link
              to="/app/login"
              className="flex items-center gap-1.5 px-3 lg:px-4 py-1.5 lg:py-2 border border-primary/60 text-primary hover:bg-primary hover:text-primary-foreground text-[11px] lg:text-xs font-heading tracking-wider rounded-sm transition-all whitespace-nowrap"
              title={t("nav.free_account_title")}
            >
              <User size={13} />
              <span>{t("nav.free_account")}</span>
            </Link>
          )}
          <Link
            to="/#intake"
            onClick={() => handleNavClick("/#intake")}
            className="ml-2 px-4 lg:px-6 py-2 lg:py-2.5 bg-primary text-primary-foreground text-xs lg:text-sm font-heading tracking-wider hover:bg-primary/90 transition-all shadow-red hover:shadow-glow whitespace-nowrap"
          >
            {t("nav.cta")}
          </Link>
        </div>

        {/* Mobile toggle */}
        <div className="md:hidden flex items-center gap-3">
          <Link
            to={user ? "/app" : "/app/login"}
            className="text-foreground p-2"
            aria-label={t("nav.account")}
          >
            <User size={20} />
          </Link>
          <LanguageSwitcher />
          <button
            className="text-foreground p-2"
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Menu"
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-background/98 backdrop-blur-md border-b border-border overflow-hidden"
          >
            <div className="px-4 py-6 flex flex-col gap-4">
              {navItems.map((item) => {
                const active = isItemActive(item.href);
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    onClick={() => handleNavClick(item.href)}
                    className={`relative inline-flex w-fit text-sm font-body py-2 transition-colors ${
                      active
                        ? "text-primary font-medium after:absolute after:left-0 after:right-0 after:-bottom-0.5 after:h-px after:bg-primary"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
              <Link
                to="/#intake"
                onClick={() => handleNavClick("/#intake")}
                className="mt-2 px-5 py-3.5 bg-primary text-primary-foreground text-sm font-heading tracking-wider text-center shadow-red"
              >
                {t("nav.cta")}
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
