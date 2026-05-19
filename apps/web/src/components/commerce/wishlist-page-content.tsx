"use client";

import Link from "next/link";
import { ProductGrid } from "@/components/commerce/product-grid";
import type { Product } from "@/data/products";
import { getProductBySlug } from "@/lib/catalog";
import { useSite } from "@/state/site-store";

export function WishlistPageContent() {
  const { state } = useSite();
  const products = state.wishlist
    .map(getProductBySlug)
    .filter((product): product is Product => Boolean(product));

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 lg:px-8">
      <h1 className="coco-heading">My wish list</h1>
      {products.length === 0 ? (
        <div className="mt-8 rounded-coco bg-cocoa-blush p-8 text-center shadow-soft">
          <p className="text-sm text-cocoa-text">Your wish list is empty.</p>
          <Link className="coco-button-primary mt-4" href="/collections/all">
            Continue shopping
          </Link>
        </div>
      ) : (
        <div className="mt-8">
          <ProductGrid products={products} />
        </div>
      )}
    </main>
  );
}
