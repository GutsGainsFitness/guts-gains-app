import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Film, ImageIcon, Loader2, RefreshCw, Sparkles, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ExRow {
  id: string;
  slug: string;
  name: string;
  primary_muscle: string;
  equipment: string;
  image_url: string | null;
}

const AdminExerciseImages = () => {
  const [exercises, setExercises] = useState<ExRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<Record<string, boolean>>({});
  const [batchRunning, setBatchRunning] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ done: 0, total: 0 });
  const [filter, setFilter] = useState<"all" | "missing" | "done">("missing");
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});

  const handleUpload = async (slug: string, file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Alleen afbeeldingen toegestaan");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Max 8MB");
      return;
    }
    setUploading((u) => ({ ...u, [slug]: true }));
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${slug}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("exercise-illustrations")
        .upload(path, file, { contentType: file.type, upsert: true });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("exercise-illustrations").getPublicUrl(path);
      const url = `${pub.publicUrl}?v=${Date.now()}`;
      const { error: updErr } = await supabase
        .from("exercises")
        .update({ image_url: url })
        .eq("slug", slug);
      if (updErr) throw updErr;
      setExercises((rows) => rows.map((r) => (r.slug === slug ? { ...r, image_url: url } : r)));
      toast.success(`${slug} geüpload`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(`${slug}: ${msg}`);
    } finally {
      setUploading((u) => ({ ...u, [slug]: false }));
    }
  };

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("exercises")
      .select("id, slug, name, primary_muscle, equipment, image_url")
      .order("primary_muscle")
      .order("name");
    if (error) toast.error("Laden mislukt");
    setExercises((data as ExRow[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = exercises.filter((e) =>
    filter === "all" ? true : filter === "missing" ? !e.image_url : !!e.image_url
  );

  const reasonLabel = (reason?: string) => {
    if (!reason) return "overgeslagen";
    if (reason === "RATE_LIMIT") return "rate limit — probeer later opnieuw";
    if (reason === "PROHIBITED_CONTENT") return "geblokkeerd door AI safety — upload eigen foto";
    if (reason === "PAYMENT_REQUIRED") return "AI credits op";
    if (reason === "NO_IMAGE") return "geen afbeelding terug";
    if (reason === "EXISTS") return "bestaat al";
    return reason;
  };

  const generate = async (slug: string, force = false): Promise<"ok" | "skipped" | "error"> => {
    setGenerating((g) => ({ ...g, [slug]: true }));
    try {
      const { data, error } = await supabase.functions.invoke("generate-exercise-image", {
        body: { slug, force },
      });
      if (error) throw error;
      if (data?.ok && data?.image_url) {
        toast.success(`${slug} klaar`);
        setExercises((rows) =>
          rows.map((r) => (r.slug === slug ? { ...r, image_url: data.image_url } : r))
        );
        return "ok";
      }
      if (data?.skipped) {
        const label = reasonLabel(data.reason);
        if (data.reason === "EXISTS") toast.info(`${slug}: ${label}`);
        else toast.warning(`${slug}: ${label}`);
        return "skipped";
      }
      throw new Error(data?.error || "Onbekende fout");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(`${slug}: ${msg}`);
      return "error";
    } finally {
      setGenerating((g) => ({ ...g, [slug]: false }));
    }
  };

  const runBatch = async () => {
    const todo = exercises.filter((e) => !e.image_url);
    if (!todo.length) {
      toast.info("Alle illustraties zijn al gegenereerd");
      return;
    }
    if (!confirm(`${todo.length} illustraties genereren? Dit kost AI credits en duurt enkele minuten.`)) return;
    setBatchRunning(true);
    setBatchProgress({ done: 0, total: todo.length });
    let done = 0;
    let okCount = 0;
    let skipCount = 0;
    for (const ex of todo) {
      const status = await generate(ex.slug, false);
      if (status === "ok") okCount++;
      else skipCount++;
      done++;
      setBatchProgress({ done, total: todo.length });
      // longer delay to avoid Gemini rate limits (free tier ~10/min)
      await new Promise((r) => setTimeout(r, 6500));
    }
    setBatchRunning(false);
    toast.success(`Batch klaar — ${okCount} gegenereerd, ${skipCount} overgeslagen`);
  };

  const filledCount = exercises.filter((e) => e.image_url).length;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto p-6 md:p-10">
        <Link
          to="/admin"
          className="inline-flex items-center gap-2 text-xs font-heading tracking-wider text-muted-foreground hover:text-primary mb-6"
        >
          <ArrowLeft size={14} /> ADMIN
        </Link>

        <Link
          to="/admin/oefeningen"
          className="ml-3 inline-flex items-center gap-2 text-xs font-heading tracking-wider text-primary hover:underline mb-6"
        >
          <Film size={14} /> OEFENINGEN MEDIA (THUMB + VIDEO'S)
        </Link>

        <div className="flex items-start justify-between mb-8 flex-wrap gap-4">
          <div>
            <p className="text-primary font-heading text-xs tracking-[0.35em] mb-2">CONTENT</p>
            <h1 className="text-3xl font-heading text-foreground">OEFENING ILLUSTRATIES</h1>
            <p className="text-sm text-muted-foreground mt-2">
              {filledCount} / {exercises.length} klaar — AI gegenereerd via Lovable AI Gateway (Gemini Nano Banana).
            </p>
          </div>
          <button
            onClick={runBatch}
            disabled={batchRunning || loading}
            className="px-5 h-12 bg-primary text-primary-foreground font-heading text-sm tracking-wider rounded-sm flex items-center gap-2 hover:bg-primary/90 disabled:opacity-50"
          >
            {batchRunning ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                {batchProgress.done}/{batchProgress.total}
              </>
            ) : (
              <>
                <Sparkles size={16} /> GENEREER ONTBREKEND
              </>
            )}
          </button>
        </div>

        {/* Filter */}
        <div className="flex gap-2 mb-6">
          {(["missing", "done", "all"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs font-heading tracking-wider rounded-sm border transition-colors ${
                filter === f
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:border-primary hover:text-primary"
              }`}
            >
              {f === "missing" ? "ONTBREEKT" : f === "done" ? "KLAAR" : "ALLES"}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-muted-foreground text-sm">Laden...</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {filtered.map((ex) => {
              const busy = !!generating[ex.slug];
              const up = !!uploading[ex.slug];
              return (
                <div key={ex.id} className="border border-border bg-card rounded-sm overflow-hidden">
                  <div className="aspect-square bg-muted relative flex items-center justify-center">
                    {ex.image_url ? (
                      <img
                        src={ex.image_url}
                        alt={ex.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <ImageIcon size={32} className="text-muted-foreground/40" />
                    )}
                    {(busy || up) && (
                      <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
                        <Loader2 size={24} className="animate-spin text-primary" />
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="font-heading text-foreground text-sm truncate">{ex.name}</p>
                    <p className="text-[10px] text-muted-foreground capitalize mt-0.5 truncate">
                      {ex.primary_muscle.replace("_", " ")} • {ex.equipment}
                    </p>
                    <input
                      ref={(el) => { fileInputs.current[ex.slug] = el; }}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleUpload(ex.slug, f);
                        e.target.value = "";
                      }}
                    />
                    <button
                      onClick={() => fileInputs.current[ex.slug]?.click()}
                      disabled={busy || up || batchRunning}
                      className="mt-2 w-full text-[10px] font-heading tracking-wider bg-primary/10 border border-primary/40 text-primary rounded-sm py-1.5 hover:bg-primary hover:text-primary-foreground transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      <Upload size={10} />
                      UPLOAD FOTO
                    </button>
                    <button
                      onClick={() => generate(ex.slug, !!ex.image_url)}
                      disabled={busy || up || batchRunning}
                      className="mt-1.5 w-full text-[10px] font-heading tracking-wider border border-border rounded-sm py-1.5 hover:border-primary hover:text-primary text-muted-foreground transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      {ex.image_url ? <RefreshCw size={10} /> : <Sparkles size={10} />}
                      {ex.image_url ? "AI OPNIEUW" : "AI GENEREER"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminExerciseImages;
