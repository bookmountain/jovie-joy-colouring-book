import { describe, expect, it } from "vitest";
import { applyHomepageCollection, type HomeRowData } from "@/lib/home-rows";
import type { Collection } from "@/lib/api";

const configuredRow: HomeRowData = {
  eyebrow: "CMS eyebrow",
  title: "CMS row title",
  href: "/collections/configured-fallback",
  collectionSlug: "configured-fallback",
  itemCount: 7,
};

function assignedCollection(
  slot: Exclude<Collection["homepageSlot"], "tile" | null>,
): Collection {
  return {
    id: `${slot}-id`,
    slug: `${slot}-collection`,
    title: `${slot} collection`,
    excerpt: "Assigned in the collection CMS",
    heroImage: null,
    defaultSort: "featured",
    homepageSlot: slot,
    productSlugs: [],
    sortIndex: 0,
  };
}

describe("applyHomepageCollection", () => {
  it.each(["newrelease", "bestseller", "digital"] as const)(
    "uses the collection assigned to the %s slot while preserving the configured row copy and count",
    (slot) => {
      const result = applyHomepageCollection(configuredRow, [assignedCollection(slot)], slot);

      expect(result).toEqual({
        eyebrow: "CMS eyebrow",
        title: "CMS row title",
        href: `/collections/${slot}-collection`,
        collectionSlug: `${slot}-collection`,
        itemCount: 7,
      });
    },
  );

  it("returns the configured row unchanged when no collection owns the slot", () => {
    const result = applyHomepageCollection(
      configuredRow,
      [assignedCollection("digital")],
      "newrelease",
    );

    expect(result).toBe(configuredRow);
    expect(result).toEqual(configuredRow);
  });
});
