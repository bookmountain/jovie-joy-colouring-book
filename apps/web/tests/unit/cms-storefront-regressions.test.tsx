import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AnnouncementBar } from "@/components/layout/announcement-bar";
import { CollectionTiles } from "@/components/content/collection-tiles";
import { Header } from "@/components/layout/header";
import { SearchDrawer } from "@/components/overlays/search-drawer";
import CollectionsPage from "@/app/(public)/collections/page";
import CollectionPage from "@/app/(public)/collections/[slug]/page";
import StaticPage from "@/app/(public)/pages/[slug]/page";
import { BundleProvider } from "@/state/catalog-provider";
import { SiteProvider, useSite } from "@/state/site-store";
import type { SiteContentBundle } from "@/lib/api";

const mocks = vi.hoisted(() => ({
  apiGetContent: vi.fn(),
  fetchCatalog: vi.fn(),
  fetchCurrentUser: vi.fn(),
  getAllCollections: vi.fn(),
  getCollectionBySlug: vi.fn(),
  getPopularProducts: vi.fn(),
  getProductsForCollection: vi.fn(),
  getStaticPage: vi.fn(),
  listFreebies: vi.fn(),
  notFound: vi.fn(),
}));

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return { ...actual, apiGetContent: mocks.apiGetContent };
});

vi.mock("@/lib/catalog", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/catalog")>();
  return {
    ...actual,
    fetchCatalog: mocks.fetchCatalog,
    getCollectionBySlug: mocks.getCollectionBySlug,
    getPopularProducts: mocks.getPopularProducts,
    getProductsForCollection: mocks.getProductsForCollection,
  };
});

vi.mock("@/data/collections", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/data/collections")>();
  return { ...actual, getAllCollections: mocks.getAllCollections };
});

vi.mock("@/lib/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth")>();
  return { ...actual, fetchCurrentUser: mocks.fetchCurrentUser };
});

vi.mock("@/data/content", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/data/content")>();
  return { ...actual, getStaticPage: mocks.getStaticPage };
});

vi.mock("@/lib/freebies", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/freebies")>();
  return { ...actual, listFreebies: mocks.listFreebies };
});

vi.mock("next/navigation", () => ({
  notFound: mocks.notFound,
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("@/components/layout/breadcrumbs", () => ({ Breadcrumbs: () => <nav>Breadcrumbs</nav> }));
vi.mock("@/components/common/SafeImage", () => ({
  SafeImage: ({ src }: { src: string }) => <span aria-label={`Image: ${src}`} data-image-src={src} role="img" />,
}));
vi.mock("@/components/content/about-page", () => ({ AboutPage: () => <section>About sections</section> }));
vi.mock("@/components/content/comics-page", () => ({ ComicsPage: () => <section>Comic worlds</section> }));
vi.mock("@/components/content/faq-accordion", () => ({ FaqAccordion: () => <section>FAQ entries</section> }));
vi.mock("@/components/content/gallery-grid", () => ({ GalleryGrid: () => <section>Gallery images</section> }));
vi.mock("@/components/commerce/collection-toolbar", () => ({
  CollectionToolbar: () => <section>Collection toolbar</section>,
}));
vi.mock("@/components/commerce/product-grid", () => ({ ProductGrid: () => <section>Product grid</section> }));
vi.mock("@/components/storefront/FreebieGrid", () => ({ FreebieGrid: () => <section>Freebie cards</section> }));

function bundle(overrides: Partial<SiteContentBundle> = {}): SiteContentBundle {
  return {
    homeHero: [],
    aboutSections: [],
    faqs: [],
    featuredOn: [],
    homeVideo: [],
    footerGroups: [],
    announcement: [],
    heroArtwork: [],
    navigation: [],
    footerLinks: [],
    socialLinks: [],
    trendingTerms: [],
    homeIntro: [],
    homeCozyMomentsHeader: [],
    footerContact: [],
    headerBrand: [],
    newsletterCopy: [],
    homeHeroSlides: [],
    homeProductRows: [],
    ...overrides,
  };
}

function OpenSearchHarness() {
  const { dispatch } = useSite();

  return (
    <>
      <button onClick={() => dispatch({ type: "drawer/open", drawer: "search" })} type="button">
        Open search
      </button>
      <SearchDrawer />
    </>
  );
}

describe("CMS storefront regressions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    mocks.fetchCatalog.mockResolvedValue([]);
    mocks.apiGetContent.mockResolvedValue(bundle());
    mocks.fetchCurrentUser.mockResolvedValue(null);
    mocks.getAllCollections.mockResolvedValue([]);
    mocks.getCollectionBySlug.mockResolvedValue(undefined);
    mocks.getPopularProducts.mockResolvedValue([]);
    mocks.getProductsForCollection.mockResolvedValue([]);
    mocks.listFreebies.mockResolvedValue([]);
  });

  describe("AnnouncementBar", () => {
    it("renders no bar when the CMS block exists but is disabled", () => {
      const { container } = render(
        <BundleProvider
          bundle={bundle({
            announcement: [{
              key: "announcement.bar",
              type: "Announcement",
              data: { enabled: false, text: "Hidden promotion", href: "/sale" },
              sortIndex: 0,
              updatedAt: "2026-08-12T00:00:00Z",
            }],
          })}
        >
          <AnnouncementBar />
        </BundleProvider>,
      );

      expect(container.firstChild).toBeNull();
      expect(screen.queryByText("Hidden promotion")).not.toBeInTheDocument();
      expect(screen.queryByText("Welcome to cozy world")).not.toBeInTheDocument();
    });

    it("retains the welcome fallback when no announcement block exists", () => {
      render(
        <BundleProvider bundle={bundle()}>
          <AnnouncementBar />
        </BundleProvider>,
      );

      expect(screen.getByText("Welcome to cozy world")).toBeInTheDocument();
    });
  });

  it("uses the bundled search placeholder and trending terms without fetching content again", async () => {
    render(
      <BundleProvider
        bundle={bundle({
          headerBrand: [{
            key: "header.brand",
            type: "HeaderBrand",
            data: { name: "Jovie & Joy", searchPlaceholder: "Find a cosy book" },
            sortIndex: 0,
            updatedAt: "2026-08-12T00:00:00Z",
          }],
          trendingTerms: ["Animals", "Rainy days"],
        })}
      >
        <SiteProvider>
          <main>Storefront</main>
          <OpenSearchHarness />
        </SiteProvider>
      </BundleProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Open search" }));

    const input = await screen.findByPlaceholderText("Find a cosy book");
    expect(screen.getByRole("button", { name: "Animals" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Rainy days" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Rainy days" }));
    expect(input).toHaveValue("Rainy days");

    await waitFor(() => {
      expect(mocks.fetchCatalog).toHaveBeenCalledTimes(1);
      expect(mocks.getPopularProducts).toHaveBeenCalledTimes(1);
    });
    expect(mocks.apiGetContent).not.toHaveBeenCalled();
  });

  it("builds home collection tiles from the CMS tile slot and prefers each collection hero image", async () => {
    mocks.getAllCollections.mockResolvedValue([
      {
        id: "configured-id",
        slug: "configured-tile",
        title: "Configured tile",
        excerpt: "Selected by the CMS slot",
        heroImage: "/uploads/configured-hero.png",
        defaultSort: "featured",
        homepageSlot: "tile",
        productSlugs: ["configured-product"],
        sortIndex: 1,
      },
      {
        id: "legacy-id",
        slug: "bold-easy",
        title: "Legacy hard-coded tile",
        excerpt: "Must not render when a CMS tile is configured",
        heroImage: "/uploads/legacy-hero.png",
        defaultSort: "featured",
        homepageSlot: null,
        productSlugs: ["legacy-product"],
        sortIndex: 2,
      },
    ]);
    mocks.getProductsForCollection.mockResolvedValue([{ images: ["/uploads/product-fallback.png"] }]);

    render(await CollectionTiles());

    expect(screen.getByRole("heading", { name: "Configured tile" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Legacy hard-coded tile" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Configured tile/ })).toHaveAttribute("href", "/collections/configured-tile");
    expect(screen.getByRole("img", { name: /configured-hero\.png/ })).toHaveAttribute(
      "data-image-src",
      expect.stringMatching(/\/uploads\/configured-hero\.png$/),
    );
    expect(mocks.getProductsForCollection).toHaveBeenCalledTimes(1);
    expect(mocks.getProductsForCollection).toHaveBeenCalledWith("configured-tile");
  });

  it("uses a collection hero image instead of its first product image on the public Collections page", async () => {
    mocks.getAllCollections.mockResolvedValue([
      {
        id: "all-id",
        slug: "all",
        title: "All",
        excerpt: "Hidden aggregate",
        heroImage: null,
        defaultSort: "featured",
        homepageSlot: null,
        productSlugs: [],
        sortIndex: 0,
      },
      {
        id: "collection-id",
        slug: "cosy-books",
        title: "Cosy books",
        excerpt: "A CMS-managed collection",
        heroImage: "/uploads/collections-hero.png",
        defaultSort: "featured",
        homepageSlot: null,
        productSlugs: ["cosy-product"],
        sortIndex: 1,
      },
    ]);
    mocks.getProductsForCollection.mockResolvedValue([{ images: ["/uploads/first-product.png"] }]);

    render(await CollectionsPage());

    expect(screen.queryByRole("heading", { name: "All" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Cosy books" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /collections-hero\.png/ })).toHaveAttribute(
      "data-image-src",
      expect.stringMatching(/\/uploads\/collections-hero\.png$/),
    );
    expect(screen.queryByRole("img", { name: /first-product\.png/ })).not.toBeInTheDocument();
    expect(mocks.getProductsForCollection).toHaveBeenCalledTimes(1);
    expect(mocks.getProductsForCollection).toHaveBeenCalledWith("cosy-books");
  });

  it.each([
    ["/uploads/detail-hero.png", true],
    [null, false],
  ])("renders the collection detail hero only when heroImage is %s", async (heroImage, shouldRender) => {
    mocks.getCollectionBySlug.mockResolvedValue({
      id: "detail-id",
      slug: "detail-collection",
      title: "Detail collection",
      excerpt: "Collection detail copy",
      heroImage,
      defaultSort: "featured",
      homepageSlot: null,
      productSlugs: [],
      sortIndex: 1,
    });

    const page = await CollectionPage({
      params: Promise.resolve({ slug: "detail-collection" }),
    });
    render(page);

    const hero = screen.queryByRole("img", { name: /detail-hero\.png/ });
    if (shouldRender) {
      expect(hero).toHaveAttribute("data-image-src", expect.stringMatching(/\/uploads\/detail-hero\.png$/));
    } else {
      expect(hero).not.toBeInTheDocument();
      expect(screen.queryByRole("img")).not.toBeInTheDocument();
    }
    expect(screen.getByRole("heading", { name: "Detail collection" })).toBeInTheDocument();
  });

  it("uses the CMS brand as the logo links' accessible name and exposes one logged-out Sign in control", async () => {
    render(
      <BundleProvider
        bundle={bundle({
          headerBrand: [{
            key: "header.brand",
            type: "HeaderBrand",
            data: { name: "Jovie & Joy CMS", searchPlaceholder: "Find a book" },
            sortIndex: 0,
            updatedAt: "2026-08-12T00:00:00Z",
          }],
        })}
      >
        <SiteProvider>
          <Header />
        </SiteProvider>
      </BundleProvider>,
    );

    await waitFor(() => {
      expect(screen.getAllByRole("button", { name: "Sign in" })).toHaveLength(1);
    });
    const brandLinks = screen.getAllByRole("link", { name: "Jovie & Joy CMS" });
    expect(brandLinks).toHaveLength(2);
    for (const brandLink of brandLinks) {
      expect(brandLink).toHaveAttribute("href", "/");
    }
    expect(screen.queryByRole("link", { name: "Zoe&Book" })).not.toBeInTheDocument();
    expect(mocks.fetchCurrentUser).toHaveBeenCalledTimes(1);
  });

  it("hides disabled header branches and renders all three levels in the mobile menu", async () => {
    render(
      <BundleProvider
        bundle={bundle({
          navigation: [
            {
              id: "products",
              label: "Products",
              href: "/products",
              enabled: true,
              children: [{
                id: "physical",
                label: "Physical books",
                href: "/collections/physical-books",
                enabled: true,
                children: [{
                  id: "paperback",
                  label: "Paperback",
                  href: "/collections/paperback",
                  enabled: true,
                  children: [],
                }],
              }],
            },
            {
              id: "gallery",
              label: "Gallery",
              href: "/pages/gallery",
              enabled: false,
              children: [],
            },
          ],
        })}
      >
        <SiteProvider>
          <Header />
        </SiteProvider>
      </BundleProvider>,
    );

    await waitFor(() => expect(mocks.fetchCurrentUser).toHaveBeenCalled());
    expect(screen.queryByRole("link", { name: "Gallery" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Open menu" }));
    const menu = screen.getByText("Menu").closest("aside");
    expect(menu).not.toBeNull();
    expect(within(menu!).getByRole("link", { name: "Products" })).toBeInTheDocument();
    expect(within(menu!).getByRole("link", { name: "Physical books" })).toBeInTheDocument();
    expect(within(menu!).getByRole("link", { name: "Paperback" })).toBeInTheDocument();
    expect(within(menu!).queryByRole("link", { name: "Gallery" })).not.toBeInTheDocument();
  });

  it.each([
    ["about-us", "About sections"],
    ["comics", "Comic worlds"],
    ["gallery", "Gallery images"],
    ["faq", "FAQ entries"],
    ["freebies", "Freebie cards"],
  ])("renders CMS body blocks on the special %s page", async (slug, specialContent) => {
    mocks.getStaticPage.mockResolvedValue({
      slug,
      title: `${slug} title`,
      intro: `${slug} intro`,
      blocks: ["First CMS paragraph", "Second CMS paragraph"],
    });

    const page = await StaticPage({
      params: Promise.resolve({ slug }),
    });
    render(page);

    expect(screen.getByText("First CMS paragraph")).toBeInTheDocument();
    expect(screen.getByText("Second CMS paragraph")).toBeInTheDocument();
    expect(screen.getByText(specialContent)).toBeInTheDocument();
  });
});
