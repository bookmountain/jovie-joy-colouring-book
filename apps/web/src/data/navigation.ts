export type NavLink = {
  label: string;
  href: string;
  children?: NavLink[];
};

export const trendingTerms = [
  "spooky cuties",
  "girl moment",
  "cozy friends",
  "cozy days",
  "cozy cuties",
  "little corner",
];

export const primaryNavigation: NavLink[] = [
  { label: "Home", href: "/" },
  {
    label: "Products",
    href: "/collections",
    children: [
      { label: "Go to Products", href: "/collections" },
      { label: "Sticker Packs", href: "/collections/vinyl-sticker-packs" },
      {
        label: "Physical Books",
        href: "/collections/physical-books",
        children: [
          { label: "Go to Physical Books", href: "/collections/physical-books" },
          { label: "Spiral-bound", href: "/collections/spiral-bound" },
          { label: "Paperback", href: "/collections/paperback-coloring-book" },
        ],
      },
      { label: "Digital Books", href: "/collections/digital" },
      { label: "Collab Collection", href: "/collections/collab-collection" },
    ],
  },
  {
    label: "Blogs",
    href: "/blogs/htc",
    children: [
      { label: "Go to Blogs", href: "/blogs/htc" },
      { label: "How To Color Series", href: "/blogs/htc" },
      { label: "Tools & Tips", href: "/blogs/coloring-book-guide" },
      { label: "Color World", href: "/blogs/color-world" },
      { label: "Lifestyle & DIY", href: "/blogs/diy" },
      { label: "Product Guide", href: "/blogs/product-guide" },
    ],
  },
  { label: "Gallery", href: "/pages/gallery" },
  { label: "About Us", href: "/pages/about-us" },
  { label: "Comics", href: "/pages/comics" },
  { label: "Freebies", href: "/pages/freebies" },
  { label: "FAQs", href: "/pages/faq" },
];

export const footerGroups = [
  {
    title: "Info",
    links: [
      { label: "About us", href: "/pages/about-us" },
      { label: "FAQs", href: "/pages/faq" },
      { label: "Blogs", href: "/blogs/htc" },
      { label: "Gallery", href: "/pages/gallery" },
    ],
  },
  {
    title: "Our book",
    links: [
      { label: "Cute & Comfy", href: "/collections/cute-comfy" },
      { label: "Bold Easy", href: "/collections/bold-easy" },
      { label: "Classic", href: "/collections/classic" },
      { label: "Best Sellers", href: "/collections/frontpage" },
      { label: "New Release", href: "/collections/new-release" },
    ],
  },
];

export const socialLinks = [
  { label: "Facebook", href: "https://www.facebook.com/" },
  { label: "Instagram", href: "https://www.instagram.com/" },
  { label: "Pinterest", href: "https://www.pinterest.com/" },
  { label: "TikTok", href: "https://www.tiktok.com/" },
  { label: "YouTube", href: "https://www.youtube.com/" },
  { label: "Threads", href: "https://www.threads.net/" },
];
