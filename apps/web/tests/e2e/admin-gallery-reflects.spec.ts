import { test, expect, type Page } from "@playwright/test";

// REAL end-to-end integration flow (no API mocking): requires the seeded .NET API
// on :8080 plus the Playwright webServer (Next on :3100). Proves an admin gallery
// edit reflects on the public /pages/gallery grid immediately. Edits an existing
// seeded image's alt text and restores it, so it never leaves orphaned uploads.
//
//   E2E_REAL_STACK=1 npx playwright test admin-gallery-reflects
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

async function setFirstGalleryAlt(page: Page, alt: string): Promise<void> {
  await login(page);
  await page.goto("/admin/gallery");
  const input = page.locator('input[id^="g-alt-"]').first();
  await expect(input).toBeVisible({ timeout: 20000 });
  const id = (await input.getAttribute("id"))!.replace("g-alt-", "");
  await input.fill(alt);
  const row = page.locator(".admin-panel").filter({ has: page.locator(`#g-alt-${id}`) });
  const [resp] = await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes(`/api/admin/gallery/${id}`) && r.request().method() === "PUT",
    ),
    row.getByRole("button", { name: /^save$/i }).click(),
  ]);
  expect(resp.status()).toBe(200);
  await expect(page.getByText(/image saved/i)).toBeVisible();
}

test("admin edit of a gallery image's alt text reflects on /pages/gallery immediately", async ({ page }) => {
  const marker = `E2E Reflect Alt ${Date.now()}`;

  // Capture the original alt so we can restore it afterwards.
  await login(page);
  await page.goto("/admin/gallery");
  const firstInput = page.locator('input[id^="g-alt-"]').first();
  await expect(firstInput).toBeVisible({ timeout: 20000 });
  const originalAlt = await firstInput.inputValue();

  try {
    await setFirstGalleryAlt(page, marker);

    // Storefront reflects the new alt immediately.
    await page.goto("/pages/gallery");
    await expect(page.getByAltText(marker)).toBeVisible({ timeout: 20000 });
  } finally {
    // Restore the original alt no matter what.
    await setFirstGalleryAlt(page, originalAlt);
  }
});
