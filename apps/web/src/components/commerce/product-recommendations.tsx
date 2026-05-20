import type { Product } from "@/data/products";
import { getAllProducts } from "@/data/products";
import { getRelatedProducts } from "@/lib/catalog";
import { ProductRail } from "./product-rail";

export async function ProductRecommendations({ product }: { product: Product }) {
  const allProducts = await getAllProducts();
  return (
    <ProductRail
      ariaLabel="You may also like"
      products={getRelatedProducts(allProducts, product, 5)}
      title="You may also like"
    />
  );
}
