import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { HomeHero } from "@/components/content/home-hero";
import { resolveAssetUrl, type HeroSlide } from "@/lib/api";

vi.mock("@/components/common/SafeImage", () => ({
  SafeImage: ({ src, className }: { src: string; className?: string }) => (
    <span aria-label={`Image: ${src}`} className={className} data-image-src={src} role="img" />
  ),
}));

const baseSlide: HeroSlide = {
  label: "Cozy banner",
  href: "/products",
  image: "/uploads/content/hero-desktop.png",
};

describe("HomeHero art direction", () => {
  it("renders a portrait mobile frame and both images when a slide has a mobile image", () => {
    render(
      <HomeHero slides={[{ ...baseSlide, mobileImage: "/uploads/content/hero-mobile.png" }]} />,
    );

    const link = screen.getByRole("link", { name: "Cozy banner" });
    expect(link.className).toContain("aspect-[5/8]");
    expect(link.className).toContain("md:aspect-[2/1]");

    const mobile = screen.getByRole("img", { name: /hero-mobile\.png/ });
    expect(mobile).toHaveAttribute(
      "data-image-src",
      resolveAssetUrl("/uploads/content/hero-mobile.png"),
    );
    expect(mobile.className).toContain("md:hidden");

    const desktop = screen.getByRole("img", { name: /hero-desktop\.png/ });
    expect(desktop.className).toContain("hidden");
    expect(desktop.className).toContain("md:block");
  });

  it("falls back to an uncropped landscape frame on mobile when there is no mobile image", () => {
    render(<HomeHero slides={[baseSlide]} />);

    const link = screen.getByRole("link", { name: "Cozy banner" });
    expect(link.className).toContain("aspect-[2/1]");
    expect(link.className).not.toContain("aspect-[5/8]");

    expect(screen.queryByRole("img", { name: /hero-mobile\.png/ })).toBeNull();
    const desktop = screen.getByRole("img", { name: /hero-desktop\.png/ });
    expect(desktop.className).not.toContain("hidden");
  });
});
