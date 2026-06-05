import { test, expect, type Page } from "@playwright/test";

// REAL end-to-end flow (no API mocking): requires the .NET API on :8080 (seeded)
// and the Playwright webServer (Next on :3100). Proves an admin edit persists and
// shows on the storefront, with toast feedback.
// These tests mutate shared blog rows in the real DB, so run them serially.
test.describe.configure({ mode: "serial" });

const ADMIN_EMAIL = "admin@joviejoy.com";
const ADMIN_PASSWORD = "changeme123";

async function login(page: Page) {
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill(ADMIN_EMAIL);
  await page.getByLabel("Password").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/admin/login") && /\/admin(\/|$)/.test(u.pathname));
}

test("editing a blog category title shows a toast and reflects on the storefront", async ({ page }) => {
  await login(page);
  await page.goto("/admin/blog");

  const unique = `How to Color ${Date.now()}`;
  // Scope to the htc category card specifically — several categories share
  // sortIndex 0, so "the first Save button" is not necessarily htc's.
  const htcCard = page.locator(".admin-panel").filter({ has: page.locator("#bc-title-htc") });
  const titleInput = htcCard.locator("#bc-title-htc");
  await titleInput.fill(unique);
  // Confirm the controlled input actually holds the new value before saving.
  await expect(titleInput).toHaveValue(unique);

  // Click Save and wait for the PUT to complete with the value we typed.
  const [putResp] = await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes("/api/admin/blogs/htc") && r.request().method() === "PUT",
    ),
    htcCard.getByRole("button", { name: /^save$/i }).click(),
  ]);
  expect(putResp.status()).toBe(200);
  expect(JSON.parse(putResp.request().postData() ?? "{}").title).toBe(unique);

  // 1. Toast feedback (no more silent save)
  await expect(page.getByText(/category saved/i)).toBeVisible();

  // 2. Storefront reflects the edit immediately (no stale 60s ISR cache)
  await page.goto("/blogs/htc");
  await expect(page.getByRole("heading", { name: unique })).toBeVisible();

  // restore the seed title so the test is idempotent
  await page.goto("/admin/blog");
  await htcCard.locator("#bc-title-htc").fill("How to Color");
  await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes("/api/admin/blogs/htc") && r.request().method() === "PUT",
    ),
    htcCard.getByRole("button", { name: /^save$/i }).click(),
  ]);
  await expect(page.getByText(/category saved/i)).toBeVisible();
});

test("delete uses a confirm dialog, not a native confirm()", async ({ page }) => {
  await login(page);
  await page.goto("/admin/blog");

  // create a throwaway category to delete
  const slug = `e2e-del-${Date.now()}`;
  await page.locator("#bc-new-slug").fill(slug);
  await page.locator("#bc-new-title").fill("Throwaway");
  await page.getByRole("button", { name: /^create$/i }).click();
  await expect(page.getByText(/category saved/i)).toBeVisible();

  // The new category is appended last, so its Delete button is the last one.
  // Clicking it opens the in-app dialog (not a native window.confirm).
  await page.getByRole("button", { name: /^delete$/i }).last().click();
  await expect(page.getByRole("button", { name: /delete category/i })).toBeVisible();
  await page.getByRole("button", { name: /delete category/i }).click();
  await expect(page.getByText(/category deleted/i)).toBeVisible();
});
