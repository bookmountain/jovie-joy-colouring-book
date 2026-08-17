export const ACTIVE_CONTENT_BLOCK_TYPES = [
  "HomeHeroSlides",
  "HomeProductRow",
  "HomeSectionVisibility",
  "SiteModules",
  "Announcement",
  "HomeVideo",
  "HeroArtwork",
  "HomeIntro",
  "HomeCozyMomentsHeader",
  "FooterContact",
  "HeaderBrand",
  "NewsletterCopy",
] as const;

export const RETIRED_CONTENT_BLOCK_TYPES = {
  HomeHero: {
    editorHref: "/admin/pages/home",
    editorLabel: "Home page editor",
  },
  AboutSection: {
    editorHref: "/admin/about",
    editorLabel: "About page editor",
  },
  FaqEntry: {
    editorHref: "/admin/faq",
    editorLabel: "FAQ editor",
  },
  FooterGroup: {
    editorHref: "/admin/pages/footer",
    editorLabel: "Footer editor",
  },
  FeaturedOn: {
    editorHref: "/admin/featured-on",
    editorLabel: "Featured On editor",
  },
} as const;

export type RetiredContentBlockType = keyof typeof RETIRED_CONTENT_BLOCK_TYPES;

export function retiredContentBlock(type: string) {
  return RETIRED_CONTENT_BLOCK_TYPES[type as RetiredContentBlockType];
}
