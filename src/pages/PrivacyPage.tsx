import { Link } from "react-router-dom";
import { ArrowLeft, Shield } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useLanguage } from "@/i18n/LanguageContext";

/**
 * Public privacy policy page (Dutch / English / Spanish).
 * Required by GDPR/AVG and by the Google Play Store. Linked from the
 * Footer, the cookie banner, the signup screens and /account-verwijderen.
 *
 * Keep the wording reviewed by a lawyer if you start running paid ads or
 * adding analytics — this version covers the current data flows only.
 */
const PrivacyPage = () => {
  const { t, language } = useLanguage();
  const lastUpdated = "19 april 2026";

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container-tight px-4 md:px-8 pt-28 pb-20">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm mb-8"
        >
          <ArrowLeft size={16} /> {t("privacy.back")}
        </Link>

        <div className="flex items-center gap-3 mb-3">
          <Shield className="text-primary" size={24} />
          <p className="text-primary font-heading text-xs tracking-[0.35em]">
            {t("privacy.tag")}
          </p>
        </div>
        <h1 className="text-4xl md:text-5xl font-heading text-foreground mb-3">
          {t("privacy.title")}
        </h1>
        <p className="text-sm text-muted-foreground mb-12">
          {t("privacy.last_updated")}: {lastUpdated} · {t("privacy.version")}: v1
        </p>

        <article className="prose prose-invert max-w-none space-y-10 text-foreground/90">
          <Section
            heading={t("privacy.s1.title")}
            body={
              <>
                <p>{t("privacy.s1.p1")}</p>
                <p className="text-sm text-muted-foreground mt-3">
                  Guts &amp; Gains Fitness · Hofwijckstraat 351, Den Haag ·{" "}
                  <a
                    href="mailto:gutsgainsfitness@gmail.com"
                    className="text-primary hover:underline"
                  >
                    gutsgainsfitness@gmail.com
                  </a>
                </p>
              </>
            }
          />

          <Section
            heading={t("privacy.s2.title")}
            body={
              <>
                <p>{t("privacy.s2.intro")}</p>
                <ul className="list-disc pl-5 space-y-2 mt-3">
                  <li>{t("privacy.s2.account")}</li>
                  <li>{t("privacy.s2.profile")}</li>
                  <li>{t("privacy.s2.training")}</li>
                  <li>{t("privacy.s2.heart")}</li>
                  <li>{t("privacy.s2.photos")}</li>
                  <li>{t("privacy.s2.payment")}</li>
                  <li>{t("privacy.s2.tech")}</li>
                </ul>
              </>
            }
          />

          <Section
            heading={t("privacy.s3.title")}
            body={
              <ul className="list-disc pl-5 space-y-2">
                <li>{t("privacy.s3.contract")}</li>
                <li>{t("privacy.s3.legal")}</li>
                <li>{t("privacy.s3.consent")}</li>
                <li>{t("privacy.s3.legitimate")}</li>
              </ul>
            }
          />

          <Section
            heading={t("privacy.s4.title")}
            body={
              <>
                <p>{t("privacy.s4.intro")}</p>
                <ul className="list-disc pl-5 space-y-2 mt-3">
                  <li>
                    <strong className="text-foreground">Lovable Cloud</strong> /{" "}
                    <strong className="text-foreground">Supabase (EU)</strong> —{" "}
                    {t("privacy.s4.supabase")}
                  </li>
                  <li>
                    <strong className="text-foreground">Stripe</strong> —{" "}
                    {t("privacy.s4.stripe")}
                  </li>
                  <li>
                    <strong className="text-foreground">Google Calendar</strong>{" "}
                    — {t("privacy.s4.gcal")}
                  </li>
                </ul>
                <p className="text-sm text-muted-foreground mt-4">
                  {t("privacy.s4.dpa")}
                </p>
              </>
            }
          />

          <Section
            heading={t("privacy.s5.title")}
            body={
              <ul className="list-disc pl-5 space-y-2">
                <li>{t("privacy.s5.account")}</li>
                <li>{t("privacy.s5.training")}</li>
                <li>{t("privacy.s5.photos")}</li>
                <li>{t("privacy.s5.invoices")}</li>
                <li>{t("privacy.s5.consent")}</li>
              </ul>
            }
          />

          <Section
            heading={t("privacy.s6.title")}
            body={
              <>
                <p>{t("privacy.s6.intro")}</p>
                <ul className="list-disc pl-5 space-y-2 mt-3">
                  <li>{t("privacy.s6.access")}</li>
                  <li>{t("privacy.s6.rectify")}</li>
                  <li>{t("privacy.s6.erase")}</li>
                  <li>{t("privacy.s6.portability")}</li>
                  <li>{t("privacy.s6.object")}</li>
                  <li>{t("privacy.s6.withdraw")}</li>
                </ul>
              </>
            }
          />

          <Section
            heading={t("privacy.s7.title")}
            body={
              <>
                <p>{t("privacy.s7.p1")}</p>
                <div className="mt-4 grid sm:grid-cols-2 gap-3">
                  <Link
                    to="/app/profiel"
                    className="block p-4 border-2 border-primary/30 hover:border-primary bg-card rounded-sm transition-colors"
                  >
                    <p className="font-heading text-sm tracking-wider text-foreground mb-1">
                      {t("privacy.s7.option1")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("privacy.s7.option1_desc")}
                    </p>
                  </Link>
                  <Link
                    to="/account-verwijderen"
                    className="block p-4 border-2 border-destructive/30 hover:border-destructive bg-card rounded-sm transition-colors"
                  >
                    <p className="font-heading text-sm tracking-wider text-foreground mb-1">
                      {t("privacy.s7.option2")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("privacy.s7.option2_desc")}
                    </p>
                  </Link>
                </div>
              </>
            }
          />

          <Section
            heading={t("privacy.s8.title")}
            body={
              <>
                <p>{t("privacy.s8.p1")}</p>
                <p className="mt-3">{t("privacy.s8.p2")}</p>
                <p className="mt-3 text-sm text-muted-foreground">
                  {t("privacy.s8.unsubscribe")}
                </p>
              </>
            }
          />

          <Section
            heading={t("privacy.s9.title")}
            body={
              <>
                <p>{t("privacy.s9.p1")}</p>
                <ul className="list-disc pl-5 space-y-2 mt-3">
                  <li>{t("privacy.s9.functional")}</li>
                  <li>{t("privacy.s9.consent")}</li>
                </ul>
                <p className="mt-3 text-sm text-muted-foreground">
                  {t("privacy.s9.no_tracking")}
                </p>
              </>
            }
          />

          <Section
            heading={t("privacy.s10.title")}
            body={
              <>
                <p>{t("privacy.s10.p1")}</p>
                <p className="mt-3 text-sm text-muted-foreground">
                  Autoriteit Persoonsgegevens ·{" "}
                  <a
                    href="https://autoriteitpersoonsgegevens.nl"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    autoriteitpersoonsgegevens.nl
                  </a>
                </p>
              </>
            }
          />

          <div className="pt-8 border-t border-border text-sm text-muted-foreground">
            {t("privacy.contact")}{" "}
            <a
              href="mailto:gutsgainsfitness@gmail.com"
              className="text-primary hover:underline"
            >
              gutsgainsfitness@gmail.com
            </a>
            .
            {language !== "nl" && (
              <p className="mt-3 text-xs italic">
                {t("privacy.legal_note")}
              </p>
            )}
          </div>
        </article>
      </main>
      <Footer />
    </div>
  );
};

const Section = ({
  heading,
  body,
}: {
  heading: string;
  body: React.ReactNode;
}) => (
  <section>
    <h2 className="text-2xl font-heading text-foreground mb-4 tracking-wide">
      {heading}
    </h2>
    <div className="text-foreground/85 leading-relaxed space-y-2">{body}</div>
  </section>
);

export default PrivacyPage;
