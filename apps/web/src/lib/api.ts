// Typed REST client for the Zoe&Book BE.
// Content loaders default to `revalidate: 60`; product/catalog loaders opt into
// `cache: "no-store"` so admin publish/upload changes show on the storefront.

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export function resolveAssetUrl(url: string | null | undefined): string {
  if (!url) return "";
  if (url.startsWith("/uploads")) return `${API_URL}${url}`;
  return url;
}

export type ProductOption = { name: string; values: string[] };
export type SourceLink = { label: string; href: string; image?: string; alt?: string };

export type Product = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  description: string[];
  priceCents: number;
  compareAtPriceCents: number | null;
  available: boolean;
  productType: "physical" | "digital" | "sticker" | "freebie";
  images: string[];
  options: ProductOption[];
  sourceLinks: SourceLink[] | null;
  reviewImages: string[] | null;
  inspirationImages: string[] | null;
  tags: string[];
  collections: string[];
  publishedAt: string;
  pdfPath: string | null;
};

export type Collection = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  heroImage: string | null;
  defaultSort: string;
  homepageSlot: "newrelease" | "bestseller" | "digital" | "tile" | null;
  productSlugs: string[];
  sortIndex: number;
};

export type CollectionWithProducts = { collection: Collection; products: Product[] };

export type BlogCategory = { slug: string; title: string; excerpt: string; image: string; sortIndex: number };
export type Article = { slug: string; blogSlug: string; title: string; excerpt: string; image: string; body: string[] };
export type ComicImage = { src: string; alt: string };
export type Comic = { id: string; title: string; description: string; hasDownload: boolean; images: ComicImage[]; sortIndex: number };
export type ComicWorld = { id: string; title: string; comics: Comic[]; sortIndex: number };
export type AboutSection = { id: string; title: string; body: string[]; image: string; alt: string; background: string; sortIndex: number };
export type GalleryImage = { id: string; src: string; alt: string; sortIndex: number };
export type StaticPage = { slug: string; title: string; intro: string; blocks: string[] };
export type FaqLink = { label: string; href: string };
export type Faq = { slug: string; question: string; answer: string; links: FaqLink[] | null; group: string | null; sortIndex: number };

export type NavLink = { id: string; label: string; href: string; children: NavLink[] };
export type FooterLinkItem = { label: string; href: string };
export type FooterLinkGroup = { key: string; title: string; links: FooterLinkItem[] };
export type SocialLink = { label: string; href: string };
export type FeaturedOnLink = { label: string; href: string; image: string; alt: string };

export type ContentBlock<T = unknown> = { key: string; type: string; data: T; sortIndex: number; updatedAt: string };

export type SiteContentBundle = {
  homeHero: ContentBlock<{ eyebrow: string; title: string; subtext: string; ctaLabel: string; ctaHref: string; image: string }>[];
  aboutSections: ContentBlock[];
  faqs: ContentBlock[];
  featuredOn: ContentBlock[];
  homeVideo: ContentBlock<{ src: string; youtubeHref: string }>[];
  footerGroups: ContentBlock[];
  announcement: ContentBlock<{ enabled: boolean; text: string; href: string; backgroundImage?: string }>[];
  heroArtwork: ContentBlock<{ image?: string; desktop?: string; mobile?: string }>[];
  navigation: NavLink[];
  footerLinks: FooterLinkGroup[];
  socialLinks: SocialLink[];
  trendingTerms: string[];
  homeIntro: ContentBlock<{ title?: string; body?: string; image1?: string; image2?: string }>[];
  homeCozyMomentsHeader: ContentBlock<{ heading?: string }>[];
  footerContact: ContentBlock<{ blurb?: string; customerCareLabel?: string; customerCareEmail?: string; licensingLabel?: string; licensingEmail?: string }>[];
  headerBrand: ContentBlock<{ name?: string; searchPlaceholder?: string }>[];
  newsletterCopy: ContentBlock<{ heading?: string; ctaLabel?: string; successMessage?: string }>[];
  homeHeroSlides: ContentBlock<{ intervalMs?: number; slides: HeroSlide[] }>[];
  homeProductRows: ContentBlock<{ eyebrow?: string; title?: string; href?: string; collectionSlug?: string; itemCount?: number }>[];
};

export type HeroSlide = {
  label: string;
  href: string;
  image: string;
};

export type UserDto = { id: string; email: string; name: string | null; avatarUrl: string | null; isAdmin: boolean };

export type CheckoutResponse = { checkoutUrl: string; orderId: string };

async function get<T>(path: string, init?: RequestInit & { next?: { revalidate?: number } }): Promise<T> {
  const url = `${API_URL}${path}`;
  const fetchInit: RequestInit & { next?: { revalidate?: number } } = { ...init };
  if (!fetchInit.cache && !fetchInit.next) {
    fetchInit.next = { revalidate: 60 };
  }
  const res = await fetch(url, fetchInit);
  if (!res.ok) throw new Error(`${url} returned ${res.status}`);
  return (await res.json()) as T;
}

async function post<T>(path: string, body: unknown, init?: RequestInit & { token?: string }): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");
  if (init?.token) headers.set("Authorization", `Bearer ${init.token}`);
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    cache: "no-store",
    ...init,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`POST ${path} returned ${res.status}: ${text}`);
  }
  return (await res.json()) as T;
}

// Public loaders
export const apiGetProducts = (collection?: string, sort?: string) => {
  const q = new URLSearchParams();
  if (collection) q.set("collection", collection);
  if (sort) q.set("sort", sort);
  const suffix = q.toString() ? `?${q}` : "";
  return get<Product[]>(`/api/products${suffix}`, { cache: "no-store" });
};
export const apiGetProduct = (slug: string) => get<Product>(`/api/products/${slug}`, { cache: "no-store" });
export const apiGetCollections = () => get<Collection[]>("/api/collections", { cache: "no-store" });
export const apiGetCollection = (slug: string) => get<CollectionWithProducts>(`/api/collections/${slug}`, { cache: "no-store" });
export const apiGetBlogs = () => get<BlogCategory[]>("/api/blogs");
export const apiGetBlog = (slug: string) => get<{ category: BlogCategory; articles: Article[] }>(`/api/blogs/${slug}`);
export const apiGetArticle = (blogSlug: string, articleSlug: string) =>
  get<Article>(`/api/blogs/${blogSlug}/articles/${articleSlug}`);
export const apiGetComics = () => get<ComicWorld[]>("/api/comics");
export const apiGetAbout = () => get<AboutSection[]>("/api/about");
export const apiGetGallery = () => get<GalleryImage[]>("/api/gallery");
export const apiGetPage = (slug: string) => get<StaticPage>(`/api/pages/${slug}`);
export const apiGetFaqs = () => get<Faq[]>("/api/faqs");
export const apiGetContent = () => get<SiteContentBundle>("/api/content");

// Commerce (anonymous OK)
export const apiNewsletterSignup = (email: string) => post<{ ok: true }>("/api/newsletter", { email });
export const apiNotifyMe = (email: string, productSlug: string) =>
  post<{ ok: true }>("/api/notify-me", { email, productSlug });
export const apiCreateCheckout = (
  body: { email: string; name?: string | null; items: { productSlug: string; quantity: number }[]; promoCode?: string | null },
  token?: string,
) => post<CheckoutResponse>("/api/checkout", body, { token });

// Wishlist (requires JWT)
export const apiGetWishlist = (token: string) =>
  get<{ productSlug: string; addedAt: string }[]>("/api/wishlist", {
    cache: "no-store",
    headers: { Authorization: `Bearer ${token}` },
  });
export const apiAddWishlist = async (token: string, slug: string) =>
  fetch(`${API_URL}/api/wishlist/${slug}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
export const apiRemoveWishlist = async (token: string, slug: string) =>
  fetch(`${API_URL}/api/wishlist/${slug}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
export const apiMergeWishlist = (token: string, productSlugs: string[]) =>
  post<void>("/api/wishlist/merge", { productSlugs }, { token });

// Auth
export const apiMe = (token: string) =>
  get<UserDto>("/auth/me", {
    cache: "no-store",
    headers: { Authorization: `Bearer ${token}` },
  });
