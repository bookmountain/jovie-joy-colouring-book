"use client";

import { useEffect, useState } from "react";
import type { Product } from "@/data/products";
import { fetchCatalog } from "@/lib/catalog";
import { useSite } from "@/state/site-store";
import { ProductRail } from "./product-rail";

export function RecentlyViewed({
  fallbackProducts = [],
  product,
}: {
  fallbackProducts?: Product[];
  product: Product;
}) {
  const { state, dispatch } = useSite();
  const [catalog, setCatalog] = useState<Product[]>([]);

  useEffect(() => {
    fetchCatalog().then(setCatalog).catch(() => setCatalog([]));
  }, []);

  useEffect(() => {
    dispatch({ type: "recentlyViewed/add", productSlug: product.slug });
  }, [dispatch, product.slug]);

  const bySlug = new Map(catalog.map((p) => [p.slug, p]));
  const recent = state.recentlyViewed
    .filter((slug) => slug !== product.slug)
    .map((slug) => bySlug.get(slug))
    .filter((item): item is Product => Boolean(item))
    .slice(0, 4);

  const productsToShow =
    recent.length > 0
      ? recent
      : fallbackProducts
          .filter((candidate) => candidate.slug !== product.slug)
          .slice(0, 4);

  if (productsToShow.length === 0) {
    return null;
  }

  return (
    <ProductRail
      ariaLabel="Recently viewed"
      products={productsToShow}
      title="Recently viewed"
    />
  );
}
