import { SafeImage } from "@/components/common/SafeImage";
import Link from "next/link";
import { resolveAssetUrl } from "@/lib/api";
import { getAllCollections } from "@/data/collections";
import { getProductsForCollection } from "@/lib/catalog";

const tileSlugs = ["bold-easy", "cute-comfy", "classic", "seasonal"];

export async function CollectionTiles() {
  const collections = await getAllCollections();
  const configuredTiles = collections.filter((collection) => collection.homepageSlot === "tile");
  const tileCollections = configuredTiles.length > 0
    ? configuredTiles
    : tileSlugs.flatMap((slug) => {
        const collection = collections.find((candidate) => candidate.slug === slug);
        return collection ? [collection] : [];
      });

  const tiles = await Promise.all(
    tileCollections.map(async (collection) => {
      const products = await getProductsForCollection(collection.slug);
      return {
        collection,
        image: collection.heroImage || products[0]?.images[0],
      };
    }),
  );

  return (
    <section className="bg-white py-12 lg:py-16">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <h2 className="coco-heading mb-8">Collection</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {tiles.map(({ collection, image }) => {
            if (!image) {
              return null;
            }

            return (
              <Link
                className="group relative block aspect-[16/9] overflow-hidden rounded-coco bg-cocoa-blush shadow-soft"
                href={`/collections/${collection.slug}`}
                key={collection.slug}
              >
                <SafeImage
                  alt=""
                  className="h-full w-full object-cover opacity-80 transition duration-300 group-hover:scale-[1.03]"
                  fill
                  sizes="(min-width: 768px) 50vw, 100vw"
                  src={resolveAssetUrl(image)}
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
