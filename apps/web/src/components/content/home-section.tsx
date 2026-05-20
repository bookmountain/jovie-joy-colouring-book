import Link from "next/link";
import type { Product } from "@/data/products";
import { ProductGrid } from "@/components/commerce/product-grid";

export function HomeSection({
  title,
  eyebrow,
  href,
  products,
}: {
  title: string;
  eyebrow?: string;
  href: string;
  products: Product[];
}) {
  return (
    <section className="py-12 lg:py-16">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            {eyebrow ? (
              <p className="mb-2 text-sm font-extrabold uppercase tracking-[0.16em] text-cocoa-coral">
                {eyebrow}
              </p>
            ) : null}
            <h2 className="coco-heading">
              {title}
            </h2>
          </div>
          <Link
            className="rounded-full border border-cocoa-border bg-white px-5 py-2 text-sm font-extrabold text-cocoa-ink transition hover:bg-cocoa-honey"
            href={href}
          >
            View more
          </Link>
        </div>
        <ProductGrid products={products} />
      </div>
    </section>
  );
}
