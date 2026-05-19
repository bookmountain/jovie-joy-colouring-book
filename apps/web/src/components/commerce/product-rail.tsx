import type { Product } from "@/data/products";
import { ProductCard } from "./product-card";

export function ProductRail({
  ariaLabel,
  products,
  title,
}: {
  ariaLabel?: string;
  products: Product[];
  title: string;
}) {
  if (products.length === 0) {
    return null;
  }

  return (
    <section aria-label={ariaLabel ?? title} className="py-10 lg:py-12">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <h2 className="coco-heading mb-8 text-center">{title}</h2>
        <div className="grid grid-cols-2 gap-x-4 gap-y-11 md:grid-cols-3 lg:grid-cols-5 lg:gap-x-7">
          {products.map((product) => (
            <ProductCard key={product.slug} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}
