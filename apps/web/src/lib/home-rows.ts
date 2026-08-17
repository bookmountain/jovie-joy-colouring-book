import type { Collection } from "@/lib/api";

export type HomeRowData = {
  eyebrow?: string;
  title?: string;
  href?: string;
  collectionSlug?: string;
  itemCount?: number;
};

export function applyHomepageCollection(
  configured: HomeRowData,
  collections: Collection[],
  // "newrelease" is excluded: that homepage row auto-feeds from the newest
  // products instead of a curated collection.
  slot: Exclude<Collection["homepageSlot"], "tile" | "newrelease" | null>,
): HomeRowData {
  const assigned = collections.find((collection) => collection.homepageSlot === slot);
  return assigned
    ? {
        ...configured,
        collectionSlug: assigned.slug,
        href: `/products?collection=${assigned.slug}`,
      }
    : configured;
}
