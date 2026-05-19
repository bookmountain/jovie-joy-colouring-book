"use client";

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { X } from "lucide-react";
import { trendingTerms } from "@/data/navigation";
import { getPopularProducts, searchCatalog } from "@/lib/catalog";
import { formatPrice } from "@/lib/format";
import { useSite } from "@/state/site-store";

export function SearchDrawer() {
  const { state, dispatch } = useSite();

  useEffect(() => {
    const main = document.querySelector("main");

    if (state.activeDrawer !== "search" || !main) {
      return;
    }

    main.setAttribute("aria-hidden", "true");

    return () => {
      main.removeAttribute("aria-hidden");
    };
  }, [state.activeDrawer]);

  if (state.activeDrawer !== "search") {
    return null;
  }

  const results = state.searchQuery
    ? searchCatalog(state.searchQuery).slice(0, 6)
    : getPopularProducts();

  return (
    <div className="fixed inset-0 z-50 bg-cocoa-ink/35">
      <aside className="ml-auto h-full w-[min(92vw,520px)] overflow-y-auto rounded-l-coco bg-cocoa-cream p-6 shadow-drawer">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="coco-heading">Search</h2>
          <button
            aria-label="Close search"
            className="grid h-10 w-10 place-items-center rounded-full border border-cocoa-line bg-white"
            onClick={() => dispatch({ type: "drawer/close" })}
            type="button"
          >
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>
        <input
          autoFocus
          className="coco-input w-full"
          onChange={(event) =>
            dispatch({ type: "search/set", query: event.target.value })
          }
          placeholder="Search the store"
          value={state.searchQuery}
        />
        <div className="mt-6">
          <p className="text-sm font-extrabold">Trending Now</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {trendingTerms.map((term) => (
              <button
                className="rounded-full border border-cocoa-border bg-white px-3 py-1 text-sm font-bold hover:bg-cocoa-honey"
                key={term}
                onClick={() => dispatch({ type: "search/set", query: term })}
                type="button"
              >
                {term}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-8">
          <p className="mb-4 text-sm font-extrabold">
            {state.searchQuery ? "Search results" : "Popular Products"}
          </p>
          {results.length === 0 ? (
            <p className="rounded-coco-sm bg-white p-4 text-sm text-cocoa-text">
              No products found.
            </p>
          ) : (
            <div className="grid gap-4">
              {results.map((product) => (
                <Link
                  className="grid grid-cols-[72px_1fr] gap-3"
                  href={`/products/${product.slug}`}
                  key={product.slug}
                  onClick={() => dispatch({ type: "drawer/close" })}
                >
                  <div className="relative aspect-square overflow-hidden rounded-coco-sm bg-cocoa-blush">
                    <Image
                      alt=""
                      className="h-full w-full object-cover"
                      fill
                      sizes="72px"
                      src={product.images[0]}
                    />
                  </div>
                  <div>
                    <p className="text-sm font-extrabold">{product.title}</p>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-cocoa-text">
                      {product.excerpt}
                    </p>
                    <p className="mt-2 text-sm font-extrabold text-cocoa-purple">
                      {formatPrice(product.price)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
