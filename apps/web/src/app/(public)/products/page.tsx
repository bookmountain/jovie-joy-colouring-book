import { Suspense } from "react";
import { notFound } from "next/navigation";
import { SafeImage } from "@/components/common/SafeImage";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { CollectionBrowser } from "@/components/commerce/collection-browser";
import { ProductGrid } from "@/components/commerce/product-grid";
import type { SortKey } from "@/data/collections";
import { getAllProducts } from "@/data/products";
import { getCollectionBySlug, getProductsForCollection } from "@/lib/catalog";
import { resolveAssetUrl } from "@/lib/api";
import { sortProducts, takePageSize } from "@/lib/product-list";
import { requireNavigationRoute } from "@/lib/require-navigation-route";

type PageProps = {
  searchParams: Promise<{ collection?: string }>;
};

// Everything a shopper browses lives under /products, including a single
// collection's listing (/products?collection=physical-books). Collections are
// a grouping of products, so the customer-facing word stays "products"
// throughout the URL, the breadcrumb and the menu.
export default async function ProductsPage({ searchParams }: PageProps) {
  const { collection: collectionSlug } = await searchParams;
  await requireNavigationRoute("/products");

  const collection = collectionSlug ? await getCollectionBySlug(collectionSlug) : null;
  if (collectionSlug && !collection) {
    notFound();
  }

  const products = collection
    ? await getProductsForCollection(collection.slug)
    : await getAllProducts();
  const defaultSort = (collection?.defaultSort as SortKey) ?? "created-descending";
  const defaultProducts = takePageSize(sortProducts(products, defaultSort), 20);

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 lg:px-8">
      <Breadcrumbs
        items={collection
          ? [{ label: "Products", href: "/products" }, { label: collection.title }]
          : [{ label: "Products" }]}
      />
      <div className="mt-8">
        <h1 className="coco-heading">{collection ? collection.title : "All Products"}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-cocoa-text">
          {collection
            ? collection.excerpt
            : "Browse every coloring book and sticker pack in the shop."}
        </p>
      </div>
      {collection?.heroImage ? (
        <div className="relative mt-8 aspect-[16/5] overflow-hidden rounded-coco bg-cocoa-blush shadow-soft">
          <SafeImage
            alt=""
            className="h-full w-full object-cover"
            fill
            priority
            sizes="100vw"
            src={resolveAssetUrl(collection.heroImage)}
          />
        </div>
      ) : null}
      <div className="mt-8">
        <Suspense fallback={<ProductGrid products={defaultProducts} />}>
          <CollectionBrowser defaultSort={defaultSort} products={products} />
        </Suspense>
      </div>
    </main>
  );
}
