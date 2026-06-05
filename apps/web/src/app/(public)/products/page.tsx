import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { CollectionToolbar } from "@/components/commerce/collection-toolbar";
import { ProductGrid } from "@/components/commerce/product-grid";
import { type SortKey } from "@/data/collections";
import { getAllProducts } from "@/data/products";
import { sortProducts, takePageSize } from "@/lib/catalog";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function readParam(
  params: Record<string, string | string[] | undefined>,
  key: string,
): string | undefined {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

export default async function ProductsPage({ searchParams }: PageProps) {
  const query = (await searchParams) ?? {};
  const allProducts = await getAllProducts();

  const pageSize = Number(readParam(query, "pageSize") ?? "20");
  const sort = (readParam(query, "sort") ?? "created-descending") as SortKey;
  const products = takePageSize(sortProducts(allProducts, sort), pageSize);

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 lg:px-8">
      <Breadcrumbs items={[{ label: "Products" }]} />
      <div className="mt-8">
        <h1 className="coco-heading">All Products</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-cocoa-text">
          Browse every coloring book and sticker pack in the shop.
        </p>
      </div>
      <div className="mt-8">
        <CollectionToolbar
          count={allProducts.length}
          pageSize={pageSize}
          sort={sort}
        />
        <ProductGrid products={products} />
      </div>
    </main>
  );
}
