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
  slot: Exclude<Collection["homepageSlot"], "tile" | null>,
): HomeRowData {
  const assigned = collections.find((collection) => collection.homepageSlot === slot);
  return assigned
    ? {
        ...configured,
        collectionSlug: assigned.slug,
        href: `/collections/${assigned.slug}`,
      }
    : configured;
}
