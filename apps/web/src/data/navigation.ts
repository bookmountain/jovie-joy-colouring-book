import { apiGetContent } from "@/lib/api";
import type { NavLink, FooterLinkGroup, SocialLink } from "@/lib/api";

export type { NavLink, FooterLinkGroup, SocialLink };

export async function getPrimaryNavigation(): Promise<NavLink[]> {
  const bundle = await apiGetContent();
  return bundle.navigation;
}

export async function getFooterGroups(): Promise<FooterLinkGroup[]> {
  const bundle = await apiGetContent();
  return bundle.footerLinks;
}

export async function getSocialLinks(): Promise<SocialLink[]> {
  const bundle = await apiGetContent();
  return bundle.socialLinks;
}

export async function getTrendingTerms(): Promise<string[]> {
  const bundle = await apiGetContent();
  return bundle.trendingTerms;
}
