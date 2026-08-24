import { getHomeVideos } from "@/data/content";
import { resolveAssetUrl } from "@/lib/api";

export async function HomeVideoSection() {
  const videos = await getHomeVideos();
  if (videos.length === 0) return null;

  return (
    <section aria-label="Zoe&Book video showcase" className="bg-white py-0">
      <div className="mx-auto flex max-w-7xl snap-x snap-mandatory gap-2 overflow-x-auto px-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:justify-center sm:gap-5 sm:overflow-visible lg:px-8">
        {videos.map((src) => (
          <video
            autoPlay
            className="block aspect-[9/16] w-[80%] max-w-[420px] flex-none snap-center rounded-[16px] bg-cocoa-cream object-cover shadow-soft sm:w-full sm:flex-1 sm:snap-align-none sm:rounded-[24px]"
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
