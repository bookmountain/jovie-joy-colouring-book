import { describe, expect, it } from "vitest";
import {
  defaultHomeSectionVisibility,
  HOME_SECTION_DEFINITIONS,
  homeSectionIsVisible,
  readHomeSectionVisibility,
} from "@/lib/home-visibility";
import type { SiteContentBundle } from "@/lib/api";

describe("homepage section visibility", () => {
  it("defaults every current and future section to visible", () => {
    const defaults = defaultHomeSectionVisibility();
    expect(Object.keys(defaults)).toHaveLength(13);
    for (const section of HOME_SECTION_DEFINITIONS) {
      expect(homeSectionIsVisible(defaults, section.id)).toBe(true);
    }
    expect(homeSectionIsVisible({}, "newsletter")).toBe(true);
  });

  it("reads explicit false values without treating a missing block as hidden", () => {
    const withoutConfig = { homeSectionVisibility: [] } as unknown as SiteContentBundle;
    expect(readHomeSectionVisibility(withoutConfig)).toEqual({});

    const configured = {
      homeSectionVisibility: [{ key: "home.visibility", data: { blogPosts: false } }],
    } as unknown as SiteContentBundle;
    const visibility = readHomeSectionVisibility(configured);
    expect(homeSectionIsVisible(visibility, "blogPosts")).toBe(false);
    expect(homeSectionIsVisible(visibility, "featuredOn")).toBe(true);
  });
});
