import { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { ArrowLeft, Mail, Lock, User as UserIcon } from "lucide-react";
import logoImage from "@/assets/logo-gutsandgains.png";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/i18n/LanguageContext";
import { recordMarketingConsent } from "@/lib/marketingConsent";

type Mode = "login" | "signup" | "forgot";

const AppLogin = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
  const { t, language } = useLanguage();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [naam, setNaam] = useState("");
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [loading, setLoading] = useState(false);

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || "/app";

  useEffect(() => {
    if (!authLoading && user) {
      navigate(from, { replace: true });
    }
  }, [user, authLoading, from, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (mode === "signup") {
      const redirectUrl = `${window.location.origin}/app`;
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: { naam },
        },
      });
      if (error) {
        toast.error(error.message);
      } else {
        // Record marketing-email consent (granted OR explicit decline) so we
        // have legal proof of what the user chose at signup time.
        await recordMarketingConsent({
          email,
          granted: marketingOptIn,
          source: "signup",
          language,
        });
        toast.success(t("applogin.toast.signup_success"));
        setMode("login");
      }
    } else if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast.error(`${t("applogin.toast.login_failed")} ${error.message}`);
      } else {
        toast.success(t("applogin.toast.welcome"));
        navigate(from, { replace: true });
      }
    } else {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/app/reset-password`,
      });
      if (error) toast.error(error.message);
      else toast.success(t("applogin.toast.reset_sent"));
    }

    setLoading(false);
  };

  const handleGoogle = async () => {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: `${window.location.origin}/app`,
    });
    if (result.error) {
      toast.error(t("applogin.toast.google_failed"));
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="container-tight px-4 md:px-8 py-6">
        <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm">
          <ArrowLeft size={16} /> {t("applogin.back")}
        </Link>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 pb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="text-center mb-10">
            <img src={logoImage} alt="Guts & Gains" className="h-16 mx-auto mb-6 drop-shadow-[0_0_3px_rgba(255,255,255,0.9)]" />
            <p className="text-primary font-heading text-xs tracking-[0.35em] mb-2">{t("applogin.tag")}</p>
            <h1 className="text-3xl font-heading text-foreground">
              {mode === "login" ? t("applogin.title.login") : mode === "signup" ? t("applogin.title.signup") : t("applogin.title.forgot")}
            </h1>
          </div>

          <div className="border-2 border-primary/20 bg-card p-7 md:p-9 rounded-sm shadow-card">
            {mode !== "forgot" && (
              <>
                <button
                  type="button"
                  onClick={handleGoogle}
                  disabled={loading}
                  className="w-full mb-6 flex items-center justify-center gap-3 px-5 py-3.5 border border-border bg-background hover:bg-muted/50 transition-colors text-sm font-body text-foreground rounded-sm disabled:opacity-50"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  {t("applogin.google")}
                </button>

                <div className="flex items-center gap-3 mb-6">
                  <div className="h-px flex-1 bg-border"></div>
                  <span className="text-xs text-muted-foreground font-heading tracking-wider">{t("applogin.or")}</span>
                  <div className="h-px flex-1 bg-border"></div>
                </div>
              </>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "signup" && (
                <div>
                  <label className="text-xs text-muted-foreground font-heading tracking-wider mb-1.5 block">{t("applogin.label.name")}</label>
                  <div className="relative">
                    <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                    <input
                      type="text"
                      value={naam}
                      onChange={(e) => setNaam(e.target.value)}
                      required
                      className="w-full pl-10 pr-4 py-3 bg-background border border-border rounded-sm text-foreground text-sm focus:outline-none focus:border-primary transition-colors"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs text-muted-foreground font-heading tracking-wider mb-1.5 block">{t("applogin.label.email")}</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full pl-10 pr-4 py-3 bg-background border border-border rounded-sm text-foreground text-sm focus:outline-none focus:border-primary transition-colors"
                  />
                </div>
              </div>

              {mode !== "forgot" && (
                <div>
                  <label className="text-xs text-muted-foreground font-heading tracking-wider mb-1.5 block">{t("applogin.label.password")}</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      className="w-full pl-10 pr-4 py-3 bg-background border border-border rounded-sm text-foreground text-sm focus:outline-none focus:border-primary transition-colors"
                    />
                  </div>
                </div>
              )}

              {mode === "signup" && (
                <label className="flex items-start gap-2.5 cursor-pointer group pt-1">
                  <input
                    type="checkbox"
                    checked={marketingOptIn}
                    onChange={(e) => setMarketingOptIn(e.target.checked)}
                    className="mt-0.5 accent-primary cursor-pointer shrink-0"
                  />
                  <span className="text-[11px] text-muted-foreground leading-relaxed group-hover:text-foreground/80 transition-colors">
                    {t("applogin.marketing_optin")}{" "}
                    <Link to="/privacy" target="_blank" className="text-primary hover:underline">
                      {t("applogin.marketing_policy_link")}
                    </Link>
                    .
                  </span>
                </label>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-primary text-primary-foreground font-heading text-sm tracking-wider hover:bg-primary/90 transition-all shadow-red hover:shadow-glow disabled:opacity-50 mt-2"
              >
                {loading ? t("applogin.btn.loading") : mode === "login" ? t("applogin.btn.login") : mode === "signup" ? t("applogin.btn.signup") : t("applogin.btn.forgot")}
              </button>
            </form>

            <div className="mt-6 flex flex-col gap-2 text-center">
              {mode === "login" && (
                <>
                  <button onClick={() => setMode("signup")} className="text-xs text-muted-foreground hover:text-primary transition-colors">
                    {t("applogin.no_account")} <span className="text-primary">{t("applogin.signup_link")}</span>
                  </button>
                  <button onClick={() => setMode("forgot")} className="text-xs text-muted-foreground hover:text-primary transition-colors">
                    {t("applogin.forgot_link")}
                  </button>
                </>
              )}
              {mode === "signup" && (
                <button onClick={() => setMode("login")} className="text-xs text-muted-foreground hover:text-primary transition-colors">
                  {t("applogin.have_account")} <span className="text-primary">{t("applogin.login_link")}</span>
                </button>
              )}
              {mode === "forgot" && (
                <button onClick={() => setMode("login")} className="text-xs text-muted-foreground hover:text-primary transition-colors">
                  {t("applogin.back_to_login")}
                </button>
              )}
              <Link
                to="/account-verwijderen"
                className="text-[11px] text-muted-foreground/70 hover:text-destructive transition-colors mt-3 pt-3 border-t border-border"
              >
                {t("applogin.delete_account_link")}
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default AppLogin;
