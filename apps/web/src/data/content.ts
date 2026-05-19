export type BlogCategory = {
  slug: string;
  title: string;
  excerpt: string;
  image: string;
};

export type Article = {
  slug: string;
  blogSlug: string;
  title: string;
  excerpt: string;
  image: string;
  body: string[];
};

export type StaticPage = {
  slug: string;
  title: string;
  intro: string;
  blocks: string[];
};

export type AboutSection = {
  title: string;
  body: string[];
  image: string;
  alt: string;
  background: string;
};

export type Comic = {
  title: string;
  description: string;
  images: {
    src: string;
    alt: string;
  }[];
  hasDownload?: boolean;
};

export type ComicWorld = {
  title: string;
  comics: Comic[];
};

export type FeaturedOnLink = {
  label: string;
  href: string;
  image: string;
  alt: string;
};

export const homeVideo = {
  src: "https://cocowyo.com/cdn/shop/videos/c/vp/35c5461dff43486e92c79a0e5735e7a0/35c5461dff43486e92c79a0e5735e7a0.HD-1080p-7.2Mbps-42161933.mp4?v=0",
  youtubeHref: "https://www.youtube.com/watch?v=_9VUPq3SxOc",
};

export const featuredOnLinks: FeaturedOnLink[] = [
  {
    label: "Penguin Random House",
    href: "https://www.penguinrandomhouse.com/",
    image:
      "https://cocowyo.com/cdn/shop/files/PRH-new.png?v=1776325503&width=500",
    alt: "Penguin Random House feature badge",
  },
  {
    label: "Etsy",
    href: "https://www.etsy.com/",
    image:
      "https://cocowyo.com/cdn/shop/files/Etsy-new.png?v=1776325502&width=500",
    alt: "Etsy feature badge",
  },
  {
    label: "Amazon",
    href: "https://www.amazon.com/",
    image:
      "https://cocowyo.com/cdn/shop/files/Amazon-new.png?v=1776325503&width=500",
    alt: "Amazon feature badge",
  },
  {
    label: "TikTok Shop",
    href: "https://www.tiktok.com/shop",
    image:
      "https://cocowyo.com/cdn/shop/files/TTS-new.png?v=1776325503&width=500",
    alt: "TikTok Shop feature badge",
  },
];

export const faqArtwork = {
  desktop:
    "https://cocowyo.com/cdn/shop/files/FAQs-desktop-2.png?v=1776916849&width=1500",
  mobile:
    "https://cocowyo.com/cdn/shop/files/FAQs-mobile.png?v=1776916631&width=750",
};

export const footerArtwork = {
  desktop: "/placeholders/footer-characters-desktop.png",
  mobile: "/placeholders/footer-characters-mobile.png",
};

export const blogCategories: BlogCategory[] = [
  {
    slug: "htc",
    title: "How to Color",
    excerpt:
      "Step-by-step coloring tips to relax, explore, and bring favorite pages to life.",
    image:
      "https://cdn.shopify.com/s/files/1/0602/0133/6893/files/1-cozy-friends-coloring-book_1e6f3fa6-a8d0-41b9-92f8-975d68ae5adf.png?v=1775734470",
  },
  {
    slug: "coloring-book-guide",
    title: "Tools & Tips",
    excerpt: "Helpful guides for choosing and using tools that match your style.",
    image:
      "https://cdn.shopify.com/s/files/1/0602/0133/6893/files/1-comfy-patterns-coloring-book_14.png?v=1775734214",
  },
  {
    slug: "color-world",
    title: "Color World",
    excerpt: "Explore color meaning and how palettes shape a coloring mood.",
    image:
      "https://cdn.shopify.com/s/files/1/0602/0133/6893/files/1-girl-moments-coloring-book-vol-2.png?v=1775731706",
  },
  {
    slug: "diy",
    title: "Lifestyle & DIY",
    excerpt: "DIY projects, cozy hobbies, and small creative rituals.",
    image:
      "https://cdn.shopify.com/s/files/1/0602/0133/6893/files/1-little-corner-coloring-book_291097bb-8c81-4611-aa8e-c9489d12a966.png?v=1775734428",
  },
  {
    slug: "product-guide",
    title: "Product Guide",
    excerpt: "Friendly guides to collections, formats, and favorite titles.",
    image:
      "https://cdn.shopify.com/s/files/1/0602/0133/6893/files/little-cuddles-spiral-and-sticky-set.png?v=1772695880",
  },
];

export const articles: Article[] = [
  {
    slug: "how-to-color-cozy-scenes",
    blogSlug: "htc",
    title: "Coloring Cozy Scenes",
    excerpt: "A gentle guide to building warm palettes and soft contrast.",
    image: blogCategories[0].image,
    body: [
      "Start with a small palette and repeat colors across the page so the scene feels connected.",
      "Use darker tones near shelves, corners, and small details to make the cozy shapes stand out.",
    ],
  },
  {
    slug: "choosing-markers-for-bold-pages",
    blogSlug: "coloring-book-guide",
    title: "Choosing Markers for Bold Pages",
    excerpt: "Simple tips for matching tools to bold and easy coloring pages.",
    image: blogCategories[1].image,
    body: [
      "Bold pages work well with larger marker tips, especially when the art has broad enclosed shapes.",
      "Place a protective sheet behind the page when testing saturated colors.",
    ],
  },
  {
    slug: "soft-color-palettes",
    blogSlug: "color-world",
    title: "Soft Color Palettes for Slow Coloring",
    excerpt: "Build calm palettes with muted accents and gentle contrast.",
    image: blogCategories[2].image,
    body: [
      "Soft palettes often use one warm neutral, one grounding dark, and two playful accent colors.",
      "Try repeating the accent in small details before filling large shapes.",
    ],
  },
];

export const staticPages: StaticPage[] = [
  {
    slug: "about-us",
    title: "About Us",
    intro: "A cozy look at the small creative team behind the books.",
    blocks: [
      "Zoe&Book centers comfort, self-expression, and approachable coloring books.",
      "This local page mirrors the structure while keeping the wording brief and replaceable.",
    ],
  },
  {
    slug: "gallery",
    title: "Gallery",
    intro: "A gallery-style page for cozy moments and finished-color inspiration.",
    blocks: ["Use this page to test image grids and responsive gallery layouts."],
  },
  {
    slug: "comics",
    title: "Comics",
    intro: "Little comic worlds, free download actions, and cozy page galleries.",
    blocks: ["Comic entries can be added to this fixture later."],
  },
  {
    slug: "freebies",
    title: "Freebies",
    intro: "A simple page for free mini coloring resources.",
    blocks: ["Freebie products are pulled from the freebies collection."],
  },
  {
    slug: "faq",
    title: "FAQs",
    intro: "Common store questions in an accordion layout.",
    blocks: ["FAQ entries come from the dedicated FAQ fixture."],
  },
];

export const aboutSections: AboutSection[] = [
  {
    title: "Little team with a cozy dream",
    body: [
      "Zoe&Book feels intentionally small and friendly: a creative group built around drawing, editing, coloring, and sharing comforting books.",
      "The shared thread is simple: art can be soft, personal, and healing.",
    ],
    image:
      "https://cocowyo.com/cdn/shop/files/about-us-1.png?v=1776237984&width=1500",
    alt: "Zoe&Book team with a cozy dream",
    background: "#f1eef7",
  },
  {
    title: "Life can be uncomfy, we know that",
    body: [
      "The brand story leans into anxious, overwhelming days and answers them with simple pages made for slower moments.",
      "The books are presented as small reminders that calm can return one colored shape at a time.",
    ],
    image:
      "https://cocowyo.com/cdn/shop/files/about-us-2.png?v=1776239460&width=1500",
    alt: "Zoe&Book comfort illustration",
    background: "#fef4eb",
  },
  {
    title: "A corner sparks tender creativity",
    body: [
      "The studio mood is warm and a little lived-in, with sketches, screens, wires, and page ideas all sitting together.",
      "That imperfect corner is part of the charm: it gives the books their soft, hand-made feeling.",
    ],
    image:
      "https://cocowyo.com/cdn/shop/files/about-us-3.png?v=1776239458&width=1500",
    alt: "Zoe&Book creative corner",
    background: "#f3fbe6",
  },
  {
    title: "We're not perfect!",
    body: [
      "The page closes with an open, human tone: the team is still learning, improving, and listening.",
      "Feedback, ideas, and friendly notes are part of the journey.",
    ],
    image:
      "https://cocowyo.com/cdn/shop/files/about-us-4.png?v=1776239458&width=1500",
    alt: "Zoe&Book imperfect team note",
    background: "#edf4fc",
  },
];

export const downloadComicImage =
  "https://cocowyo.com/cdn/shop/files/download.png?v=1771992523";

export const comicWorlds: ComicWorld[] = [
  {
    title: "Spooky Cutie World",
    comics: [
      {
        title: "Twisted Potato",
        description: "Remote work turns into a very involved helper moment.",
        hasDownload: true,
        images: [
          {
            src: "https://cocowyo.com/cdn/shop/files/1-twisted-potato-comic-by-coco-wyo_f68abcb9-e113-4243-8e95-076ba1485925.png?v=1754989095&width=800",
            alt: "Twisted Potato comic page 1",
          },
          {
            src: "https://cocowyo.com/cdn/shop/files/2-twisted-potato-comic-by-coco-wyo_e67bc9fb-f666-4fbc-9ad9-bb74a8d4a916.png?v=1754989070&width=800",
            alt: "Twisted Potato comic page 2",
          },
          {
            src: "https://cocowyo.com/cdn/shop/files/3-twisted-potato-comic-by-coco-wyo.png?v=1754989119&width=800",
            alt: "Twisted Potato comic page 3",
          },
        ],
      },
      {
        title: "Fried Egg",
        description: "The first cooking lesson gets sunny and silly.",
        hasDownload: true,
        images: [
          {
            src: "https://cocowyo.com/cdn/shop/files/2-twisted-potato-comic-by-coco-wyo.png?v=1754986788&width=800",
            alt: "Fried Egg comic page 1",
          },
          {
            src: "https://cocowyo.com/cdn/shop/files/1-twisted-potato-comic-by-coco-wyo.png?v=1754986913&width=800",
            alt: "Fried Egg comic page 2",
          },
        ],
      },
    ],
  },
  {
    title: "Cozy Friend World",
    comics: [
      {
        title: '"That\'s my type" of day',
        description: "A soft routine for recharging with quiet time.",
        hasDownload: true,
        images: [
          {
            src: "https://cocowyo.com/cdn/shop/files/1-thats-my-type-of-day-comic-by-coco-wyo.png?v=1754304573&width=800",
            alt: "That's my type of day comic page 1",
          },
          {
            src: "https://cocowyo.com/cdn/shop/files/2-thats-my-type-of-day-comic-by-coco-wyo.png?v=1754304601&width=800",
            alt: "That's my type of day comic page 2",
          },
        ],
      },
      {
        title: "Aquarium Trip",
        description: "Duckie visits the aquarium and makes a sweet memory.",
        hasDownload: true,
        images: [
          {
            src: "https://cocowyo.com/cdn/shop/files/aquarium-trip-coloring-book-1.png?v=1753155608&width=800",
            alt: "Aquarium Trip comic page 1",
          },
          {
            src: "https://cocowyo.com/cdn/shop/files/aquarium-trip-coloring-book-2.png?v=1753155684&width=800",
            alt: "Aquarium Trip comic page 2",
          },
          {
            src: "https://cocowyo.com/cdn/shop/files/aquarium-trip-coloring-book-3.png?v=1753155861&width=800",
            alt: "Aquarium Trip comic page 3",
          },
        ],
      },
      {
        title: "Crocie's Bakery",
        description: "Crocie starts the bakery dream with a first cake.",
        hasDownload: true,
        images: [
          {
            src: "https://cocowyo.com/cdn/shop/files/crocie-bakery-coloring-book-1_c4c25bb7-4d3f-49c1-85ff-8a07649a64bd.png?v=1753157679&width=800",
            alt: "Crocie's Bakery comic page 1",
          },
          {
            src: "https://cocowyo.com/cdn/shop/files/crocies_s-bakery-2.png?v=1753157563&width=800",
            alt: "Crocie's Bakery comic page 2",
          },
          {
            src: "https://cocowyo.com/cdn/shop/files/crocie-bakery-coco-wyo-3.png?v=1753157593&width=800",
            alt: "Crocie's Bakery comic page 3",
          },
        ],
      },
      {
        title: "Crocie's Bakery Menu",
        description: "A sweet menu of tiny bakery picks.",
        images: [
          {
            src: "https://cocowyo.com/cdn/shop/files/crocies-bakery-menu-coco-wyo-5.png?v=1752739261&width=800",
            alt: "Crocie's Bakery Menu comic page 1",
          },
          {
            src: "https://cocowyo.com/cdn/shop/files/crocies-bakery-menu-coco-wyo-2.png?v=1752739261&width=800",
            alt: "Crocie's Bakery Menu comic page 2",
          },
          {
            src: "https://cocowyo.com/cdn/shop/files/crocies-bakery-menu-coco-wyo-6.png?v=1752739261&width=800",
            alt: "Crocie's Bakery Menu comic page 3",
          },
          {
            src: "https://cocowyo.com/cdn/shop/files/crocies-bakery-menu-coco-wyo-7.png?v=1752739261&width=800",
            alt: "Crocie's Bakery Menu comic page 4",
          },
          {
            src: "https://cocowyo.com/cdn/shop/files/crocies-bakery-menu-coco-wyo-4.png?v=1752739260&width=800",
            alt: "Crocie's Bakery Menu comic page 5",
          },
          {
            src: "https://cocowyo.com/cdn/shop/files/crocies-bakery-menu-coco-wyo-3.png?v=1752739261&width=800",
            alt: "Crocie's Bakery Menu comic page 6",
          },
          {
            src: "https://cocowyo.com/cdn/shop/files/crocies-bakery-menu-coco-wyo-1.png?v=1752739261&width=800",
            alt: "Crocie's Bakery Menu comic page 7",
          },
          {
            src: "https://cocowyo.com/cdn/shop/files/crocies-bakery-menu-coco-wyo-8.png?v=1752739261&width=800",
            alt: "Crocie's Bakery Menu comic page 8",
          },
        ],
      },
      {
        title: "Grocery Day",
        description: "A regular shopping trip becomes a tiny friend-group scene.",
        hasDownload: true,
        images: [
          {
            src: "https://cocowyo.com/cdn/shop/files/grocery-bakery-comic-by-coco-wyo.jpg?v=1753504519&width=800",
            alt: "Grocery Day comic page 1",
          },
          {
            src: "https://cocowyo.com/cdn/shop/files/2-grocery-day-comic-by-coco-wyo.png?v=1753505466&width=800",
            alt: "Grocery Day comic page 2",
          },
          {
            src: "https://cocowyo.com/cdn/shop/files/3-grocery-day-comic-by-coco-wyo.png?v=1753505520&width=800",
            alt: "Grocery Day comic page 3",
          },
        ],
      },
      {
        title: "Bugatti Challenge",
        description: "A friendship-powered challenge with big little energy.",
        hasDownload: true,
        images: [
          {
            src: "https://cocowyo.com/cdn/shop/files/bugatti-challenge-Coco-Wyo-comic-1.png?v=1753695173&width=800",
            alt: "Bugatti Challenge comic page 1",
          },
          {
            src: "https://cocowyo.com/cdn/shop/files/bugatti-challenge-Coco-Wyo-comic-2.png?v=1753695206&width=800",
            alt: "Bugatti Challenge comic page 2",
          },
          {
            src: "https://cocowyo.com/cdn/shop/files/bugatti-challenge-Coco-Wyo-comic-3.png?v=1753695244&width=800",
            alt: "Bugatti Challenge comic page 3",
          },
        ],
      },
    ],
  },
  {
    title: "Lala Friends World",
    comics: [
      {
        title: "Big Fish",
        description: "A calm fishing day finds a tiny twist.",
        hasDownload: true,
        images: [
          {
            src: "https://cocowyo.com/cdn/shop/files/1-big-fish-comic-by-coco-wyo_ba04ccd2-a049-4fe8-a0a7-8a9bf9832b85.png?v=1754541116&width=800",
            alt: "Big Fish comic page 1",
          },
          {
            src: "https://cocowyo.com/cdn/shop/files/2-big-fish-comic-by-coco-wyo.png?v=1754541167&width=800",
            alt: "Big Fish comic page 2",
          },
          {
            src: "https://cocowyo.com/cdn/shop/files/3-big-fish-comic-by-coco-wyo_6df915f0-1b23-42f9-86e3-0cbeac16ed3f.png?v=1754541253&width=800",
            alt: "Big Fish comic page 3",
          },
        ],
      },
    ],
  },
];
