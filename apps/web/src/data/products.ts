import type { Product, ProductOption, SourceLink } from "@/lib/api";
import { apiGetProducts, apiGetProduct } from "@/lib/api";

export type { Product, ProductOption, SourceLink };
export type ProductType = Product["productType"];

export async function getAllProducts(collection?: string, sort?: string): Promise<Product[]> {
  return apiGetProducts(collection, sort);
}

export async function getProduct(slug: string): Promise<Product | null> {
  try {
    return await apiGetProduct(slug);
  } catch {
    return null;
  }
}
