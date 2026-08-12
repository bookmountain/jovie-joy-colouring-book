import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Home from "@/app/(public)/page";
import { HOME_SECTION_DEFINITIONS } from "@/lib/home-visibility";

const mocks = vi.hoisted(() => ({
  apiGetContent: vi.fn(),
  getAllCollections: vi.fn(),
  getProductsForCollection: vi.fn(),
  getCozyMomentImages: vi.fn(),
}));

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return { ...actual, apiGetContent: mocks.apiGetContent };
});
vi.mock("@/data/collections", () => ({ getAllCollections: mocks.getAllCollections }));
vi.mock("@/lib/catalog", () => ({ getProductsForCollection: mocks.getProductsForCollection }));
vi.mock("@/data/gallery", () => ({ getCozyMomentImages: mocks.getCozyMomentImages }));

vi.mock("@/components/content/home-hero", () => ({ HomeHero: () => <section>Hero carousel</section> }));
vi.mock("@/components/content/home-section", () => ({ HomeSection: ({ title }: { title: string }) => <section>{title}</section> }));
vi.mock("@/components/content/home-video-section", () => ({ HomeVideoSection: () => <section>Home video</section> }));
vi.mock("@/components/content/collection-tiles", () => ({ CollectionTiles: () => <section>Collection tiles</section> }));
vi.mock("@/components/content/blog-category-cards", () => ({ BlogCategoryCards: () => <section>Blog posts</section> }));
vi.mock("@/components/content/featured-on-section", () => ({ FeaturedOnSection: () => <section>Featured On</section> }));
vi.mock("@/components/content/faq-preview", () => ({ FaqPreview: () => <section>FAQ preview</section> }));
vi.mock("@/components/content/newsletter-form", () => ({ NewsletterForm: () => <section>Newsletter signup</section> }));
vi.mock("@/components/content/home-footer-art", () => ({ HomeFooterArt: () => <section>Footer artwork</section> }));

function contentBundle(hidden: Record<string, boolean> = {}) {
  return {
    homeProductRows: [],
    homeIntro: [],
    homeCozyMomentsHeader: [],
    homeHeroSlides: [],
    homeSectionVisibility: [{ key: "home.visibility", data: hidden }],
  };
}

describe("public homepage visibility", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAllCollections.mockResolvedValue([]);
    mocks.getProductsForCollection.mockResolvedValue([]);
    mocks.getCozyMomentImages.mockResolvedValue([]);
  });

  it("omits every disabled section and skips its data work", async () => {
    const hidden = Object.fromEntries(HOME_SECTION_DEFINITIONS.map(({ id }) => [id, false]));
    mocks.apiGetContent.mockResolvedValue(contentBundle(hidden));

    const { container } = render(await Home());

    expect(container.querySelector("main")).toBeEmptyDOMElement();
    expect(mocks.getAllCollections).not.toHaveBeenCalled();
    expect(mocks.getProductsForCollection).not.toHaveBeenCalled();
    expect(mocks.getCozyMomentImages).not.toHaveBeenCalled();
  });

  it("keeps legacy behavior visible when the visibility block is missing", async () => {
    mocks.apiGetContent.mockResolvedValue({ ...contentBundle(), homeSectionVisibility: [] });

    render(await Home());

    expect(screen.getByText("Hero carousel")).toBeInTheDocument();
    expect(screen.getByText("Hi Friend!")).toBeInTheDocument();
    expect(screen.getByText("New Release")).toBeInTheDocument();
    expect(screen.getByText("Home video")).toBeInTheDocument();
    expect(screen.getByText("Collection tiles")).toBeInTheDocument();
    expect(screen.getByText("Blog posts")).toBeInTheDocument();
    expect(screen.getByText("Featured On")).toBeInTheDocument();
    expect(screen.getByText("FAQ preview")).toBeInTheDocument();
    expect(screen.getByText("Newsletter signup")).toBeInTheDocument();
    expect(screen.getByText("Footer artwork")).toBeInTheDocument();
  });
});
