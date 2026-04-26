import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { supabase } from "@/integrations/supabase/client";
import { getStoredRef } from "@/lib/referral";

interface StripeEmbeddedCheckoutProps {
  priceId: string;
  productName?: string;
  quantity?: number;
  customerEmail?: string;
  returnUrl?: string;
}

export function StripeEmbeddedCheckout({
  priceId,
  productName,
  quantity,
  customerEmail,
  returnUrl,
}: StripeEmbeddedCheckoutProps) {
  const fetchClientSecret = async (): Promise<string> => {
    const referrerCode = getStoredRef();
    const { data, error } = await supabase.functions.invoke("create-checkout", {
      body: {
        priceId,
        productName,
        quantity,
        customerEmail,
        returnUrl,
        environment: getStripeEnvironment(),
        referrerCode,
      },
    });
    if (error || !data?.clientSecret) {
      throw new Error(error?.message || "Failed to create checkout session");
    }
    return data.clientSecret;
  };

  return (
    <div id="checkout">
      <EmbeddedCheckoutProvider stripe={getStripe()} options={{ fetchClientSecret }}>
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  );
}
