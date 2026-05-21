"use client";

import { HomeHeroBlock } from "@/components/admin/blocks/HomeHeroBlock";
import { AnnouncementBlock } from "@/components/admin/blocks/AnnouncementBlock";
import { HomeVideoBlock } from "@/components/admin/blocks/HomeVideoBlock";
import { HeroArtworkBlock } from "@/components/admin/blocks/HeroArtworkBlock";
import { HomeIntroBlock } from "@/components/admin/blocks/HomeIntroBlock";
import { HomeCozyMomentsHeaderBlock } from "@/components/admin/blocks/HomeCozyMomentsHeaderBlock";
import { FooterContactBlock } from "@/components/admin/blocks/FooterContactBlock";
import { HeaderBrandBlock } from "@/components/admin/blocks/HeaderBrandBlock";
import { NewsletterCopyBlock } from "@/components/admin/blocks/NewsletterCopyBlock";
import { AdminTextarea } from "@/components/admin/ui";

export type ContentBlockEditorProps = {
  blockKey: string;
  type: string;
  data: unknown;
  onChange: (data: unknown) => void;
};

export function ContentBlockEditor(props: ContentBlockEditorProps) {
  switch (props.type) {
    case "HomeHero":              return <HomeHeroBlock {...props} />;
    case "Announcement":          return <AnnouncementBlock {...props} />;
    case "HomeVideo":             return <HomeVideoBlock {...props} />;
    case "HeroArtwork":           return <HeroArtworkBlock {...props} />;
    case "HomeIntro":             return <HomeIntroBlock {...props} />;
    case "HomeCozyMomentsHeader": return <HomeCozyMomentsHeaderBlock {...props} />;
    case "FooterContact":         return <FooterContactBlock {...props} />;
    case "HeaderBrand":           return <HeaderBrandBlock {...props} />;
    case "NewsletterCopy":        return <NewsletterCopyBlock {...props} />;
    default:
      return (
        <AdminTextarea
          className="font-mono text-xs"
          defaultValue={JSON.stringify(props.data, null, 2)}
          onChange={(e) => {
            try { props.onChange(JSON.parse(e.target.value)); } catch { /* mid-edit */ }
          }}
          rows={8}
        />
      );
  }
}
