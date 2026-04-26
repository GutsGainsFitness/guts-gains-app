import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Loader2, CheckCircle2, AlertCircle, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";

type Status = "loading" | "valid" | "already" | "invalid" | "confirming" | "done" | "error";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

const UnsubscribePage = () => {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (!token) {
      setStatus("invalid");
      return;
    }
    const validate = async () => {
      try {
        const res = await fetch(
          `${SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${encodeURIComponent(token)}`,
          { headers: { apikey: SUPABASE_ANON } },
        );
        const data = await res.json();
        if (!res.ok) {
          setStatus("invalid");
          setError(data.error || "Ongeldige link");
          return;
        }
        if (data.valid === false && data.reason === "already_unsubscribed") {
          setStatus("already");
          return;
        }
        if (data.valid) {
          setStatus("valid");
          return;
        }
        setStatus("invalid");
      } catch (e) {
        setStatus("error");
        setError("Kon link niet valideren");
      }
    };
    validate();
  }, [token]);

  const confirm = async () => {
    setStatus("confirming");
    try {
      const res = await fetch(
        `${SUPABASE_URL}/functions/v1/handle-email-unsubscribe`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: SUPABASE_ANON,
          },
          body: JSON.stringify({ token }),
        },
      );
      const data = await res.json();
      if (data.success) {
        setStatus("done");
      } else if (data.reason === "already_unsubscribed") {
        setStatus("already");
      } else {
        setStatus("error");
        setError(data.error || "Er ging iets mis");
      }
    } catch (e) {
      setStatus("error");
      setError("Verbindingsfout");
    }
  };

  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full bg-card border border-border rounded-sm p-8 md:p-10 text-center">
        <div className="w-14 h-14 mx-auto mb-5 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
          {status === "loading" || status === "confirming" ? (
            <Loader2 className="text-primary animate-spin" size={28} />
          ) : status === "done" || status === "already" ? (
            <CheckCircle2 className="text-primary" size={28} />
          ) : status === "valid" ? (
            <Mail className="text-primary" size={28} />
          ) : (
            <AlertCircle className="text-primary" size={28} />
          )}
        </div>

        <h1 className="font-heading text-2xl md:text-3xl text-foreground mb-3 tracking-wide">
          {status === "loading" && "LINK CONTROLEREN..."}
          {status === "valid" && "UITSCHRIJVEN BEVESTIGEN"}
          {status === "confirming" && "BEZIG..."}
          {status === "done" && "JE BENT UITGESCHREVEN"}
          {status === "already" && "AL UITGESCHREVEN"}
          {status === "invalid" && "ONGELDIGE LINK"}
          {status === "error" && "ER GING IETS MIS"}
        </h1>

        <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
          {status === "valid" &&
            "Klik hieronder om je definitief uit te schrijven van e-mails van Guts & Gains Fitness."}
          {status === "done" &&
            "Je ontvangt geen e-mails meer van ons. Je kunt dit venster nu sluiten."}
          {status === "already" &&
            "Dit e-mailadres is al uitgeschreven. Je ontvangt geen e-mails meer van ons."}
          {status === "invalid" &&
            (error || "Deze uitschrijflink is niet langer geldig.")}
          {status === "error" && (error || "Probeer het later opnieuw.")}
        </p>

        {status === "valid" && (
          <Button
            onClick={confirm}
            className="bg-primary text-primary-foreground hover:bg-primary/90 font-heading tracking-wider w-full"
          >
            BEVESTIG UITSCHRIJVEN
          </Button>
        )}

        {(status === "done" || status === "already" || status === "invalid" || status === "error") && (
          <Button asChild variant="outline" className="font-heading tracking-wider w-full">
            <Link to="/">TERUG NAAR HOME</Link>
          </Button>
        )}
      </div>
    </main>
  );
};

export default UnsubscribePage;
