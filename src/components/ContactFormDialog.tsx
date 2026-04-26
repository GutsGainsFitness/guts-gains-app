import { useState } from "react";
import { z } from "zod";
import { Loader2, Send, CheckCircle2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const OWNER_EMAIL = "gutsgainsfitness@gmail.com";

const contactSchema = z.object({
  name: z.string().trim().min(2, "Naam is te kort").max(100, "Naam is te lang"),
  email: z.string().trim().email("Ongeldig e-mailadres").max(255),
  phone: z
    .string()
    .trim()
    .max(30, "Telefoonnummer is te lang")
    .optional()
    .or(z.literal("")),
  subject: z
    .string()
    .trim()
    .max(150, "Onderwerp is te lang")
    .optional()
    .or(z.literal("")),
  message: z
    .string()
    .trim()
    .min(10, "Bericht is te kort (min. 10 tekens)")
    .max(2000, "Bericht is te lang (max. 2000 tekens)"),
});

type FormState = {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
};

const empty: FormState = { name: "", email: "", phone: "", subject: "", message: "" };

interface ContactFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ContactFormDialog = ({ open, onOpenChange }: ContactFormDialogProps) => {
  const [form, setForm] = useState<FormState>(empty);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const update = (field: keyof FormState) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = contactSchema.safeParse(form);
    if (!parsed.success) {
      const fieldErrors: Partial<Record<keyof FormState, string>> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof FormState;
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    setSubmitting(true);
    try {
      const data = parsed.data;
      const idempotency = `contact-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

      // 1. Notify the owner (gutsgainsfitness@gmail.com)
      const ownerSend = supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: "contact-notification",
          recipientEmail: OWNER_EMAIL,
          idempotencyKey: `${idempotency}-owner`,
          replyTo: data.email,
          templateData: {
            name: data.name,
            email: data.email,
            phone: data.phone || undefined,
            subject: data.subject || undefined,
            message: data.message,
          },
        },
      });

      // 2. Confirmation to the visitor
      const userSend = supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: "contact-confirmation",
          recipientEmail: data.email,
          idempotencyKey: `${idempotency}-user`,
          templateData: {
            name: data.name,
            message: data.message,
          },
        },
      });

      const [ownerResult] = await Promise.all([ownerSend, userSend]);

      if (ownerResult.error) {
        throw new Error(ownerResult.error.message || "Versturen mislukt");
      }

      setSuccess(true);
      setForm(empty);
      toast({
        title: "Bericht verzonden",
        description: "Je hoort binnen 24 uur van Pablo.",
      });
    } catch (err) {
      console.error("Contact form error:", err);
      toast({
        title: "Versturen mislukt",
        description:
          "Er ging iets mis. Probeer opnieuw of bel direct: 06 528 879 88.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = (next: boolean) => {
    if (!next) {
      setSuccess(false);
      setErrors({});
    }
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg bg-card border-border">
        {success ? (
          <div className="py-8 text-center">
            <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
              <CheckCircle2 className="text-primary" size={32} />
            </div>
            <h3 className="font-heading text-2xl text-foreground mb-3">
              BERICHT VERZONDEN
            </h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
              Bedankt! Je hebt zojuist een bevestiging in je inbox ontvangen.
              Pablo neemt binnen 24 uur persoonlijk contact met je op.
            </p>
            <Button
              onClick={() => handleClose(false)}
              className="bg-primary text-primary-foreground hover:bg-primary/90 font-heading tracking-wider"
            >
              SLUITEN
            </Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="font-heading text-2xl tracking-wide text-foreground">
                STUUR EEN BERICHT
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Vul het formulier in en Pablo reageert binnen 24 uur.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4 mt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field
                  label="Naam *"
                  id="cf-name"
                  value={form.name}
                  onChange={update("name")}
                  error={errors.name}
                  autoComplete="name"
                  disabled={submitting}
                />
                <Field
                  label="E-mail *"
                  id="cf-email"
                  type="email"
                  value={form.email}
                  onChange={update("email")}
                  error={errors.email}
                  autoComplete="email"
                  disabled={submitting}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field
                  label="Telefoon (optioneel)"
                  id="cf-phone"
                  type="tel"
                  value={form.phone}
                  onChange={update("phone")}
                  error={errors.phone}
                  autoComplete="tel"
                  disabled={submitting}
                />
                <Field
                  label="Onderwerp (optioneel)"
                  id="cf-subject"
                  value={form.subject}
                  onChange={update("subject")}
                  error={errors.subject}
                  disabled={submitting}
                />
              </div>

              <div>
                <Label
                  htmlFor="cf-message"
                  className="text-xs font-heading tracking-wider text-foreground"
                >
                  BERICHT *
                </Label>
                <Textarea
                  id="cf-message"
                  rows={5}
                  value={form.message}
                  onChange={update("message")}
                  disabled={submitting}
                  className="mt-1.5 bg-background border-border focus-visible:ring-primary"
                  placeholder="Waarmee kunnen we je helpen?"
                />
                {errors.message && (
                  <p className="text-xs text-destructive mt-1">{errors.message}</p>
                )}
              </div>

              <Button
                type="submit"
                disabled={submitting}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-heading tracking-wider shadow-red"
              >
                {submitting ? (
                  <>
                    <Loader2 className="animate-spin mr-2" size={16} />
                    VERSTUREN...
                  </>
                ) : (
                  <>
                    <Send className="mr-2" size={16} />
                    VERSTUUR BERICHT
                  </>
                )}
              </Button>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

interface FieldProps {
  label: string;
  id: string;
  type?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  autoComplete?: string;
  disabled?: boolean;
}

const Field = ({
  label,
  id,
  type = "text",
  value,
  onChange,
  error,
  autoComplete,
  disabled,
}: FieldProps) => (
  <div>
    <Label
      htmlFor={id}
      className="text-xs font-heading tracking-wider text-foreground"
    >
      {label.toUpperCase()}
    </Label>
    <Input
      id={id}
      type={type}
      value={value}
      onChange={onChange}
      disabled={disabled}
      autoComplete={autoComplete}
      className="mt-1.5 bg-background border-border focus-visible:ring-primary"
    />
    {error && <p className="text-xs text-destructive mt-1">{error}</p>}
  </div>
);

export default ContactFormDialog;
