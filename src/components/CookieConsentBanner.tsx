import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Cookie, X } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { recordMarketingConsent } from "@/lib/marketingConsent";
import { toast } from "sonner";

const STORAGE_KEY = "gg-cookie-consent-v1";

interface ConsentState {
  functional: true; // always true; required for the app to work
  marketing: boolean;
  decided_at: string;
  policy_version: string;
}

/**
 * AVG/GDPR-compliant cookie + marketing-consent banner.
 *
 * Two important legal points baked in:
 *   1. The marketing-email checkbox is UNCHECKED by default — pre-ticked
 *      boxes are explicitly forbidden by the AP (Autoriteit
 *      Persoonsgegevens) and the EU ePrivacy directive.
 *   2. "Reject all" is just as easy to click as "Accept all". Hiding the
 *      reject option behind a deeper menu is a known dark pattern that
 *      gets fined.
 *
 * The marketing consent is also written to the `marketing_consents`
 * table when the visitor provides an email — that's our legal proof.
 * For purely anonymous visitors we store the choice in localStorage
 * only (no email = no marketing list to add to anyway).
 */
const CookieConsentBanner = () => {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        // Show after a tiny delay so the page has time to render
        const t = setTimeout(() => setOpen(true), 800);
        return () => clearTimeout(t);
      }
    } catch {
      setOpen(true);
    }
  }, []);

  const persist = (state: ConsentState) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // localStorage might be blocked (private mode); ignore — banner
      // will reappear on next visit which is acceptable behaviour.
    }
  };

  const recordIfPossible = async (granted: boolean) => {
    // We can only record marketing consent server-side when we know an
    // email. For anonymous visitors we rely on localStorage; the moment
    // they sign up or log in, their account-level consent will take over.
    if (!user?.email) return;
    await recordMarketingConsent({
      email: user.email,
      granted,
      source: "cookie_banner",
      language,
      userId: user.id,
    });
  };

  const handleAcceptAll = async () => {
    persist({
      functional: true,
      marketing: true,
      decided_at: new Date().toISOString(),
      policy_version: "v1-2025-04",
    });
    setOpen(false);
    await recordIfPossible(true);
    toast.success(t("cookies.toast.saved"));
  };

  const handleRejectAll = async () => {
    persist({
      functional: true,
      marketing: false,
      decided_at: new Date().toISOString(),
      policy_version: "v1-2025-04",
    });
    setOpen(false);
    await recordIfPossible(false);
  };

  const handleSavePreferences = async () => {
    persist({
      functional: true,
      marketing,
      decided_at: new Date().toISOString(),
      policy_version: "v1-2025-04",
    });
    setOpen(false);
    await recordIfPossible(marketing);
    toast.success(t("cookies.toast.saved"));
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="fixed bottom-0 left-0 right-0 z-[60] p-3 md:p-5"
        >
          <div className="container-tight">
            <div className="bg-card border-2 border-primary/30 rounded-sm shadow-2xl p-5 md:p-6">
              <div className="flex items-start gap-3 mb-4">
                <Cookie className="text-primary mt-0.5 shrink-0" size={20} />
                <div className="flex-1">
                  <h2 className="font-heading text-sm tracking-wider text-foreground mb-1">
                    {t("cookies.title")}
                  </h2>
                  <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
                    {t("cookies.intro")}{" "}
                    <Link
                      to="/privacy"
                      className="text-primary hover:underline whitespace-nowrap"
                    >
                      {t("cookies.read_policy")}
                    </Link>
                    .
                  </p>
                </div>
                <button
                  onClick={handleRejectAll}
                  aria-label={t("cookies.close")}
                  className="text-muted-foreground hover:text-foreground transition-colors -mt-1 -mr-1 p-1"
                >
                  <X size={18} />
                </button>
              </div>

              {showDetails && (
                <div className="space-y-3 mb-4 pt-3 border-t border-border">
                  <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-sm">
                    <input
                      type="checkbox"
                      checked
                      disabled
                      className="mt-0.5 accent-primary"
                    />
                    <div className="flex-1">
                      <p className="text-xs font-heading tracking-wider text-foreground">
                        {t("cookies.functional.title")}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {t("cookies.functional.desc")}
                      </p>
                    </div>
                    <span className="text-[10px] text-muted-foreground font-heading tracking-wider">
                      {t("cookies.required")}
                    </span>
                  </div>

                  <label className="flex items-start gap-3 p-3 bg-muted/30 rounded-sm cursor-pointer hover:bg-muted/50 transition-colors">
                    <input
                      type="checkbox"
                      checked={marketing}
                      onChange={(e) => setMarketing(e.target.checked)}
                      className="mt-0.5 accent-primary cursor-pointer"
                    />
                    <div className="flex-1">
                      <p className="text-xs font-heading tracking-wider text-foreground">
                        {t("cookies.marketing.title")}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {t("cookies.marketing.desc")}
                      </p>
                    </div>
                  </label>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  onClick={handleRejectAll}
                  className="flex-1 px-4 py-3 border border-border text-foreground hover:bg-muted/50 transition-colors font-heading text-xs tracking-wider rounded-sm"
                >
                  {t("cookies.reject_all")}
                </button>
                {showDetails ? (
                  <button
                    onClick={handleSavePreferences}
                    className="flex-1 px-4 py-3 border-2 border-primary text-primary hover:bg-primary/10 transition-colors font-heading text-xs tracking-wider rounded-sm"
                  >
                    {t("cookies.save")}
                  </button>
                ) : (
                  <button
                    onClick={() => setShowDetails(true)}
                    className="flex-1 px-4 py-3 border border-border text-foreground hover:bg-muted/50 transition-colors font-heading text-xs tracking-wider rounded-sm"
                  >
                    {t("cookies.customize")}
                  </button>
                )}
                <button
                  onClick={handleAcceptAll}
                  className="flex-1 px-4 py-3 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-heading text-xs tracking-wider rounded-sm shadow-red"
                >
                  {t("cookies.accept_all")}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CookieConsentBanner;
