import { expect, test, type Page } from "@playwright/test";

const TOKEN = "fake-admin-token";
const USER = {
  id: "u1",
  email: "admin@joviejoy.com",
  name: "Admin",
  avatarUrl: null,
  isAdmin: true,
};

/** Minimal Product shape returned by the BE after create/update. */
function makeProduct(overrides: Partial<{
  slug: string;
  title: string;
  productType: string;
  priceCents: number;
  available: boolean;
  publishedAt: string | null;
}> = {}) {
  const slug = overrides.slug ?? "crm-test-product";
  return {
    id: "prod-001",
    slug,
    title: overrides.title ?? "CRM Test Product",
    excerpt: "Smoke product for CRM test.",
    description: ["Body paragraph one.", "Body paragraph two."],
    priceCents: overrides.priceCents ?? 499,
    compareAtPriceCents: null,
    available: overrides.available ?? true,
    productType: overrides.productType ?? "physical",
    images: [],
    options: [],
    sourceLinks: null,
    reviewImages: null,
    inspirationImages: null,
    tags: [],
    collections: [],
    publishedAt: overrides.publishedAt ?? null,
    pdfPath: null,
  };
}

/** Minimal AdminProductListItem shape used by the list page. */
function makeListItem(overrides: Partial<{
  slug: string;
  title: string;
  productType: string;
  priceCents: number;
  status: string;
  primaryImage: string | null;
}> = {}) {
  return {
    slug: overrides.slug ?? "cozy-book",
    title: overrides.title ?? "Cozy Colouring Book",
    excerpt: "A cozy book.",
    priceCents: overrides.priceCents ?? 1299,
    compareAtPriceCents: null,
    available: true,
    productType: overrides.productType ?? "physical",
    status: overrides.status ?? "published",
    tags: ["cozy"],
    collectionSlugs: [],
    primaryImage: overrides.primaryImage ?? null,
    publishedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/** Register the auth routes every test needs. */
function mockAuth(page: Page) {
  page.route("**/auth/admin/login", (r) =>
    r.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ token: TOKEN, user: USER }),
    }),
  );
  page.route("**/auth/me", (r) =>
    r.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(USER),
    }),
  );
}

test.describe("admin product CRM", () => {
  test.beforeEach(async ({ page }) => {
    mockAuth(page);
    await page.goto("/admin/login");
    await page.getByLabel("Email").fill("admin@joviejoy.com");
    await page.getByLabel("Password").fill("anything");
    await page.locator('button[type="submit"]', { hasText: /sign in/i }).click();
    await page.waitForURL(
      (u) => !u.pathname.startsWith("/admin/login") && /\/admin(\/|$)/.test(u.pathname),
      { timeout: 60_000 },
    );
  });

  // ---------------------------------------------------------------------------
  // Test 1: create a digital product end-to-end
  // ---------------------------------------------------------------------------
  test("creates a digital product end-to-end with all field types", async ({ page }) => {
    const stamp = Date.now();
    const slug = `crm-test-${stamp}`;
    const createdProduct = makeProduct({
      slug,
      title: `CRM Test ${stamp}`,
      productType: "digital",
      priceCents: 499,
      publishedAt: null, // starts as draft
    });
    const publishedProduct = { ...createdProduct, publishedAt: new Date().toISOString() };

    // --- mock collections (sidebar needs this) ---
    await page.route("**/api/admin/collections", (r) =>
      r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) }),
    );

    // --- mock the POST /api/admin/products (create) ---
    await page.route("**/api/admin/products", async (r) => {
      if (r.request().method() === "POST") {
        await r.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify(createdProduct),
        });
      } else {
        // GET list — shouldn't be called on the new-product page but guard anyway
        await r.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ items: [], total: 0, page: 1, pageSize: 25 }),
        });
      }
    });

    // --- mock the GET + PUT for the edit page that /admin/products/new redirects to ---
    await page.route(`**/api/admin/products/${slug}`, async (r) => {
      if (r.request().method() === "GET") {
        await r.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(createdProduct),
        });
      } else if (r.request().method() === "PUT") {
        const body = r.request().postDataJSON();
        await r.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ ...publishedProduct, publishedAt: body.publishedAt }),
        });
      }
    });

    await page.goto("/admin/products/new");

    // Fill basics
    await page.locator("#pf-title").fill(`CRM Test ${stamp}`);
    await page.locator("#pf-excerpt").fill("Smoke product for CRM test.");
    await page.locator("#pf-description").fill("Body paragraph one.\n\nBody paragraph two.");

    // Switch format to digital — AdminFormatPicker renders role="radio" buttons
    await page.getByRole("radio", { name: /digital pdf/i }).click();
    // Digital fulfillment panel should now be visible
    await expect(page.getByText(/digital fulfillment/i)).toBeVisible();

    // Fill price
    await page.locator("#pf-price").fill("4.99");

    // Submit — label is "Create product"
    await page.getByRole("button", { name: /create product/i }).click();

    // After create the router pushes to /admin/products/<slug>
    await expect(page).toHaveURL(new RegExp(`/admin/products/${slug}$`), { timeout: 15_000 });

    // Status badge should show "Draft" (publishedAt is null)
    await expect(page.getByText("Draft").first()).toBeVisible();

    // Now flip Published switch → ON to set publishedAt
    await page.getByRole("switch", { name: /published/i }).click();

    // Submit the edit
    const updateRequest = page.waitForRequest((request) =>
      request.method() === "PUT" && request.url().includes(`/api/admin/products/${slug}`),
    );
    await page.getByRole("button", { name: /save changes/i }).click();
    const updatePayload = (await updateRequest).postDataJSON();
    expect(updatePayload.publishedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    // After update the badge should update to "Published"
    await expect(page.getByText("Published").first()).toBeVisible({ timeout: 10_000 });
  });

  // ---------------------------------------------------------------------------
  // Test 2: list page — thumbnail, search, row selection, bulk unpublish
  // ---------------------------------------------------------------------------
  test("list page row controls stay on list, show uploaded thumbnails, and support bulk unpublish", async ({ page }) => {
    const cozyItem = makeListItem({
      slug: "cozy-book",
      title: "Cozy Colouring Book",
      status: "published",
      primaryImage: "/uploads/products/cozy-cover.png",
    });
    const listResponse = JSON.stringify({ items: [cozyItem], total: 1, page: 1, pageSize: 25 });

    // Wildcard matches the paginated list endpoint but NOT /bulk or /tags paths
    await page.route(/\/api\/admin\/products\?/, async (r) => {
      await r.fulfill({
        status: 200,
        contentType: "application/json",
        body: listResponse,
      });
    });
    await page.route("**/api/admin/collections", (r) =>
      r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) }),
    );
    await page.route("**/api/admin/products/tags", (r) =>
      r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(["cozy"]) }),
    );
    await page.route("**/api/admin/products/bulk", async (r) => {
      await r.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ updated: 1 }),
      });
    });

    await page.goto("/admin/products");
    await expect(page.getByRole("heading", { level: 1, name: "Products" })).toBeVisible();
    await expect(page.locator("tbody img")).toHaveAttribute(
      "src",
      "http://localhost:8080/uploads/products/cozy-cover.png",
    );

    // Search — wait for the debounced query to fire
    await page.getByPlaceholder(/search/i).fill("cozy");
    await page.waitForResponse(/\/api\/admin\/products\?/);

    // Select first data row checkbox (index 0 is the "select all" header checkbox)
    const checkboxes = page.locator('[role="checkbox"]');
    await checkboxes.nth(1).click();

    // Bulk bar should now show "1 selected"
    await expect(page.getByText("1 selected")).toBeVisible();
    await expect(page).toHaveURL(/\/admin\/products$/);

    // Click Unpublish in the bulk bar; wait for the bulk POST to settle
    const bulkDone = page.waitForResponse(/\/api\/admin\/products\/bulk/);
    await page.getByRole("button", { name: /^unpublish$/i }).click();
    await bulkDone;
  });

  // ---------------------------------------------------------------------------
  // Test 3: format toggle physical ↔ digital on edit page
  // ---------------------------------------------------------------------------
  test("switching format physical ↔ digital toggles the digital fulfillment panel", async ({
    page,
  }) => {
    const physicalProduct = makeProduct({ slug: "sample-physical", productType: "physical" });
    const digitalProduct = { ...physicalProduct, productType: "digital" };

    await page.route("**/api/admin/collections", (r) =>
      r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) }),
    );
    await page.route("**/api/admin/products/sample-physical", async (r) => {
      if (r.request().method() === "PUT") {
        await r.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(digitalProduct),
        });
      } else {
        await r.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(physicalProduct),
        });
      }
    });

    await page.goto("/admin/products/sample-physical");
    // Should start as physical — digital fulfillment panel should NOT be visible
    await expect(page.getByText(/digital fulfillment/i)).not.toBeVisible();

    // Switch to digital format
    await page.getByRole("radio", { name: /digital pdf/i }).click();
    await expect(page.getByText(/digital fulfillment/i)).toBeVisible();

    // Switch back to physical
    await page.getByRole("radio", { name: /physical book/i }).click();
    await expect(page.getByText(/digital fulfillment/i)).not.toBeVisible();
  });
});
