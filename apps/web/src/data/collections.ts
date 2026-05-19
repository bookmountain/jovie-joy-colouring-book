import type { Collection } from "@/lib/api";
import { apiGetCollections, apiGetCollection } from "@/lib/api";

export type { Collection };

export type SortKey =
  | "featured"
  | "relevance"
  | "best-selling"
  | "title-ascending"
  | "title-descending"
  | "price-ascending"
  | "price-descending"
  | "created-ascending"
  | "created-descending";

export const collectionSortLabels: Record<SortKey, string> = {
  featured: "Featured",
  relevance: "Most relevant",
  "best-selling": "Best selling",
  "title-ascending": "Alphabetically, A-Z",
  "title-descending": "Alphabetically, Z-A",
  "price-ascending": "Price, low to high",
  "price-descending": "Price, high to low",
  "created-ascending": "Date, old to new",
  "created-descending": "Date, new to old",
};

export async function getAllCollections(): Promise<Collection[]> {
  return apiGetCollections();
}

export async function getCollection(slug: string) {
  try {
    return await apiGetCollection(slug);
  } catch {
    return null;
  }
}
