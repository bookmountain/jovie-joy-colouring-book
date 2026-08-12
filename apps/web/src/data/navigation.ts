import type { NavLink, FooterLinkGroup, SocialLink } from "@/lib/api";
import { getSiteContent } from "@/data/site-content";

export type { NavLink, FooterLinkGroup, SocialLink };

export async function getPrimaryNavigation(): Promise<NavLink[]> {
  const bundle = await getSiteContent();
  return bundle.navigation;
}

export async function getFooterGroups(): Promise<FooterLinkGroup[]> {
  const bundle = await getSiteContent();
  return bundle.footerLinks;
}

export async function getSocialLinks(): Promise<SocialLink[]> {
  const bundle = await getSiteContent();
  return bundle.socialLinks;
}

export async function getTrendingTerms(): Promise<string[]> {
  const bundle = await getSiteContent();
  return bundle.trendingTerms;
}
