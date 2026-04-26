import { useEffect, useState } from "react";
import { Apple, X } from "lucide-react";
import { isIOS } from "@/lib/heartRate";
import { useLanguage } from "@/i18n/LanguageContext";

/**
 * Subtle, dismissable banner shown ONLY on iOS devices (iPhone / iPad).
 *
 * Why: Apple blocks Web Bluetooth in every iOS browser, so iPhone members
 * cannot pair their HR strap or sync an Apple Watch through the PWA.
 * The native Android app ships first; the iOS app follows. This banner
 * sets that expectation up-front so iPhone visitors / members understand
 * why some features are missing today and that a real native app is
 * coming.
 *
 * Variants:
 *  - `member`: shown inside the /app/* shell, lighter framing
 *  - `public`: shown above the public Navbar, paired with the existing
 *    promo banner styling so it doesn't feel like a separate system
 *
 * Dismissal is persisted in localStorage so we don't nag returning users.
 */
type Variant = "member" | "public";

const STORAGE_KEY: Record<Variant, string> = {
  member: "gg-ios-app-banner-member-dismissed",
  public: "gg-ios-app-banner-public-dismissed",
};

interface Props {
  variant?: Variant;
}

const IOSAppComingBanner = ({ variant = "member" }: Props) => {
  const { t } = useLanguage();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isIOS()) return;
    const dismissed = localStorage.getItem(STORAGE_KEY[variant]);
    if (!dismissed) setVisible(true);
  }, [variant]);

  if (!visible) return null;

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY[variant], "1");
    setVisible(false);
  };

  return (
    <div className="relative bg-gradient-to-r from-primary/10 via-primary/20 to-primary/10 border-b border-primary/30">
      <div className="container-tight px-4 md:px-8 py-2.5 flex items-center justify-center gap-3 text-center">
        <div className="flex items-center gap-2 text-[11px] md:text-xs font-heading tracking-[0.15em] text-foreground">
          <Apple size={14} className="text-primary shrink-0" />
          <span className="uppercase">{t("ios_banner.title")}</span>
          <span className="hidden md:inline text-muted-foreground font-body normal-case tracking-normal">
            {t("ios_banner.subtitle")}
          </span>
        </div>
        <button
          onClick={dismiss}
          className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors"
          aria-label={t("ios_banner.close")}
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
};

export default IOSAppComingBanner;
