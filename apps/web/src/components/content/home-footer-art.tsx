import Image from "next/image";
import { getFooterArtwork } from "@/data/content";

export async function HomeFooterArt() {
  const footerArtwork = await getFooterArtwork();
  if (!footerArtwork) return null;

  return (
    <section
      aria-label="Homepage footer art"
      className="pointer-events-none relative z-10 -mb-px bg-white pt-12 md:pt-16"
    >
      <div className="relative -mb-px hidden w-full md:block">
        <Image
          alt="Zoe&Book footer illustration"
          className="block h-auto w-full"
          height={365}
          priority={false}
          sizes="100vw"
          src={footerArtwork.desktop}
          width={2089}
        />
      </div>
      <div className="relative mx-auto -mb-px w-[min(78vw,316px)] md:hidden">
        <Image
          alt="Zoe&Book mobile footer illustration"
          className="block h-auto w-full"
          height={181}
          sizes="78vw"
          src={footerArtwork.mobile}
          width={316}
        />
      </div>
    </section>
  );
}
