import { useEffect, useState } from "react";
import { Camera, Upload, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AppShell from "@/components/app/AppShell";
import { format } from "date-fns";
import { toast } from "sonner";
import { useLanguage } from "@/i18n/LanguageContext";
import { dateLocale } from "@/i18n/dateLocale";

interface Photo {
  id: string;
  photo_date: string;
  photo_type: "front" | "side" | "back";
  storage_path: string;
  signedUrl?: string;
}

const AppPhotos = () => {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const locale = dateLocale(language);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [photoType, setPhotoType] = useState<"front" | "side" | "back">("front");

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("progress_photos")
      .select("*")
      .eq("user_id", user.id)
      .order("photo_date", { ascending: false });

    if (data) {
      const withUrls = await Promise.all(
        (data as Photo[]).map(async (p) => {
          const { data: signed } = await supabase.storage
            .from("progress-photos")
            .createSignedUrl(p.storage_path, 3600);
          return { ...p, signedUrl: signed?.signedUrl };
        })
      );
      setPhotos(withUrls);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [user]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error(t("app.photos.too_large"));
      return;
    }

    setUploading(true);
    const ext = file.name.split(".").pop();
    const filename = `${user.id}/${Date.now()}-${photoType}.${ext}`;

    const { error: upErr } = await supabase.storage
      .from("progress-photos")
      .upload(filename, file, { contentType: file.type });

    if (upErr) {
      toast.error(t("app.photos.upload_failed") + upErr.message);
      setUploading(false);
      return;
    }

    const { error: dbErr } = await supabase.from("progress_photos").insert({
      user_id: user.id,
      photo_date: new Date().toISOString().split("T")[0],
      photo_type: photoType,
      storage_path: filename,
    });

    if (dbErr) toast.error(t("app.photos.save_failed"));
    else {
      toast.success(t("app.photos.uploaded"));
      load();
    }
    setUploading(false);
    e.target.value = "";
  };

  const remove = async (photo: Photo) => {
    if (!confirm(t("app.photos.delete_confirm"))) return;
    await supabase.storage.from("progress-photos").remove([photo.storage_path]);
    await supabase.from("progress_photos").delete().eq("id", photo.id);
    load();
  };

  const typeLabel = (typ: string) => {
    if (typ === "front") return t("app.photos.front");
    if (typ === "side") return t("app.photos.side");
    if (typ === "back") return t("app.photos.back");
    return typ;
  };

  return (
    <AppShell>
      <div className="p-6 md:p-10 max-w-5xl mx-auto">
        <div className="mb-8">
          <p className="text-primary font-heading text-xs tracking-[0.35em] mb-2">{t("app.photos.tag")}</p>
          <h1 className="text-3xl font-heading text-foreground">{t("app.photos.title")}</h1>
          <p className="text-sm text-muted-foreground mt-2">{t("app.photos.subtitle")}</p>
        </div>

        <div className="border-2 border-primary/20 bg-card p-6 rounded-sm mb-8">
          <p className="text-xs font-heading tracking-wider text-muted-foreground mb-3">{t("app.photos.upload_new")}</p>
          <div className="flex flex-col sm:flex-row gap-3">
            <select
              value={photoType}
              onChange={(e) => setPhotoType(e.target.value as "front" | "side" | "back")}
              className="px-4 py-2.5 bg-background border border-border rounded-sm text-sm"
            >
              <option value="front">{t("app.photos.front")}</option>
              <option value="side">{t("app.photos.side")}</option>
              <option value="back">{t("app.photos.back")}</option>
            </select>
            <label className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground text-xs font-heading tracking-wider hover:bg-primary/90 transition-all shadow-red rounded-sm cursor-pointer">
              <Upload size={14} />
              {uploading ? t("app.photos.uploading") : t("app.photos.choose")}
              <input type="file" accept="image/*" onChange={handleUpload} disabled={uploading} className="hidden" />
            </label>
          </div>
        </div>

        {loading ? (
          <div className="text-muted-foreground text-sm">{t("app.photos.loading")}</div>
        ) : photos.length === 0 ? (
          <div className="border border-border bg-card p-10 rounded-sm text-center">
            <Camera className="mx-auto text-muted-foreground mb-3" size={32} />
            <p className="text-muted-foreground text-sm">{t("app.photos.empty")}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {photos.map((p) => (
              <div key={p.id} className="border border-border bg-card rounded-sm overflow-hidden group relative">
                {p.signedUrl ? (
                  <img src={p.signedUrl} alt="" className="w-full aspect-square object-cover" />
                ) : (
                  <div className="w-full aspect-square bg-muted" />
                )}
                <div className="p-3">
                  <p className="text-xs font-heading tracking-wider text-primary">{typeLabel(p.photo_type).toUpperCase()}</p>
                  <p className="text-xs text-muted-foreground mt-1">{format(new Date(p.photo_date), "d MMM yyyy", { locale })}</p>
                </div>
                <button onClick={() => remove(p)} className="absolute top-2 right-2 bg-background/90 hover:bg-primary text-foreground hover:text-primary-foreground p-2 rounded-sm opacity-0 group-hover:opacity-100 transition-opacity">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
};

export default AppPhotos;
