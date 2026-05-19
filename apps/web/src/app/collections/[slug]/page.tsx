import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { CollectionToolbar } from "@/components/commerce/collection-toolbar";
import { ProductGrid } from "@/components/commerce/product-grid";
import { type SortKey } from "@/data/collections";
import {
  getCollectionBySlug,
  getProductsForCollection,
  sortProducts,
  takePageSize,
} from "@/lib/catalog";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function readParam(
  params: Record<string, string | string[] | undefined>,
  key: string,
): string | undefined {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

export default async function CollectionPage({
  params,
  searchParams,
}: PageProps) {
  const { slug } = await params;
  const query = (await searchParams) ?? {};
  const [collection, collectionProducts] = await Promise.all([
    getCollectionBySlug(slug),
    getProductsForCollection(slug),
  ]);

  if (!collection) {
    notFound();
  }

  const pageSize = Number(readParam(query, "pageSize") ?? "20");
  const sort = (readParam(query, "sort") ?? collection.defaultSort) as SortKey;
  const products = takePageSize(sortProducts(collectionProducts, sort), pageSize);

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
      <div className="mt-8">
        <CollectionToolbar
          count={collectionProducts.length}
          pageSize={pageSize}
          sort={sort}
        />
        <ProductGrid products={products} />
      </div>
    </main>
  );
}
