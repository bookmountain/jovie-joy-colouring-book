import { test, expect, type Page } from "@playwright/test";

// REAL end-to-end integration flow (no API mocking): requires the seeded .NET API
// running on :8080 plus the Playwright webServer (Next on :3100). Proves an admin
// edit persists and shows on the storefront, with toast feedback, on its OWN
// throwaway category so it never mutates seed data.
//
// Gated behind E2E_REAL_STACK because the rest of the e2e suite is designed to run
// WITHOUT an external API (admin-storefront-workflow self-hosts a fake API on :8080,
// the others mock). Run this explicitly against the live stack:
//   E2E_REAL_STACK=1 npx playwright test admin-blog-reflects
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

test("admin edit of a blog category reflects on the storefront immediately, with toasts", async ({ page }) => {
  const slug = `e2e-reflect-${Date.now()}`;
  await login(page);
  await page.goto("/admin/blog");

  // Create a throwaway category.
  await page.locator("#bc-new-slug").fill(slug);
  await page.locator("#bc-new-title").fill("First Title");
  await page.getByRole("button", { name: /^create$/i }).click();
  await expect(page.getByText(/category saved/i)).toBeVisible();

  // Storefront shows the created title. (Generous timeout: the Next dev server
  // compiles the /blogs/[slug] route on first hit, which is slow under parallel load.)
  await page.goto(`/blogs/${slug}`);
  await expect(page.getByRole("heading", { name: "First Title", level: 1 })).toBeVisible({ timeout: 20000 });

  // Edit the title in admin, scoped to this category's card.
  await page.goto("/admin/blog");
  const card = page.locator(".admin-panel").filter({ has: page.locator(`#bc-title-${slug}`) });
  await card.locator(`#bc-title-${slug}`).fill("Second Title");
  const [putResp] = await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes(`/api/admin/blogs/${slug}`) && r.request().method() === "PUT",
    ),
    card.getByRole("button", { name: /^save$/i }).click(),
  ]);
  expect(putResp.status()).toBe(200);
  await expect(page.getByText(/category saved/i)).toBeVisible();

  // Storefront reflects the edit immediately (no stale ISR cache).
  await page.goto(`/blogs/${slug}`);
  await expect(page.getByRole("heading", { name: "Second Title", level: 1 })).toBeVisible({ timeout: 20000 });

  // Clean up: delete via the in-app confirm dialog (not a native confirm()).
  await page.goto("/admin/blog");
  const card2 = page.locator(".admin-panel").filter({ has: page.locator(`#bc-title-${slug}`) });
  await card2.getByRole("button", { name: /^delete$/i }).click();
  await page.getByRole("button", { name: /delete category/i }).click();
  await expect(page.getByText(/category deleted/i)).toBeVisible();
});

test("admin create/edit of a blog article reflects on the storefront immediately", async ({ page }) => {
  const cat = `e2e-reflect-cat-${Date.now()}`;
  const article = `e2e-reflect-article-${Date.now()}`;
  await login(page);

  // Throwaway category to host the article.
  await page.goto("/admin/blog");
  await page.locator("#bc-new-slug").fill(cat);
  await page.locator("#bc-new-title").fill("Reflect Category");
  await page.getByRole("button", { name: /^create$/i }).click();
  await expect(page.getByText(/category saved/i)).toBeVisible();

  // Create an article in it.
  await page.goto(`/admin/blog/${cat}`);
  await page.locator("#a-new-slug").fill(article);
  await page.locator("#a-new-title").fill("Article First Title");
  await page.locator("#a-new-excerpt").fill("Throwaway article for the reflect e2e.");
  await page.locator("#a-new-body").fill("Body paragraph one.\n\nBody paragraph two.");
  const [createResp] = await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes(`/api/admin/blogs/${cat}/articles`) && r.request().method() === "POST",
    ),
    page.getByRole("button", { name: /^create$/i }).click(),
  ]);
  expect(createResp.ok()).toBeTruthy();
  await expect(page.getByText(/article saved/i)).toBeVisible();

  // Storefront shows the article.
  await page.goto(`/blogs/${cat}/${article}`);
  await expect(page.getByRole("heading", { name: "Article First Title", level: 1 })).toBeVisible({ timeout: 20000 });

  // Edit the article title (re-login first: storefront browsing can clear the token).
  await login(page);
  await page.goto(`/admin/blog/${cat}`);
  await page.locator(`#a-title-${article}`).fill("Article Second Title");
  const [putResp] = await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes(`/api/admin/blogs/${cat}/articles/${article}`) && r.request().method() === "PUT",
    ),
    page.getByRole("button", { name: /^save$/i }).click(),
  ]);
  expect(putResp.status()).toBe(200);
  await expect(page.getByText(/article saved/i)).toBeVisible();

  // Storefront reflects the edit immediately.
  await page.goto(`/blogs/${cat}/${article}`);
  await expect(page.getByRole("heading", { name: "Article Second Title", level: 1 })).toBeVisible({ timeout: 20000 });

  // Clean up: delete the article, then the category.
  await login(page);
  await page.goto(`/admin/blog/${cat}`);
  await page.getByRole("button", { name: /^delete$/i }).click();
  await page.getByRole("button", { name: /delete article/i }).click();
  await expect(page.getByText(/article deleted/i)).toBeVisible();

  await page.goto("/admin/blog");
  const catCard = page.locator(".admin-panel").filter({ has: page.locator(`#bc-title-${cat}`) });
  await catCard.getByRole("button", { name: /^delete$/i }).click();
  await page.getByRole("button", { name: /delete category/i }).click();
  await expect(page.getByText(/category deleted/i)).toBeVisible();
});
