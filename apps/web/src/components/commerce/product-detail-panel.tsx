"use client";

import { useState } from "react";
import Image from "next/image";
import { Minus, Plus } from "lucide-react";
import type { Product } from "@/data/products";
import { resolveAssetUrl } from "@/lib/api";
import { formatMoney } from "@/lib/format";
import { useSite } from "@/state/site-store";
import { WishlistButton } from "./wishlist-button";

export function ProductDetailPanel({ product }: { product: Product }) {
  const [quantity, setQuantity] = useState(1);
  const { dispatch } = useSite();
  const onSale =
    typeof product.compareAtPriceCents === "number" &&
    product.compareAtPriceCents > product.priceCents;
  const productImage = resolveAssetUrl(product.images[0]);

  return (
    <section className="lg:sticky lg:top-28">
      {onSale ? (
        <p className="mb-3 inline-flex rounded-[4px] bg-cocoa-purple px-3 py-1 text-xs font-extrabold text-white">
          Sale
        </p>
      ) : null}
      <h1 className="text-3xl font-extrabold tracking-normal text-cocoa-ink md:text-4xl">
        {product.title}
      </h1>
      <div className="mt-4 flex items-baseline gap-3">
        {onSale ? (
          <span className="text-base text-[#969696] line-through">
            {formatMoney(product.compareAtPriceCents ?? product.priceCents)}
          </span>
        ) : null}
        <span
          className={`text-[28px] font-normal ${
            onSale ? "text-cocoa-purple" : "text-cocoa-text"
          }`}
        >
          {formatMoney(product.priceCents)}
        </span>
      </div>
      <p className="mt-1 text-sm text-[#777]">Unit price / per</p>
      <div className="mt-8 space-y-4">
        <div>
          <p className="mb-2 text-sm font-extrabold">Format</p>
          <div className="flex flex-wrap gap-2">
            {product.options[0]?.values.map((value) => (
              <span
                className="rounded-full border border-cocoa-border bg-white px-4 py-2 text-sm font-bold"
                key={value}
              >
                {value}
              </span>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-2 text-sm font-extrabold">Quantity</p>
          <div className="inline-flex min-h-11 items-center rounded-full border border-cocoa-line bg-white">
            <button
              aria-label="Decrease quantity"
              className="grid h-11 w-11 place-items-center"
              onClick={() => setQuantity((value) => Math.max(1, value - 1))}
              type="button"
            >
              <Minus aria-hidden="true" className="h-4 w-4" />
            </button>
            <span className="min-w-10 text-center text-sm font-extrabold">
              {quantity}
            </span>
            <button
              aria-label="Increase quantity"
              className="grid h-11 w-11 place-items-center"
              onClick={() => setQuantity((value) => value + 1)}
              type="button"
            >
              <Plus aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
      <div className="mt-6 flex gap-3">
        <button
          className="coco-button-primary flex-1"
          onClick={() =>
            dispatch({
              type: "cart/add",
              item: {
                productSlug: product.slug,
                title: product.title,
                priceCents: product.priceCents,
                quantity,
                image: productImage,
                option: product.options[0]?.values[0],
              },
            })
          }
          type="button"
        >
          Add to cart
        </button>
        <WishlistButton productSlug={product.slug} productTitle={product.title} />
      </div>
      {product.available ? null : (
        <button
          className="coco-button-secondary mt-3 w-full"
          onClick={() => dispatch({ type: "modal/open", modal: "back-in-stock" })}
          type="button"
        >
          Back In Stock Notification
        </button>
      )}
      {product.sourceLinks?.length ? (
        <div className="mt-5">
          <span className="text-sm font-extrabold">Buy the book from:</span>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {product.sourceLinks.map((link) => (
            <a
              className="flex min-h-12 items-center justify-center rounded-[14px] border border-cocoa-line bg-white px-3 py-2 text-sm font-extrabold transition hover:-translate-y-0.5 hover:shadow-soft"
              href={link.href}
              key={link.label}
              rel="noreferrer"
              target="_blank"
            >
              {link.image ? (
                <Image
                  alt={link.alt ?? link.label}
                  className="h-auto max-h-9 w-full object-contain"
                  height={48}
                  src={resolveAssetUrl(link.image)}
                  width={180}
                />
              ) : (
                link.label
              )}
            </a>
          ))}
          </div>
        </div>
      ) : null}
      <div className="mt-8 space-y-4 border-t border-cocoa-line pt-6 text-sm leading-7 text-cocoa-text">
        {product.description.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>
    </section>
  );
}
