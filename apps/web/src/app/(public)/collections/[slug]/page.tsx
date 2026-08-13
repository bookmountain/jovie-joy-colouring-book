import { Suspense } from "react";
import { notFound } from "next/navigation";
import { SafeImage } from "@/components/common/SafeImage";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { CollectionBrowser } from "@/components/commerce/collection-browser";
import { ProductGrid } from "@/components/commerce/product-grid";
import type { SortKey } from "@/data/collections";
import {
  getCollectionBySlug,
  getProductsForCollection,
} from "@/lib/catalog";
import { resolveAssetUrl } from "@/lib/api";
import { sortProducts, takePageSize } from "@/lib/product-list";
import { requireNavigationRoute } from "@/lib/require-navigation-route";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return [];
}

export default async function CollectionPage({
  params,
}: PageProps) {
  const { slug } = await params;
  await requireNavigationRoute(`/collections/${slug}`);
  const [collection, collectionProducts] = await Promise.all([
    getCollectionBySlug(slug),
    getProductsForCollection(slug),
  ]);

  if (!collection) {
    notFound();
  }

  const defaultProducts = takePageSize(
    sortProducts(collectionProducts, collection.defaultSort as SortKey),
    20,
  );

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 lg:px-8">
      <Breadcrumbs items={[{ label: "Collections", href: "/collections" }, { label: collection.title }]} />
      <div className="mt-8">
        <h1 className="coco-heading">
          {collection.title}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-cocoa-text">
          {collection.excerpt}
        </p>
      </div>
      {collection.heroImage ? (
        <div className="relative mt-8 aspect-[16/5] overflow-hidden rounded-coco bg-cocoa-blush shadow-soft">
          <SafeImage
            alt=""
            className="h-full w-full object-cover"
            fill
            priority
            sizes="(min-width: 1280px) 1216px, 100vw"
            src={resolveAssetUrl(collection.heroImage)}
          />
        </div>
      ) : null}
      <div className="mt-8">
        <Suspense fallback={<ProductGrid products={defaultProducts} />}>
          <CollectionBrowser
            defaultSort={collection.defaultSort as SortKey}
            products={collectionProducts}
          />
        </Suspense>
      </div>
    </main>
  );
}
