import Image from "next/image";
import Link from "next/link";
import { getCollectionBySlug, getProductsForCollection } from "@/lib/catalog";

const tileSlugs = ["bold-easy", "cute-comfy", "classic", "seasonal"];

export async function CollectionTiles() {
  const tiles = await Promise.all(
    tileSlugs.map(async (slug) => {
      const [collection, products] = await Promise.all([
        getCollectionBySlug(slug),
        getProductsForCollection(slug),
      ]);
      return { slug, collection, image: products[0]?.images[0] };
    }),
  );

  return (
    <section className="bg-white py-12 lg:py-16">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <h2 className="coco-heading mb-8">Collection</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {tiles.map(({ slug, collection, image }) => {
            if (!collection || !image) {
              return null;
            }

            return (
              <Link
                className="group relative block aspect-[16/9] overflow-hidden rounded-coco bg-cocoa-blush shadow-soft"
                href={`/collections/${slug}`}
                key={slug}
              >
                <Image
                  alt=""
                  className="h-full w-full object-cover opacity-80 transition duration-300 group-hover:scale-[1.03]"
                  fill
                  sizes="(min-width: 768px) 50vw, 100vw"
                  src={image}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-cocoa-ink/50 via-cocoa-ink/5 to-transparent" />
                <h3 className="absolute bottom-5 left-5 rounded-full bg-white/90 px-5 py-2 text-2xl font-extrabold tracking-normal text-cocoa-ink shadow-soft">
                  {collection.title}
                </h3>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
