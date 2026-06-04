import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { expect, test, type Locator, type Page } from "@playwright/test";

const TOKEN = "fake-admin-token";
const USER = {
  id: "u1",
  email: "admin@joviejoy.com",
  name: "Admin",
  avatarUrl: null,
  isAdmin: true,
};

type Product = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  description: string[];
  priceCents: number;
  compareAtPriceCents: number | null;
  available: boolean;
  productType: "physical" | "digital" | "sticker" | "freebie";
  images: string[];
  options: { name: string; values: string[] }[];
  sourceLinks: { label: string; href: string; image?: string; alt?: string }[] | null;
  reviewImages: string[] | null;
  inspirationImages: string[] | null;
  tags: string[];
  collections: string[];
  publishedAt: string | null;
  pdfPath: string | null;
};

type ProductWriteBody = {
  slug?: string;
  title: string;
  excerpt: string;
  description: string[];
  priceCents: number;
  compareAtPriceCents: number | null;
  available: boolean;
  productType: Product["productType"];
  images: string[];
  sourceLinks: Product["sourceLinks"];
  reviewImages: string[] | null;
  inspirationImages: string[] | null;
  tags: string[];
  collectionSlugs: string[];
  publishedAt?: string | null;
};

const collection = {
  id: "collection-new-release",
  slug: "new-release",
  title: "New Release",
  excerpt: "Freshly published books.",
  heroImage: null,
  defaultSort: "featured",
  homepageSlot: "newrelease",
  productSlugs: [] as string[],
  sortIndex: 0,
};

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, content-type",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  };
}

function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, {
    ...corsHeaders(),
    "Content-Type": "application/json",
  });
  res.end(JSON.stringify(body));
}

function sendText(res: ServerResponse, status: number, body = "") {
  res.writeHead(status, corsHeaders());
  res.end(body);
}

function sendPng(res: ServerResponse) {
  res.writeHead(200, {
    ...corsHeaders(),
    "Content-Type": "image/png",
  });
  res.end(Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=",
    "base64",
  ));
}

async function readBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8");
}

async function readJson<T>(req: IncomingMessage): Promise<T> {
  const body = await readBody(req);
  return body ? JSON.parse(body) as T : {} as T;
}

function isPublished(product: Product): boolean {
  return Boolean(product.publishedAt && Date.parse(product.publishedAt) <= Date.now());
}

function statusFor(product: Product): "published" | "draft" | "scheduled" | "out_of_stock" {
  if (!product.available) return "out_of_stock";
  if (!product.publishedAt) return "draft";
  if (Date.parse(product.publishedAt) > Date.now()) return "scheduled";
  return "published";
}

function adminListItem(product: Product) {
  return {
    slug: product.slug,
    title: product.title,
    excerpt: product.excerpt,
    priceCents: product.priceCents,
    compareAtPriceCents: product.compareAtPriceCents,
    available: product.available,
    productType: product.productType,
    status: statusFor(product),
    tags: product.tags,
    collectionSlugs: product.collections,
    primaryImage: product.images[0] ?? null,
    publishedAt: product.publishedAt,
    updatedAt: new Date().toISOString(),
  };
}

async function brokenImageSources(scope: Page | Locator): Promise<string[]> {
  return scope.locator("img").evaluateAll((imgs) =>
    imgs
      .filter((img): img is HTMLImageElement => img instanceof HTMLImageElement && img.complete && img.naturalWidth === 0)
      .map((img) => img.currentSrc || img.src),
  );
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/[\s-]+/g, "-");
}

function productFromBody(body: ProductWriteBody): Product {
  const slug = body.slug ?? slugify(body.title);
  return {
    id: `product-${slug}`,
    slug,
    title: body.title,
    excerpt: body.excerpt,
    description: body.description,
    priceCents: body.priceCents,
    compareAtPriceCents: body.compareAtPriceCents,
    available: body.available,
    productType: body.productType,
    images: body.images,
    options: [{ name: "Format", values: ["Physical book"] }],
    sourceLinks: body.sourceLinks,
    reviewImages: body.reviewImages,
    inspirationImages: body.inspirationImages,
    tags: body.tags,
    collections: body.collectionSlugs,
    publishedAt: body.publishedAt ?? null,
    pdfPath: null,
  };
}

function contentBundle() {
  const now = new Date().toISOString();
  return {
    homeHero: [],
    aboutSections: [],
    faqs: [],
    featuredOn: [],
    homeVideo: [],
    footerGroups: [],
    announcement: [{ key: "announcement", type: "Announcement", data: { enabled: false, text: "", href: "" }, sortIndex: 0, updatedAt: now }],
    heroArtwork: [],
    navigation: [{ id: "nav-new-release", label: "New Release", href: "/collections/new-release", children: [] }],
    footerLinks: [],
    socialLinks: [],
    trendingTerms: ["cozy"],
    homeIntro: [{
      key: "home.intro",
      type: "HomeIntro",
      data: {
        title: "Hi Friend!",
        body: "A cozy admin workflow fixture.",
        image1: "/uploads/content/missing-home-intro-one.png",
        image2: "/uploads/content/missing-home-intro-two.png",
      },
      sortIndex: 0,
      updatedAt: now,
    }],
    homeCozyMomentsHeader: [{ key: "home.cozy.header", type: "HomeCozyMomentsHeader", data: { heading: "Cozy Moments" }, sortIndex: 0, updatedAt: now }],
    footerContact: [],
    headerBrand: [{ key: "header.brand", type: "HeaderBrand", data: { name: "Zoe&Book", searchPlaceholder: "Search the store" }, sortIndex: 0, updatedAt: now }],
    newsletterCopy: [],
    homeHeroSlides: [{
      key: "home.hero.slides",
      type: "HomeHeroSlides",
      data: {
        intervalMs: 5000,
        slides: [{
          label: "Missing CMS hero",
          href: "/collections/new-release",
          image: "/uploads/content/missing-home-hero.png",
        }],
      },
      sortIndex: 0,
      updatedAt: now,
    }],
    homeProductRows: [
      {
        key: "home.row.new-release",
        type: "HomeProductRow",
        data: { eyebrow: "Just published", title: "New Release", href: "/collections/new-release", collectionSlug: "new-release", itemCount: 4 },
        sortIndex: 0,
        updatedAt: now,
      },
      {
        key: "home.row.best-seller",
        type: "HomeProductRow",
        data: { eyebrow: "Popular products", title: "Best Seller", href: "/collections/frontpage", collectionSlug: "frontpage", itemCount: 4 },
        sortIndex: 1,
        updatedAt: now,
      },
      {
        key: "home.row.digital",
        type: "HomeProductRow",
        data: { eyebrow: "Digital books", title: "Digital", href: "/collections/digital", collectionSlug: "digital", itemCount: 4 },
        sortIndex: 2,
        updatedAt: now,
      },
    ],
  };
}

async function startMockApi() {
  const products = new Map<string, Product>();
  const server = createServer(async (req, res) => {
    try {
      if (!req.url) {
        sendText(res, 404);
        return;
      }
      if (req.method === "OPTIONS") {
        sendText(res, 204);
        return;
      }

      const url = new URL(req.url, "http://localhost:8080");
      const method = req.method ?? "GET";
      const segments = url.pathname.split("/").filter(Boolean);

      if (method === "POST" && url.pathname === "/auth/admin/login") {
        sendJson(res, 200, { token: TOKEN, user: USER });
        return;
      }
      if (method === "GET" && url.pathname === "/auth/me") {
        sendJson(res, 200, USER);
        return;
      }
      if (method === "GET" && url.pathname === "/api/content") {
        sendJson(res, 200, contentBundle());
        return;
      }
      if (method === "GET" && url.pathname === "/api/gallery") {
        sendJson(res, 200, [
          { id: "gallery-one", src: "/uploads/gallery/fallback-one.png", alt: "Gallery fallback one", sortIndex: 0 },
          { id: "gallery-two", src: "/uploads/gallery/fallback-two.png", alt: "Gallery fallback two", sortIndex: 1 },
        ]);
        return;
      }
      if (method === "GET" && ["/api/blogs", "/api/faqs", "/api/comics", "/api/about"].includes(url.pathname)) {
        sendJson(res, 200, []);
        return;
      }
      if (method === "HEAD" && url.pathname.startsWith("/uploads/content/missing-")) {
        sendText(res, 404);
        return;
      }
      if (method === "GET" && url.pathname.includes("missing-public-cover.png")) {
        sendText(res, 404, "missing");
        return;
      }
      if (method === "GET" && url.pathname.startsWith("/uploads/products/")) {
        sendPng(res);
        return;
      }
      if (method === "GET" && url.pathname.startsWith("/uploads/gallery/")) {
        sendPng(res);
        return;
      }
      if (method === "HEAD" && url.pathname.startsWith("/uploads/gallery/")) {
        res.writeHead(200, {
          ...corsHeaders(),
          "Content-Type": "image/png",
        });
        res.end();
        return;
      }
      if (method === "GET" && url.pathname.startsWith("/api/pages/")) {
        sendJson(res, 200, { slug: segments.at(-1), title: "Page", intro: "", blocks: [] });
        return;
      }
      if (method === "GET" && url.pathname === "/api/admin/collections") {
        sendJson(res, 200, [collection]);
        return;
      }
      if (method === "GET" && url.pathname === "/api/admin/products/tags") {
        sendJson(res, 200, ["cozy", "workflow"]);
        return;
      }
      if (method === "GET" && url.pathname === "/api/admin/products") {
        const q = (url.searchParams.get("q") ?? "").toLowerCase();
        const items = Array.from(products.values())
          .filter((product) => !q || product.title.toLowerCase().includes(q) || product.slug.includes(q))
          .map(adminListItem);
        sendJson(res, 200, { items, total: items.length, page: 1, pageSize: 25 });
        return;
      }
      if (method === "POST" && url.pathname === "/api/admin/products") {
        const body = await readJson<ProductWriteBody>(req);
        const product = productFromBody(body);
        products.set(product.slug, product);
        collection.productSlugs = product.collections.includes(collection.slug) ? [product.slug] : [];
        sendJson(res, 201, product);
        return;
      }
      if (segments[0] === "api" && segments[1] === "admin" && segments[2] === "products" && segments[3]) {
        const slug = segments[3];
        const product = products.get(slug);
        if (!product) {
          sendText(res, 404);
          return;
        }
        if (method === "GET" && segments.length === 4) {
          sendJson(res, 200, product);
          return;
        }
        if (method === "PUT" && segments.length === 4) {
          const body = await readJson<ProductWriteBody>(req);
          const updated = { ...productFromBody({ ...body, slug }), id: product.id };
          products.set(slug, updated);
          collection.productSlugs = updated.collections.includes(collection.slug) ? [slug] : [];
          sendJson(res, 200, updated);
          return;
        }
        if (method === "POST" && segments[4] === "images") {
          await readBody(req);
          const urlPath = `/uploads/products/${slug}/admin-workflow-cover.png`;
          const updated = { ...product, images: [...product.images, urlPath] };
          products.set(slug, updated);
          sendJson(res, 200, { url: urlPath });
          return;
        }
      }
      if (method === "GET" && url.pathname === "/api/collections") {
        sendJson(res, 200, [collection]);
        return;
      }
      if (method === "GET" && segments[0] === "api" && segments[1] === "collections" && segments[2]) {
        const slug = segments[2];
        const publicProducts = Array.from(products.values()).filter((product) =>
          product.collections.includes(slug) && isPublished(product)
        );
        sendJson(res, 200, {
          collection: { ...collection, slug, productSlugs: publicProducts.map((product) => product.slug) },
          products: publicProducts,
        });
        return;
      }
      if (method === "GET" && url.pathname === "/api/products") {
        const collectionSlug = url.searchParams.get("collection");
        const publicProducts = Array.from(products.values()).filter((product) =>
          isPublished(product) && (!collectionSlug || product.collections.includes(collectionSlug))
        );
        sendJson(res, 200, publicProducts);
        return;
      }
      if (method === "GET" && segments[0] === "api" && segments[1] === "products" && segments[2]) {
        const product = products.get(segments[2]);
        if (!product || !isPublished(product)) {
          sendText(res, 404);
          return;
        }
        sendJson(res, 200, product);
        return;
      }

      sendText(res, 404);
    } catch (error) {
      sendJson(res, 500, { error: error instanceof Error ? error.message : "Mock API failed" });
    }
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(8080, () => {
      server.off("error", reject);
      resolve();
    });
  });

  return { server, products };
}

async function stopServer(server: Server) {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
}

test.describe("admin product changes reach the storefront", () => {
  test.describe.configure({ mode: "serial" });

  let mock: Awaited<ReturnType<typeof startMockApi>>;

  test.beforeAll(async () => {
    mock = await startMockApi();
  });

  test.afterAll(async () => {
    await stopServer(mock.server);
  });

  test("creates, uploads, publishes, and renders a product on the homepage", async ({ page }) => {
    const title = "Admin Workflow E2E Book";
    const slug = slugify(title);
    const imageUrl = `http://localhost:8080/uploads/products/${slug}/admin-workflow-cover.png`;

    await page.goto("/admin/login");
    await page.getByLabel("Email").fill(USER.email);
    await page.getByLabel("Password").fill("anything");
    await page.locator('button[type="submit"]', { hasText: /sign in/i }).click();
    await page.waitForURL((url) => /\/admin(\/|$)/.test(url.pathname) && !url.pathname.startsWith("/admin/login"));

    await page.goto("/admin/products/new");
    await page.locator("#pf-title").fill(title);
    await page.locator("#pf-excerpt").fill("A product that proves admin changes reach the storefront.");
    await page.locator("#pf-description").fill("A calm test product.\n\nIt should be visible only after publishing.");
    await page.locator("#pf-price").fill("12.50");
    await page.getByRole("button", { name: "+ New Release" }).click();

    await page.getByRole("button", { name: /create product/i }).click();
    await expect(page).toHaveURL(new RegExp(`/admin/products/${slug}$`), { timeout: 15_000 });
    await expect(page.getByText("Draft").first()).toBeVisible();

    await page.goto("/");
    await expect(page.getByLabel("Missing CMS hero")).toHaveCount(0);
    await expect(page.locator('img[src*="missing-home"], img[srcset*="missing-home"]')).toHaveCount(0);
    expect(await page.locator('img[src*="fallback-one"]').count()).toBeGreaterThan(0);
    expect(await page.locator('img[src*="fallback-two"]').count()).toBeGreaterThan(0);
    await expect(page.getByTestId("product-card").filter({ hasText: title })).toHaveCount(0);

    await page.goto(`/admin/products/${slug}`);
    const chooserPromise = page.waitForEvent("filechooser");
    await page.getByRole("button", { name: /upload images/i }).first().click();
    const chooser = await chooserPromise;
    await chooser.setFiles({
      name: "admin-workflow-cover.png",
      mimeType: "image/png",
      buffer: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=",
        "base64",
      ),
    });
    await expect(page.locator(".admin-gallery-thumb img").first()).toHaveAttribute("src", imageUrl);

    await page.getByRole("switch", { name: /published/i }).click();
    const updateRequest = page.waitForRequest((request) =>
      request.method() === "PUT" && request.url().includes(`/api/admin/products/${slug}`),
    );
    await page.getByRole("button", { name: /save changes/i }).click();
    const updateBody = (await updateRequest).postDataJSON() as ProductWriteBody;
    expect(updateBody.images).toEqual([`/uploads/products/${slug}/admin-workflow-cover.png`]);
    expect(updateBody.collectionSlugs).toContain("new-release");
    expect(updateBody.publishedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    await expect(page.getByText("Published").first()).toBeVisible();

    await page.goto("/admin/products");
    const adminRow = page.locator("tbody tr", { hasText: title });
    await expect(adminRow).toBeVisible();
    await expect(adminRow.locator("img")).toHaveAttribute("src", imageUrl);

    await page.goto("/");
    const card = page.getByTestId("product-card").filter({ hasText: title });
    await expect(card).toBeVisible();
    await expect(card.locator("img").first()).toHaveAttribute(
      "src",
      /localhost%3A8080%2Fuploads%2Fproducts%2Fadmin-workflow-e2e-book%2Fadmin-workflow-cover\.png/,
    );

    await card.getByLabel(title, { exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/products/${slug}$`));
    await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
    await expect(page.getByRole("button", { name: /add to cart/i })).toBeVisible();
    await expect(page.locator("section[aria-label$='media gallery'] img").first()).toHaveAttribute(
      "src",
      /localhost%3A8080%2Fuploads%2Fproducts%2Fadmin-workflow-e2e-book%2Fadmin-workflow-cover\.png/,
    );

    expect(mock.products.get(slug)?.publishedAt).toBeTruthy();
  });

  test("storefront product cards and galleries replace missing uploaded images with placeholders", async ({ page }) => {
    const slug = "missing-public-image-book";
    const title = "Missing Public Image Book";
    mock.products.set(slug, {
      id: `product-${slug}`,
      slug,
      title,
      excerpt: "Published product with an upload path whose file is gone.",
      description: ["The product should still render without a broken image."],
      priceCents: 900,
      compareAtPriceCents: null,
      available: true,
      productType: "physical",
      images: ["/uploads/products/missing-public-cover.png"],
      options: [{ name: "Format", values: ["Physical book"] }],
      sourceLinks: null,
      reviewImages: null,
      inspirationImages: null,
      tags: ["missing"],
      collections: ["new-release"],
      publishedAt: new Date().toISOString(),
      pdfPath: null,
    });

    await page.goto("/collections/new-release");
    const card = page.getByTestId("product-card").filter({ hasText: title });
    await expect(card).toBeVisible();
    await expect(card.getByText("Image unavailable").first()).toBeVisible();
    await expect(card.locator('img[src*="missing-public-cover"]')).toHaveCount(0);
    await expect.poll(() => brokenImageSources(card)).toEqual([]);

    await card.getByLabel(title, { exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/products/${slug}$`));
    await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
    const gallery = page.getByLabel(`${title} media gallery`);
    await expect(gallery.getByText("Image unavailable").first()).toBeVisible();
    await expect(page.locator('img[src*="missing-public-cover"]')).toHaveCount(0);
    await expect.poll(() => brokenImageSources(gallery)).toEqual([]);
  });
});
