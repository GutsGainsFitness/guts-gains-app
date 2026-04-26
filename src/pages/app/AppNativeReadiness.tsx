import { useEffect, useState } from "react";
import AppShell from "@/components/app/AppShell";
import { CheckCircle2, AlertTriangle, XCircle, Smartphone, Globe, HeartPulse, Vibrate, Sun, Volume2, Bell, Apple, Watch, Activity } from "lucide-react";
import { isNative, triggerVibrate, requestKeepAwake, ensureNotificationPermission } from "@/lib/native";
import { detectBluetoothBlockReason, isWebBluetoothSupported, isIOS } from "@/lib/heartRate";
import { toast } from "sonner";

/**
 * Internal QA / readiness checklist.
 *
 * Surfaces, per device feature, whether it works in the current runtime
 * (browser tab, installed PWA, or native Capacitor app). Goal is to make
 * it obvious which features rely on a native wrapper before we publish
 * to the App Store / Play Store.
 *
 * Status legend:
 *  - "ok"      → works in current runtime
 *  - "partial" → works but with caveats (e.g. only with screen on)
 *  - "missing" → not available here, needs a native wrapper or a different
 *                browser
 */
type Status = "ok" | "partial" | "missing";

interface CheckRow {
  icon: typeof HeartPulse;
  label: string;
  web: Status;
  native: Status;
  note: string;
  test?: () => Promise<void> | void;
  testLabel?: string;
}

const StatusPill = ({ status }: { status: Status }) => {
  if (status === "ok") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-heading tracking-wider bg-primary/10 text-primary border border-primary/30 rounded-sm">
        <CheckCircle2 size={10} /> OK
      </span>
    );
  }
  if (status === "partial") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-heading tracking-wider bg-foreground/5 text-foreground border border-border rounded-sm">
        <AlertTriangle size={10} /> PARTIAL
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-heading tracking-wider bg-muted text-muted-foreground border border-border rounded-sm">
      <XCircle size={10} /> MISSING
    </span>
  );
};

interface PlatformRow {
  label: string;
  status: Status;
  hint?: string;
}

const PlatformCard = ({
  icon: Icon,
  title,
  tagline,
  warning,
  highlight,
  isCurrent,
  rows,
}: {
  icon: typeof HeartPulse;
  title: string;
  tagline: string;
  warning?: string;
  highlight?: string;
  isCurrent: boolean;
  rows: PlatformRow[];
}) => (
  <div
    className={`relative border rounded-sm bg-card p-4 flex flex-col ${
      isCurrent ? "border-primary/60 shadow-[0_0_0_1px_hsl(var(--primary)/0.2)]" : "border-border"
    }`}
  >
    {isCurrent && (
      <span className="absolute -top-2 left-3 px-1.5 py-0.5 text-[9px] font-heading tracking-wider bg-primary text-primary-foreground rounded-sm">
        JIJ NU
      </span>
    )}
    <div className="flex items-start gap-2.5 mb-3">
      <Icon size={18} className="text-primary mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-sm font-heading text-foreground">{title}</p>
        <p className="text-[11px] text-muted-foreground">{tagline}</p>
      </div>
    </div>
    {warning && (
      <p className="text-[11px] text-muted-foreground border-l-2 border-primary/50 pl-2 mb-3 leading-relaxed">
        {warning}
      </p>
    )}
    {highlight && (
      <p className="text-[10px] font-heading tracking-wider text-primary mb-2">
        {highlight.toUpperCase()}
      </p>
    )}
    <ul className="space-y-2 flex-1">
      {rows.map((r) => (
        <li key={r.label} className="flex items-start gap-2">
          <span className="mt-0.5 shrink-0">
            {r.status === "ok" && <CheckCircle2 size={12} className="text-primary" />}
            {r.status === "partial" && <AlertTriangle size={12} className="text-foreground" />}
            {r.status === "missing" && <XCircle size={12} className="text-muted-foreground" />}
          </span>
          <div className="min-w-0">
            <p className="text-xs text-foreground leading-snug">{r.label}</p>
            {r.hint && <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">{r.hint}</p>}
          </div>
        </li>
      ))}
    </ul>
  </div>
);

const AppNativeReadiness = () => {
  const [native, setNative] = useState(false);
  const [bluetoothStatus, setBluetoothStatus] = useState<Status>("missing");
  const [vibrateStatus, setVibrateStatus] = useState<Status>("missing");
  const [wakeLockStatus, setWakeLockStatus] = useState<Status>("missing");
  const [audioStatus, setAudioStatus] = useState<Status>("missing");

  useEffect(() => {
    const isNativeRuntime = isNative();
    setNative(isNativeRuntime);

    // --- Bluetooth (Web Bluetooth) ---
    // Native uses a different stack entirely (a BLE plugin). Mark accordingly.
    if (isNativeRuntime) {
      setBluetoothStatus("missing"); // needs @capacitor-community/bluetooth-le
    } else {
      const supported = isWebBluetoothSupported();
      const reason = detectBluetoothBlockReason();
      if (!supported) setBluetoothStatus("missing");
      else if (reason === "iframe" || reason === "insecure") setBluetoothStatus("partial");
      else setBluetoothStatus("ok");
    }

    // --- Vibrate / Haptics ---
    if (isNativeRuntime) {
      setVibrateStatus("ok"); // Capacitor Haptics
    } else if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      setVibrateStatus("ok");
    } else {
      setVibrateStatus("missing");
    }

    // --- Wake Lock ---
    if (isNativeRuntime) {
      setWakeLockStatus("partial"); // OS handles it, no dedicated plugin yet
    } else if (
      typeof navigator !== "undefined" &&
      typeof (navigator as Navigator & { wakeLock?: unknown }).wakeLock !== "undefined"
    ) {
      setWakeLockStatus("partial"); // works only while page visible
    } else {
      setWakeLockStatus("missing");
    }

    // --- Audio (Web Audio API for tones) ---
    if (typeof window !== "undefined" && (typeof AudioContext !== "undefined" || typeof (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext !== "undefined")) {
      setAudioStatus(isNativeRuntime ? "partial" : "ok"); // background playback on native needs background-audio mode
    } else {
      setAudioStatus("missing");
    }
  }, []);

  const testVibrate = async () => {
    await triggerVibrate([100, 60, 200], "medium");
    toast.success("Vibrate triggered");
  };

  const testWakeLock = async () => {
    const handle = await requestKeepAwake();
    if (!handle) {
      toast.error("Wake lock not available");
      return;
    }
    toast.success("Wake lock acquired for 5s");
    setTimeout(() => { void handle.release(); }, 5000);
  };

  const testAudio = () => {
    try {
      const Ctx = (window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext);
      const ctx = new Ctx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.3);
      osc.start(); osc.stop(ctx.currentTime + 0.3);
      toast.success("Tone played");
    } catch {
      toast.error("Audio failed");
    }
  };

  const testNotifications = async () => {
    if (!native) {
      toast.error("Native only — install via Capacitor first");
      return;
    }
    const granted = await ensureNotificationPermission();
    toast[granted ? "success" : "error"](granted ? "Permission granted" : "Permission denied");
  };

  const checks: CheckRow[] = [
    {
      icon: HeartPulse,
      label: "HR Bluetooth (BLE chest strap / band)",
      web: bluetoothStatus,
      native: "missing",
      note: native
        ? "Native build needs @capacitor-community/bluetooth-le; Web Bluetooth API does not run inside a Capacitor WebView."
        : bluetoothStatus === "ok"
          ? "Works on Android Chrome + desktop Chrome over HTTPS. iOS Safari does not support Web Bluetooth."
          : bluetoothStatus === "partial"
            ? "Blocked in this iframe — open in a top-level tab to test."
            : "Not supported in this browser.",
    },
    {
      icon: Vibrate,
      label: "Vibrate / Haptics",
      web: vibrateStatus,
      native: "ok",
      note: native
        ? "Uses Capacitor Haptics — distinct impact styles, fired immediately."
        : "Uses navigator.vibrate. Android Chrome only; iOS Safari ignores it silently.",
      test: testVibrate,
      testLabel: "Buzz",
    },
    {
      icon: Sun,
      label: "Wake Lock (screen stays on)",
      web: wakeLockStatus,
      native: "partial",
      note: native
        ? "Foreground apps already keep the screen on per OS idle timer; for guaranteed always-on add @capacitor-community/keep-awake."
        : "Web Wake Lock requires HTTPS and only works while the tab is visible. Released automatically when the tab is hidden.",
      test: testWakeLock,
      testLabel: "Hold 5s",
    },
    {
      icon: Volume2,
      label: "Audio cues (tones)",
      web: audioStatus,
      native: "partial",
      note: native
        ? "Plays in foreground. Background playback needs the iOS audio background mode and an Android foreground service."
        : "Web Audio API works in all modern browsers. iOS requires a user gesture before the first tone.",
      test: testAudio,
      testLabel: "Beep",
    },
    {
      icon: Bell,
      label: "Local notifications (background phase cues)",
      web: "missing",
      native: "ok",
      note: native
        ? "Use @capacitor/local-notifications to schedule interval phase changes — works with screen off."
        : "Web has no equivalent for scheduled local notifications. Available only after wrapping with Capacitor.",
      test: testNotifications,
      testLabel: "Ask permission",
    },
  ];

  return (
    <AppShell>
      <div className="p-6 md:p-10 max-w-4xl mx-auto">
        <div className="mb-8">
          <p className="text-primary font-heading text-xs tracking-[0.35em] mb-2">DEV / QA</p>
          <h1 className="text-3xl font-heading text-foreground">Native Readiness</h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
            Quick reference for which device features work in the current runtime, and which still need a native
            wrapper. Use this to decide what to test once the app is wrapped with Capacitor and shipped to the App
            Store / Play Store.
          </p>
        </div>

        <div className="mb-6 inline-flex items-center gap-2 px-4 py-2 border border-primary/30 bg-primary/5 rounded-sm">
          {native ? <Smartphone size={16} className="text-primary" /> : <Globe size={16} className="text-primary" />}
          <span className="text-xs font-heading tracking-wider text-foreground">
            CURRENT RUNTIME: {native ? "NATIVE (CAPACITOR)" : "WEB BROWSER"}
          </span>
        </div>

        {/* === Heart rate sources by platform =====================================
            Customer-facing breakdown so we can answer "does my watch / band
            work?" without diving into Web Bluetooth specs. iOS Safari + every
            iOS browser blocks Web Bluetooth, so the iOS-PWA column is dead
            until we ship a native Capacitor build with a BLE plugin (and,
            optionally, a HealthKit integration for Apple Watch).
        */}
        <div className="mb-10">
          <h2 className="text-xl font-heading text-foreground mb-1">Hartslagbronnen per platform</h2>
          <p className="text-xs text-muted-foreground mb-4 max-w-2xl">
            Wat klanten vandaag kunnen koppelen, en wat een native iOS-app extra zou ontgrendelen.
            Web Bluetooth wordt door Apple op iOS in álle browsers geblokkeerd — niet alleen Safari.
          </p>

          <div className="grid md:grid-cols-3 gap-3">
            <PlatformCard
              icon={Activity}
              title="Android — PWA"
              tagline="Chrome / Edge"
              isCurrent={!native && !isIOS() && isWebBluetoothSupported()}
              rows={[
                { label: "BLE chest strap (Polar H10, Garmin HRM, Wahoo Tickr, Coospo)", status: "ok" },
                { label: "BLE polsband (Polar Verity Sense)", status: "ok" },
                { label: "Garmin / Polar / Whoop horloge data", status: "missing", hint: "vereist OAuth-koppeling met hun cloud" },
                { label: "Apple Watch", status: "missing", hint: "Apple-only ecosysteem" },
              ]}
            />
            <PlatformCard
              icon={Apple}
              title="iPhone / iPad — PWA"
              tagline="Safari, Chrome, Edge — allemaal WebKit"
              warning="Apple blokkeert Web Bluetooth volledig op iOS"
              isCurrent={!native && isIOS()}
              rows={[
                { label: "BLE chest strap", status: "missing", hint: "Web Bluetooth niet ondersteund op iOS" },
                { label: "BLE polsband", status: "missing", hint: "Web Bluetooth niet ondersteund op iOS" },
                { label: "Apple Watch", status: "missing", hint: "vereist HealthKit — niet beschikbaar voor websites" },
                { label: "Garmin / Polar / Whoop horloge data", status: "missing", hint: "vereist OAuth-koppeling met hun cloud" },
              ]}
            />
            <PlatformCard
              icon={Watch}
              title="Native iOS-app"
              tagline="Capacitor build, App Store"
              highlight="Wat een native build ontgrendelt"
              isCurrent={native}
              rows={[
                { label: "BLE chest strap (Polar, Garmin, Wahoo)", status: "ok", hint: "via @capacitor-community/bluetooth-le" },
                { label: "BLE polsband", status: "ok", hint: "via dezelfde BLE-plugin" },
                { label: "Apple Watch hartslag + workouts", status: "partial", hint: "vereist HealthKit-plugin + Apple Health koppeling" },
                { label: "Achtergrond-meting (scherm uit)", status: "ok", hint: "iOS background-audio + local notifications" },
              ]}
            />
          </div>
        </div>

        <h2 className="text-xl font-heading text-foreground mb-3">Runtime feature checklist</h2>

        <div className="border border-border bg-card rounded-sm overflow-hidden">
          <div className="hidden md:grid grid-cols-[1fr_auto_auto] gap-4 px-4 py-3 border-b border-border bg-background">
            <p className="text-[10px] font-heading tracking-wider text-muted-foreground">FEATURE</p>
            <p className="text-[10px] font-heading tracking-wider text-muted-foreground w-20 text-center">WEB</p>
            <p className="text-[10px] font-heading tracking-wider text-muted-foreground w-20 text-center">NATIVE</p>
          </div>

          {checks.map((c) => {
            const Icon = c.icon;
            return (
              <div key={c.label} className="px-4 py-4 border-b border-border last:border-0">
                <div className="grid md:grid-cols-[1fr_auto_auto] gap-3 md:gap-4 md:items-center">
                  <div className="flex items-start gap-3">
                    <Icon size={18} className="text-primary mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-heading text-foreground">{c.label}</p>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{c.note}</p>
                    </div>
                  </div>
                  <div className="flex md:justify-center md:w-20">
                    <StatusPill status={c.web} />
                  </div>
                  <div className="flex md:justify-center md:w-20">
                    <StatusPill status={c.native} />
                  </div>
                </div>
                {c.test && (
                  <div className="mt-3 md:ml-8">
                    <button
                      onClick={() => void c.test?.()}
                      className="px-3 py-1.5 border border-border bg-background hover:border-primary text-foreground font-heading text-[10px] tracking-wider rounded-sm transition-colors"
                    >
                      {c.testLabel}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-8 p-5 border border-border bg-card rounded-sm">
          <p className="text-xs font-heading tracking-wider text-primary mb-3">NEXT STEPS BEFORE STORE SUBMISSION</p>
          <ul className="space-y-2 text-xs text-muted-foreground list-disc pl-5">
            <li>Remove the <code className="text-foreground">server.url</code> block from <code className="text-foreground">capacitor.config.ts</code> for production builds.</li>
            <li>Add <code className="text-foreground">@capacitor-community/bluetooth-le</code> if HR connectivity is required in native.</li>
            <li>Add <code className="text-foreground">@capacitor-community/keep-awake</code> for guaranteed screen-on during sessions.</li>
            <li>Wire <code className="text-foreground">@capacitor/local-notifications</code> into the interval timer for screen-off phase cues.</li>
            <li>Generate app icons + splash screens in the brand palette and run <code className="text-foreground">npx cap sync</code>.</li>
          </ul>
        </div>
      </div>
    </AppShell>
  );
};

export default AppNativeReadiness;
