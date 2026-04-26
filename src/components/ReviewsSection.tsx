import { motion } from "framer-motion";
import { Star, Play } from "lucide-react";
import { useState, useRef } from "react";
import { useLanguage } from "@/i18n/LanguageContext";

const SUPABASE_MEDIA = "https://okwfzijsuxnibjsxsjjg.supabase.co/storage/v1/object/public/marketing-media/testimonials";

const reviews = [
  {
    name: "Nadia — Den Haag",
    text: "Sinds eind oktober train ik bij Pablo en ik ben super blij dat ik die stap heb gezet. Voor de zomer heb ik mijn doel bereikt: 10 kilo afgevallen. De trainingen zijn afwisselend, nooit saai en altijd motiverend. Echt een aanrader als je resultaat wilt én het leuk wilt houden. Elke sessie is het waard.",
    rating: 5,
    video: `${SUPABASE_MEDIA}/testimonial_Nadia.mp4`,
    cover: "/images/testimonial_Nadia-Cover.jpg",
  },
  {
    name: "Bootcampgroep — Den Haag",
    text: "Bootcamp bij Pablo is echt een aanrader. Hij is super enthousiast, motiveert iedereen en zorgt ervoor dat je altijd met energie uit de training komt. De trainingen zijn afwisselend, uitdagend en hij weet je op een goede manier tot het uiterste te pushen. Tegelijkertijd houdt hij rekening met je niveau en gezondheid. Wat het extra fijn maakt, is dat hij altijd vrolijk is en echt een personal touch geeft aan zijn trainingen.",
    rating: 5,
    video: `${SUPABASE_MEDIA}/testimonial_Bootcamp.mp4`,
    cover: "/images/testimonial_Bootcamp-Cover.jpg",
  },
  {
    name: "Julianne — Den Haag",
    text: "I chose Pablo because something about him felt different in a good way, and he turned out to be exactly what I hoped for and more. He is friendly, patient, motivating, and makes me feel safe and comfortable in the gym. His coaching and advice really work, and in just five months I achieved strength I never thought I would have.",
    rating: 5,
    video: `${SUPABASE_MEDIA}/testimonial_Julianne.mp4`,
    cover: "/images/testimonial_Julianne-Cover.jpg",
  },
  {
    name: "Breana — Capelle aan den IJssel",
    text: "Mijn doel is om af te vallen en om een sterkere versie van mezelf te worden. Mijn PT sessies met Pablo zijn altijd een 10, hij motiveert mij altijd om mijn grenzen op een goede manier op te zoeken maar ik kan altijd wel met en om hem lachen.",
    rating: 5,
  },
];

function VideoTestimonial({ video, cover }: { video: string; cover: string }) {
  const [playing, setPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handlePlay = () => {
    setPlaying(true);
    setTimeout(() => videoRef.current?.play(), 50);
  };

  return (
    <div className="relative aspect-[9/16] max-h-[420px] w-full rounded-sm overflow-hidden bg-black/20">
      {!playing ? (
        <button onClick={handlePlay} className="relative w-full h-full group cursor-pointer">
          <img src={cover} alt="Testimonial" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/30 group-hover:bg-black/20 transition-colors flex items-center justify-center">
            <div className="w-14 h-14 rounded-full bg-primary/90 flex items-center justify-center shadow-glow group-hover:scale-110 transition-transform">
              <Play size={22} className="text-primary-foreground ml-1" fill="currentColor" />
            </div>
          </div>
        </button>
      ) : (
        <video ref={videoRef} src={video} controls playsInline className="w-full h-full object-cover" />
      )}
    </div>
  );
}

const ReviewsSection = () => {
  const { t } = useLanguage();

  return (
    <section id="reviews" className="section-padding bg-card">
      <div className="container-tight">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-14">
          <p className="text-primary font-heading text-xs tracking-[0.35em] mb-3">{t("reviews.tag")}</p>
          <h2 className="text-3xl md:text-5xl text-foreground">{t("reviews.title")}</h2>
        </motion.div>

        {reviews.filter(r => r.video).map((review, i) => (
          <motion.div key={review.name} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="mb-8">
            <div className="relative p-7 md:p-8 rounded-sm border border-primary/20 bg-background grid grid-cols-1 md:grid-cols-[280px_1fr] gap-7 items-center">
              <div className="absolute left-0 top-6 bottom-6 w-[2px] bg-primary/40 rounded-full hidden md:block" />
              <VideoTestimonial video={review.video!} cover={review.cover!} />
              <div>
                <span className="absolute top-4 right-6 text-5xl text-primary/10 font-heading leading-none select-none">"</span>
                <div className="flex gap-1 mb-5">
                  {Array.from({ length: review.rating }).map((_, j) => (
                    <Star key={j} size={14} className="fill-primary text-primary" />
                  ))}
                </div>
                <p className="text-muted-foreground text-sm leading-relaxed mb-5 italic">"{review.text}"</p>
                <p className="text-sm font-heading text-foreground">{review.name}</p>
              </div>
            </div>
          </motion.div>
        ))}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {reviews.filter(r => !r.video).map((review, i) => (
            <motion.div key={review.name} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
              className="relative p-7 md:p-8 rounded-sm border border-border bg-background hover:border-primary/20 transition-all"
            >
              <div className="absolute left-0 top-6 bottom-6 w-[2px] bg-primary/40 rounded-full" />
              <span className="absolute top-4 right-6 text-5xl text-primary/10 font-heading leading-none select-none">"</span>
              <div className="flex gap-1 mb-5">
                {Array.from({ length: review.rating }).map((_, j) => (
                  <Star key={j} size={14} className="fill-primary text-primary" />
                ))}
              </div>
              <p className="text-muted-foreground text-sm leading-relaxed mb-5 italic pl-4">"{review.text}"</p>
              <p className="text-sm font-heading text-foreground pl-4">{review.name}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ReviewsSection;
