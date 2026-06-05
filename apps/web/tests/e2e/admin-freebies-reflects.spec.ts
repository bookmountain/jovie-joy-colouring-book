import { test, expect, type Page } from "@playwright/test";

// REAL end-to-end integration flow (no API mocking): requires the seeded .NET API
// on :8080 plus the Playwright webServer (Next on :3100). Proves an admin freebie
// publish reflects on /pages/freebies immediately. Creates a throwaway published
// freebie, asserts it on the public grid, then deletes it.
//
//   E2E_REAL_STACK=1 npx playwright test admin-freebies-reflects
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

test("admin publish of a freebie reflects on /pages/freebies immediately", async ({ page }) => {
  const stamp = Date.now();
  const title = `E2E Reflect Freebie ${stamp}`;
  const slug = `e2e-reflect-freebie-${stamp}`;

  await login(page);
  await page.goto("/admin/freebies");

  // Create a throwaway freebie, published immediately.
  await page.getByRole("button", { name: /\+ new freebie/i }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Title").fill(title);
  await dialog.getByLabel("Excerpt").fill("Throwaway freebie for the reflect e2e.");
  await dialog.getByLabel(/publish immediately/i).check();
  const [createResp] = await Promise.all([
    page.waitForResponse(
      (r) => r.url().endsWith("/api/admin/freebies") && r.request().method() === "POST",
    ),
    dialog.getByRole("button", { name: /create & edit/i }).click(),
  ]);
  expect(createResp.ok()).toBeTruthy();
  // Create redirects to the edit page.
  await page.waitForURL(`**/admin/freebies/${slug}`);

  // Storefront reflects the published freebie immediately.
  await page.goto("/pages/freebies");
  await expect(page.getByRole("heading", { name: title, level: 3 })).toBeVisible({ timeout: 20000 });

  // Clean up: delete from the list (re-login: storefront browsing can clear the token).
  await login(page);
  await page.goto("/admin/freebies");
  const row = page.locator("tr").filter({ hasText: title });
  await row.getByRole("button", { name: /^delete$/i }).click();
  await page.getByRole("button", { name: /delete freebie/i }).click();
  await expect(page.getByRole("heading", { name: title, level: 3 })).toHaveCount(0);

  // And it's gone from the storefront.
  await page.goto("/pages/freebies");
  await expect(page.getByRole("heading", { name: title, level: 3 })).toBeHidden();
});
