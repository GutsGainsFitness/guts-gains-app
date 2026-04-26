import { useEffect, useRef, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Lock, ShieldCheck, CreditCard } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { StripeEmbeddedCheckout } from "@/components/StripeEmbeddedCheckout";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { Checkbox } from "@/components/ui/checkbox";

const PRODUCT_NAMES: Record<string, string> = {
  maandkaart_1x_pt_4wk: "Maandkaart · 1x PT per week",
  maandkaart_2x_pt_4wk: "Maandkaart · 2x PT per week",
  maandkaart_3x_pt_4wk: "Maandkaart · 3x PT per week",
  maandkaart_4x_pt_4wk: "Maandkaart · 4x PT per week",
  rittenkaart_power_up_5: "Power-Up Pack · 5 sessies",
  rittenkaart_warrior_10: "Warrior Pack · 10 sessies",
  rittenkaart_hiit_20: "HIIT Pack · 20 sessies",
  rittenkaart_guts_25: "Guts Regiment · 25 sessies",
  rittenkaart_saiyan_36: "Saiyan Training · 36 sessies",
  small_group_2p_1x_4wk: "Small Group · 2 personen · 1x/week (4 sessies)",
  small_group_2p_2x_4wk: "Small Group · 2 personen · 2x/week (8 sessies)",
  small_group_2p_3x_4wk: "Small Group · 2 personen · 3x/week (12 sessies)",
};

const SMALL_GROUP_DISCLAIMER = "Dit pakket is uitsluitend geldig bij deelname met 2 personen. De prijs is per persoon en alleen van toepassing wanneer beide deelnemers samen trainen.";

function isSmallGroup(priceId: string): boolean {
  return priceId.startsWith("small_group_");
}

function isSubscription(priceId: string): boolean {
  return priceId.startsWith("maandkaart_") || priceId.startsWith("small_group_");
}

export default function CheckoutPage() {
  const [searchParams] = useSearchParams();
  const priceId = searchParams.get("price");
  const productName = priceId ? PRODUCT_NAMES[priceId] || priceId : null;
  const [termsAccepted, setTermsAccepted] = useState(false);

  const recurring = priceId ? isSubscription(priceId) : false;
  const canProceed = !recurring || termsAccepted;
  const termsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (recurring && !termsAccepted && termsRef.current) {
      // Wait one frame so layout is ready, then scroll the terms block into view
      requestAnimationFrame(() => {
        termsRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    }
  }, [recurring, termsAccepted, priceId]);


  if (!priceId) {
    return (
      <>
        <Navbar />
        <main className="pt-24 section-padding min-h-screen">
          <div className="max-w-lg mx-auto text-center">
            <h1 className="text-2xl font-heading text-foreground mb-4">GEEN PRODUCT GESELECTEERD</h1>
            <p className="text-muted-foreground">Ga terug naar de tarieven om een pakket te kiezen.</p>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <PaymentTestModeBanner />
      <Navbar />
      <main className="pt-24 section-padding min-h-screen">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-heading text-foreground mb-2 text-center">AFREKENEN</h1>
          <p className="text-center text-muted-foreground mb-4">{productName}</p>
          {priceId && isSmallGroup(priceId) && (
            <p className="text-center text-sm text-muted-foreground/80 italic mb-8 max-w-md mx-auto">
              {SMALL_GROUP_DISCLAIMER}
            </p>
          )}

          {recurring && (
            <div
              ref={termsRef}
              className={`relative mb-8 scroll-mt-24 rounded-lg border-2 transition-all ${
                termsAccepted
                  ? "border-primary/40 bg-card"
                  : "border-primary bg-primary/5 shadow-[0_0_0_4px_hsl(var(--primary)/0.12)] animate-pulse-soft"
              }`}
            >
              <div className="absolute -top-3 left-4 px-2 py-0.5 bg-primary text-primary-foreground text-[10px] font-heading tracking-[0.25em] rounded-sm">
                {termsAccepted ? "✓ AKKOORD" : "VEREIST"}
              </div>
              <div className="p-5 pt-6">
                <p className="text-sm text-muted-foreground mb-4">
                  Dit is een doorlopend abonnement dat elke 4 weken automatisch wordt afgeschreven.
                  Minimale looptijd is 8 weken. Opzeggen kan daarna met een opzegtermijn van 4 weken.
                </p>
                <label
                  htmlFor="terms"
                  className={`flex items-start gap-3 p-3 rounded-md cursor-pointer transition-colors ${
                    termsAccepted ? "bg-transparent" : "bg-primary/10 hover:bg-primary/15"
                  }`}
                >
                  <Checkbox
                    id="terms"
                    checked={termsAccepted}
                    onCheckedChange={(checked) => setTermsAccepted(checked === true)}
                    className="mt-0.5 border-primary data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                  />
                  <span className="text-sm text-foreground leading-snug">
                    Ik ga akkoord met de{" "}
                    <Link
                      to="/algemene-voorwaarden"
                      target="_blank"
                      className="text-primary underline hover:text-primary/80 font-semibold"
                    >
                      algemene voorwaarden
                    </Link>{" "}
                    en de automatische incasso elke 4 weken.
                  </span>
                </label>
              </div>
            </div>
          )}

          {canProceed ? (
            <>
              <div className="mb-5 p-4 rounded-lg border border-border bg-card/50">
                <div className="flex items-center justify-center gap-2 text-foreground mb-3">
                  <Lock className="text-primary" size={16} />
                  <p className="text-sm font-heading tracking-wider">VEILIG BETALEN VIA STRIPE</p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck size={14} className="text-primary" />
                    SSL-versleuteld
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CreditCard size={14} className="text-primary" />
                    iDEAL · Card · SEPA
                  </span>
                  <span>PCI-DSS gecertificeerd</span>
                </div>
              </div>
              <StripeEmbeddedCheckout
                priceId={priceId}
                productName={productName || undefined}
                returnUrl={`${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}`}
              />

              <div className="mt-10">
                <p className="text-center text-xs font-heading tracking-[0.3em] text-muted-foreground mb-5">
                  VEELGESTELDE VRAGEN
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="p-4 rounded-lg border border-border bg-card">
                    <p className="font-heading text-sm text-foreground mb-2">Wanneer start mijn pakket?</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Direct na betaling. Plan je eerste sessie in via WhatsApp en ga van start.
                    </p>
                  </div>
                  <div className="p-4 rounded-lg border border-border bg-card">
                    <p className="font-heading text-sm text-foreground mb-2">Kan ik opzeggen?</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {recurring
                        ? "Ja. Na de minimale looptijd van 8 weken zeg je op met 4 weken opzegtermijn."
                        : "Rittenkaarten zijn eenmalige aankopen — geen abonnement, niets om op te zeggen."}
                    </p>
                  </div>
                  <div className="p-4 rounded-lg border border-border bg-card">
                    <p className="font-heading text-sm text-foreground mb-2">Krijg ik een factuur?</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Ja. Direct na betaling ontvang je per e-mail een bevestiging met factuur.
                    </p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <p>Accepteer de algemene voorwaarden om door te gaan met betalen.</p>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}