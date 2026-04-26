import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/i18n/LanguageContext";
import { trackCta, trackCtaImpression } from "@/lib/ctaTracking";

const STORAGE_KEY = "gg-app-banner-dismissed";

const AppPromoBanner = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (user) return;
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (!dismissed) setVisible(true);
  }, [user]);

  useEffect(() => {
    if (visible && !user) {
      trackCtaImpression("promo.app_signup");
    }
  }, [visible, user]);

  if (!visible || user) return null;

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
  };

  return (
    <div className="relative bg-gradient-to-r from-primary/15 via-primary/25 to-primary/15 border-b border-primary/30">
      <div className="container-tight px-4 md:px-8 py-2.5 flex items-center justify-center gap-3 text-center">
        <Link
          to="/app/login"
          onClick={() => trackCta("promo.app_signup")}
          className="flex items-center gap-2 text-[11px] md:text-xs font-heading tracking-[0.2em] text-foreground hover:text-primary transition-colors group"
        >
          <span className="hidden sm:inline text-primary">●</span>
          <span>{t("banner.title")}</span>
          <span className="hidden md:inline text-muted-foreground font-body normal-case tracking-normal">
            {t("banner.subtitle")}
          </span>
          <ArrowRight
            size={14}
            className="text-primary transition-transform group-hover:translate-x-1"
          />
        </Link>
        <button
          onClick={dismiss}
          className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors"
          aria-label={t("banner.close")}
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
};

export default AppPromoBanner;
