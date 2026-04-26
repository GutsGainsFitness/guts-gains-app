import { motion } from "framer-motion";
import { ArrowRight, Download } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/i18n/LanguageContext";

const categoryColors: Record<string, string> = {
  Afvallen: "bg-primary/10 text-primary",
  Voeding: "bg-green-500/10 text-green-400",
  "Personal Training": "bg-blue-500/10 text-blue-400",
  Spieropbouw: "bg-purple-500/10 text-purple-400",
  "Trainingsschema's": "bg-orange-500/10 text-orange-400",
  Mindset: "bg-yellow-500/10 text-yellow-400",
};

const BlogPreview = () => {
  const { t } = useLanguage();

  const ebooks = [
    { title: t("blog.ebook1_title"), description: t("blog.ebook1_desc"), href: "/ebooks/high-volume-food-swaps.pdf" },
    { title: t("blog.ebook2_title"), description: t("blog.ebook2_desc"), href: "/ebooks/de-3-lichaamstypes.pdf" },
  ];

  const { data: blogPosts = [] } = useQuery({
    queryKey: ["blog-posts-preview"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts").select("slug, category, title, excerpt, published_at, cover_image_url")
        .eq("published", true).order("published_at", { ascending: false }).limit(3);
      if (error) throw error;
      return data;
    },
  });

  return (
    <section className="section-padding bg-card">
      <div className="container-tight">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="flex items-end justify-between mb-14">
          <div>
            <p className="text-primary font-heading text-xs tracking-[0.35em] mb-3">{t("blog.tag")}</p>
            <h2 className="text-3xl md:text-5xl text-foreground">{t("blog.title")}</h2>
          </div>
          <Link to="/blog" className="hidden md:flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors font-heading tracking-wider">
            {t("blog.all")} <ArrowRight size={16} />
          </Link>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-10">
          <p className="text-primary font-heading text-xs tracking-[0.35em] mb-5">{t("blog.ebooks_tag")}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {ebooks.map((ebook) => (
              <a key={ebook.title} href={ebook.href} target="_blank" rel="noopener noreferrer"
                className="p-7 rounded-sm border-2 border-primary/20 bg-background hover:border-primary/50 hover:shadow-card transition-all group flex flex-col justify-between"
              >
                <div>
                  <span className="inline-block text-xs font-heading tracking-wider px-3 py-1 rounded-sm bg-primary/10 text-primary mb-4">{t("blog.ebook_badge")}</span>
                  <h3 className="text-lg font-heading text-foreground mb-3 group-hover:text-primary transition-colors leading-tight">{ebook.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-5">{ebook.description}</p>
                </div>
                <div className="flex items-center gap-2 text-sm text-primary font-heading tracking-wider">
                  <Download size={16} /> {t("blog.download")}
                </div>
              </a>
            ))}
          </div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {blogPosts.map((post, i) => (
            <motion.article key={post.slug} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
              <Link to={`/blog/${post.slug}`} className="block rounded-sm border border-border bg-background hover:border-primary/30 hover:shadow-card transition-all group overflow-hidden">
                {post.cover_image_url && (
                  <div className="aspect-video w-full overflow-hidden bg-muted">
                    <img src={post.cover_image_url} alt={post.title} loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  </div>
                )}
                <div className="p-7">
                  <span className={`inline-block text-xs font-heading tracking-wider px-3 py-1 rounded-sm ${categoryColors[post.category] || "bg-primary/10 text-primary"}`}>{post.category}</span>
                  <h3 className="text-lg font-heading text-foreground mt-4 mb-3 group-hover:text-primary transition-colors leading-tight">{post.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-5">{post.excerpt}</p>
                  <p className="text-xs text-muted-foreground">
                    {post.published_at ? new Date(post.published_at).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" }) : ""}
                  </p>
                </div>
              </Link>
            </motion.article>
          ))}
        </div>

        {blogPosts.length === 0 && <p className="text-muted-foreground text-center py-10">{t("blog.no_posts")}</p>}

        <Link to="/blog" className="mt-8 md:hidden flex items-center justify-center gap-2 text-sm text-primary font-heading tracking-wider">
          {t("blog.all")} <ArrowRight size={16} />
        </Link>
      </div>
    </section>
  );
};

export default BlogPreview;
