"use client";

import { API_URL, type Product, type Collection, type ContentBlock, type StaticPage } from "@/lib/api";
import { tokenStorage } from "@/lib/auth";

function requireToken(): string {
  const t = tokenStorage.read();
  if (!t) throw new Error("Not authenticated");
  return t;
}

async function adminFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${requireToken()}`);
  if (init.body && !headers.has("Content-Type") && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  const res = await fetch(`${API_URL}${path}`, { cache: "no-store", ...init, headers });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${init.method ?? "GET"} ${path} → ${res.status}: ${text}`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

// Products
export type AdminProductListItem = {
  slug: string;
  title: string;
  excerpt: string;
  priceCents: number;
  compareAtPriceCents: number | null;
  available: boolean;
  productType: string;
  status: "published" | "draft" | "scheduled" | "out_of_stock";
  tags: string[];
  collectionSlugs: string[];
  primaryImage: string | null;
  publishedAt: string | null;
  updatedAt: string;
};
export type AdminProductListResponse = {
  items: AdminProductListItem[];
  total: number;
  page: number;
  pageSize: number;
};
export type AdminProductListQuery = {
  q?: string;
  format?: string[];
  status?: string[];
  collection?: string[];
  tag?: string[];
  sort?: "title_asc" | "title_desc" | "price_asc" | "price_desc" | "updated_asc" | "updated_desc";
  page?: number;
  pageSize?: number;
};

function csv(values: string[] | undefined): string | undefined {
  return values && values.length > 0 ? values.join(",") : undefined;
}

export const adminListProducts = (query: AdminProductListQuery = {}) => {
  const p = new URLSearchParams();
  if (query.q) p.set("q", query.q);
  const f = csv(query.format); if (f) p.set("format", f);
  const s = csv(query.status); if (s) p.set("status", s);
  const c = csv(query.collection); if (c) p.set("collection", c);
  const t = csv(query.tag); if (t) p.set("tag", t);
  if (query.sort) p.set("sort", query.sort);
  p.set("page", String(query.page ?? 1));
  p.set("pageSize", String(query.pageSize ?? 25));
  return adminFetch<AdminProductListResponse>(`/api/admin/products?${p}`);
};

export type AdminProductBulkAction =
  | "publish" | "unpublish" | "delete" | "add-to-collection" | "remove-from-collection";

export const adminBulkProducts = (body: {
  slugs: string[];
  action: AdminProductBulkAction;
  payload?: { collectionSlug?: string };
}) =>
  adminFetch<{ updated: number }>("/api/admin/products/bulk", {
    method: "POST",
    body: JSON.stringify(body),
  });

export const adminDuplicateProduct = (slug: string) =>
  adminFetch<Product>(`/api/admin/products/${slug}/duplicate`, { method: "POST" });

export const adminListProductTags = () =>
  adminFetch<string[]>("/api/admin/products/tags");

export const adminGetProduct = (slug: string) => adminFetch<Product>(`/api/admin/products/${slug}`);
export const adminCreateProduct = (body: AdminProductWriteBody) =>
  adminFetch<Product>("/api/admin/products", { method: "POST", body: JSON.stringify(body) });
export const adminUpdateProduct = (slug: string, body: AdminProductWriteBody) =>
  adminFetch<Product>(`/api/admin/products/${slug}`, { method: "PUT", body: JSON.stringify(body) });
export const adminDeleteProduct = (slug: string) =>
  adminFetch<void>(`/api/admin/products/${slug}`, { method: "DELETE" });
export const adminUploadProductImage = (slug: string, file: File) => {
  const fd = new FormData(); fd.append("file", file);
  return adminFetch<{ url: string }>(`/api/admin/products/${slug}/images`, { method: "POST", body: fd });
};
export const adminUploadProductPdf = (slug: string, file: File) => {
  const fd = new FormData(); fd.append("file", file);
  return adminFetch<Product>(`/api/admin/products/${slug}/pdf`, { method: "POST", body: fd });
};

// Collections
export const adminListCollections = () => adminFetch<Collection[]>("/api/admin/collections");
export const adminGetCollection = (slug: string) => adminFetch<Collection>(`/api/admin/collections/${slug}`);
export const adminCreateCollection = (body: AdminCollectionWriteBody) =>
  adminFetch<Collection>("/api/admin/collections", { method: "POST", body: JSON.stringify(body) });
export const adminUpdateCollection = (slug: string, body: AdminCollectionWriteBody) =>
  adminFetch<Collection>(`/api/admin/collections/${slug}`, { method: "PUT", body: JSON.stringify(body) });
export const adminDeleteCollection = (slug: string) =>
  adminFetch<void>(`/api/admin/collections/${slug}`, { method: "DELETE" });
export const adminUploadCollectionHero = (slug: string, file: File) => {
  const fd = new FormData(); fd.append("file", file);
  return adminFetch<{ url: string }>(`/api/admin/collections/${slug}/hero-image`, { method: "POST", body: fd });
};

// Content blocks
export const adminListContent = () => adminFetch<ContentBlock[]>("/api/admin/content");
export const adminGetContent = (key: string) => adminFetch<ContentBlock>(`/api/admin/content/${key}`);
export const adminUpsertContent = (key: string, body: { type: string; data: unknown; sortIndex: number }) =>
  adminFetch<ContentBlock>(`/api/admin/content/${key}`, { method: "PUT", body: JSON.stringify(body) });
export const adminDeleteContent = (key: string) =>
  adminFetch<void>(`/api/admin/content/${key}`, { method: "DELETE" });
export const adminUploadContentImage = (key: string, file: File) => {
  const fd = new FormData(); fd.append("file", file);
  return adminFetch<{ url: string }>(`/api/admin/content/${key}/image`, { method: "POST", body: fd });
};

// General upload (used when no entity yet)
export const adminUploadGeneral = (file: File, folder?: string) => {
  const fd = new FormData();
  fd.append("file", file);
  if (folder) fd.append("folder", folder);
  return adminFetch<{ url: string }>("/api/admin/uploads", { method: "POST", body: fd });
};

// Orders + analytics
export type AdminOrder = {
  id: string; email: string; status: string;
  totalCents: number; createdAt: string; paidAt: string | null;
  items: { productSlug: string; title: string; qty: number; unitPriceCents: number }[];
};
export const adminListOrders = (status?: string, page = 1, pageSize = 20) => {
  const q = new URLSearchParams();
  if (status) q.set("status", status);
  q.set("page", String(page)); q.set("pageSize", String(pageSize));
  return adminFetch<{ items: AdminOrder[]; total: number; page: number; pageSize: number }>(
    `/api/admin/analytics/orders?${q}`,
  );
};
export const adminAnalyticsSummary = () =>
  adminFetch<{
    totalOrders: number; paidOrders: number; totalRevenueCents: number;
    revenueThisMonthCents: number; ordersThisMonth: number;
    last30Days: { date: string; revenueCents: number; orders: number }[];
    topProducts: { productSlug: string; title: string; unitsSold: number; revenueCents: number }[];
  }>("/api/admin/analytics/summary");

// Write request shapes (match Phase 1 AdminDtos)
export type AdminProductWriteBody = {
  slug?: string; title: string; excerpt: string; description: string[];
  priceCents: number; compareAtPriceCents: number | null; available: boolean;
  productType: string; images: string[];
  options?: { name: string; values: string[] }[]; // optional now — BE preserves/defaults
  sourceLinks: { label: string; href: string; image?: string; alt?: string }[] | null;
  reviewImages: string[] | null; inspirationImages: string[] | null;
  tags: string[]; collectionSlugs: string[];
  publishedAt?: string | null;
};

export type AdminCollectionWriteBody = {
  slug?: string; title: string; excerpt: string; heroImage: string | null;
  defaultSort: string; homepageSlot: string | null;
  productOrder: string[]; sortIndex: number;
};

// ----------------- Phase 4a: chrome admin -----------------

// Static pages
export type AdminStaticPageWriteBody = {
  slug?: string; // required on create
  title: string;
  intro: string;
  blocks: string[];
};
export const adminListStaticPages = () => adminFetch<StaticPage[]>("/api/admin/static-pages");
export const adminGetStaticPage = (slug: string) => adminFetch<StaticPage>(`/api/admin/static-pages/${slug}`);
export const adminCreateStaticPage = (body: AdminStaticPageWriteBody) =>
  adminFetch<StaticPage>("/api/admin/static-pages", { method: "POST", body: JSON.stringify(body) });
export const adminUpdateStaticPage = (slug: string, body: AdminStaticPageWriteBody) =>
  adminFetch<StaticPage>(`/api/admin/static-pages/${slug}`, { method: "PUT", body: JSON.stringify(body) });
export const adminDeleteStaticPage = (slug: string) =>
  adminFetch<void>(`/api/admin/static-pages/${slug}`, { method: "DELETE" });

// Footer links
export type AdminFooterLinkWriteBody = {
  groupKey: string; groupTitle: string; label: string; href: string; sortIndex: number;
};
export type AdminFooterLink = AdminFooterLinkWriteBody & { id: string };
export const adminListFooterLinks = () => adminFetch<AdminFooterLink[]>("/api/admin/footer-links");
export const adminCreateFooterLink = (body: AdminFooterLinkWriteBody) =>
  adminFetch<AdminFooterLink>("/api/admin/footer-links", { method: "POST", body: JSON.stringify(body) });
export const adminUpdateFooterLink = (id: string, body: AdminFooterLinkWriteBody) =>
  adminFetch<AdminFooterLink>(`/api/admin/footer-links/${id}`, { method: "PUT", body: JSON.stringify(body) });
export const adminDeleteFooterLink = (id: string) =>
  adminFetch<void>(`/api/admin/footer-links/${id}`, { method: "DELETE" });

// Social links
export type AdminSocialLink = { label: string; href: string; sortIndex: number };
export type AdminSocialLinkUpdateBody = { href: string; sortIndex: number };
export const adminListSocialLinks = () => adminFetch<AdminSocialLink[]>("/api/admin/social-links");
export const adminCreateSocialLink = (body: AdminSocialLink) =>
  adminFetch<AdminSocialLink>("/api/admin/social-links", { method: "POST", body: JSON.stringify(body) });
export const adminUpdateSocialLink = (label: string, body: AdminSocialLinkUpdateBody) =>
  adminFetch<AdminSocialLink>(`/api/admin/social-links/${encodeURIComponent(label)}`, { method: "PUT", body: JSON.stringify(body) });
export const adminDeleteSocialLink = (label: string) =>
  adminFetch<void>(`/api/admin/social-links/${encodeURIComponent(label)}`, { method: "DELETE" });

// Comics
export type AdminComicImage = { src: string; alt: string };
export type AdminComic = { id: string; title: string; description: string; hasDownload: boolean; images: AdminComicImage[]; sortIndex: number };
export type AdminComicWorld = { id: string; title: string; comics: AdminComic[]; sortIndex: number };
export type AdminComicWriteBody = { title: string; description: string; hasDownload: boolean; images: AdminComicImage[]; sortIndex: number };
export type AdminComicWorldWriteBody = { title: string; sortIndex: number };

export const adminListComicWorlds = () => adminFetch<AdminComicWorld[]>("/api/admin/comics");
export const adminCreateComicWorld = (body: AdminComicWorldWriteBody) =>
  adminFetch<AdminComicWorld>("/api/admin/comics", { method: "POST", body: JSON.stringify(body) });
export const adminUpdateComicWorld = (id: string, body: AdminComicWorldWriteBody) =>
  adminFetch<AdminComicWorld>(`/api/admin/comics/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(body) });
export const adminDeleteComicWorld = (id: string) =>
  adminFetch<void>(`/api/admin/comics/${encodeURIComponent(id)}`, { method: "DELETE" });

export const adminListComics = (worldId: string) =>
  adminFetch<AdminComic[]>(`/api/admin/comics/${encodeURIComponent(worldId)}/comics`);
export const adminCreateComic = (worldId: string, body: AdminComicWriteBody) =>
  adminFetch<AdminComic>(`/api/admin/comics/${encodeURIComponent(worldId)}/comics`, { method: "POST", body: JSON.stringify(body) });
export const adminUpdateComic = (worldId: string, comicId: string, body: AdminComicWriteBody) =>
  adminFetch<AdminComic>(`/api/admin/comics/${encodeURIComponent(worldId)}/comics/${encodeURIComponent(comicId)}`, { method: "PUT", body: JSON.stringify(body) });
export const adminDeleteComic = (worldId: string, comicId: string) =>
  adminFetch<void>(`/api/admin/comics/${encodeURIComponent(worldId)}/comics/${encodeURIComponent(comicId)}`, { method: "DELETE" });
export const adminUploadComicImage = (worldId: string, comicId: string, file: File) => {
  const fd = new FormData(); fd.append("file", file);
  return adminFetch<{ url: string }>(`/api/admin/comics/${encodeURIComponent(worldId)}/comics/${encodeURIComponent(comicId)}/image`, { method: "POST", body: fd });
};

// Blogs
export type AdminBlogCategory = { slug: string; title: string; excerpt: string; image: string; sortIndex: number };
export type AdminBlogCategoryWriteBody = { title: string; excerpt: string; image: string; sortIndex: number };
export type AdminBlogCategoryCreateBody = AdminBlogCategoryWriteBody & { slug: string };
export type AdminArticle = { slug: string; blogSlug: string; title: string; excerpt: string; image: string; body: string[]; sortIndex?: number };
export type AdminArticleWriteBody = { title: string; excerpt: string; image: string; body: string[]; sortIndex: number };
export type AdminArticleCreateBody = AdminArticleWriteBody & { slug: string };

export const adminListBlogCategories = () => adminFetch<AdminBlogCategory[]>("/api/admin/blogs");
export const adminCreateBlogCategory = (body: AdminBlogCategoryCreateBody) =>
  adminFetch<AdminBlogCategory>("/api/admin/blogs", { method: "POST", body: JSON.stringify(body) });
export const adminUpdateBlogCategory = (slug: string, body: AdminBlogCategoryWriteBody) =>
  adminFetch<AdminBlogCategory>(`/api/admin/blogs/${encodeURIComponent(slug)}`, { method: "PUT", body: JSON.stringify(body) });
export const adminDeleteBlogCategory = (slug: string) =>
  adminFetch<void>(`/api/admin/blogs/${encodeURIComponent(slug)}`, { method: "DELETE" });
export const adminUploadBlogCategoryImage = (slug: string, file: File) => {
  const fd = new FormData(); fd.append("file", file);
  return adminFetch<{ url: string }>(`/api/admin/blogs/${encodeURIComponent(slug)}/image`, { method: "POST", body: fd });
};

export const adminListArticles = (categorySlug: string) =>
  adminFetch<AdminArticle[]>(`/api/admin/blogs/${encodeURIComponent(categorySlug)}/articles`);
export const adminCreateArticle = (categorySlug: string, body: AdminArticleCreateBody) =>
  adminFetch<AdminArticle>(`/api/admin/blogs/${encodeURIComponent(categorySlug)}/articles`, { method: "POST", body: JSON.stringify(body) });
export const adminUpdateArticle = (categorySlug: string, articleSlug: string, body: AdminArticleWriteBody) =>
  adminFetch<AdminArticle>(`/api/admin/blogs/${encodeURIComponent(categorySlug)}/articles/${encodeURIComponent(articleSlug)}`, { method: "PUT", body: JSON.stringify(body) });
export const adminDeleteArticle = (categorySlug: string, articleSlug: string) =>
  adminFetch<void>(`/api/admin/blogs/${encodeURIComponent(categorySlug)}/articles/${encodeURIComponent(articleSlug)}`, { method: "DELETE" });
export const adminUploadArticleImage = (categorySlug: string, articleSlug: string, file: File) => {
  const fd = new FormData(); fd.append("file", file);
  return adminFetch<{ url: string }>(`/api/admin/blogs/${encodeURIComponent(categorySlug)}/articles/${encodeURIComponent(articleSlug)}/image`, { method: "POST", body: fd });
};

// Gallery
export type AdminGalleryImage = { id: string; src: string; alt: string; sortIndex: number };
export type AdminGalleryWriteBody = { src: string; alt: string; sortIndex: number };
export const adminListGallery = () => adminFetch<AdminGalleryImage[]>("/api/admin/gallery");
export const adminCreateGalleryImage = (body: AdminGalleryWriteBody) =>
  adminFetch<AdminGalleryImage>("/api/admin/gallery", { method: "POST", body: JSON.stringify(body) });
export const adminUpdateGalleryImage = (id: string, body: AdminGalleryWriteBody) =>
  adminFetch<AdminGalleryImage>(`/api/admin/gallery/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(body) });
export const adminDeleteGalleryImage = (id: string) =>
  adminFetch<void>(`/api/admin/gallery/${encodeURIComponent(id)}`, { method: "DELETE" });
export const adminUploadGalleryImage = (file: File) => {
  const fd = new FormData(); fd.append("file", file);
  return adminFetch<{ url: string }>("/api/admin/gallery/upload", { method: "POST", body: fd });
};

// FAQs
export type AdminFaq = { slug: string; question: string; answer: string; group: string | null; sortIndex: number };
export type AdminFaqUpdateBody = { question: string; answer: string; group: string | null; sortIndex: number };
export type AdminFaqCreateBody = { slug: string; question: string; answer: string; group: string | null; sortIndex: number };
export const adminListFaqs = () => adminFetch<AdminFaq[]>("/api/admin/faqs");
export const adminCreateFaq = (body: AdminFaqCreateBody) =>
  adminFetch<AdminFaq>("/api/admin/faqs", { method: "POST", body: JSON.stringify(body) });
export const adminUpdateFaq = (slug: string, body: AdminFaqUpdateBody) =>
  adminFetch<AdminFaq>(`/api/admin/faqs/${encodeURIComponent(slug)}`, { method: "PUT", body: JSON.stringify(body) });
export const adminDeleteFaq = (slug: string) =>
  adminFetch<void>(`/api/admin/faqs/${encodeURIComponent(slug)}`, { method: "DELETE" });

// Featured On
export type AdminFeaturedOn = { slug: string; label: string; href: string; image: string; alt: string; sortIndex: number };
export type AdminFeaturedOnUpdateBody = { label: string; href: string; image: string; alt: string; sortIndex: number };
export const adminListFeaturedOn = () => adminFetch<AdminFeaturedOn[]>("/api/admin/featured-on");
export const adminCreateFeaturedOn = (body: AdminFeaturedOn) =>
  adminFetch<AdminFeaturedOn>("/api/admin/featured-on", { method: "POST", body: JSON.stringify(body) });
export const adminUpdateFeaturedOn = (slug: string, body: AdminFeaturedOnUpdateBody) =>
  adminFetch<AdminFeaturedOn>(`/api/admin/featured-on/${encodeURIComponent(slug)}`, { method: "PUT", body: JSON.stringify(body) });
export const adminDeleteFeaturedOn = (slug: string) =>
  adminFetch<void>(`/api/admin/featured-on/${encodeURIComponent(slug)}`, { method: "DELETE" });
export const adminUploadFeaturedOnImage = (slug: string, file: File) => {
  const fd = new FormData(); fd.append("file", file);
  return adminFetch<{ url: string }>(`/api/admin/featured-on/${encodeURIComponent(slug)}/image`, { method: "POST", body: fd });
};

// Trending terms
export type AdminTrendingTerm = { term: string; sortIndex: number };
export const adminListTrendingTerms = () => adminFetch<AdminTrendingTerm[]>("/api/admin/trending-terms");
export const adminCreateTrendingTerm = (body: AdminTrendingTerm) =>
  adminFetch<AdminTrendingTerm>("/api/admin/trending-terms", { method: "POST", body: JSON.stringify(body) });
export const adminUpdateTrendingTerm = (term: string, body: { sortIndex: number }) =>
  adminFetch<AdminTrendingTerm>(`/api/admin/trending-terms/${encodeURIComponent(term)}`, { method: "PUT", body: JSON.stringify(body) });
export const adminDeleteTrendingTerm = (term: string) =>
  adminFetch<void>(`/api/admin/trending-terms/${encodeURIComponent(term)}`, { method: "DELETE" });
