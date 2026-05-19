import type {
  Article, BlogCategory, AboutSection, ComicWorld, StaticPage, FeaturedOnLink,
} from "@/lib/api";
import {
  apiGetBlogs, apiGetBlog, apiGetArticle, apiGetComics, apiGetAbout, apiGetPage, apiGetContent,
} from "@/lib/api";

export type { Article, BlogCategory, AboutSection, ComicWorld, StaticPage, FeaturedOnLink };

export type Comic = ComicWorld["comics"][number];

export const getBlogCategories = (): Promise<BlogCategory[]> => apiGetBlogs();
export const getBlogCategory = (slug: string) => apiGetBlog(slug);
export const getArticle = (blogSlug: string, articleSlug: string) =>
  apiGetArticle(blogSlug, articleSlug);
export const getComicWorlds = () => apiGetComics();
export const getAboutSections = () => apiGetAbout();
export const getStaticPage = (slug: string) => apiGetPage(slug);

export async function getHomeVideo(): Promise<{ src: string; youtubeHref: string } | null> {
  const bundle = await apiGetContent();
  return bundle.homeVideo[0]?.data ?? null;
}

export async function getFaqArtwork(): Promise<{ desktop: string; mobile: string } | null> {
  const bundle = await apiGetContent();
  return bundle.heroArtwork.find((b) => b.key === "hero.artwork.faq")?.data as
    | { desktop: string; mobile: string }
    | undefined ?? null;
}

export async function getFooterArtwork(): Promise<{ desktop: string; mobile: string } | null> {
  const bundle = await apiGetContent();
  return bundle.heroArtwork.find((b) => b.key === "hero.artwork.footer")?.data as
    | { desktop: string; mobile: string }
    | undefined ?? null;
}

export async function getFeaturedOnLinks(): Promise<FeaturedOnLink[]> {
  const bundle = await apiGetContent();
  return bundle.featuredOn.map((b) => {
    const d = b.data as { label: string; href: string; image: string; alt: string };
    return { label: d.label, href: d.href, image: d.image, alt: d.alt };
  });
}
