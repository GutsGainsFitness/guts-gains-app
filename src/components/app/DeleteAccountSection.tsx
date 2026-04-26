import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/i18n/LanguageContext";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

/**
 * Hard-delete the calling user's account and ALL personal data via the
 * `delete-account` edge function. Required by Google Play Store policy
 * (since 2024) and by GDPR's right to erasure.
 *
 * UX safeguards before invoking the destructive call:
 *  1. AlertDialog confirmation
 *  2. Type-to-confirm input ("VERWIJDER" / "DELETE" / "ELIMINAR")
 *  3. Final button is disabled until the word matches
 *
 * After success we sign out locally (the auth user is already gone server
 * side, but this clears the cached session) and route back to /app/login.
 */
const DeleteAccountSection = () => {
  const { t } = useLanguage();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  const requiredWord = t("app.profile.delete.confirm_word");
  const canConfirm = confirmText.trim().toUpperCase() === requiredWord.toUpperCase();

  const handleDelete = async () => {
    if (!canConfirm || deleting) return;
    setDeleting(true);
    try {
      const { error } = await supabase.functions.invoke("delete-account", {
        method: "POST",
      });
      if (error) throw error;
      toast.success(t("app.profile.delete.success"));
      // Even though the auth user is already deleted server-side, clear
      // the local session cache so the UI doesn't try to use stale tokens.
      await signOut();
      navigate("/app/login", { replace: true });
    } catch (e) {
      console.error("[delete-account] error:", e);
      toast.error(t("app.profile.delete.failed"));
      setDeleting(false);
    }
  };

  return (
    <div className="mt-10 border-2 border-destructive/40 bg-destructive/5 p-6 rounded-sm">
      <div className="flex items-start gap-3 mb-3">
        <AlertTriangle size={20} className="text-destructive mt-0.5 shrink-0" />
        <div>
          <h2 className="text-sm font-heading tracking-wider text-destructive">
            {t("app.profile.danger.title")}
          </h2>
          <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
            {t("app.profile.danger.subtitle")}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => {
          setConfirmText("");
          setOpen(true);
        }}
        className="mt-2 inline-flex items-center gap-2 px-4 py-2.5 border border-destructive/60 text-destructive hover:bg-destructive hover:text-destructive-foreground font-heading text-xs tracking-wider rounded-sm transition-colors"
      >
        <Trash2 size={14} />
        {t("app.profile.danger.button")}
      </button>

      <AlertDialog open={open} onOpenChange={(o) => !deleting && setOpen(o)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("app.profile.delete.title")}</AlertDialogTitle>
            <AlertDialogDescription>{t("app.profile.delete.body")}</AlertDialogDescription>
          </AlertDialogHeader>

          <div className="my-2">
            <label className="block text-xs font-heading tracking-wider text-muted-foreground mb-1.5">
              {t("app.profile.delete.confirm_label")}
            </label>
            <input
              type="text"
              autoFocus
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={requiredWord}
              disabled={deleting}
              className="w-full px-3 py-2 bg-background border border-border rounded-sm font-mono text-sm text-foreground focus:outline-none focus:border-destructive"
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>
              {t("app.profile.delete.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleDelete();
              }}
              disabled={!canConfirm || deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50 disabled:pointer-events-none"
            >
              {deleting ? t("app.profile.delete.deleting") : t("app.profile.delete.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default DeleteAccountSection;
