import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getStripeEnvironment } from "@/lib/stripe";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

export default function CheckoutReturn() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [status, setStatus] = useState<"loading" | "paid" | "failed">("loading");
  const [productName, setProductName] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setStatus("failed");
      return;
    }

    const checkStatus = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("checkout-status", {
          body: { sessionId, environment: getStripeEnvironment() },
        });

        if (error || !data) {
          setStatus("failed");
          return;
        }

        setProductName(data.productName);
        setStatus(data.status === "paid" ? "paid" : "failed");
      } catch {
        setStatus("failed");
      }
    };

    checkStatus();
  }, [sessionId]);

  return (
    <>
      <Navbar />
      <main className="pt-24 section-padding min-h-screen">
        <div className="max-w-lg mx-auto text-center">
          {status === "loading" && (
            <>
              <Loader2 className="mx-auto text-primary mb-6 animate-spin" size={64} />
              <h1 className="text-2xl font-heading text-foreground mb-4">BETALING VERIFIËREN...</h1>
            </>
          )}

          {status === "paid" && (
            <>
              <CheckCircle className="mx-auto text-green-500 mb-6" size={64} />
              <h1 className="text-3xl font-heading text-foreground mb-4">BEDANKT VOOR JE AANKOOP!</h1>
              {productName && (
                <p className="text-foreground mb-2 font-heading">{productName}</p>
              )}
              <p className="text-muted-foreground mb-8">
                Je betaling is succesvol verwerkt. Je ontvangt een bevestiging per e-mail.
              </p>
              <Link
                to="/"
                className="inline-flex items-center gap-3 px-10 py-4 bg-primary text-primary-foreground font-heading text-sm tracking-wider hover:bg-primary/90 transition-all"
              >
                TERUG NAAR HOME
              </Link>
            </>
          )}

          {status === "failed" && (
            <>
              <XCircle className="mx-auto text-destructive mb-6" size={64} />
              <h1 className="text-2xl font-heading text-foreground mb-4">BETALING NIET GEVONDEN</h1>
              <p className="text-muted-foreground mb-8">
                Er kon geen succesvolle betaling worden geverifieerd. Neem contact op als je denkt dat dit niet klopt.
              </p>
              <Link
                to="/#tarieven"
                className="inline-flex items-center gap-3 px-10 py-4 border border-border text-foreground font-heading text-sm tracking-wider hover:border-primary hover:text-primary transition-all"
              >
                TERUG NAAR TARIEVEN
              </Link>
            </>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
