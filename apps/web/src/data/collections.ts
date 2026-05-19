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

export type Collection = {
  slug: string;
  title: string;
  excerpt: string;
  heroImage?: string;
  productSlugs: string[];
  defaultSort: SortKey;
  homepageSlot?: "new-release" | "best-seller" | "digital" | "tile";
};

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

export const collections: Collection[] = [
  {
    slug: "all",
    title: "Products",
    excerpt: "Every fixture product in this learning clone.",
    productSlugs: [],
    defaultSort: "title-ascending",
  },
  {
    slug: "vinyl-sticker-packs",
    title: "Vinyl Sticker Packs",
    excerpt: "Sticker packs with the same sale-card behavior as the public store.",
    productSlugs: [
      "cute-things-vinyl-sticker-pack-100pcs",
      "cozy-friends-vinyl-sticker-pack-100pcs",
    ],
    defaultSort: "relevance",
  },
  {
    slug: "physical-books",
    title: "Zoe&Book Coloring Books",
    excerpt: "Paperback, spiral-bound, and collaboration coloring books.",
    productSlugs: [],
    defaultSort: "best-selling",
  },
  {
    slug: "spiral-bound",
    title: "Spiral-bound",
    excerpt: "Spiral-bound coloring book and sticker set products.",
    productSlugs: [],
    defaultSort: "title-ascending",
  },
  {
    slug: "paperback-coloring-book",
    title: "Paperback",
    excerpt: "Physical paperback-style coloring book products.",
    productSlugs: [],
    defaultSort: "title-ascending",
  },
  {
    slug: "digital",
    title: "Digital",
    excerpt: "Printable digital coloring page products.",
    productSlugs: [],
    defaultSort: "title-ascending",
    homepageSlot: "digital",
  },
  {
    slug: "collab-collection",
    title: "Collab Collection",
    excerpt: "Public collaboration titles represented in the local clone.",
    productSlugs: [],
    defaultSort: "title-ascending",
  },
  {
    slug: "frontpage",
    title: "Best Seller",
    excerpt: "Best-selling titles highlighted on the homepage.",
    productSlugs: [
      "cozy-christmas-coloring-book",
      "girl-moments-coloring-book",
      "girl-moments-coloring-book-vol-2",
      "ocean-scene-coloring-book",
      "little-corner-coloring-book",
      "cozy-friends-coloring-book",
    ],
    defaultSort: "best-selling",
    homepageSlot: "best-seller",
  },
  {
    slug: "new-release",
    title: "New Release",
    excerpt: "Newer public products and sale cards.",
    productSlugs: [
      "cozy-friends-vinyl-sticker-pack-100pcs",
      "cute-things-vinyl-sticker-pack-100pcs",
      "comfy-corner-coloring-book",
      "little-cuddles-coloring-book-spiral-bound-and-sticker-set",
    ],
    defaultSort: "created-descending",
    homepageSlot: "new-release",
  },
  {
    slug: "cute-comfy",
    title: "Cute & Comfy",
    excerpt: "Cozy character books, gentle corners, and comfy scenes.",
    productSlugs: [],
    defaultSort: "best-selling",
    homepageSlot: "tile",
  },
  {
    slug: "bold-easy",
    title: "Bold & Easy",
    excerpt: "Large, simple, easy-to-color pages.",
    productSlugs: [],
    defaultSort: "title-ascending",
    homepageSlot: "tile",
  },
  {
    slug: "classic",
    title: "Classic",
    excerpt: "Recognizable cozy book titles.",
    productSlugs: [],
    defaultSort: "title-ascending",
    homepageSlot: "tile",
  },
  {
    slug: "seasonal",
    title: "Seasonal",
    excerpt: "Christmas, spooky, and seasonally cozy titles.",
    productSlugs: [],
    defaultSort: "title-ascending",
    homepageSlot: "tile",
  },
  {
    slug: "patterns",
    title: "Patterns",
    excerpt: "Pattern-based bold and easy coloring books.",
    productSlugs: [],
    defaultSort: "title-ascending",
  },
  {
    slug: "freebies",
    title: "Freebies",
    excerpt: "Free mini coloring resources.",
    productSlugs: ["mini-coloring-book"],
    defaultSort: "title-ascending",
  },
];
