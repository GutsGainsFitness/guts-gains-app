import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  Film,
  ImageIcon,
  Loader2,
  Pencil,
  Plus,
  Play,
  Save,
  Search,
  Smartphone,
  Trophy,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import ExerciseMedia from "@/components/app/ExerciseMedia";

type MuscleGroup =
  | "chest" | "back" | "shoulders" | "biceps" | "triceps" | "forearms"
  | "abs" | "obliques" | "glutes" | "quads" | "hamstrings" | "calves"
  | "traps" | "lats" | "lower_back" | "full_body" | "cardio";

type Equipment =
  | "barbell" | "dumbbell" | "machine" | "cable" | "bodyweight"
  | "kettlebell" | "band" | "other";

type Difficulty = "beginner" | "intermediate" | "advanced";

interface ExerciseRow {
  id: string;
  slug: string;
  name: string;
  primary_muscle: MuscleGroup;
  equipment: Equipment;
  difficulty: Difficulty;
  image_url: string | null;
  video_url_1: string | null;
  video_url_2: string | null;
  description: string | null;
  instructions: string | null;
  tips: string | null;
}

const MUSCLES: MuscleGroup[] = [
  "chest","back","shoulders","biceps","triceps","forearms","abs","obliques",
  "glutes","quads","hamstrings","calves","traps","lats","lower_back","full_body","cardio",
];
const EQUIPMENT: Equipment[] = [
  "barbell","dumbbell","machine","cable","bodyweight","kettlebell","band","other",
];
const DIFFICULTIES: Difficulty[] = ["beginner","intermediate","advanced"];

const slugify = (s: string) =>
  s.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-").replace(/-+/g, "-");

/** Inline mini player — gedraagt zich als GIF (autoplay, muted, loop, playsInline). */
const InlineLoopVideo = ({
  src,
  poster,
  fit = "cover",
  onMeta,
}: {
  src: string;
  poster?: string | null;
  fit?: "cover" | "contain";
  onMeta?: (w: number, h: number) => void;
}) => (
  <video
    src={src}
    poster={poster ?? undefined}
    autoPlay
    muted
    loop
    playsInline
    preload="metadata"
    {...({ "webkit-playsinline": "true" } as Record<string, string>)}
    disablePictureInPicture
    disableRemotePlayback
    controls={false}
    onLoadedMetadata={(e) => {
      const v = e.currentTarget;
      if (onMeta && v.videoWidth && v.videoHeight) onMeta(v.videoWidth, v.videoHeight);
    }}
    className={`w-full h-full ${fit === "contain" ? "object-contain" : "object-cover"}`}
  />
);

const AdminExerciseMedia = () => {
  const [searchParams] = useSearchParams();
  const [rows, setRows] = useState<ExerciseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const [filterMuscle, setFilterMuscle] = useState<"all" | MuscleGroup>((searchParams.get("muscle") as MuscleGroup | null) ?? "all");
  const statusFilter = searchParams.get("status");
  const [editing, setEditing] = useState<ExerciseRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [previewing, setPreviewing] = useState<ExerciseRow | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("exercises")
      .select("id, slug, name, primary_muscle, equipment, difficulty, image_url, video_url_1, video_url_2, description, instructions, tips")
      .order("primary_muscle")
      .order("name");
    if (error) toast.error(`Laden mislukt: ${error.message}`);
    setRows((data as ExerciseRow[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (filterMuscle !== "all" && r.primary_muscle !== filterMuscle) return false;
      if (statusFilter === "incomplete" && (!!r.image_url && !!r.video_url_1 && !!r.video_url_2)) return false;
      if (q && !r.name.toLowerCase().includes(q) && !r.slug.includes(q)) return false;
      return true;
    });
  }, [rows, search, filterMuscle, statusFilter]);

  const stats = useMemo(() => {
    const total = rows.length;
    const withThumb = rows.filter((r) => r.image_url).length;
    const withVideo = rows.filter((r) => r.video_url_1 || r.video_url_2).length;
    const fullyDone = rows.filter((r) => r.image_url && r.video_url_1 && r.video_url_2).length;
    return { total, withThumb, withVideo, fullyDone };
  }, [rows]);

  const handleDelete = async (row: ExerciseRow) => {
    if (!confirm(`Oefening "${row.name}" definitief verwijderen?`)) return;
    const { error } = await supabase.from("exercises").delete().eq("id", row.id);
    if (error) {
      toast.error(`Verwijderen mislukt: ${error.message}`);
      return;
    }
    setRows((r) => r.filter((x) => x.id !== row.id));
    toast.success("Verwijderd");
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-6 md:p-10">
        <Link
          to="/admin"
          className="inline-flex items-center gap-2 text-xs font-heading tracking-wider text-muted-foreground hover:text-primary mb-6"
        >
          <ArrowLeft size={14} /> ADMIN
        </Link>

        <div className="flex items-start justify-between mb-8 flex-wrap gap-4">
          <div>
            <p className="text-primary font-heading text-xs tracking-[0.35em] mb-2">CONTENT</p>
            <h1 className="text-3xl font-heading text-foreground">OEFENINGEN MEDIA</h1>
            <p className="text-sm text-muted-foreground mt-2">
              {stats.total} oefeningen — {stats.withThumb} met thumbnail • {stats.withVideo} met minstens 1 video • {stats.fullyDone} compleet
            </p>
          </div>
          <button
            onClick={() => setCreating(true)}
            className="px-5 h-12 bg-primary text-primary-foreground font-heading text-sm tracking-wider rounded-sm flex items-center gap-2 hover:bg-primary/90"
          >
            <Plus size={16} /> NIEUWE OEFENING
          </button>
        </div>

        <div className="flex flex-wrap gap-3 mb-6">
          <div className="relative flex-1 min-w-[220px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Zoek op naam of slug..."
              className="w-full h-10 pl-9 pr-3 bg-card border border-border rounded-sm text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
            />
          </div>
          <select
            value={filterMuscle}
            onChange={(e) => setFilterMuscle(e.target.value as typeof filterMuscle)}
            className="h-10 px-3 bg-card border border-border rounded-sm text-sm text-foreground focus:outline-none focus:border-primary"
          >
            <option value="all">Alle spiergroepen</option>
            {MUSCLES.map((m) => (
              <option key={m} value={m}>{m.replace("_", " ")}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-64 w-full rounded-sm" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-muted-foreground text-sm">Geen oefeningen gevonden.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((row) => (
              <RowCard
                key={row.id}
                row={row}
                onEdit={() => setEditing(row)}
                onDelete={() => handleDelete(row)}
                onPreview={() => setPreviewing(row)}
              />
            ))}
          </div>
        )}
      </div>

      {(editing || creating) && (
        <ExerciseDialog
          row={editing}
          isCreate={creating}
          existingSlugs={rows.map((r) => r.slug)}
          onClose={() => { setEditing(null); setCreating(false); }}
          onSaved={(saved) => {
            setRows((prev) => {
              const idx = prev.findIndex((p) => p.id === saved.id);
              if (idx === -1) return [...prev, saved];
              const copy = [...prev];
              copy[idx] = saved;
              return copy;
            });
            setEditing(null);
            setCreating(false);
          }}
        />
      )}

      {previewing && (
        <PreviewDialog row={previewing} onClose={() => setPreviewing(null)} />
      )}
    </div>
  );
};

/** ====== Card preview ====== */
const getMediaStatus = (row: ExerciseRow) => {
  if (!row.image_url) {
    return {
      label: "THUMBNAIL ONTBREEKT",
      className: "bg-destructive/10 text-destructive border border-destructive/30",
      dotClassName: "bg-destructive",
    };
  }

  if (!row.video_url_1 || !row.video_url_2) {
    return {
      label: "VIDEO ONTBREEKT",
      className: "bg-primary/10 text-primary border border-primary/30",
      dotClassName: "bg-primary",
    };
  }

  return {
    label: "ALLES COMPLEET",
    className: "bg-secondary text-secondary-foreground border border-border",
    dotClassName: "bg-primary",
  };
};

const RowCard = ({
  row,
  onEdit,
  onDelete,
  onPreview,
}: {
  row: ExerciseRow;
  onEdit: () => void;
  onDelete: () => void;
  onPreview: () => void;
}) => {
  const mediaStatus = getMediaStatus(row);

  return (
    <div className="border border-border bg-card rounded-sm overflow-hidden flex flex-col">
      <div className="grid grid-cols-3 gap-1 bg-background">
        <div className="aspect-square bg-muted relative flex items-center justify-center overflow-hidden">
          {row.image_url ? (
            <img src={row.image_url} alt={row.name} className="w-full h-full object-cover" loading="lazy" />
          ) : (
            <ImageIcon size={20} className="text-muted-foreground/40" />
          )}
          <span className="absolute bottom-1 left-1 text-[8px] font-heading tracking-wider bg-background/80 px-1 py-0.5 rounded-sm text-muted-foreground">
            THUMB
          </span>
        </div>
        <div className="aspect-square bg-muted relative flex items-center justify-center overflow-hidden">
          {row.video_url_1 ? (
            <InlineLoopVideo src={row.video_url_1} poster={row.image_url} />
          ) : (
            <Film size={20} className="text-muted-foreground/40" />
          )}
          <span className="absolute bottom-1 left-1 text-[8px] font-heading tracking-wider bg-background/80 px-1 py-0.5 rounded-sm text-muted-foreground">
            V1
          </span>
        </div>
        <div className="aspect-square bg-muted relative flex items-center justify-center overflow-hidden">
          {row.video_url_2 ? (
            <InlineLoopVideo src={row.video_url_2} poster={row.image_url} />
          ) : (
            <Film size={20} className="text-muted-foreground/40" />
          )}
          <span className="absolute bottom-1 left-1 text-[8px] font-heading tracking-wider bg-background/80 px-1 py-0.5 rounded-sm text-muted-foreground">
            V2
          </span>
        </div>
      </div>
      <div className="p-3 flex-1 flex flex-col">
        <p className="font-heading text-foreground text-sm truncate">{row.name}</p>
        <p className="text-[10px] text-muted-foreground capitalize mt-0.5 truncate">
          {row.primary_muscle.replace("_", " ")} • {row.equipment} • {row.difficulty}
        </p>
        <div className="mt-2">
          <span className={`inline-flex items-center gap-1.5 rounded-sm px-2 py-1 text-[9px] font-heading tracking-wider ${mediaStatus.className}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${mediaStatus.dotClassName}`} />
            {mediaStatus.label}
          </span>
        </div>
        <div className="mt-auto pt-3 grid grid-cols-3 gap-2">
          <button
            onClick={onPreview}
            className="text-[10px] font-heading tracking-wider bg-foreground/5 border border-foreground/20 text-foreground rounded-sm py-1.5 hover:bg-foreground hover:text-background transition-colors flex items-center justify-center gap-1.5"
          >
            <Play size={10} /> PREVIEW
          </button>
          <button
            onClick={onEdit}
            className="text-[10px] font-heading tracking-wider bg-primary/10 border border-primary/40 text-primary rounded-sm py-1.5 hover:bg-primary hover:text-primary-foreground transition-colors flex items-center justify-center gap-1.5"
          >
            <Pencil size={10} /> BEWERK
          </button>
          <button
            onClick={onDelete}
            className="text-[10px] font-heading tracking-wider border border-border rounded-sm py-1.5 hover:border-destructive hover:text-destructive text-muted-foreground transition-colors flex items-center justify-center gap-1.5"
          >
            <Trash2 size={10} /> VERWIJDER
          </button>
        </div>
      </div>
    </div>
  );
};

/** ====== Edit / create dialog ====== */
interface DialogProps {
  row: ExerciseRow | null;
  isCreate: boolean;
  existingSlugs: string[];
  onClose: () => void;
  onSaved: (row: ExerciseRow) => void;
}

const ExerciseDialog = ({ row, isCreate, existingSlugs, onClose, onSaved }: DialogProps) => {
  const [name, setName] = useState(row?.name ?? "");
  const [slug, setSlug] = useState(row?.slug ?? "");
  const [primary, setPrimary] = useState<MuscleGroup>(row?.primary_muscle ?? "chest");
  const [equipment, setEquipment] = useState<Equipment>(row?.equipment ?? "bodyweight");
  const [difficulty, setDifficulty] = useState<Difficulty>(row?.difficulty ?? "beginner");
  const [imageUrl, setImageUrl] = useState(row?.image_url ?? "");
  const [video1, setVideo1] = useState(row?.video_url_1 ?? "");
  const [video2, setVideo2] = useState(row?.video_url_2 ?? "");
  const [description, setDescription] = useState(row?.description ?? "");
  const [instructions, setInstructions] = useState(row?.instructions ?? "");
  const [tips, setTips] = useState(row?.tips ?? "");
  const [saving, setSaving] = useState(false);

  // Auto-slug bij create
  useEffect(() => {
    if (isCreate) setSlug(slugify(name));
  }, [name, isCreate]);

  const uploadFile = async (
    file: File,
    kind: "image" | "video",
    suffix: "thumb" | "v1" | "v2",
  ): Promise<string | null> => {
    const baseSlug = slug || slugify(name) || `tmp-${Date.now()}`;
    if (kind === "image" && !file.type.startsWith("image/")) {
      toast.error("Alleen afbeeldingen toegestaan");
      return null;
    }
    if (kind === "video" && !file.type.startsWith("video/")) {
      toast.error("Alleen video's toegestaan (mp4 of webm)");
      return null;
    }
    const maxSize = kind === "image" ? 8 * 1024 * 1024 : 25 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error(`Bestand te groot (max ${kind === "image" ? "8" : "25"}MB)`);
      return null;
    }
    const ext = (file.name.split(".").pop() || (kind === "image" ? "jpg" : "mp4")).toLowerCase();
    const path = `${baseSlug}-${suffix}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("exercise-illustrations")
      .upload(path, file, { contentType: file.type, upsert: true, cacheControl: "604800" });
    if (upErr) {
      toast.error(`Upload mislukt: ${upErr.message}`);
      return null;
    }
    const { data: pub } = supabase.storage.from("exercise-illustrations").getPublicUrl(path);
    return `${pub.publicUrl}?v=${Date.now()}`;
  };

  const handleSave = async () => {
    if (!name.trim()) return toast.error("Naam is verplicht");
    if (!slug.trim()) return toast.error("Slug is verplicht");
    if (isCreate && existingSlugs.includes(slug)) return toast.error("Slug bestaat al");

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        slug: slug.trim(),
        primary_muscle: primary,
        equipment,
        difficulty,
        image_url: imageUrl || null,
        video_url_1: video1 || null,
        video_url_2: video2 || null,
        description: description || null,
        instructions: instructions || null,
        tips: tips || null,
      };

      if (isCreate) {
        const { data, error } = await supabase
          .from("exercises")
          .insert(payload)
          .select("id, slug, name, primary_muscle, equipment, difficulty, image_url, video_url_1, video_url_2, description, instructions, tips")
          .single();
        if (error) throw error;
        onSaved(data as ExerciseRow);
        toast.success("Oefening aangemaakt");
      } else if (row) {
        const { data, error } = await supabase
          .from("exercises")
          .update(payload)
          .eq("id", row.id)
          .select("id, slug, name, primary_muscle, equipment, difficulty, image_url, video_url_1, video_url_2, description, instructions, tips")
          .single();
        if (error) throw error;
        onSaved(data as ExerciseRow);
        toast.success("Opgeslagen");
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(`Opslaan mislukt: ${msg}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm overflow-y-auto">
      <div className="min-h-screen flex items-start justify-center p-4 md:p-8">
        <div className="w-full max-w-4xl bg-card border border-border rounded-sm shadow-2xl">
          <div className="flex items-center justify-between p-5 border-b border-border">
            <h2 className="font-heading text-xl tracking-wider text-foreground">
              {isCreate ? "NIEUWE OEFENING" : `BEWERK: ${row?.name}`}
            </h2>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground" aria-label="Sluiten">
              <X size={20} />
            </button>
          </div>

          <div className="p-5 space-y-5">
            {/* Basisvelden */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Naam">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full h-10 px-3 bg-background border border-border rounded-sm text-sm text-foreground focus:outline-none focus:border-primary"
                />
              </Field>
              <Field label="Slug" hint="Wordt automatisch ingevuld bij nieuwe oefening">
                <input
                  value={slug}
                  onChange={(e) => setSlug(slugify(e.target.value))}
                  className="w-full h-10 px-3 bg-background border border-border rounded-sm text-sm text-foreground focus:outline-none focus:border-primary"
                />
              </Field>
              <Field label="Primaire spier">
                <select
                  value={primary}
                  onChange={(e) => setPrimary(e.target.value as MuscleGroup)}
                  className="w-full h-10 px-3 bg-background border border-border rounded-sm text-sm text-foreground focus:outline-none focus:border-primary"
                >
                  {MUSCLES.map((m) => <option key={m} value={m}>{m.replace("_", " ")}</option>)}
                </select>
              </Field>
              <Field label="Materiaal">
                <select
                  value={equipment}
                  onChange={(e) => setEquipment(e.target.value as Equipment)}
                  className="w-full h-10 px-3 bg-background border border-border rounded-sm text-sm text-foreground focus:outline-none focus:border-primary"
                >
                  {EQUIPMENT.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </Field>
              <Field label="Niveau">
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as Difficulty)}
                  className="w-full h-10 px-3 bg-background border border-border rounded-sm text-sm text-foreground focus:outline-none focus:border-primary"
                >
                  {DIFFICULTIES.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </Field>
            </div>

            {/* Media */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <MediaSlot
                label="Thumbnail (image_url)"
                accept="image/*"
                kind="image"
                value={imageUrl}
                onChange={setImageUrl}
                upload={(file) => uploadFile(file, "image", "thumb")}
                hint="Wordt gebruikt als poster voor de video's. JPG/PNG/WebP, max 8MB."
              />
              <MediaSlot
                label="Video 1 (video_url_1)"
                accept="video/mp4,video/webm"
                kind="video"
                value={video1}
                onChange={setVideo1}
                upload={(file) => uploadFile(file, "video", "v1")}
                poster={imageUrl}
                hint="MP4 (voorkeur) of WebM. 3-8 sec loop, max 25MB."
              />
              <MediaSlot
                label="Video 2 (video_url_2)"
                accept="video/mp4,video/webm"
                kind="video"
                value={video2}
                onChange={setVideo2}
                upload={(file) => uploadFile(file, "video", "v2")}
                poster={imageUrl}
                hint="Optioneel tweede hoek. Zelfde formaat."
              />
            </div>

            {/* Tekst */}
            <Field label="Korte omschrijving">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 bg-background border border-border rounded-sm text-sm text-foreground focus:outline-none focus:border-primary"
              />
            </Field>
            <Field label="Uitvoering / instructies">
              <textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                rows={5}
                className="w-full px-3 py-2 bg-background border border-border rounded-sm text-sm text-foreground focus:outline-none focus:border-primary"
              />
            </Field>
            <Field label="Tips">
              <textarea
                value={tips}
                onChange={(e) => setTips(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 bg-background border border-border rounded-sm text-sm text-foreground focus:outline-none focus:border-primary"
              />
            </Field>
          </div>

          <div className="flex items-center justify-end gap-3 p-5 border-t border-border">
            <button
              onClick={onClose}
              disabled={saving}
              className="px-4 h-10 border border-border text-muted-foreground hover:text-foreground hover:border-foreground rounded-sm text-xs font-heading tracking-wider"
            >
              ANNULEREN
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-5 h-10 bg-primary text-primary-foreground hover:bg-primary/90 rounded-sm text-xs font-heading tracking-wider flex items-center gap-2 disabled:opacity-60"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              OPSLAAN
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const Field = ({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) => (
  <div>
    <label className="block text-[11px] font-heading tracking-wider text-muted-foreground mb-1.5">
      {label}
    </label>
    {children}
    {hint && <p className="text-[10px] text-muted-foreground mt-1">{hint}</p>}
  </div>
);

/** Media slot — preview + upload + URL input. */
const MediaSlot = ({
  label,
  accept,
  kind,
  value,
  onChange,
  upload,
  poster,
  hint,
}: {
  label: string;
  accept: string;
  kind: "image" | "video";
  value: string;
  onChange: (v: string) => void;
  upload: (file: File) => Promise<string | null>;
  poster?: string | null;
  hint?: string;
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [cropMode, setCropMode] = useState<"app" | "frame">("app");
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null);

  const handleFile = async (file: File) => {
    setBusy(true);
    const url = await upload(file);
    setBusy(false);
    if (url) {
      onChange(url);
      toast.success("Geüpload");
    }
  };

  return (
    <div className="border border-border bg-background rounded-sm p-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[11px] font-heading tracking-wider text-muted-foreground">{label}</p>
        {value && !busy && (
          <div className="flex items-center gap-1 bg-card border border-border rounded-sm p-0.5">
            <button
              type="button"
              onClick={() => setCropMode("app")}
              className={`text-[9px] font-heading tracking-wider px-1.5 py-0.5 rounded-sm transition-colors ${
                cropMode === "app"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Zo ziet de gebruiker de tegel: 1:1 cover"
            >
              APP
            </button>
            <button
              type="button"
              onClick={() => setCropMode("frame")}
              className={`text-[9px] font-heading tracking-wider px-1.5 py-0.5 rounded-sm transition-colors ${
                cropMode === "frame"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Volledig frame met cropbox-overlay"
            >
              FRAME
            </button>
          </div>
        )}
      </div>

      <div
        className={`relative bg-muted overflow-hidden rounded-sm mb-2 ${
          cropMode === "app" || !value ? "aspect-square" : "aspect-video"
        } flex items-center justify-center`}
      >
        {busy ? (
          <Loader2 size={20} className="animate-spin text-primary" />
        ) : value ? (
          kind === "image" ? (
            <img
              src={value}
              alt={label}
              onLoad={(e) => {
                const i = e.currentTarget;
                if (i.naturalWidth && i.naturalHeight) {
                  setNaturalSize({ w: i.naturalWidth, h: i.naturalHeight });
                }
              }}
              className={`w-full h-full ${cropMode === "app" ? "object-cover" : "object-contain"}`}
            />
          ) : (
            <InlineLoopVideo
              src={value}
              poster={poster}
              fit={cropMode === "app" ? "cover" : "contain"}
              onMeta={(w, h) => setNaturalSize({ w, h })}
            />
          )
        ) : kind === "image" ? (
          <ImageIcon size={28} className="text-muted-foreground/40" />
        ) : (
          <Film size={28} className="text-muted-foreground/40" />
        )}

        {/* Cropbox-overlay: alleen in FRAME-modus, toont waar de 1:1 app-tegel het frame snijdt */}
        {value && !busy && cropMode === "frame" && naturalSize && (
          <CropOverlay naturalW={naturalSize.w} naturalH={naturalSize.h} />
        )}

        {value && !busy && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute top-1 right-1 bg-background/80 text-muted-foreground hover:text-destructive p-1 rounded-sm z-10"
            aria-label="Wissen"
          >
            <X size={12} />
          </button>
        )}
      </div>

      {value && !busy && naturalSize && (
        <p className="text-[9px] text-muted-foreground mb-2 leading-tight">
          {cropMode === "app" ? (
            <>Exact zoals klant ziet (1:1 crop, midden).</>
          ) : (
            <>
              Bron: {naturalSize.w}×{naturalSize.h}. Rode kader = wat zichtbaar wordt in app.
              {Math.abs(naturalSize.w - naturalSize.h) > 4 && (
                <> {naturalSize.w > naturalSize.h ? "Links/rechts" : "Boven/onder"} wordt afgesneden.</>
              )}
            </>
          )}
        </p>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = "";
        }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="w-full text-[10px] font-heading tracking-wider bg-primary/10 border border-primary/40 text-primary rounded-sm py-1.5 hover:bg-primary hover:text-primary-foreground transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 mb-2"
      >
        <Upload size={10} /> UPLOAD BESTAND
      </button>
      <input
        type="url"
        value={value}
        onChange={(e) => { onChange(e.target.value); setNaturalSize(null); }}
        placeholder="of plak een URL"
        className="w-full h-8 px-2 bg-card border border-border rounded-sm text-xs text-foreground focus:outline-none focus:border-primary"
      />
      {hint && <p className="text-[10px] text-muted-foreground mt-1.5 leading-relaxed">{hint}</p>}
    </div>
  );
};

/**
 * Tekent een rood kader over het zichtbare videoframe dat exact aangeeft
 * welk gedeelte van de bron in de 1:1 app-tegel terecht komt (object-cover, midden).
 * Werkt in FRAME-modus waar de container `aspect-video` is en de bron via
 * `object-contain` getoond wordt; we berekenen waar de bron daadwerkelijk
 * gerenderd staat binnen de container, en projecteren de centrale 1:1 crop daar bovenop.
 */
const CropOverlay = ({ naturalW, naturalH }: { naturalW: number; naturalH: number }) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const [box, setBox] = useState<{ left: number; top: number; size: number } | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const compute = () => {
      const cw = el.clientWidth;
      const ch = el.clientHeight;
      if (!cw || !ch) return;
      const srcAspect = naturalW / naturalH;
      const contAspect = cw / ch;
      // Bepaal hoe object-contain de bron rendert binnen de container.
      let renderedW: number;
      let renderedH: number;
      if (srcAspect > contAspect) {
        renderedW = cw;
        renderedH = cw / srcAspect;
      } else {
        renderedH = ch;
        renderedW = ch * srcAspect;
      }
      const offsetX = (cw - renderedW) / 2;
      const offsetY = (ch - renderedH) / 2;
      // Centrale 1:1 crop op de bron = vierkant met zijde min(renderedW, renderedH).
      const cropSize = Math.min(renderedW, renderedH);
      const cropLeft = offsetX + (renderedW - cropSize) / 2;
      const cropTop = offsetY + (renderedH - cropSize) / 2;
      setBox({ left: cropLeft, top: cropTop, size: cropSize });
    };
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    return () => ro.disconnect();
  }, [naturalW, naturalH]);

  return (
    <div ref={ref} className="absolute inset-0 pointer-events-none">
      {box && (
        <>
          {/* Donkere "bars" buiten de cropbox */}
          <div
            className="absolute bg-background/60"
            style={{ left: 0, top: 0, width: `${box.left}px`, height: "100%" }}
          />
          <div
            className="absolute bg-background/60"
            style={{ left: `${box.left + box.size}px`, top: 0, right: 0, height: "100%" }}
          />
          <div
            className="absolute bg-background/60"
            style={{ left: `${box.left}px`, top: 0, width: `${box.size}px`, height: `${box.top}px` }}
          />
          <div
            className="absolute bg-background/60"
            style={{
              left: `${box.left}px`,
              top: `${box.top + box.size}px`,
              width: `${box.size}px`,
              bottom: 0,
            }}
          />
          {/* Rode crop-rand */}
          <div
            className="absolute border-2 border-primary shadow-[0_0_0_1px_hsl(var(--background))]"
            style={{
              left: `${box.left}px`,
              top: `${box.top}px`,
              width: `${box.size}px`,
              height: `${box.size}px`,
            }}
          >
            <span className="absolute -top-4 left-0 text-[8px] font-heading tracking-wider text-primary bg-background/90 px-1 rounded-sm">
              APP CROP 1:1
            </span>
          </div>
        </>
      )}
    </div>
  );
};

/** ====== Live preview dialog — gebruikt exact dezelfde ExerciseMedia als de workout UI ====== */
const PreviewDialog = ({ row, onClose }: { row: ExerciseRow; onClose: () => void }) => {
  // ESC sluit modaal
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const [tab, setTab] = useState<"detail" | "mobile">("detail");

  return (
    <div className="fixed inset-0 z-50 bg-background/90 backdrop-blur-sm overflow-y-auto">
      <div className="min-h-screen flex items-start justify-center p-4 md:p-8">
        <div className={`w-full ${tab === "mobile" ? "max-w-2xl" : "max-w-md"} bg-card border border-border rounded-sm shadow-2xl transition-all`}>
          <div className="flex items-center justify-between p-4 border-b border-border gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-heading tracking-[0.3em] text-primary mb-0.5">LIVE PREVIEW</p>
              <h2 className="font-heading text-base tracking-wider text-foreground truncate">{row.name}</h2>
            </div>

            <div className="flex items-center bg-background border border-border rounded-sm p-0.5 shrink-0">
              <button
                onClick={() => setTab("detail")}
                className={`text-[10px] font-heading tracking-wider px-2.5 py-1 rounded-sm transition-colors flex items-center gap-1 ${
                  tab === "detail"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Play size={10} /> DETAIL
              </button>
              <button
                onClick={() => setTab("mobile")}
                className={`text-[10px] font-heading tracking-wider px-2.5 py-1 rounded-sm transition-colors flex items-center gap-1 ${
                  tab === "mobile"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Smartphone size={10} /> MOBIEL
              </button>
            </div>

            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground shrink-0"
              aria-label="Sluiten"
            >
              <X size={20} />
            </button>
          </div>

          {tab === "detail" ? (
            <div className="p-4">
              <ExerciseMedia
                exerciseName={row.name}
                imageUrl={row.image_url}
                videoUrl1={row.video_url_1}
                videoUrl2={row.video_url_2}
              />

              <div className="space-y-3 mt-2">
                <div>
                  <p className="text-[10px] font-heading tracking-wider text-muted-foreground mb-1">SPIERGROEP</p>
                  <p className="text-sm text-foreground capitalize">
                    {row.primary_muscle.replace("_", " ")} • {row.equipment} • {row.difficulty}
                  </p>
                </div>
                {row.description && (
                  <div>
                    <p className="text-[10px] font-heading tracking-wider text-muted-foreground mb-1">OMSCHRIJVING</p>
                    <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">{row.description}</p>
                  </div>
                )}
                {row.instructions && (
                  <div>
                    <p className="text-[10px] font-heading tracking-wider text-muted-foreground mb-1">UITVOERING</p>
                    <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">{row.instructions}</p>
                  </div>
                )}
                {row.tips && (
                  <div>
                    <p className="text-[10px] font-heading tracking-wider text-muted-foreground mb-1">TIPS</p>
                    <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">{row.tips}</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <MobileTilePreview row={row} />
          )}

          <div className="flex items-center justify-end gap-3 p-4 border-t border-border">
            <p className="text-[10px] text-muted-foreground mr-auto">
              {tab === "detail"
                ? "Zo zien gebruikers deze oefening in de workout."
                : "Echte schaal: 375×812 (iPhone 13/14). Layout en spacing 1:1 met de app-tegel."}
            </p>
            <button
              onClick={onClose}
              className="px-4 h-9 border border-border text-muted-foreground hover:text-foreground hover:border-foreground rounded-sm text-xs font-heading tracking-wider"
            >
              SLUITEN
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Mobiele preview — toont een 375x812 telefoonframe (notch + home-indicator)
 * met daarbinnen exact dezelfde card-styling, spacing en typografie als
 * AppWorkoutSession's "huidige oefening" tegel. Gebruikt ExerciseMedia
 * (lazy load + autoplay/pause buiten beeld).
 */
const MobileTilePreview = ({ row }: { row: ExerciseRow }) => {
  return (
    <div className="bg-background/40 p-6 flex justify-center">
      {/* iPhone-frame */}
      <div
        className="relative bg-foreground/90 rounded-[44px] p-[10px] shadow-2xl"
        style={{ width: 375 + 20, height: 812 + 20 }}
      >
        {/* Scherm */}
        <div
          className="relative bg-background rounded-[34px] overflow-hidden"
          style={{ width: 375, height: 812 }}
        >
          {/* Notch */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 z-20 w-[150px] h-[28px] bg-foreground rounded-b-2xl" />

          {/* App-content — scrollbaar, exact dezelfde stijl als AppWorkoutSession current-exercise card */}
          <div className="h-full overflow-y-auto pt-[40px] pb-[28px] px-4">
            <div className="border-2 border-primary/30 bg-card p-5 rounded-sm">
              <div className="mb-4 flex gap-4">
                {row.image_url && (
                  <img
                    src={row.image_url}
                    alt={row.name}
                    loading="lazy"
                    className="w-24 h-24 object-cover rounded-sm border border-border flex-shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-heading tracking-wider text-primary">OEFENING 1</p>
                  <h2 className="text-xl font-heading text-foreground mt-1 truncate">{row.name}</h2>
                  <p className="text-xs text-muted-foreground capitalize mt-1">
                    {row.primary_muscle.replace("_", " ")} • doel 3 × 10
                  </p>
                  <p className="text-[10px] font-heading tracking-wider text-primary/80 mt-2 inline-flex items-center gap-1">
                    <Trophy size={10} /> JOUW PR: 60KG × 8
                  </p>
                </div>
              </div>

              <ExerciseMedia
                key={`mobile-${row.id}`}
                exerciseName={row.name}
                imageUrl={row.image_url}
                videoUrl1={row.video_url_1}
                videoUrl2={row.video_url_2}
              />

              {row.description && (
                <p className="text-sm font-heading text-foreground mb-2 leading-relaxed">{row.description}</p>
              )}
              {row.instructions && (
                <p className="text-xs text-muted-foreground mb-3 leading-relaxed">{row.instructions}</p>
              )}
              {row.tips && (
                <p className="text-xs text-primary/80 mb-4 leading-relaxed border-l-2 border-primary/40 pl-3">
                  <span className="font-heading tracking-wider text-[10px] text-primary block mb-1">TIP</span>
                  {row.tips}
                </p>
              )}

              {/* Mock sets-rij voor realistische schaalcheck */}
              <div className="space-y-2">
                <div className="grid grid-cols-12 gap-2 text-[10px] font-heading tracking-wider text-muted-foreground px-1">
                  <div className="col-span-1">SET</div>
                  <div className="col-span-4">REPS</div>
                  <div className="col-span-5">GEWICHT (KG)</div>
                  <div className="col-span-2 text-right">OK</div>
                </div>
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="grid grid-cols-12 gap-2 items-center p-2 rounded-sm bg-background"
                  >
                    <div className="col-span-1 text-sm font-heading text-foreground">{i + 1}</div>
                    <div className="col-span-4 px-2 py-1.5 bg-background border border-border rounded-sm text-sm text-muted-foreground">10</div>
                    <div className="col-span-5 px-2 py-1.5 bg-background border border-border rounded-sm text-sm text-muted-foreground">60</div>
                    <div className="col-span-2 h-9 rounded-sm border border-border" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Home-indicator */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20 w-[120px] h-[5px] bg-foreground rounded-full" />
        </div>
      </div>
    </div>
  );
};

export default AdminExerciseMedia;
