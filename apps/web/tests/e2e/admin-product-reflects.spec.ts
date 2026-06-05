import { test, expect, type Page } from "@playwright/test";

// REAL end-to-end integration flow (no API mocking): requires the seeded .NET API
// running on :8080 plus the Playwright webServer (Next on :3100). Proves an admin
// product publish/unpublish persists and reflects on the storefront immediately,
// on its OWN throwaway product so it never mutates seed data.
//
// This is the flow that broke in production: a publish save 500'd (Npgsql rejected
// a bare-date publishedAt) and nothing in the mocked/in-memory suites caught it.
//
// Gated behind E2E_REAL_STACK because the rest of the e2e suite runs WITHOUT an
// external API. Run explicitly against the live stack:
//   E2E_REAL_STACK=1 npx playwright test admin-product-reflects
test.skip(!process.env.E2E_REAL_STACK, "requires the real local stack (API on :8080) — set E2E_REAL_STACK=1");

const ADMIN_EMAIL = "admin@joviejoy.com";
const ADMIN_PASSWORD = "changeme123";

async function login(page: Page) {
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill(ADMIN_EMAIL);
  await page.getByLabel("Password").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/admin/login") && /\/admin(\/|$)/.test(u.pathname));
}

test("admin publish of a product reflects on the storefront immediately, then unpublish hides it", async ({ page }) => {
  const stamp = Date.now();
  const title = `E2E Reflect Product ${stamp}`;
  const slug = `e2e-reflect-product-${stamp}`;
  const today = new Date().toISOString().slice(0, 10);

  await login(page);
  await page.goto("/admin/products/new");

  // Fill the required fields. Typing the title auto-derives the slug.
  await page.locator("#pf-title").fill(title);
  await page.locator("#pf-excerpt").fill("Throwaway product for the reflect e2e.");
  await page.locator("#pf-description").fill("Body paragraph one.\n\nBody paragraph two.");
  await page.locator("#pf-price").fill("9.00");
  // Publish by setting today's date.
  await page.locator("#pf-published").fill(today);

  const [createResp] = await Promise.all([
    page.waitForResponse(
      (r) => r.url().endsWith("/api/admin/products") && r.request().method() === "POST",
    ),
    page.getByRole("button", { name: /create product/i }).click(),
  ]);
  expect(createResp.ok()).toBeTruthy(); // 201 Created — the bug made this a 500
  await expect(page.getByText(/product saved/i)).toBeVisible();
  // New-product page redirects to the edit page on success.
  await page.waitForURL(`**/admin/products/${slug}`);

  // Storefront: the product appears on the /products listing...
  await page.goto("/products?pageSize=50");
  await expect(page.getByRole("link", { name: title })).toBeVisible({ timeout: 20000 });

  // ...and its detail page renders, with the Products breadcrumb crumb.
  await page.goto(`/products/${slug}`);
  await expect(page.getByRole("heading", { name: title, level: 1 })).toBeVisible({ timeout: 20000 });
  await expect(page.getByRole("link", { name: "Products" })).toHaveAttribute("href", "/products");

  // Unpublish in admin: toggle the Published switch off and save.
  await page.goto(`/admin/products/${slug}`);
  await page.getByRole("switch", { name: "Published" }).click();
  const [updateResp] = await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes(`/api/admin/products/${slug}`) && r.request().method() === "PUT",
    ),
    page.getByRole("button", { name: /save changes/i }).click(),
  ]);
  expect(updateResp.status()).toBe(200);
  await expect(page.getByText(/product saved/i)).toBeVisible();

  // Storefront reflects the unpublish immediately: gone from the listing...
  await page.goto("/products?pageSize=50");
  await expect(page.getByRole("link", { name: title })).toBeHidden();
  // ...and the detail page 404s for the public.
  const detail = await page.goto(`/products/${slug}`);
  expect(detail?.status()).toBe(404);

  // Clean up: delete via the in-app confirm dialog (not a native confirm()).
  await page.goto(`/admin/products/${slug}`);
  await page.getByRole("button", { name: /delete product/i }).click();
  await page.getByRole("dialog").getByRole("button", { name: /delete product/i }).click();
  await expect(page.getByText(/product deleted/i)).toBeVisible();
});
