"use client";

import { useEffect, useMemo, useState } from "react";
import { ProductGrid } from "@/components/commerce/product-grid";
import { fetchCatalog, searchCatalog } from "@/lib/catalog";
import type { Product } from "@/lib/api";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [catalog, setCatalog] = useState<Product[]>([]);

  useEffect(() => {
    fetchCatalog().then(setCatalog).catch(() => setCatalog([]));
  }, []);

  const results = useMemo(() => searchCatalog(catalog, query), [catalog, query]);

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 lg:px-8">
      <h1 className="coco-heading">Search</h1>
      <input
        className="coco-input mt-8 w-full max-w-xl"
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search the store"
        value={query}
      />
      <div className="mt-8">
        {query && results.length === 0 ? (
          <p className="rounded-coco-sm bg-cocoa-blush p-4 text-sm text-cocoa-text">
            No products found.
          </p>
        ) : (
          <ProductGrid products={results} />
        )}
      </div>
    </main>
  );
}
