"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { SafeImage } from "@/components/common/SafeImage";
import type { Product } from "@/data/products";
import { resolveAssetUrl } from "@/lib/api";

export function ProductGallery({ product }: { product: Product }) {
  const images = product.images;
  const [activeIndex, setActiveIndex] = useState(0);
  const activeImage = images[activeIndex] ?? images[0];

  if (!activeImage) {
    return null;
  }

  const showPrevious = () => {
    setActiveIndex((index) => (index === 0 ? images.length - 1 : index - 1));
  };

  const showNext = () => {
    setActiveIndex((index) => (index === images.length - 1 ? 0 : index + 1));
  };

  return (
    <section
      aria-label={`${product.title} media gallery`}
      className="grid gap-4"
    >
      <div className="relative aspect-square overflow-hidden rounded-[24px] bg-white shadow-soft">
        <SafeImage
          alt={`${product.title} image ${activeIndex + 1}`}
          className="h-full w-full object-cover"
          fill
          priority
          sizes="(min-width: 1024px) 50vw, 100vw"
          src={resolveAssetUrl(activeImage)}
        />
        {images.length > 1 ? (
          <div className="absolute inset-x-3 top-1/2 flex -translate-y-1/2 items-center justify-between">
            <button
              aria-label="Show previous product image"
              className="grid size-10 place-items-center rounded-full bg-white/90 text-cocoa-ink shadow-disclosure transition hover:bg-cocoa-honey"
              onClick={showPrevious}
              type="button"
            >
              <ChevronLeft aria-hidden="true" className="h-5 w-5" />
            </button>
            <button
              aria-label="Show next product image"
              className="grid size-10 place-items-center rounded-full bg-white/90 text-cocoa-ink shadow-disclosure transition hover:bg-cocoa-honey"
              onClick={showNext}
              type="button"
            >
              <ChevronRight aria-hidden="true" className="h-5 w-5" />
            </button>
          </div>
        ) : null}
      </div>
      {images.length > 1 ? (
        <div className="grid grid-cols-4 gap-3 sm:grid-cols-5">
          {images.map((image, index) => (
            <button
              aria-label={`Show product image ${index + 1}`}
              aria-pressed={activeIndex === index}
              className={`relative aspect-square overflow-hidden rounded-[15px] bg-white shadow-soft transition ${
                activeIndex === index
                  ? "ring-2 ring-cocoa-coral ring-offset-2 ring-offset-cocoa-cream"
                  : "hover:-translate-y-0.5 hover:ring-2 hover:ring-cocoa-honey"
              }`}
              key={image}
              onClick={() => setActiveIndex(index)}
              type="button"
            >
              <SafeImage
                alt={`${product.title} thumbnail ${index + 1}`}
                className="h-full w-full object-cover"
                fill
                sizes="120px"
                src={resolveAssetUrl(image)}
              />
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
}
