import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Download } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const allCategories = ["Alles", "Afvallen", "Spieropbouw", "Voeding", "Trainingsschema's", "Mindset", "Personal Training"];

const ebooks = [
  {
    title: "High-Volume Food Swaps for Fat Loss",
    description: "Eet meer met minder calorieën. Ontdek slimme voedingsswaps die je helpen om vol te zitten zonder je calorie-intake te verhogen.",
    href: "/ebooks/high-volume-food-swaps.pdf",
  },
  {
    title: "De 3 Lichaamstypes: Ectomorf, Mesomorf & Endomorf",
    description: "Ontdek welk lichaamstype jij hebt en hoe je je training en voeding daarop kunt afstemmen voor het beste resultaat.",
    href: "/ebooks/de-3-lichaamstypes.pdf",
  },
];

const BlogPage = () => {
  const [activeCategory, setActiveCategory] = useState("Alles");

  const { data: posts = [] } = useQuery({
    queryKey: ["blog-posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("published", true)
        .order("published_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const filteredPosts = activeCategory === "Alles"
    ? posts
    : posts.filter((p) => p.category === activeCategory);

  return (
    <>
      <Navbar />
      <main className="pt-24 section-padding">
        <div className="container-tight">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-12"
          >
            <p className="text-primary font-heading text-sm tracking-[0.3em] mb-2">KENNIS & EXPERTISE</p>
            <h1 className="text-3xl md:text-5xl text-foreground mb-4">BLOG</h1>
            <p className="text-muted-foreground max-w-xl">
              Artikelen over training, voeding, mindset en alles wat je nodig hebt om jouw fitnessdoelen te bereiken.
            </p>
          </motion.div>

          {/* Free E-books */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-12"
          >
            <p className="text-primary font-heading text-xs tracking-[0.35em] mb-5">GRATIS E-BOOKS</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {ebooks.map((ebook) => (
                <a
                  key={ebook.title}
                  href={ebook.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-7 rounded-sm border-2 border-primary/20 bg-card hover:border-primary/50 hover:shadow-card transition-all group flex flex-col justify-between"
                >
                  <div>
                    <span className="inline-block text-xs font-heading tracking-wider px-3 py-1 rounded-sm bg-primary/10 text-primary mb-4">
                      GRATIS E-BOOK
                    </span>
                    <h3 className="text-lg font-heading text-foreground mb-3 group-hover:text-primary transition-colors leading-tight">
                      {ebook.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-5">{ebook.description}</p>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-primary font-heading tracking-wider">
                    <Download size={16} /> DOWNLOAD PDF
                  </div>
                </a>
              ))}
            </div>
          </motion.div>

          {/* Categories */}
          <div className="flex gap-2 overflow-x-auto pb-4 mb-8">
            {allCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-2 text-xs font-heading tracking-wider border rounded-sm whitespace-nowrap transition-colors ${
                  activeCategory === cat
                    ? "border-primary text-primary bg-primary/10"
                    : "border-border text-muted-foreground hover:text-foreground hover:border-primary/30"
                }`}
              >
                {cat.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Posts */}
          {filteredPosts.length === 0 ? (
            <p className="text-muted-foreground text-center py-10">Nog geen artikelen in deze categorie.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPosts.map((post, i) => (
                <motion.article
                  key={post.slug}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                >
                  <Link
                    to={`/blog/${post.slug}`}
                    className="block rounded-sm border border-border bg-card hover:border-primary/30 transition-colors group cursor-pointer overflow-hidden h-full"
                  >
                    {post.cover_image_url && (
                      <div className="aspect-video w-full overflow-hidden bg-muted">
                        <img src={post.cover_image_url} alt={post.title} loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      </div>
                    )}
                    <div className="p-6">
                      <span className="text-xs text-primary font-heading tracking-wider">{post.category.toUpperCase()}</span>
                      <h2 className="text-lg font-heading text-foreground mt-2 mb-3 group-hover:text-primary transition-colors leading-tight">
                        {post.title}
                      </h2>
                      <p className="text-sm text-muted-foreground leading-relaxed mb-4">{post.excerpt}</p>
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">
                          {post.published_at
                            ? new Date(post.published_at).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" })
                            : ""}
                        </p>
                        <ArrowRight size={14} className="text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  </Link>
                </motion.article>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
};

export default BlogPage;
