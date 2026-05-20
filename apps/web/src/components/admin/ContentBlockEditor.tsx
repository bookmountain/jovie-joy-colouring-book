"use client";

import { HomeHeroBlock } from "@/components/admin/blocks/HomeHeroBlock";
import { AnnouncementBlock } from "@/components/admin/blocks/AnnouncementBlock";
import { HomeVideoBlock } from "@/components/admin/blocks/HomeVideoBlock";
import { HeroArtworkBlock } from "@/components/admin/blocks/HeroArtworkBlock";

export type ContentBlockEditorProps = {
  blockKey: string;
  type: string;
  data: unknown;
  onChange: (data: unknown) => void;
};

export function ContentBlockEditor(props: ContentBlockEditorProps) {
  switch (props.type) {
    case "HomeHero":
      return <HomeHeroBlock {...props} />;
    case "Announcement":
      return <AnnouncementBlock {...props} />;
    case "HomeVideo":
      return <HomeVideoBlock {...props} />;
    case "HeroArtwork":
      return <HeroArtworkBlock {...props} />;
    default:
      return (
        <textarea
          className="coco-input w-full font-mono text-xs"
          defaultValue={JSON.stringify(props.data, null, 2)}
          onChange={(e) => {
            try {
              props.onChange(JSON.parse(e.target.value));
            } catch {
              // user mid-edit; ignore
            }
          }}
          rows={8}
        />
      );
  }
}
