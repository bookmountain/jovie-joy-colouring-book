import { describe, expect, it } from "vitest";
import {
  ACTIVE_CONTENT_BLOCK_TYPES,
  retiredContentBlock,
} from "@/lib/content-block-types";

describe("advanced content block policy", () => {
  it("offers only block types consumed by the current storefront", () => {
    expect(ACTIVE_CONTENT_BLOCK_TYPES).toContain("HomeHeroSlides");
    expect(ACTIVE_CONTENT_BLOCK_TYPES).toContain("HomeProductRow");
    expect(ACTIVE_CONTENT_BLOCK_TYPES).not.toContain("FaqEntry");
    expect(ACTIVE_CONTENT_BLOCK_TYPES).not.toContain("AboutSection");
    expect(ACTIVE_CONTENT_BLOCK_TYPES).not.toContain("FooterGroup");
    expect(ACTIVE_CONTENT_BLOCK_TYPES).not.toContain("FeaturedOn");
    expect(ACTIVE_CONTENT_BLOCK_TYPES).not.toContain("HomeHero");
  });

  it("routes every retired type to its dedicated editor", () => {
    expect(retiredContentBlock("FaqEntry")?.editorHref).toBe("/admin/faq");
    expect(retiredContentBlock("AboutSection")?.editorHref).toBe("/admin/about");
    expect(retiredContentBlock("FooterGroup")?.editorHref).toBe("/admin/pages/footer");
    expect(retiredContentBlock("FeaturedOn")?.editorHref).toBe("/admin/featured-on");
    expect(retiredContentBlock("HomeHero")?.editorHref).toBe("/admin/pages/home");
    expect(retiredContentBlock("HomeVideo")).toBeUndefined();
  });
});
