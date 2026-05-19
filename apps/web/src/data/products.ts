export type ProductType = "physical" | "digital" | "sticker" | "freebie";

export type ProductOption = {
  name: string;
  values: string[];
};

export type Product = {
  id: string;
  slug: string;
  title: string;
  price: number;
  compareAtPrice?: number | null;
  available: boolean;
  excerpt: string;
  description: string[];
  images: string[];
  collections: string[];
  tags: string[];
  productType: ProductType;
  options: ProductOption[];
  sourceLinks?: Array<{ label: string; href: string; image?: string; alt?: string }>;
  reviewImages?: string[];
  inspirationImages?: string[];
  publishedAt: string;
};

const defaultOptions: ProductOption[] = [
  {
    name: "Format",
    values: ["Default Title"],
  },
];

export const products: Product[] = [
  {
    id: "cozy-christmas-coloring-book",
    slug: "cozy-christmas-coloring-book",
    title: "Cozy Christmas Coloring Book",
    price: 8.99,
    compareAtPrice: null,
    available: true,
    excerpt:
      "Wrap yourself in the magic of Christmas with coloring pens and a cozy blanket in this Penguin Random House collaboration.",
    description: [
      "A seasonal coloring book built around warm holiday moments, cozy scenes, and simple pages designed for relaxing color sessions.",
      "Includes hand-drawn pages, single-sided artwork, and crisp illustrations for calm creative time.",
    ],
    images: [
      "https://cocowyo.com/cdn/shop/files/1-cozy-christmas-coloring-book_04b4e1c3-4640-4fb9-ba1e-3ecfa5f1ad00.png?v=1775733386",
      "https://cocowyo.com/cdn/shop/files/1-cozy-christmas-coloring-book.jpg?v=1775733386",
      "https://cocowyo.com/cdn/shop/files/10-cozy-christmas-coloring-book.jpg?v=1775733386",
      "https://cocowyo.com/cdn/shop/files/2-cozy-christmas-coloring-book.jpg?v=1775733386",
      "https://cocowyo.com/cdn/shop/files/3-cozy-christmas-coloring-book.jpg?v=1775733386",
      "https://cocowyo.com/cdn/shop/files/4-cozy-christmas-coloring-book.jpg?v=1775733386",
      "https://cocowyo.com/cdn/shop/files/5-cozy-christmas-coloring-book.jpg?v=1775733386",
      "https://cocowyo.com/cdn/shop/files/6-cozy-christmas-coloring-book.jpg?v=1775733386",
      "https://cocowyo.com/cdn/shop/files/7-cozy-christmas-coloring-book.jpg?v=1775733386",
      "https://cocowyo.com/cdn/shop/files/8-cozy-christmas-coloring-book.jpg?v=1775733386",
      "https://cocowyo.com/cdn/shop/files/9-cozy-christmas-coloring-book.jpg?v=1775733386",
    ],
    collections: [
      "all",
      "frontpage",
      "new-release",
      "collab-collection",
      "physical-books",
      "paperback-coloring-book",
      "seasonal",
      "cute-comfy",
    ],
    tags: ["christmas", "cozy", "holiday", "penguin"],
    productType: "physical",
    options: defaultOptions,
    sourceLinks: [
      {
        label: "Penguin Random House",
        href: "https://www.penguinrandomhouse.com/",
        image:
          "https://cdn.shopify.com/s/files/1/0602/0133/6893/files/Buy-on-Penguin-US_f3259fc7-e7b8-4860-b4bd-c508194bea62.png?v=1774429898",
        alt: "Buy on Penguin US",
      },
      {
        label: "Penguin UK",
        href: "https://www.penguin.co.uk/",
        image:
          "https://cdn.shopify.com/s/files/1/0602/0133/6893/files/Buy-on-Penguin-UK_da64018e-ddfc-4703-84a2-4bd7fbf61c23.png?v=1774429898",
        alt: "Buy on Penguin UK",
      },
      {
        label: "Penguin Australia",
        href: "https://www.penguin.com.au/",
        image:
          "https://cdn.shopify.com/s/files/1/0602/0133/6893/files/Buy-on-Penguin-AU_b7c31dfa-374d-48fc-a40f-f882d8d0adb5.png?v=1774429897",
        alt: "Buy on Penguin AU",
      },
      {
        label: "Latvian edition",
        href: "https://www.zvaigzne.lv/",
        image:
          "https://cdn.shopify.com/s/files/1/0602/0133/6893/files/Buy-on-Penguin-Latvian.png?v=1774429897",
        alt: "Buy Latvian edition",
      },
      {
        label: "Vietnamese edition",
        href: "https://dinhtibooks.com.vn/",
        image:
          "https://cdn.shopify.com/s/files/1/0602/0133/6893/files/Buy-on-Penguin-Vietnamese.png?v=1774429897",
        alt: "Buy Vietnamese edition",
      },
      {
        label: "Polish edition",
        href: "https://www.znak.com.pl/",
        image:
          "https://cdn.shopify.com/s/files/1/0602/0133/6893/files/Buy-on-Penguin-Poland.png?v=1774862808",
        alt: "Buy Polish edition",
      },
    ],
    reviewImages: [
      "https://cocowyo.com/cdn/shop/files/1-cozy-christmas-coloring-book.png?v=1751517594&width=800",
      "https://cocowyo.com/cdn/shop/files/2-cozy-christmas-coloring-book.png?v=1751517594&width=800",
      "https://cocowyo.com/cdn/shop/files/3-cozy-christmas-coloring-book.png?v=1751517594&width=800",
      "https://cocowyo.com/cdn/shop/files/4-cozy-christmas-coloring-book.png?v=1751517594&width=800",
      "https://cocowyo.com/cdn/shop/files/5-cozy-christmas-coloring-book.png?v=1751517595&width=800",
    ],
    inspirationImages: [
      "https://cocowyo.com/cdn/shop/files/1-cozy-christmas-coloring-book.png?v=1751517594&width=800",
      "https://cocowyo.com/cdn/shop/files/2-cozy-christmas-coloring-book.png?v=1751517594&width=800",
      "https://cocowyo.com/cdn/shop/files/3-cozy-christmas-coloring-book.png?v=1751517594&width=800",
      "https://cocowyo.com/cdn/shop/files/4-cozy-christmas-coloring-book.png?v=1751517594&width=800",
    ],
    publishedAt: "2026-03-01",
  },
  {
    id: "comfy-corner-coloring-book",
    slug: "comfy-corner-coloring-book",
    title: "Comfy Corner Coloring Book",
    price: 9.99,
    compareAtPrice: null,
    available: false,
    excerpt:
      "Quiet spaces of calm, creativity, and comfort, with peaceful scenes made for unwinding at home.",
    description: [
      "Comfy Corner follows small, lived-in rooms and gentle creative spaces where the page feels warm without feeling busy.",
      "This learning clone keeps the product text brief so the fixture can be replaced with original copy later.",
    ],
    images: [
      "https://cdn.shopify.com/s/files/1/0602/0133/6893/files/1-comfy-days-coloring-book.png?v=1775731278",
      "https://cdn.shopify.com/s/files/1/0602/0133/6893/files/2-Comfy-Corner-coloring-book.png?v=1775731278",
      "https://cdn.shopify.com/s/files/1/0602/0133/6893/files/3-Comfy-Corner-coloring-book.png?v=1775731278",
    ],
    collections: [
      "all",
      "new-release",
      "collab-collection",
      "physical-books",
      "paperback-coloring-book",
      "cute-comfy",
    ],
    tags: ["comfy", "corner", "calm", "penguin"],
    productType: "physical",
    options: defaultOptions,
    sourceLinks: [
      {
        label: "Penguin Random House",
        href: "https://www.penguinrandomhouse.com/",
      },
    ],
    publishedAt: "2026-03-27",
  },
  {
    id: "little-cuddles-coloring-book-spiral-bound-and-sticker-set",
    slug: "little-cuddles-coloring-book-spiral-bound-and-sticker-set",
    title: "Little Cuddles Coloring Book (Spiral-bound) & Sticker Set",
    price: 10.99,
    compareAtPrice: 12.99,
    available: true,
    excerpt:
      "Cute animal friends and cozy daily moments in a spiral-bound book with a sticker set.",
    description: [
      "Sized like a compact cozy coloring book, Little Cuddles centers gentle daily activities and simple illustrations.",
      "The spiral-bound and sticker-set presentation is represented here as a local storefront option.",
    ],
    images: [
      "https://cdn.shopify.com/s/files/1/0602/0133/6893/files/little-cuddles-spiral-and-sticky-set.png?v=1772695880",
    ],
    collections: [
      "all",
      "new-release",
      "physical-books",
      "spiral-bound",
      "cute-comfy",
    ],
    tags: ["little cuddles", "spiral", "sticker", "animal"],
    productType: "physical",
    options: defaultOptions,
    publishedAt: "2026-02-12",
  },
  {
    id: "cozy-friends-vinyl-sticker-pack-100pcs",
    slug: "cozy-friends-vinyl-sticker-pack-100pcs",
    title: "Cozy Friends Vinyl Sticker Pack (100 pieces)",
    price: 9.99,
    compareAtPrice: 15.99,
    available: true,
    excerpt:
      "A 100-piece vinyl sticker pack with cozy character designs and a semi-matte finish.",
    description: [
      "A cheerful pack of waterproof stickers for decorating notebooks, devices, and small everyday objects.",
      "The clone treats this as a sticker product with sale pricing and wishlist/cart support.",
    ],
    images: [
      "https://cdn.shopify.com/s/files/1/0602/0133/6893/files/1-cozy-friends-vinyl-sticker-packs-new.png?v=1777944846",
    ],
    collections: ["all", "vinyl-sticker-packs", "new-release"],
    tags: ["sticker", "cozy friends", "vinyl", "sale"],
    productType: "sticker",
    options: defaultOptions,
    publishedAt: "2026-05-01",
  },
  {
    id: "cute-things-vinyl-sticker-pack-100pcs",
    slug: "cute-things-vinyl-sticker-pack-100pcs",
    title: "Cute Things Vinyl Sticker Pack (100 pieces)",
    price: 9.99,
    compareAtPrice: 15.99,
    available: true,
    excerpt:
      "A playful vinyl sticker pack with tiny cute things for decorating favorite items.",
    description: [
      "This sale item mirrors the public sticker pack card shape: image, short teaser, compare-at price, and wishlist action.",
    ],
    images: [
      "https://cdn.shopify.com/s/files/1/0602/0133/6893/files/1-cute-things-vinyl-sticker-packs-new.png?v=1777944906",
    ],
    collections: ["all", "vinyl-sticker-packs", "new-release"],
    tags: ["sticker", "cute things", "vinyl", "sale"],
    productType: "sticker",
    options: defaultOptions,
    publishedAt: "2026-05-01",
  },
  {
    id: "cozy-friends-coloring-book",
    slug: "cozy-friends-coloring-book",
    title: "Cozy Friends Coloring Book",
    price: 9.99,
    compareAtPrice: null,
    available: true,
    excerpt:
      "Familiar everyday activities with super cute animal characters and hidden little stories.",
    description: [
      "Cozy Friends is one of the recognizable Zoe&Book-style titles, with gentle daily scenes and animal characters.",
    ],
    images: [
      "https://cdn.shopify.com/s/files/1/0602/0133/6893/files/1-cozy-friends-coloring-book_1e6f3fa6-a8d0-41b9-92f8-975d68ae5adf.png?v=1775734470",
    ],
    collections: [
      "all",
      "frontpage",
      "physical-books",
      "paperback-coloring-book",
      "cute-comfy",
      "collab-collection",
    ],
    tags: ["cozy friends", "animal", "cute", "bestseller"],
    productType: "physical",
    options: defaultOptions,
    publishedAt: "2024-09-01",
  },
  {
    id: "girl-moments-coloring-book",
    slug: "girl-moments-coloring-book",
    title: "Girl Moments Coloring Book",
    price: 9.99,
    compareAtPrice: null,
    available: true,
    excerpt:
      "Warm familiar daily activities and cozy scenes made for calm coloring sessions.",
    description: [
      "Girl Moments focuses on soft everyday scenes, gentle self-care rhythms, and a quiet mood.",
    ],
    images: [
      "https://cdn.shopify.com/s/files/1/0602/0133/6893/files/1-girl-moments-coloring-book_7c63e197-0a4f-45e0-a292-6ccc40f8303f.png?v=1775733493",
    ],
    collections: ["all", "frontpage", "physical-books", "paperback-coloring-book", "classic"],
    tags: ["girl moments", "daily", "classic", "bestseller"],
    productType: "physical",
    options: defaultOptions,
    publishedAt: "2024-08-01",
  },
  {
    id: "girl-moments-coloring-book-vol-2",
    slug: "girl-moments-coloring-book-vol-2",
    title: "Girl Moments Coloring Book Vol 2",
    price: 9.99,
    compareAtPrice: null,
    available: true,
    excerpt:
      "A gentle celebration of everyday life, journaling, slow living, and small personal rituals.",
    description: [
      "The second Girl Moments volume keeps the same cozy tone while adding new everyday scenes.",
    ],
    images: [
      "https://cdn.shopify.com/s/files/1/0602/0133/6893/files/1-girl-moments-coloring-book-vol-2.png?v=1775731706",
    ],
    collections: ["all", "frontpage", "physical-books", "paperback-coloring-book", "classic"],
    tags: ["girl moments", "vol 2", "classic", "cozy"],
    productType: "physical",
    options: defaultOptions,
    publishedAt: "2025-02-01",
  },
  {
    id: "ocean-scene-coloring-book",
    slug: "ocean-scene-coloring-book",
    title: "Ocean Scene Coloring Book",
    price: 9.99,
    compareAtPrice: null,
    available: true,
    excerpt:
      "Bold and easy ocean scenes with fish, coral, and calm underwater details.",
    description: [
      "A nature-themed title with larger simple illustrations, useful for the store's classic collection rows.",
    ],
    images: [
      "https://cdn.shopify.com/s/files/1/0602/0133/6893/files/1-ocean-scene-coloring-book.png?v=1775731194",
    ],
    collections: ["all", "frontpage", "physical-books", "paperback-coloring-book", "classic"],
    tags: ["ocean", "scene", "classic", "bold easy"],
    productType: "physical",
    options: defaultOptions,
    publishedAt: "2024-03-01",
  },
  {
    id: "little-corner-coloring-book",
    slug: "little-corner-coloring-book",
    title: "Little Corner Coloring Book",
    price: 9.99,
    compareAtPrice: null,
    available: true,
    excerpt:
      "Cozy rooms, tiny decorated spaces, dreamy bedrooms, kitchens, and warm corners.",
    description: [
      "Little Corner anchors the room-and-interior side of the Zoe&Book catalog.",
    ],
    images: [
      "https://cdn.shopify.com/s/files/1/0602/0133/6893/files/1-little-corner-coloring-book_291097bb-8c81-4611-aa8e-c9489d12a966.png?v=1775734428",
    ],
    collections: ["all", "frontpage", "physical-books", "paperback-coloring-book", "cute-comfy"],
    tags: ["little corner", "room", "interior", "bestseller"],
    productType: "physical",
    options: defaultOptions,
    publishedAt: "2024-06-01",
  },
  {
    id: "cozy-days-coloring-book",
    slug: "cozy-days-coloring-book",
    title: "Cozy Days Coloring Book",
    price: 9.99,
    compareAtPrice: null,
    available: true,
    excerpt:
      "A cute cozy day with beach moments, movie nights, and gentle daily scenes.",
    description: [
      "Cozy Days supports the homepage trending terms and the cute collection taxonomy.",
    ],
    images: [
      "https://cdn.shopify.com/s/files/1/0602/0133/6893/files/1-cozy-days-coloring-book_634ce46b-290b-4d6c-8b71-862b0c268929.png?v=1775731500",
    ],
    collections: ["all", "physical-books", "paperback-coloring-book", "cute-comfy", "seasonal"],
    tags: ["cozy days", "cute", "daily", "beach"],
    productType: "physical",
    options: defaultOptions,
    publishedAt: "2024-10-01",
  },
  {
    id: "cozy-cuties-coloring-book",
    slug: "cozy-cuties-coloring-book",
    title: "Cozy Cuties Coloring Book",
    price: 8.99,
    compareAtPrice: null,
    available: true,
    excerpt:
      "Baby animals, sunny skies, and sweet simple scenes for warm-day coloring.",
    description: [
      "This collab title represents the public Penguin-linked collection rows.",
    ],
    images: [
      "https://cdn.shopify.com/s/files/1/0602/0133/6893/files/1-cozy-cuties-coloring-book.png?v=1775733336",
    ],
    collections: [
      "all",
      "collab-collection",
      "physical-books",
      "paperback-coloring-book",
      "cute-comfy",
    ],
    tags: ["cozy cuties", "cute", "collab", "spring"],
    productType: "physical",
    options: defaultOptions,
    publishedAt: "2025-09-01",
  },
  {
    id: "cozy-corner-coloring-book",
    slug: "cozy-corner-coloring-book",
    title: "Cozy Corner Coloring Book",
    price: 8.99,
    compareAtPrice: null,
    available: true,
    excerpt:
      "A follow-up to Little Corner with reading nooks, bakeries, kitchens, and homey details.",
    description: [
      "Cozy Corner keeps the small-space collection theme and gives product pages another collab-like route.",
    ],
    images: [
      "https://cdn.shopify.com/s/files/1/0602/0133/6893/files/1-cozy-corner-coloring-book.png?v=1775731962",
    ],
    collections: ["all", "collab-collection", "physical-books", "paperback-coloring-book"],
    tags: ["cozy corner", "little corner", "collab", "rooms"],
    productType: "physical",
    options: defaultOptions,
    publishedAt: "2025-08-01",
  },
  {
    id: "spooky-cutie-coloring-book",
    slug: "spooky-cutie-coloring-book",
    title: "Spooky Cutie Coloring Book",
    price: 9.99,
    compareAtPrice: null,
    available: true,
    excerpt:
      "A peculiar cozy world where cute meets spooky in mystical little scenes.",
    description: [
      "Spooky Cutie appears in search trends and seasonal browsing, so it is included as a full product route.",
    ],
    images: [
      "https://cdn.shopify.com/s/files/1/0602/0133/6893/files/1-spooky-cutie-coloring-book_0e2baac1-9f03-4599-803a-dc39922ca693.png?v=1775733933",
    ],
    collections: ["all", "physical-books", "paperback-coloring-book", "seasonal"],
    tags: ["spooky cuties", "spooky", "seasonal", "halloween"],
    productType: "physical",
    options: defaultOptions,
    publishedAt: "2024-10-15",
  },
  {
    id: "spooky-cutie-coloring-book-vol-2",
    slug: "spooky-cutie-coloring-book-vol-2",
    title: "Spooky Cutie Coloring Book Vol 2",
    price: 9.99,
    compareAtPrice: null,
    available: true,
    excerpt:
      "Eerie meets adorable in another cozy-odd volume of spooky character pages.",
    description: [
      "Volume two supports the seasonal and trending search experience.",
    ],
    images: [
      "https://cdn.shopify.com/s/files/1/0602/0133/6893/files/1-spooky-cuties-coloring-book_07664ba9-b776-4682-9d0e-f79c4a91d583.png?v=1775731609",
    ],
    collections: ["all", "physical-books", "paperback-coloring-book", "seasonal"],
    tags: ["spooky cuties", "vol 2", "seasonal", "halloween"],
    productType: "physical",
    options: defaultOptions,
    publishedAt: "2025-10-01",
  },
  {
    id: "comfy-days-coloring-book-spiral-bound-and-sticker-set",
    slug: "comfy-days-coloring-book-spiral-bound-and-sticker-set",
    title: "Comfy Days Coloring Book (Spiral-bound) & Sticker Set",
    price: 10.99,
    compareAtPrice: 12.99,
    available: true,
    excerpt:
      "A spiral-bound Comfy Days edition with warm everyday scenes and a sticker set.",
    description: [
      "This product gives the spiral-bound collection another sale-card example.",
    ],
    images: [
      "https://cdn.shopify.com/s/files/1/0602/0133/6893/files/comfy-days-spiral-and-sticker-set.png?v=1772695816",
    ],
    collections: ["all", "physical-books", "spiral-bound", "seasonal"],
    tags: ["comfy days", "spiral", "sticker", "sale"],
    productType: "physical",
    options: defaultOptions,
    publishedAt: "2026-02-01",
  },
  {
    id: "girl-moments-coloring-book-vol-2-spiral-bound-and-sticky-set",
    slug: "girl-moments-coloring-book-vol-2-spiral-bound-and-sticky-set",
    title: "Girl Moments Vol. 2 Coloring Book (Spiral-bound) & Sticker Set",
    price: 10.99,
    compareAtPrice: 12.99,
    available: true,
    excerpt:
      "A spiral-bound Girl Moments Vol. 2 edition with stickers and mindful everyday scenes.",
    description: [
      "This mirrors the visible long product-card title behavior on collection pages.",
    ],
    images: [
      "https://cdn.shopify.com/s/files/1/0602/0133/6893/files/1-girl-moments-vol2-coloring-book-sticker-set.png?v=1774595823",
    ],
    collections: ["all", "physical-books", "spiral-bound", "classic"],
    tags: ["girl moments", "spiral", "sticker", "sale"],
    productType: "physical",
    options: defaultOptions,
    publishedAt: "2026-02-10",
  },
  {
    id: "combo-1-little-cuddles",
    slug: "combo-1-little-cuddles",
    title: "Combo 1: Little Cuddles",
    price: 2.99,
    compareAtPrice: 0,
    available: true,
    excerpt:
      "A digital Little Cuddles set with tiny adventures, sweet moments, and printable pages.",
    description: [
      "Digital products simulate Etsy-style instant downloads in the local clone.",
    ],
    images: [
      "https://cdn.shopify.com/s/files/1/0602/0133/6893/files/1-Little-cuddles-digital-book-combo1.png?v=1778516575",
    ],
    collections: ["all", "digital"],
    tags: ["digital", "little cuddles", "combo"],
    productType: "digital",
    options: defaultOptions,
    sourceLinks: [{ label: "Etsy", href: "https://www.etsy.com/" }],
    publishedAt: "2025-04-09",
  },
  {
    id: "combo-2-little-cuddles",
    slug: "combo-2-little-cuddles",
    title: "Combo 2: Little Cuddles",
    price: 2.99,
    compareAtPrice: 0,
    available: true,
    excerpt:
      "A cozy digital set with harvest, bath, school, and quiet daily coloring scenes.",
    description: [
      "A representative digital product for the Digital homepage row.",
    ],
    images: [
      "https://cdn.shopify.com/s/files/1/0602/0133/6893/files/1-Little-cuddles-digital-book-combo2.png?v=1778517151",
    ],
    collections: ["all", "digital"],
    tags: ["digital", "little cuddles", "combo"],
    productType: "digital",
    options: defaultOptions,
    sourceLinks: [{ label: "Etsy", href: "https://www.etsy.com/" }],
    publishedAt: "2025-04-09",
  },
  {
    id: "combo-3-little-cuddles",
    slug: "combo-3-little-cuddles",
    title: "Combo 3: Little Cuddles",
    price: 2.99,
    compareAtPrice: 0,
    available: true,
    excerpt:
      "A digital Little Cuddles set with space, beach, exhibition, and home scenes.",
    description: [
      "Digital fixture used to reproduce the compact Digital section on the homepage.",
    ],
    images: [
      "https://cdn.shopify.com/s/files/1/0602/0133/6893/files/1-Little-cuddles-digital-book-combo3.png?v=1778517540",
    ],
    collections: ["all", "digital"],
    tags: ["digital", "little cuddles", "combo"],
    productType: "digital",
    options: defaultOptions,
    sourceLinks: [{ label: "Etsy", href: "https://www.etsy.com/" }],
    publishedAt: "2025-04-09",
  },
  {
    id: "combo-4-little-cuddles",
    slug: "combo-4-little-cuddles",
    title: "Combo 4: Little Cuddles",
    price: 2.99,
    compareAtPrice: 0,
    available: true,
    excerpt:
      "A digital Little Cuddles set with music, baking, tidying, and warm spaces.",
    description: [
      "Digital fixture with the same card shape as the public digital products.",
    ],
    images: [
      "https://cdn.shopify.com/s/files/1/0602/0133/6893/files/1-Little-cuddles-digital-book-combo4.png?v=1778517689",
    ],
    collections: ["all", "digital"],
    tags: ["digital", "little cuddles", "combo"],
    productType: "digital",
    options: defaultOptions,
    sourceLinks: [{ label: "Etsy", href: "https://www.etsy.com/" }],
    publishedAt: "2025-04-09",
  },
  {
    id: "cozy-friends-coloring-pages",
    slug: "cozy-friends-coloring-pages",
    title: "Cozy Friends Coloring Pages",
    price: 1.49,
    compareAtPrice: null,
    available: true,
    excerpt:
      "A small digital set from Cozy Friends with printable coloring pages.",
    description: [
      "A low-price digital product for search, filters, and price sorting.",
    ],
    images: [
      "https://cdn.shopify.com/s/files/1/0602/0133/6893/files/1-Cozy-Friends-digital-coloring-book.png?v=1778666159",
    ],
    collections: ["all", "digital"],
    tags: ["digital", "cozy friends", "printable"],
    productType: "digital",
    options: defaultOptions,
    sourceLinks: [{ label: "Etsy", href: "https://www.etsy.com/" }],
    publishedAt: "2025-04-10",
  },
  {
    id: "spooky-cutie-coloring-pages",
    slug: "spooky-cutie-coloring-pages",
    title: "Spooky Cutie Coloring Pages",
    price: 1.49,
    compareAtPrice: null,
    available: true,
    excerpt:
      "A small printable digital set where cute meets spooky and cozy.",
    description: [
      "A seasonal digital item for search and the Digital collection.",
    ],
    images: [
      "https://cdn.shopify.com/s/files/1/0602/0133/6893/files/1-Spooky-cutie-digital-book.png?v=1778518360",
    ],
    collections: ["all", "digital", "seasonal"],
    tags: ["digital", "spooky cuties", "seasonal"],
    productType: "digital",
    options: defaultOptions,
    sourceLinks: [{ label: "Etsy", href: "https://www.etsy.com/" }],
    publishedAt: "2025-04-10",
  },
  {
    id: "comfy-patterns-coloring-book",
    slug: "comfy-patterns-coloring-book",
    title: "Comfy Patterns Coloring Book",
    price: 9.99,
    compareAtPrice: null,
    available: true,
    excerpt:
      "Large, bold, easy-to-follow pattern designs made for a relaxed coloring process.",
    description: [
      "Comfy Patterns gives the Patterns collection a dedicated physical book route.",
    ],
    images: [
      "https://cdn.shopify.com/s/files/1/0602/0133/6893/files/1-comfy-patterns-coloring-book_14.png?v=1775734214",
    ],
    collections: ["all", "physical-books", "paperback-coloring-book", "patterns", "bold-easy"],
    tags: ["patterns", "bold easy", "comfy"],
    productType: "physical",
    options: defaultOptions,
    publishedAt: "2024-05-01",
  },
  {
    id: "cute-groovy-coloring-book",
    slug: "cute-groovy-coloring-book",
    title: "Cute & Groovy Coloring Book",
    price: 9.99,
    compareAtPrice: null,
    available: true,
    excerpt:
      "Bold, easy coloring pages with cute and vintage groovy things.",
    description: [
      "Cute & Groovy appears in the patterns and bold/easy side of the catalog.",
    ],
    images: [
      "https://cdn.shopify.com/s/files/1/0602/0133/6893/files/1-cute-and-groovy-coloring-book.png?v=1775734345",
    ],
    collections: ["all", "physical-books", "paperback-coloring-book", "patterns", "bold-easy"],
    tags: ["groovy", "patterns", "bold easy"],
    productType: "physical",
    options: defaultOptions,
    publishedAt: "2024-05-15",
  },
  {
    id: "food-drink-sweets-coloring-book",
    slug: "food-drink-sweets-coloring-book",
    title: "Food Drink & Sweets Coloring Book",
    price: 9.99,
    compareAtPrice: null,
    available: true,
    excerpt:
      "Bold pages with foods, snacks, drinks, and sweet treats.",
    description: [
      "A classic bold/easy product with a food theme.",
    ],
    images: [
      "https://cdn.shopify.com/s/files/1/0602/0133/6893/files/1-food-drink-and-sweet-coloring-book.png?v=1775734179",
    ],
    collections: ["all", "physical-books", "paperback-coloring-book", "bold-easy"],
    tags: ["food", "drink", "sweets", "bold easy"],
    productType: "physical",
    options: defaultOptions,
    publishedAt: "2024-02-01",
  },
  {
    id: "mini-coloring-book",
    slug: "mini-coloring-book",
    title: "Mini Coloring Book",
    price: 0,
    compareAtPrice: null,
    available: true,
    excerpt:
      "A free mini coloring book used in the public freebies area.",
    description: [
      "The freebie route needs at least one zero-price product-like card.",
    ],
    images: [
      "https://cdn.shopify.com/s/files/1/0602/0133/6893/files/1-Mini-coloring-book-Front.png?v=1778068163",
    ],
    collections: ["all", "freebies"],
    tags: ["freebie", "mini", "digital"],
    productType: "freebie",
    options: defaultOptions,
    publishedAt: "2026-04-01",
  },
];
