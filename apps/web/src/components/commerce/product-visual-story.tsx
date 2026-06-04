import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/data/products";
import { resolveAssetUrl } from "@/lib/api";

export function ProductVisualStory({ product }: { product: Product }) {
  const reviewImages = product.reviewImages ?? [];
  const inspirationImages = product.inspirationImages ?? [];

  if (reviewImages.length === 0 && inspirationImages.length === 0) {
    return null;
  }

  return (
    <section className="bg-white py-10 lg:py-12">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        {reviewImages.length ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            {reviewImages.map((image, index) => (
              <div
                className="relative aspect-square overflow-hidden rounded-[18px] bg-cocoa-cream shadow-soft"
                key={image}
              >
                <Image
                  alt={`Review Image ${index + 1}`}
                  className="h-full w-full object-cover"
                  fill
                  sizes="(min-width: 768px) 20vw, 50vw"
                  src={resolveAssetUrl(image)}
                />
              </div>
            ))}
          </div>
        ) : null}

        {inspirationImages.length ? (
          <div className="mt-12 text-center">
            <h2 className="coco-heading">Get inspired</h2>
            <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
              {inspirationImages.map((image, index) => (
                <div
                  className="relative aspect-square overflow-hidden rounded-[18px] bg-cocoa-blush shadow-soft"
                  key={image}
                >
                  <Image
                    alt={`Inspiration Image ${index + 1}`}
                    className="h-full w-full object-cover"
                    fill
                    sizes="(min-width: 768px) 25vw, 50vw"
                    src={resolveAssetUrl(image)}
                  />
                </div>
              ))}
            </div>
            <Link
              className="mt-7 inline-flex rounded-full border border-cocoa-border bg-white px-6 py-2 text-sm font-extrabold text-cocoa-ink transition hover:bg-cocoa-honey"
              href="/pages/gallery"
            >
              More inspiration in Gallery
            </Link>
          </div>
        ) : null}
      </div>
    </section>
  );
}
