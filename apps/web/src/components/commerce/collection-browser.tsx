"use client";

import { useSearchParams } from "next/navigation";
import { CollectionToolbar } from "@/components/commerce/collection-toolbar";
import { ProductGrid } from "@/components/commerce/product-grid";
import type { SortKey } from "@/data/collections";
import type { Product } from "@/lib/api";
import { sortProducts, takePageSize } from "@/lib/product-list";

export function CollectionBrowser({
  defaultSort,
  products,
}: {
  defaultSort: SortKey;
  products: Product[];
}) {
  const searchParams = useSearchParams();
  const pageSize = Number(searchParams.get("pageSize") ?? "20");
  const sort = (searchParams.get("sort") ?? defaultSort) as SortKey;
  const visibleProducts = takePageSize(sortProducts(products, sort), pageSize);

  return (
    <>
      <CollectionToolbar
        count={products.length}
        pageSize={pageSize}
        sort={sort}
      />
      <ProductGrid products={visibleProducts} />
    </>
  );
}
