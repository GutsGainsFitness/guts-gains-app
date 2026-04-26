import { X, Watch, HeartPulse, Smartphone, AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { HR_PROVIDERS } from "@/lib/heartRate/registry";
import type { HRProviderId } from "@/lib/heartRate/types";

/**
 * Compatibility helper modal for the heart rate / smartwatch pairing flow.
 *
 * Web Bluetooth (and our native Capacitor BLE later) only see devices that
 * advertise the standard Heart Rate Service (UUID 0x180D). Most dedicated
 * straps do this out-of-the-box; many smartwatches (Samsung, Apple, some
 * Fitbits) do NOT — they keep HR locked inside their proprietary ecosystem.
 *
 * Each brand row optionally maps to a real `HRProvider` (see
 * `src/lib/heartRate/registry.ts`). Today only the BLE provider is wired up;
 * the others render a "Coming soon" pill. The day we ship the Apple Health
 * or Garmin Connect provider, just flip its `availability()` to `true` and
 * this modal automatically gains a working "Connect" button — no UI changes.
 */
interface Props {
  open: boolean;
  onClose: () => void;
}

type Section = {
  icon: typeof HeartPulse;
  titleKey: string;
  descKey: string;
  /** When set, the row reflects this provider's live availability. */
  providerId?: HRProviderId;
  /** Fallback when `providerId` is absent: brand works via BLE strap pathway. */
  staticWorks?: boolean;
};

const HRCompatibilityModal = ({ open, onClose }: Props) => {
  const { t } = useLanguage();
  if (!open) return null;

  const sections: Section[] = [
    // Brand rows. `providerId` links the row to a real provider so we can
    // render its live availability; `staticWorks: true` is for brands that
    // pair via the generic BLE provider (no dedicated provider needed).
    { icon: HeartPulse, titleKey: "app.interval.hr_compat.straps_title", descKey: "app.interval.hr_compat.straps_desc", providerId: "web-bluetooth" },
    { icon: Watch, titleKey: "app.interval.hr_compat.garmin_title", descKey: "app.interval.hr_compat.garmin_desc", providerId: "garmin-connect", staticWorks: true },
    { icon: Watch, titleKey: "app.interval.hr_compat.polar_title", descKey: "app.interval.hr_compat.polar_desc", providerId: "polar-flow", staticWorks: true },
    { icon: Watch, titleKey: "app.interval.hr_compat.samsung_title", descKey: "app.interval.hr_compat.samsung_desc", providerId: "samsung-health" },
    { icon: Watch, titleKey: "app.interval.hr_compat.apple_title", descKey: "app.interval.hr_compat.apple_desc", providerId: "apple-health" },
    { icon: Watch, titleKey: "app.interval.hr_compat.fitbit_title", descKey: "app.interval.hr_compat.fitbit_desc", staticWorks: false },
    { icon: Smartphone, titleKey: "app.interval.hr_compat.wearos_title", descKey: "app.interval.hr_compat.wearos_desc", providerId: "health-connect", staticWorks: true },
  ];

  const providerStatus = (s: Section): "live" | "soon" | "works-via-ble" | "no" => {
    if (s.providerId) {
      const p = HR_PROVIDERS.find((x) => x.id === s.providerId);
      if (p?.availability().available) return "live";
      if (s.staticWorks) return "works-via-ble";
      return "soon";
    }
    return s.staticWorks ? "works-via-ble" : "no";
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-background/90 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full md:max-w-2xl max-h-[90vh] overflow-y-auto bg-card border border-border md:rounded-sm rounded-t-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-card border-b border-border flex items-center justify-between px-5 py-4 z-10">
          <h2 className="font-heading text-sm tracking-[0.2em] text-foreground">
            {t("app.interval.hr_compat.title")}
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-muted-foreground hover:text-foreground transition-colors"
            aria-label={t("app.interval.hr_compat.close")}
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <p className="text-xs text-muted-foreground leading-relaxed">
            {t("app.interval.hr_compat.intro")}
          </p>

          <div className="space-y-2">
            {sections.map((s) => {
              const Icon = s.icon;
              const status = providerStatus(s);
              const positive = status === "live" || status === "works-via-ble";
              return (
                <div
                  key={s.titleKey}
                  className="border border-border bg-background/40 rounded-sm p-3"
                >
                  <div className="flex items-start gap-2.5">
                    <Icon size={16} className={positive ? "text-primary mt-0.5 shrink-0" : "text-muted-foreground mt-0.5 shrink-0"} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center flex-wrap gap-2 mb-1">
                        <p className="text-xs font-heading tracking-wider text-foreground">
                          {t(s.titleKey)}
                        </p>
                        {status === "live" && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 border border-primary/40 bg-primary/10 text-primary text-[9px] font-heading tracking-wider rounded-sm">
                            <CheckCircle2 size={10} /> {t("app.interval.hr_compat.status_live")}
                          </span>
                        )}
                        {status === "works-via-ble" && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 border border-primary/40 bg-primary/10 text-primary text-[9px] font-heading tracking-wider rounded-sm">
                            <CheckCircle2 size={10} /> {t("app.interval.hr_compat.status_ble")}
                          </span>
                        )}
                        {status === "soon" && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 border border-border bg-muted/40 text-muted-foreground text-[9px] font-heading tracking-wider rounded-sm">
                            <Clock size={10} /> {t("app.interval.hr_compat.status_soon")}
                          </span>
                        )}
                        {status === "no" && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 border border-border bg-muted/40 text-muted-foreground text-[9px] font-heading tracking-wider rounded-sm">
                            <AlertCircle size={10} /> {t("app.interval.hr_compat.status_no")}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed normal-case tracking-normal">
                        {t(s.descKey)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="border border-primary/30 bg-primary/5 rounded-sm p-3">
            <p className="text-[11px] text-foreground leading-relaxed">
              <span className="font-heading tracking-wider text-primary">{t("app.interval.hr_compat.tip_label")}: </span>
              {t("app.interval.hr_compat.tip_desc")}
            </p>
          </div>
        </div>

        <div className="sticky bottom-0 bg-card border-t border-border px-5 py-3">
          <button
            onClick={onClose}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-primary bg-primary/10 hover:bg-primary/20 text-primary font-heading text-xs tracking-wider rounded-sm transition-colors"
          >
            {t("app.interval.hr_compat.got_it")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default HRCompatibilityModal;