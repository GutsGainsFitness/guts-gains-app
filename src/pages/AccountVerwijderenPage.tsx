import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, AlertTriangle, CheckCircle2, Mail, Clock, UserCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/i18n/LanguageContext";
import { dateLocale } from "@/i18n/dateLocale";
import { format } from "date-fns";
import logoImage from "@/assets/logo-gutsandgains.png";

/**
 * Public, no-login-required deletion request page.
 *
 * Required by Google Play (and good GDPR practice) so users who lost
 * their password can still ask us to wipe their data. The form posts to
 * the `request-account-deletion` edge function which writes a row to
 * `admin_notifications` for the admin to action manually.
 *
 * We intentionally do NOT confirm whether the email exists in our
 * database — the server always returns success on a valid input — to
 * avoid turning this endpoint into a user-enumeration oracle.
 */
const AccountVerwijderenPage = () => {
  const { t, language } = useLanguage();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [reason, setReason] = useState("");
  // Honeypot: real users leave this empty. Bots usually fill every input.
  const [website, setWebsite] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submittedAt, setSubmittedAt] = useState<Date | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "request-account-deletion",
        { body: { email, name, reason, website } },
      );
      if (error) throw error;
      if ((data as { error?: string })?.error) {
        throw new Error((data as { error: string }).error);
      }
      setSubmittedAt(new Date());
      setSubmitted(true);
    } catch (err) {
      console.error("[request-account-deletion] error:", err);
      toast.error(t("delreq.toast.failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="container-tight px-4 md:px-8 py-6">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm"
        >
          <ArrowLeft size={16} /> {t("delreq.back")}
        </Link>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 pb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-xl"
        >
          <div className="text-center mb-8">
            <img
              src={logoImage}
              alt="Guts & Gains"
              className="h-14 mx-auto mb-5 drop-shadow-[0_0_3px_rgba(255,255,255,0.9)]"
            />
            <p className="text-primary font-heading text-xs tracking-[0.35em] mb-2">
              {t("delreq.tag")}
            </p>
            <h1 className="text-3xl md:text-4xl font-heading text-foreground">
              {t("delreq.title")}
            </h1>
          </div>

          {submitted ? (
            <div
              role="status"
              aria-live="polite"
              className="border-2 border-primary/30 bg-card p-7 md:p-9 rounded-sm shadow-card"
            >
              <div className="text-center">
                <CheckCircle2 className="text-primary mx-auto mb-4" size={48} />
                <h2 className="text-xl font-heading tracking-wider text-foreground mb-3">
                  {t("delreq.success.title")}
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed mb-2">
                  {t("delreq.success.body")}
                </p>
                {submittedAt && email && (
                  <p className="text-[11px] text-muted-foreground/80 mb-6">
                    <span className="font-medium text-foreground/80">{email}</span>
                    {" · "}
                    {t("delreq.success.confirmed_at")}{" "}
                    {format(submittedAt, "d MMM yyyy · HH:mm", {
                      locale: dateLocale(language),
                    })}
                  </p>
                )}
              </div>

              <div className="my-6 border-t border-border" />

              <h3 className="text-xs font-heading tracking-[0.25em] text-foreground mb-4">
                {t("delreq.success.what_now")}
              </h3>
              <ol className="space-y-4 mb-6">
                <li className="flex items-start gap-3">
                  <div className="shrink-0 w-8 h-8 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
                    <Clock size={14} className="text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-heading tracking-wide text-foreground">
                      {t("delreq.success.step1_title")}
                    </p>
                    <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
                      {t("delreq.success.step1_body")}
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="shrink-0 w-8 h-8 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
                    <UserCheck size={14} className="text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-heading tracking-wide text-foreground">
                      {t("delreq.success.step2_title")}
                    </p>
                    <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
                      {t("delreq.success.step2_body")}
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="shrink-0 w-8 h-8 rounded-full bg-destructive/10 border border-destructive/30 flex items-center justify-center">
                    <Trash2 size={14} className="text-destructive" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-heading tracking-wide text-foreground">
                      {t("delreq.success.step3_title")}
                    </p>
                    <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
                      {t("delreq.success.step3_body")}
                    </p>
                  </div>
                </li>
              </ol>

              <p className="text-[11px] text-muted-foreground text-center mb-5">
                {t("delreq.success.spam")}
              </p>

              <div className="text-center">
                <Link
                  to="/"
                  className="inline-block px-6 py-3 bg-primary text-primary-foreground font-heading text-xs tracking-wider hover:bg-primary/90 transition-colors rounded-sm"
                >
                  {t("delreq.success.home")}
                </Link>
              </div>
            </div>
          ) : (
            <div className="border-2 border-destructive/30 bg-card p-7 md:p-9 rounded-sm shadow-card">
              <div className="flex items-start gap-3 mb-6 p-4 bg-destructive/5 border border-destructive/30 rounded-sm">
                <AlertTriangle
                  size={18}
                  className="text-destructive mt-0.5 shrink-0"
                />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {t("delreq.warning")}
                </p>
              </div>

              <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                {t("delreq.intro")}{" "}
                <Link
                  to="/app/profiel"
                  className="text-primary hover:underline"
                >
                  {t("delreq.intro_link")}
                </Link>
                .
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Honeypot field — visually hidden, ignored by users, filled by bots */}
                <div
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    left: "-10000px",
                    width: "1px",
                    height: "1px",
                    overflow: "hidden",
                  }}
                >
                  <label>
                    Website
                    <input
                      type="text"
                      tabIndex={-1}
                      autoComplete="off"
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                    />
                  </label>
                </div>

                <div>
                  <label className="text-xs text-muted-foreground font-heading tracking-wider mb-1.5 block">
                    {t("delreq.label.email")} *
                  </label>
                  <div className="relative">
                    <Mail
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                      size={16}
                    />
                    <input
                      type="email"
                      required
                      maxLength={320}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-background border border-border rounded-sm text-foreground text-sm focus:outline-none focus:border-primary transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-muted-foreground font-heading tracking-wider mb-1.5 block">
                    {t("delreq.label.name")}
                  </label>
                  <input
                    type="text"
                    maxLength={200}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-3 bg-background border border-border rounded-sm text-foreground text-sm focus:outline-none focus:border-primary transition-colors"
                  />
                </div>

                <div>
                  <label className="text-xs text-muted-foreground font-heading tracking-wider mb-1.5 block">
                    {t("delreq.label.reason")}
                  </label>
                  <textarea
                    maxLength={1000}
                    rows={4}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder={t("delreq.label.reason_ph")}
                    className="w-full px-4 py-3 bg-background border border-border rounded-sm text-foreground text-sm focus:outline-none focus:border-primary transition-colors resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || !email}
                  className="w-full py-3.5 bg-destructive text-destructive-foreground font-heading text-sm tracking-wider hover:bg-destructive/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2 rounded-sm"
                >
                  {loading ? t("delreq.btn.loading") : t("delreq.btn.submit")}
                </button>

                <p className="text-[11px] text-muted-foreground text-center pt-2">
                  {t("delreq.footnote")}
                </p>
              </form>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default AccountVerwijderenPage;
