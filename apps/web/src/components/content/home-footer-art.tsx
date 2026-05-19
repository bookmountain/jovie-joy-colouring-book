import Image from "next/image";
import { getFooterArtwork } from "@/data/content";

export async function HomeFooterArt() {
  const footerArtwork = await getFooterArtwork();
  if (!footerArtwork) return null;

  return (
    <section
      aria-label="Homepage footer art"
      className="pointer-events-none relative z-10 -mb-px h-[178px] overflow-hidden bg-white md:h-[230px]"
    >
      <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-px bg-[#f8edff]" />
      <div className="absolute bottom-0 left-1/2 hidden w-[min(42vw,626px)] -translate-x-1/2 md:block">
        <Image
          alt="Zoe&Book footer illustration"
          className="h-auto w-full"
          height={291}
          sizes="(min-width: 1024px) 626px, 42vw"
          src={footerArtwork.desktop}
          width={626}
        />
      </div>
      <div className="absolute bottom-0 left-1/2 w-[min(78vw,316px)] -translate-x-1/2 md:hidden">
        <Image
          alt="Zoe&Book mobile footer illustration"
          className="h-auto w-full"
          height={181}
          sizes="78vw"
          src={footerArtwork.mobile}
          width={316}
        />
      </div>
    </section>
  );
}
