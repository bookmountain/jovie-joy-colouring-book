import Image from "next/image";
import { getComicWorlds } from "@/data/content";
import type { Comic } from "@/data/content";
import { resolveAssetUrl } from "@/lib/api";

function getImageGridClass(imageCount: number) {
  if (imageCount === 2) {
    return "grid-cols-1 sm:grid-cols-2";
  }

  if (imageCount === 8) {
    return "grid-cols-2 lg:grid-cols-4";
  }

  return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";
}

function ComicSection({ comic }: { comic: Comic }) {
  const downloadHref = comic.images[0]?.src ?? "/pages/comics";

  return (
    <article className="space-y-5">
      <header className="mx-auto max-w-3xl text-center">
        <h3 className="text-[26px] font-extrabold leading-tight text-cocoa-ink md:text-[30px]">
          {comic.title}
        </h3>
        <p className="mt-2 text-base font-semibold leading-7 text-cocoa-text">
          {comic.description}
        </p>
        {comic.hasDownload ? (
          <a
            className="mt-5 inline-flex rounded-full border border-cocoa-line bg-cocoa-honey px-5 py-2 text-sm font-extrabold transition hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-cocoa-honey focus:ring-offset-4 focus:ring-offset-cocoa-cream"
            href={downloadHref}
            rel="noreferrer"
            target="_blank"
          >
            Get Free Comic
          </a>
        ) : null}
      </header>

      <div className={`grid gap-2.5 ${getImageGridClass(comic.images.length)}`}>
        {comic.images.map((image) => (
          <a
            className="group relative aspect-square overflow-hidden rounded-[26px] bg-white shadow-soft ring-1 ring-cocoa-line"
            href={image.src}
            key={image.src}
            rel="noreferrer"
            target="_blank"
          >
            <Image
              alt={image.alt}
              className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
              fill
              loading="eager"
              sizes={
                comic.images.length === 8
                  ? "(min-width: 1024px) 25vw, 50vw"
                  : "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
              }
              src={resolveAssetUrl(image.src)}
            />
          </a>
        ))}
      </div>
    </article>
  );
}

export async function ComicsPage() {
  const comicWorlds = await getComicWorlds();

  return (
    <div className="space-y-14">
      {comicWorlds.map((world) => (
        <section className="space-y-10" key={world.title}>
          <div className="text-center">
            <h2 className="font-display text-[34px] font-extrabold leading-none text-cocoa-purple md:text-[38px]">
              {world.title}
            </h2>
          </div>
          <div className="space-y-14">
            {world.comics.map((comic) => (
              <ComicSection comic={comic} key={comic.title} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
