import type {
  Article, BlogCategory, AboutSection, ComicWorld, StaticPage, FeaturedOnLink,
} from "@/lib/api";
import {
  apiGetBlogs, apiGetBlog, apiGetArticle, apiGetComics, apiGetAbout, apiGetPage,
} from "@/lib/api";
import { getSiteContent } from "@/data/site-content";

export type { Article, BlogCategory, AboutSection, ComicWorld, StaticPage, FeaturedOnLink };

export type Comic = ComicWorld["comics"][number];

export const getBlogCategories = (): Promise<BlogCategory[]> => apiGetBlogs();
export const getBlogCategory = (slug: string) => apiGetBlog(slug);
export const getArticle = (blogSlug: string, articleSlug: string) =>
  apiGetArticle(blogSlug, articleSlug);
export const getComicWorlds = () => apiGetComics();
export const getAboutSections = () => apiGetAbout();
export const getStaticPage = (slug: string) => apiGetPage(slug);

export async function getHomeVideos(): Promise<string[]> {
  const bundle = await getSiteContent();
  const data = bundle.homeVideo[0]?.data;
  if (!data) return [];
  if (Array.isArray(data.videos)) return data.videos.filter(Boolean).slice(0, 3);
  // Legacy single-video shape: only keep it if it's an admin-uploaded asset,
  // never a third-party CDN link.
  return data.src?.startsWith("/uploads/") ? [data.src] : [];
}

function pickHeroArtwork(data: unknown): string | null {
  const d = (data ?? {}) as { image?: string; desktop?: string; mobile?: string };
  return d.image || d.desktop || d.mobile || null;
}

export async function getFaqArtwork(): Promise<string | null> {
  const bundle = await getSiteContent();
  return pickHeroArtwork(bundle.heroArtwork.find((b) => b.key === "hero.artwork.faq")?.data);
}

export async function getFooterArtwork(): Promise<string | null> {
  const bundle = await getSiteContent();
  return pickHeroArtwork(bundle.heroArtwork.find((b) => b.key === "hero.artwork.footer")?.data);
}

export async function getFeaturedOnLinks(): Promise<FeaturedOnLink[]> {
  const bundle = await getSiteContent();
  return bundle.featuredOn.map((b) => {
    const d = b.data as { label: string; href: string; image: string; alt: string };
    return { label: d.label, href: d.href, image: d.image, alt: d.alt };
  });
}
