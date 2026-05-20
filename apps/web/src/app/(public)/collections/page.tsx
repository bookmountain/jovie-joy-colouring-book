import Image from "next/image";
import Link from "next/link";
import { getAllCollections } from "@/data/collections";
import { getProductsForCollection } from "@/lib/catalog";

export default async function CollectionsPage() {
  const all = await getAllCollections();
  const visible = all.filter((collection) => collection.slug !== "all");
  const previews = await Promise.all(
    visible.map(async (collection) => {
      const products = await getProductsForCollection(collection.slug);
      return { collection, image: products[0]?.images[0] };
    }),
  );

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 lg:px-8">
      <h1 className="coco-heading">Collections</h1>
      <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {previews.map(({ collection, image }) => (
          <Link
            className="group block"
            href={`/collections/${collection.slug}`}
            key={collection.slug}
          >
            <div className="relative aspect-[4/3] overflow-hidden rounded-coco bg-cocoa-blush shadow-soft">
              {image ? (
                <Image
                  alt=""
                  className="h-full w-full object-cover transition group-hover:scale-[1.03]"
                  fill
                  sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                  src={image}
                />
              ) : null}
            </div>
            <h2 className="mt-4 text-xl font-extrabold">{collection.title}</h2>
            <p className="mt-2 text-sm leading-6 text-cocoa-text">
              {collection.excerpt}
            </p>
          </Link>
        ))}
      </div>
    </main>
  );
}
