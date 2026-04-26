import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { sanitizeBlogHtml, isHtmlContent } from "@/lib/sanitizeHtml";

const BlogContent = ({ content }: { content: string | null | undefined }) => {
  if (!content) return null;
  if (isHtmlContent(content)) {
    return (
      <div
        className="prose-custom max-w-none"
        dangerouslySetInnerHTML={{ __html: sanitizeBlogHtml(content) }}
      />
    );
  }
  // Backwards-compatibility voor oudere posts (plain text met dubbele newlines)
  return (
    <div className="prose-custom space-y-5">
      {content.split("\n\n").map((paragraph, i) => (
        <p key={i} className="text-foreground/80 leading-relaxed">
          {paragraph}
        </p>
      ))}
    </div>
  );
};

const BlogPostPage = () => {
  const { slug } = useParams<{ slug: string }>();

  const { data: post, isLoading } = useQuery({
    queryKey: ["blog-post", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("slug", slug)
        .eq("published", true)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });

  return (
    <>
      <Navbar />
      <main className="pt-24 section-padding min-h-screen">
        <div className="max-w-3xl mx-auto">
          <Link
            to="/blog"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors font-heading tracking-wider mb-8"
          >
            <ArrowLeft size={16} /> TERUG NAAR BLOG
          </Link>

          {isLoading ? (
            <div className="text-muted-foreground">Laden...</div>
          ) : !post ? (
            <div className="text-center py-20">
              <h1 className="text-2xl font-heading text-foreground mb-4">ARTIKEL NIET GEVONDEN</h1>
              <p className="text-muted-foreground">Dit artikel bestaat niet of is nog niet gepubliceerd.</p>
            </div>
          ) : (
            <motion.article
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {post.cover_image_url && (
                <div className="mb-8 -mx-4 sm:mx-0 sm:rounded-sm overflow-hidden border-y sm:border border-border">
                  <img
                    src={post.cover_image_url}
                    alt={post.title}
                    className="w-full aspect-video object-cover"
                    loading="eager"
                  />
                </div>
              )}
              <span className="text-xs text-primary font-heading tracking-wider">{post.category.toUpperCase()}</span>
              <h1 className="text-3xl md:text-5xl font-heading text-foreground mt-3 mb-4 leading-tight">
                {post.title}
              </h1>
              <p className="text-muted-foreground text-sm mb-10">
                {post.published_at
                  ? new Date(post.published_at).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" })
                  : ""}
              </p>

              {post.excerpt && (
                <p className="text-lg text-foreground/80 border-l-2 border-primary pl-5 mb-10 leading-relaxed">
                  {post.excerpt}
                </p>
              )}

              <BlogContent content={post.content} />
            </motion.article>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
};

export default BlogPostPage;
