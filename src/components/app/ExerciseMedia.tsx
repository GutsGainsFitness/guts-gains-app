import { useEffect, useRef, useState } from "react";
import { Play } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  exerciseName: string;
  imageUrl: string | null;
  videoUrl1: string | null;
  videoUrl2: string | null;
}

/**
 * Toont eerst de thumbnail (image_url) als poster.
 * Wanneer de gebruiker op "Toon demo" klikt, of wanneer de tile in beeld komt,
 * worden tot twee MP4/WebM-loops geladen die zich als GIFs gedragen
 * (autoplay, muted, loop, playsInline, geen controls).
 *
 * Performance:
 * - preload="metadata" (geen volledige preload)
 * - poster=image_url (visueel direct iets te zien terwijl video laadt)
 * - IntersectionObserver: video bron pas inhangen als element in viewport komt
 * - Lazy: niets geladen voor de gebruiker actief de oefening start (klik) of scrollt
 */
const ExerciseMedia = ({ exerciseName, imageUrl, videoUrl1, videoUrl2 }: Props) => {
  const [started, setStarted] = useState(false);
  const [inView, setInView] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const hasAnyVideo = !!(videoUrl1 || videoUrl2);
  const shouldLoadVideos = hasAnyVideo && (started || inView);

  // Lazy mount: wacht tot tile bijna in beeld is voor we videosrc inhangen
  useEffect(() => {
    if (!hasAnyVideo) return;
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setInView(true);
            obs.disconnect();
            break;
          }
        }
      },
      { rootMargin: "200px 0px", threshold: 0.01 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasAnyVideo]);

  if (!imageUrl && !hasAnyVideo) return null;

  return (
    <div ref={containerRef} className="mb-4">
      {/* Stap 1: alleen thumbnail tot user 'start' of in view */}
      {!shouldLoadVideos && (
        <div className="relative aspect-video bg-muted border border-border rounded-sm overflow-hidden">
          {imageUrl ? (
            <>
              {!imgLoaded && <Skeleton className="absolute inset-0 rounded-none" />}
              <img
                src={imageUrl}
                alt={exerciseName}
                loading="lazy"
                decoding="async"
                onLoad={() => setImgLoaded(true)}
                className={`w-full h-full object-cover transition-opacity duration-300 ${
                  imgLoaded ? "opacity-100" : "opacity-0"
                }`}
              />
            </>
          ) : (
            <Skeleton className="absolute inset-0 rounded-none" />
          )}
          {hasAnyVideo && (
            <button
              type="button"
              onClick={() => setStarted(true)}
              className="absolute inset-0 flex items-center justify-center bg-background/40 hover:bg-background/30 transition-colors group"
              aria-label="Toon demonstratie"
            >
              <span className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground font-heading text-xs tracking-wider rounded-sm shadow-red group-hover:bg-primary/90">
                <Play size={14} /> TOON DEMO
              </span>
            </button>
          )}
        </div>
      )}

      {/* Stap 2: zodra geladen, twee loop-video's naast elkaar */}
      {shouldLoadVideos && (
        <div className="grid grid-cols-2 gap-2">
          {[videoUrl1, videoUrl2].map((src, i) => (
            <LazyLoopVideo
              key={`${exerciseName}-${i}-${src ?? "empty"}`}
              src={src}
              poster={imageUrl}
            />
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * Eén loop-video tile.
 * - Vaste aspect-ratio (aspect-square) → geen layout shifts
 * - Skeleton tot er een frame is
 * - Pauseert automatisch als hij uit beeld is, hervat als hij in beeld komt
 * - Cleanup: srcen unloaden bij unmount zodat geheugen niet vol loopt
 */
const LazyLoopVideo = ({
  src,
  poster,
}: {
  src: string | null;
  poster: string | null;
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [ready, setReady] = useState(false);

  // Pause/play o.b.v. zichtbaarheid
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !src || typeof IntersectionObserver === "undefined") return;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            v.play().catch(() => {});
          } else {
            v.pause();
          }
        }
      },
      { threshold: 0.25 }
    );
    obs.observe(v);
    return () => obs.disconnect();
  }, [src]);

  // Cleanup: stop & unload bij unmount
  useEffect(() => {
    const v = videoRef.current;
    return () => {
      if (!v) return;
      try {
        v.pause();
        v.removeAttribute("src");
        v.load();
      } catch {
        // best effort
      }
    };
  }, []);

  if (!src) {
    return (
      <div className="aspect-square bg-background border border-border rounded-sm overflow-hidden flex items-center justify-center">
        <span className="text-[10px] font-heading tracking-wider text-muted-foreground">
          GEEN VIDEO
        </span>
      </div>
    );
  }

  return (
    <div className="relative aspect-square bg-background border border-border rounded-sm overflow-hidden">
      {!ready && <Skeleton className="absolute inset-0 rounded-none" />}
      <video
        ref={videoRef}
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
        onLoadedData={() => setReady(true)}
        onCanPlay={() => setReady(true)}
        className={`w-full h-full object-cover transition-opacity duration-300 ${
          ready ? "opacity-100" : "opacity-0"
        }`}
      />
    </div>
  );
};

export default ExerciseMedia;
