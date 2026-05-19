import type { Product } from "@/data/products";
import { getRelatedProducts } from "@/lib/catalog";
import { ProductRail } from "./product-rail";

export function ProductRecommendations({ product }: { product: Product }) {
  return (
    <ProductRail
      ariaLabel="You may also like"
      products={getRelatedProducts(product, 5)}
      title="You may also like"
    />
  );
}
