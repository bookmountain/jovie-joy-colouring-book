import { SafeImage } from "@/components/common/SafeImage";
import { getFooterArtwork } from "@/data/content";
import { resolveAssetUrl } from "@/lib/api";

export async function HomeFooterArt() {
  const src = await getFooterArtwork();
  if (!src) return null;

  return (
    <section
      aria-label="Homepage footer art"
      className="pointer-events-none relative z-10 -mb-px bg-white pt-12 md:pt-16"
    >
      <div className="relative mx-auto -mb-px w-full">
        <SafeImage
          alt="Zoe&Book footer illustration"
          className="block h-auto w-full"
          height={365}
          priority={false}
          sizes="100vw"
          src={resolveAssetUrl(src)}
          width={2089}
        />
      </div>
    </section>
  );
}
