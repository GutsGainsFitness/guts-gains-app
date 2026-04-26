import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Check, Mail, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

interface DeletionRequest {
  id: string;
  title: string;
  body: string | null;
  metadata: { email?: string; name?: string | null; submitted_at?: string; user_agent?: string | null } | null;
  created_at: string;
}

const AccountDeletionRequests = () => {
  const [items, setItems] = useState<DeletionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    const { data, error } = await supabase
      .from("admin_notifications")
      .select("id, title, body, metadata, created_at")
      .eq("type", "account_deletion_request")
      .is("read_at", null)
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Kon verzoeken niet laden");
    } else {
      setItems((data as unknown as DeletionRequest[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const markProcessed = async (id: string) => {
    setBusyId(id);
    const { error } = await supabase
      .from("admin_notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", id);
    setBusyId(null);
    if (error) {
      toast.error("Markeren mislukt");
      return;
    }
    toast.success("Verzoek gemarkeerd als verwerkt");
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  if (loading) return null;
  if (items.length === 0) return null;

  return (
    <div className="mb-8 border-2 border-primary/40 bg-card rounded-sm">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border bg-primary/5">
        <Trash2 size={18} className="text-primary" />
        <h2 className="font-heading text-sm tracking-[0.25em] text-foreground">
          OPENSTAANDE VERWIJDERVERZOEKEN ({items.length})
        </h2>
      </div>
      <ul className="divide-y divide-border">
        {items.map((req) => {
          const email = req.metadata?.email ?? req.title.replace(/^Verwijderverzoek:\s*/, "");
          const name = req.metadata?.name;
          return (
            <li key={req.id} className="p-5 flex flex-col md:flex-row md:items-start gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-sm font-body text-foreground">
                  <Mail size={14} className="text-muted-foreground shrink-0" />
                  <a href={`mailto:${email}`} className="truncate hover:text-primary transition-colors">
                    {email}
                  </a>
                  {name && <span className="text-muted-foreground">· {name}</span>}
                </div>
                {req.body && req.body !== "(Geen reden opgegeven)" && (
                  <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">{req.body}</p>
                )}
                <p className="mt-2 text-xs text-muted-foreground">
                  Ingediend {format(new Date(req.created_at), "d MMM yyyy 'om' HH:mm", { locale: nl })}
                </p>
              </div>
              <button
                onClick={() => markProcessed(req.id)}
                disabled={busyId === req.id}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-xs font-heading tracking-wider hover:bg-primary/90 disabled:opacity-50 transition-all rounded-sm shrink-0"
              >
                <Check size={14} /> MARKEER ALS VERWERKT
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default AccountDeletionRequests;
