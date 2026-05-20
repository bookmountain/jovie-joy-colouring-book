"use client";

import { API_URL, type Product, type Collection, type ContentBlock } from "@/lib/api";
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
export const adminListProducts = () => adminFetch<Product[]>("/api/admin/products");
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
  options: { name: string; values: string[] }[];
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
