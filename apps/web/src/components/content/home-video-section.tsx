import { getHomeVideos } from "@/data/content";
import { resolveAssetUrl } from "@/lib/api";

export async function HomeVideoSection() {
  const videos = await getHomeVideos();
  if (videos.length === 0) return null;

  return (
    <section aria-label="Zoe&Book video showcase" className="bg-white py-0">
      <div className="mx-auto flex max-w-7xl justify-center gap-2 px-4 sm:gap-5 lg:px-8">
        {videos.map((src) => (
          <video
            autoPlay
            className="block aspect-[9/16] w-full max-w-[420px] flex-1 rounded-[16px] bg-cocoa-cream object-cover shadow-soft sm:rounded-[24px]"
            key={src}
            loop
            muted
            playsInline
            preload="metadata"
          >
            <source src={resolveAssetUrl(src)} type={src.endsWith(".webm") ? "video/webm" : "video/mp4"} />
          </video>
        ))}
      </div>
    </section>
  );
}
