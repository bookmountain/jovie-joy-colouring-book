import { homeVideo } from "@/data/content";

export function HomeVideoSection() {
  return (
    <section aria-label="Zoe&Book video showcase" className="bg-white py-0">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <a
          aria-label="Watch the Zoe&Book video on YouTube"
          className="group block overflow-hidden rounded-[24px] bg-cocoa-cream shadow-soft"
          href={homeVideo.youtubeHref}
          rel="noreferrer"
          target="_blank"
        >
          <video
            autoPlay
            className="block aspect-[20/9] w-full object-cover"
            loop
            muted
            playsInline
            preload="metadata"
          >
            <source src={homeVideo.src} type="video/mp4" />
          </video>
        </a>
      </div>
    </section>
  );
}
