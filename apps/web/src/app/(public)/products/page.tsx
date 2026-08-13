import { Suspense } from "react";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { CollectionBrowser } from "@/components/commerce/collection-browser";
import { ProductGrid } from "@/components/commerce/product-grid";
import { getAllProducts } from "@/data/products";
import { sortProducts, takePageSize } from "@/lib/product-list";
import { requireNavigationRoute } from "@/lib/require-navigation-route";

export default async function ProductsPage() {
  await requireNavigationRoute("/products");
  const allProducts = await getAllProducts();
  const defaultProducts = takePageSize(
    sortProducts(allProducts, "created-descending"),
    20,
  );

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
        <Suspense fallback={<ProductGrid products={defaultProducts} />}>
          <CollectionBrowser
            defaultSort="created-descending"
            products={allProducts}
          />
        </Suspense>
      </div>
    </main>
  );
}
