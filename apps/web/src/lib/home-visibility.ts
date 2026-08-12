import type { SiteContentBundle } from "@/lib/api";

export const HOME_VISIBILITY_KEY = "home.visibility";

export const HOME_SECTION_DEFINITIONS = [
  { id: "heroCarousel", label: "Hero carousel" },
  { id: "intro", label: "Hi Friend! panel" },
  { id: "newRelease", label: "New Release product row" },
  { id: "video", label: "Home video" },
  { id: "bestSeller", label: "Best Seller product row" },
  { id: "collectionTiles", label: "Collection tiles" },
  { id: "digital", label: "Digital product row" },
  { id: "blogPosts", label: "Blog posts" },
  { id: "featuredOn", label: "Featured On" },
  { id: "cozyMoments", label: "Cozy Moments gallery" },
  { id: "faqPreview", label: "FAQ preview" },
  { id: "newsletter", label: "Newsletter signup" },
  { id: "footerArtwork", label: "Homepage footer artwork" },
] as const;

export type HomeSectionId = (typeof HOME_SECTION_DEFINITIONS)[number]["id"];
export type HomeSectionVisibility = Partial<Record<HomeSectionId, boolean>>;

export function defaultHomeSectionVisibility(): Record<HomeSectionId, boolean> {
  return Object.fromEntries(
    HOME_SECTION_DEFINITIONS.map(({ id }) => [id, true]),
  ) as Record<HomeSectionId, boolean>;
}

export function readHomeSectionVisibility(bundle: SiteContentBundle): HomeSectionVisibility {
  return (bundle.homeSectionVisibility?.find((block) => block.key === HOME_VISIBILITY_KEY)?.data ?? {}) as HomeSectionVisibility;
}

export function homeSectionIsVisible(
  visibility: HomeSectionVisibility | null | undefined,
  section: HomeSectionId,
): boolean {
  return visibility?.[section] !== false;
}
