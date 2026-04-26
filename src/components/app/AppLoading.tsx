import logoImage from "@/assets/logo-gutsandgains.png";

/**
 * Branded full-screen loading state used while auth/session resolve
 * and during initial native shell boot. Keeps the user looking at the
 * brand instead of a blank white flash.
 */
const AppLoading = ({ label = "LADEN..." }: { label?: string }) => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-background safe-py">
    <img
      src={logoImage}
      alt="Guts & Gains"
      className="h-16 w-auto mb-6 animate-pulse drop-shadow-[0_0_6px_rgba(255,255,255,0.6)]"
    />
    <div className="flex items-center gap-3">
      <div className="h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
      <div className="h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
      <div className="h-2 w-2 rounded-full bg-primary animate-bounce" />
    </div>
    <p className="mt-4 text-xs font-heading tracking-[0.3em] text-muted-foreground">
      {label}
    </p>
  </div>
);

export default AppLoading;