"use client";

import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/data/products";
import { resolveAssetUrl } from "@/lib/api";
import { formatMoney } from "@/lib/format";
import { useSite } from "@/state/site-store";
import { WishlistButton } from "./wishlist-button";

export function ProductCard({ product }: { product: Product }) {
  const { dispatch } = useSite();
  const onSale =
    typeof product.compareAtPriceCents === "number" &&
    product.compareAtPriceCents > product.priceCents;
  const imageSrc = resolveAssetUrl(product.images[0]);

  return (
    <article
      className="group relative flex h-full flex-col text-center"
      data-testid="product-card"
    >
      <Link
        aria-label={product.title}
        className="block"
        href={`/products/${product.slug}`}
      >
        <div className="relative aspect-square overflow-hidden rounded-coco-sm bg-cocoa-cream">
          <Image
            alt={product.title}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            src={imageSrc}
          />
          {onSale ? (
            <span className="absolute left-3 top-3 rounded-[4px] bg-cocoa-purple px-3 py-1 text-xs font-extrabold text-white">
              Sale
            </span>
          ) : null}
        </div>
      </Link>
      <div className="absolute right-3 top-3">
        <WishlistButton
          productSlug={product.slug}
          productTitle={product.title}
        />
      </div>
      <div className="flex flex-1 flex-col pt-4">
        <Link href={`/products/${product.slug}`}>
          <h3 className="line-clamp-2 min-h-14 text-[18px] font-normal leading-7 text-cocoa-ink transition hover:text-cocoa-coral">
            {product.title}
          </h3>
        </Link>
        <div className="mt-auto pt-2">
          <div className="flex items-baseline justify-center gap-2">
            {onSale ? (
              <span className="text-[15px] text-[#969696] line-through">
                {formatMoney(product.compareAtPriceCents ?? product.priceCents)}
              </span>
            ) : null}
            <span
              className={`text-[23px] font-normal ${
                onSale ? "text-cocoa-purple" : "text-cocoa-text"
              }`}
            >
              {formatMoney(product.priceCents)}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-[#777]">Unit price / per</p>
          <button
            className="mt-4 min-h-11 w-full rounded-full border border-cocoa-border bg-white px-4 text-sm font-extrabold text-cocoa-ink transition hover:bg-cocoa-honey"
            onClick={() => {
              if (!product.available) {
                dispatch({ type: "modal/open", modal: "back-in-stock" });
                return;
              }

              dispatch({ type: "modal/open", modal: "choose-options" });
            }}
            type="button"
          >
            {product.available ? "Choose options" : "Back In Stock Notification"}
          </button>
        </div>
      </div>
    </article>
  );
}
