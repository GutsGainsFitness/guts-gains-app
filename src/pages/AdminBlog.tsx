import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { toast } from "sonner";
import { Plus, Edit, Trash2, Eye, EyeOff, LogOut, FileText, CreditCard, Users, Check, X, Dumbbell, CalendarClock, UserCog, Mail, BarChart3, Image as ImageIcon, Search, Sparkles, Upload, Trash } from "lucide-react";
import RichTextEditor from "@/components/admin/RichTextEditor";

type Tab = "blog" | "intakes" | "purchases";

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  category: string;
  excerpt: string | null;
  content: string | null;
  published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  cover_image_url?: string | null;
}

interface IntakeRequest {
  id: string;
  naam: string;
  email: string;
  telefoon: string;
  doel: string | null;
  voorkeur: string | null;
  bericht: string | null;
  status: string;
  created_at: string;
}

interface Purchase {
  id: string;
  stripe_session_id: string | null;
  product_name: string;
  amount: number;
  currency: string;
  customer_email: string | null;
  status: string;
  environment: string;
  created_at: string;
}

interface ExerciseSearchItem {
  id: string;
  name: string;
  slug: string;
  primary_muscle: string;
}

const blogCategories = ["Afvallen", "Voeding", "Personal Training", "Spieropbouw", "Trainingsschema's", "Mindset"];

const generateSlug = (title: string) =>
  title.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").trim();

const AdminBlog = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [tab, setTab] = useState<Tab>("blog");

  // Blog state
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [editing, setEditing] = useState<BlogPost | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [category, setCategory] = useState(blogCategories[0]);
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [published, setPublished] = useState(false);
  const [coverImageUrl, setCoverImageUrl] = useState<string>("");
  const [generatingCover, setGeneratingCover] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Intakes state
  const [intakes, setIntakes] = useState<IntakeRequest[]>([]);
  const [loadingIntakes, setLoadingIntakes] = useState(true);

  // Purchases state
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loadingPurchases, setLoadingPurchases] = useState(true);

  // Exercise media stats
  const [mediaIncompleteCount, setMediaIncompleteCount] = useState<number | null>(null);
  const [mediaTotalCount, setMediaTotalCount] = useState<number | null>(null);
  const [exerciseSearch, setExerciseSearch] = useState("");
  const [exerciseIndex, setExerciseIndex] = useState<ExerciseSearchItem[]>([]);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/login"); return; }
      setUser(user);
      fetchPosts();
      fetchIntakes();
      fetchPurchases();
      fetchMediaStats();
      fetchExerciseIndex();
    };
    checkAuth();
  }, [navigate]);

  // Count exercises missing thumbnail or video_url_1
  const fetchMediaStats = async () => {
    const { data, error } = await supabase
      .from("exercises")
      .select("id,image_url,video_url_1");
    if (error || !data) {
      setMediaIncompleteCount(null);
      setMediaTotalCount(null);
      return;
    }
    const incomplete = data.filter(
      (r) => !r.image_url || !r.video_url_1 || r.image_url.trim() === "" || r.video_url_1.trim() === "",
    ).length;
    setMediaIncompleteCount(incomplete);
    setMediaTotalCount(data.length);
  };

  const fetchExerciseIndex = async () => {
    const { data } = await supabase
      .from("exercises")
      .select("id,name,slug,primary_muscle")
      .order("name");
    setExerciseIndex((data as ExerciseSearchItem[]) || []);
  };

  const exerciseMatches = useMemo(() => {
    const q = exerciseSearch.trim().toLowerCase();
    if (!q) return [] as ExerciseSearchItem[];
    return exerciseIndex
      .filter((item) =>
        item.name.toLowerCase().includes(q) ||
        item.slug.toLowerCase().includes(q) ||
        item.primary_muscle.replace(/_/g, " ").toLowerCase().includes(q),
      )
      .slice(0, 6);
  }, [exerciseIndex, exerciseSearch]);

  const goToExerciseMedia = (opts?: { q?: string; muscle?: string }) => {
    const params = new URLSearchParams();
    if (opts?.q) params.set("q", opts.q);
    if (opts?.muscle) params.set("muscle", opts.muscle);
    navigate(`/admin/oefeningen${params.toString() ? `?${params.toString()}` : ""}`);
  };

  const handleExerciseSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = exerciseSearch.trim();
    if (!q) {
      goToExerciseMedia();
      return;
    }
    const exactMuscle = exerciseIndex.find(
      (item) => item.primary_muscle.replace(/_/g, " ").toLowerCase() === q.toLowerCase(),
    )?.primary_muscle;
    goToExerciseMedia({ q, muscle: exactMuscle });
  };

  // Blog functions
  const fetchPosts = async () => {
    setLoadingPosts(true);
    const { data } = await supabase.from("blog_posts").select("*").order("created_at", { ascending: false });
    setPosts(data || []);
    setLoadingPosts(false);
  };

  const resetForm = () => {
    setTitle(""); setSlug(""); setCategory(blogCategories[0]); setExcerpt(""); setContent("");
    setPublished(false); setCoverImageUrl(""); setEditing(null); setShowForm(false);
  };

  const openEdit = (post: BlogPost) => {
    setEditing(post); setTitle(post.title); setSlug(post.slug); setCategory(post.category);
    setExcerpt(post.excerpt || ""); setContent(post.content || ""); setPublished(post.published);
    setCoverImageUrl(post.cover_image_url || "");
    setShowForm(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const postData = {
      title, slug: slug || generateSlug(title), category, excerpt, content, published,
      published_at: published ? new Date().toISOString() : null, author_id: user.id,
      cover_image_url: coverImageUrl || null,
    };
    const { error } = editing
      ? await supabase.from("blog_posts").update(postData).eq("id", editing.id)
      : await supabase.from("blog_posts").insert(postData);
    if (error) { toast.error("Opslaan mislukt: " + error.message); }
    else { toast.success(editing ? "Artikel bijgewerkt!" : "Artikel aangemaakt!"); resetForm(); fetchPosts(); }
  };

  const handleGenerateCover = async () => {
    if (!title.trim()) {
      toast.error("Vul eerst een titel in");
      return;
    }
    setGeneratingCover(true);
    const tid = toast.loading("AI cover wordt gegenereerd...");
    try {
      const { data, error } = await supabase.functions.invoke("generate-blog-cover", {
        body: { title, category, slug: slug || generateSlug(title) },
      });
      if (error) throw error;
      if (!data?.ok || !data?.image_url) throw new Error(data?.error || "Geen afbeelding ontvangen");
      setCoverImageUrl(data.image_url);
      toast.success("Cover gegenereerd!", { id: tid });
    } catch (err: any) {
      toast.error("Genereren mislukt: " + (err?.message || "onbekende fout"), { id: tid });
    } finally {
      setGeneratingCover(false);
    }
  };

  const handleUploadCover = async (file: File) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Bestand te groot (max 5MB)");
      return;
    }
    setUploadingCover(true);
    const tid = toast.loading("Cover uploaden...");
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const baseSlug = (slug || generateSlug(title) || "blog").slice(0, 60);
      const path = `${baseSlug}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("blog-covers").upload(path, file, {
        upsert: false, contentType: file.type,
      });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("blog-covers").getPublicUrl(path);
      setCoverImageUrl(pub.publicUrl);
      toast.success("Cover geüpload!", { id: tid });
    } catch (err: any) {
      toast.error("Upload mislukt: " + (err?.message || "onbekende fout"), { id: tid });
    } finally {
      setUploadingCover(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Weet je zeker dat je dit artikel wilt verwijderen?")) return;
    await supabase.from("blog_posts").delete().eq("id", id);
    toast.success("Artikel verwijderd"); fetchPosts();
  };

  const togglePublish = async (post: BlogPost) => {
    const np = !post.published;
    await supabase.from("blog_posts").update({ published: np, published_at: np ? new Date().toISOString() : null }).eq("id", post.id);
    toast.success(np ? "Gepubliceerd!" : "Concept opgeslagen"); fetchPosts();
  };

  // Intakes functions
  const fetchIntakes = async () => {
    setLoadingIntakes(true);
    const { data } = await supabase.from("intake_requests").select("*").order("created_at", { ascending: false });
    setIntakes(data || []);
    setLoadingIntakes(false);
  };

  const markIntake = async (id: string, status: string) => {
    await supabase.from("intake_requests").update({ status }).eq("id", id);
    toast.success("Status bijgewerkt"); fetchIntakes();
  };

  // Purchases functions
  const fetchPurchases = async () => {
    setLoadingPurchases(true);
    const { data } = await supabase.from("purchases").select("*").order("created_at", { ascending: false });
    setPurchases(data || []);
    setLoadingPurchases(false);
  };

  const handleLogout = async () => { await supabase.auth.signOut(); navigate("/"); };

  if (!user) return null;

  const tabs: { id: Tab; label: string; icon: any; count?: number }[] = [
    { id: "blog", label: "BLOG", icon: FileText, count: posts.length },
    { id: "intakes", label: "INTAKES", icon: Users, count: intakes.filter(i => i.status === "nieuw").length },
    { id: "purchases", label: "BETALINGEN", icon: CreditCard, count: purchases.length },
  ];

  return (
    <>
      <Navbar />
      <main className="pt-24 section-padding min-h-screen">
        <div className="container-tight">
          <div className="flex items-center justify-between mb-8">
            <div>
              <p className="text-primary font-heading text-xs tracking-[0.35em] mb-2">ADMIN</p>
              <h1 className="text-3xl font-heading text-foreground">DASHBOARD</h1>
            </div>
            <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-3 border border-border text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all font-heading text-sm tracking-wider">
              <LogOut size={16} />
            </button>
          </div>

          {/* Primary action: oefeningen media beheren */}
          <div className="mb-4 relative">
            <form onSubmit={handleExerciseSearchSubmit} className="relative">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={exerciseSearch}
                onChange={(e) => setExerciseSearch(e.target.value)}
                placeholder="Zoek oefening op naam of categorie..."
                className="w-full h-12 pl-11 pr-28 bg-card border border-border rounded-sm text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
              />
              <button
                type="submit"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 h-9 px-4 bg-primary text-primary-foreground font-heading text-xs tracking-wider rounded-sm hover:bg-primary/90 transition-colors"
              >
                ZOEK
              </button>
            </form>

            {exerciseMatches.length > 0 && exerciseSearch.trim() && (
              <div className="absolute z-20 top-full mt-2 w-full border border-border bg-card rounded-sm shadow-xl overflow-hidden">
                {exerciseMatches.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => goToExerciseMedia({ q: item.name, muscle: item.primary_muscle })}
                    className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left border-b last:border-b-0 border-border hover:bg-muted/40 transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="font-heading text-sm text-foreground truncate">{item.name}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {item.primary_muscle.replace(/_/g, " ")} • {item.slug}
                      </div>
                    </div>
                    <span className="text-xs font-heading tracking-wider text-primary">OPEN</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => navigate("/admin/oefeningen")}
            className="group w-full mb-4 flex items-center gap-4 p-5 sm:p-6 bg-primary text-primary-foreground border-2 border-primary hover:bg-primary/90 transition-all text-left rounded-sm shadow-lg shadow-primary/20"
          >
            <div className="flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center bg-primary-foreground/10 rounded-sm">
              <Dumbbell size={28} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-heading text-xs tracking-[0.3em] opacity-80 mb-1">BEHEER</p>
              <h2 className="font-heading text-lg sm:text-xl tracking-wider leading-tight">
                OEFENINGEN MEDIA BEHEREN
              </h2>
              <p className="text-xs sm:text-sm opacity-80 mt-1 hidden sm:block">
                Upload thumbnails en video's, preview in mobiel frame
              </p>
              {mediaIncompleteCount !== null && mediaTotalCount !== null && (
                <div className="mt-2 flex items-center gap-2 flex-wrap">
                  {mediaIncompleteCount > 0 ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate("/admin/oefeningen?status=incomplete");
                      }}
                      className="inline-flex items-center gap-1.5 bg-primary-foreground text-primary font-heading text-xs tracking-wider px-2.5 py-1 rounded-sm hover:bg-primary-foreground/90 transition-colors"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                      {mediaIncompleteCount} VAN {mediaTotalCount} INCOMPLEET
                    </button>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 bg-primary-foreground/20 text-primary-foreground font-heading text-xs tracking-wider px-2.5 py-1 rounded-sm">
                      ✓ ALLE {mediaTotalCount} OEFENINGEN COMPLEET
                    </span>
                  )}
                </div>
              )}
            </div>
            <span className="font-heading text-2xl opacity-60 group-hover:translate-x-1 transition-transform">→</span>
          </button>

          {/* Other admin shortcuts */}
          <div className="mb-8">
            <p className="text-muted-foreground font-heading text-xs tracking-[0.3em] mb-3">OVERIGE SNELKOPPELINGEN</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
              {[
                { to: "/admin/oefening-illustraties", label: "ILLUSTRATIES", icon: ImageIcon },
                { to: "/admin/tijdsloten", label: "TIJDSLOTEN", icon: CalendarClock },
                { to: "/admin/klanten", label: "KLANTEN", icon: UserCog },
                { to: "/admin/invites", label: "INVITES", icon: Mail },
                { to: "/admin/cta", label: "CTA STATS", icon: BarChart3 },
              ].map((item) => (
                <button
                  key={item.to}
                  onClick={() => navigate(item.to)}
                  className="flex items-center gap-2 px-4 py-3 font-heading text-xs tracking-wider transition-all border border-border text-muted-foreground hover:text-foreground hover:border-primary/30"
                >
                  <item.icon size={16} />
                  <span className="truncate">{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-8 overflow-x-auto">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-5 py-3 font-heading text-sm tracking-wider transition-all whitespace-nowrap ${
                  tab === t.id ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground hover:text-foreground hover:border-primary/30"
                }`}
              >
                <t.icon size={16} />
                {t.label}
                {t.count !== undefined && t.count > 0 && (
                  <span className={`ml-1 text-xs px-2 py-0.5 rounded-full ${tab === t.id ? "bg-primary-foreground/20 text-primary-foreground" : "bg-primary/10 text-primary"}`}>
                    {t.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Blog Tab */}
          {tab === "blog" && (
            <>
              <div className="flex justify-end mb-6">
                <button onClick={() => { resetForm(); setShowForm(true); }} className="flex items-center gap-2 px-5 py-3 bg-primary text-primary-foreground font-heading text-sm tracking-wider hover:bg-primary/90 transition-all">
                  <Plus size={16} /> NIEUW ARTIKEL
                </button>
              </div>

              {showForm && (
                <div className="mb-10 p-4 sm:p-8 border border-border bg-card rounded-sm">
                  <h2 className="text-lg sm:text-xl font-heading text-foreground mb-5 sm:mb-6">{editing ? "ARTIKEL BEWERKEN" : "NIEUW ARTIKEL"}</h2>
                  <form onSubmit={handleSave} className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-sm text-muted-foreground mb-2">Titel</label>
                        <input type="text" value={title} onChange={(e) => { setTitle(e.target.value); if (!editing) setSlug(generateSlug(e.target.value)); }} required className="w-full px-4 py-3 bg-background border border-border rounded-sm text-foreground focus:border-primary focus:outline-none transition-colors" />
                      </div>
                      <div>
                        <label className="block text-sm text-muted-foreground mb-2">Slug (URL)</label>
                        <input type="text" value={slug} onChange={(e) => setSlug(e.target.value)} className="w-full px-4 py-3 bg-background border border-border rounded-sm text-foreground focus:border-primary focus:outline-none transition-colors" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm text-muted-foreground mb-2">Categorie</label>
                      <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full px-4 py-3 bg-background border border-border rounded-sm text-foreground focus:border-primary focus:outline-none transition-colors">
                        {blogCategories.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-muted-foreground mb-2">Cover-afbeelding</label>
                      {coverImageUrl ? (
                        <div className="relative mb-3 group">
                          <img src={coverImageUrl} alt="Cover preview" className="w-full aspect-video object-cover rounded-sm border border-border" loading="lazy" />
                          <button type="button" onClick={() => setCoverImageUrl("")} className="absolute top-2 right-2 p-2 bg-background/90 border border-border rounded-sm text-muted-foreground hover:text-destructive transition-colors" aria-label="Cover verwijderen">
                            <Trash size={14} />
                          </button>
                        </div>
                      ) : (
                        <div className="mb-3 aspect-video w-full bg-background border border-dashed border-border rounded-sm flex items-center justify-center text-muted-foreground text-xs tracking-wider font-heading">
                          GEEN COVER
                        </div>
                      )}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <button type="button" onClick={handleGenerateCover} disabled={generatingCover || uploadingCover || !title.trim()}
                          className="flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground font-heading text-xs tracking-wider rounded-sm hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                          <Sparkles size={14} /> {generatingCover ? "GENEREREN..." : "GENEREER MET AI"}
                        </button>
                        <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploadingCover || generatingCover}
                          className="flex items-center justify-center gap-2 px-4 py-3 border border-border text-muted-foreground hover:text-foreground hover:border-primary/40 font-heading text-xs tracking-wider rounded-sm transition-colors disabled:opacity-50">
                          <Upload size={14} /> {uploadingCover ? "UPLOADEN..." : "UPLOAD AFBEELDING"}
                        </button>
                      </div>
                      <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden"
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUploadCover(f); }} />
                      <input type="text" value={coverImageUrl} onChange={(e) => setCoverImageUrl(e.target.value)} placeholder="Of plak hier een cover URL..."
                        className="mt-2 w-full px-4 py-2.5 bg-background border border-border rounded-sm text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none transition-colors" />
                      <p className="text-xs text-muted-foreground mt-1.5">Tip: AI genereert een 16:9 cover op basis van je titel. Vul eerst de titel in.</p>
                    </div>
                    <div>
                      <label className="block text-sm text-muted-foreground mb-2">Samenvatting</label>
                      <textarea value={excerpt} onChange={(e) => setExcerpt(e.target.value)} rows={2} className="w-full px-4 py-3 bg-background border border-border rounded-sm text-foreground focus:border-primary focus:outline-none transition-colors resize-y" />
                    </div>
                    <div>
                      <label className="block text-sm text-muted-foreground mb-2">Inhoud</label>
                      <RichTextEditor value={content} onChange={setContent} placeholder="Begin hier je blog te schrijven..." />
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} className="accent-primary" />
                      <span className="text-sm text-foreground">Direct publiceren</span>
                    </label>
                    <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 sticky bottom-0 -mx-4 sm:mx-0 px-4 sm:px-0 py-3 sm:py-0 bg-card sm:bg-transparent border-t sm:border-t-0 border-border z-10">
                      <button type="button" onClick={resetForm} className="px-6 py-3 border border-border text-muted-foreground hover:text-foreground font-heading text-sm tracking-wider transition-colors rounded-sm">ANNULEREN</button>
                      <button type="submit" className="flex-1 sm:flex-initial px-8 py-3 bg-primary text-primary-foreground font-heading text-sm tracking-wider hover:bg-primary/90 transition-all rounded-sm">{editing ? "OPSLAAN" : "AANMAKEN"}</button>
                    </div>
                  </form>
                </div>
              )}

              {loadingPosts ? <p className="text-muted-foreground">Laden...</p> : posts.length === 0 ? <p className="text-muted-foreground">Nog geen artikelen.</p> : (
                <div className="space-y-3">
                  {posts.map((post) => (
                    <div key={post.id} className="flex items-center justify-between p-5 border border-border bg-card rounded-sm hover:border-primary/20 transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                          <span className={`inline-block w-2 h-2 rounded-full ${post.published ? "bg-green-500" : "bg-yellow-500"}`} />
                          <span className="text-xs text-primary font-heading tracking-wider">{post.category.toUpperCase()}</span>
                        </div>
                        <h3 className="text-foreground font-heading truncate">{post.title}</h3>
                        <p className="text-xs text-muted-foreground mt-1">{new Date(post.created_at).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" })} · {post.published ? "Gepubliceerd" : "Concept"}</p>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <button onClick={() => togglePublish(post)} className="p-2 text-muted-foreground hover:text-foreground transition-colors" title={post.published ? "Verbergen" : "Publiceren"}>{post.published ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                        <button onClick={() => openEdit(post)} className="p-2 text-muted-foreground hover:text-primary transition-colors" title="Bewerken"><Edit size={16} /></button>
                        <button onClick={() => handleDelete(post.id)} className="p-2 text-muted-foreground hover:text-destructive transition-colors" title="Verwijderen"><Trash2 size={16} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Intakes Tab */}
          {tab === "intakes" && (
            <>
              {loadingIntakes ? <p className="text-muted-foreground">Laden...</p> : intakes.length === 0 ? <p className="text-muted-foreground">Nog geen intake-aanvragen.</p> : (
                <div className="space-y-3">
                  {intakes.map((intake) => (
                    <div key={intake.id} className={`p-5 border rounded-sm transition-colors ${intake.status === "nieuw" ? "border-primary/30 bg-primary/5" : "border-border bg-card"}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <span className={`inline-block w-2 h-2 rounded-full ${intake.status === "nieuw" ? "bg-primary" : "bg-green-500"}`} />
                            <span className="text-xs font-heading tracking-wider text-muted-foreground">
                              {new Date(intake.created_at).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                            </span>
                            <span className={`text-xs font-heading tracking-wider px-2 py-0.5 rounded-sm ${intake.status === "nieuw" ? "bg-primary/10 text-primary" : "bg-green-500/10 text-green-400"}`}>
                              {intake.status.toUpperCase()}
                            </span>
                          </div>
                          <h3 className="text-foreground font-heading text-lg">{intake.naam}</h3>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2">
                            <p className="text-sm text-muted-foreground">📧 {intake.email}</p>
                            <p className="text-sm text-muted-foreground">📞 {intake.telefoon}</p>
                            {intake.doel && <p className="text-sm text-muted-foreground">🎯 {intake.doel}</p>}
                          </div>
                          {intake.voorkeur && <p className="text-sm text-muted-foreground mt-1">🕐 {intake.voorkeur}</p>}
                          {intake.bericht && <p className="text-sm text-foreground/70 mt-2 border-l-2 border-border pl-3">{intake.bericht}</p>}
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          {intake.status === "nieuw" ? (
                            <button onClick={() => markIntake(intake.id, "beantwoord")} className="flex items-center gap-1 px-3 py-2 text-xs font-heading tracking-wider bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors" title="Markeer als beantwoord">
                              <Check size={14} /> BEANTWOORD
                            </button>
                          ) : (
                            <button onClick={() => markIntake(intake.id, "nieuw")} className="flex items-center gap-1 px-3 py-2 text-xs font-heading tracking-wider bg-primary/10 text-primary hover:bg-primary/20 transition-colors" title="Markeer als nieuw">
                              <X size={14} /> ONGEDAAN
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Purchases Tab */}
          {tab === "purchases" && (
            <>
              {loadingPurchases ? <p className="text-muted-foreground">Laden...</p> : purchases.length === 0 ? <p className="text-muted-foreground">Nog geen betalingen ontvangen.</p> : (
                <div className="space-y-3">
                  {purchases.map((purchase) => (
                    <div key={purchase.id} className="flex items-center justify-between p-5 border border-border bg-card rounded-sm">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                          <span className="inline-block w-2 h-2 rounded-full bg-green-500" />
                          <span className={`text-xs font-heading tracking-wider px-2 py-0.5 rounded-sm ${purchase.environment === "sandbox" ? "bg-orange-500/10 text-orange-400" : "bg-green-500/10 text-green-400"}`}>
                            {purchase.environment === "sandbox" ? "TEST" : "LIVE"}
                          </span>
                        </div>
                        <h3 className="text-foreground font-heading">{purchase.product_name}</h3>
                        <p className="text-xs text-muted-foreground mt-1">
                          {purchase.customer_email || "Geen e-mail"} · {new Date(purchase.created_at).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                      <div className="text-right ml-4">
                        <p className="text-xl font-heading text-foreground">€{(purchase.amount / 100).toFixed(2).replace(".", ",")}</p>
                        <p className="text-xs text-muted-foreground">{purchase.status}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
};

export default AdminBlog;
