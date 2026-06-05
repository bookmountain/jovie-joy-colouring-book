import { test, expect, type Page } from "@playwright/test";

// REAL end-to-end integration flow (no API mocking): requires the seeded .NET API
// on :8080 plus the Playwright webServer (Next on :3100). Proves an admin About
// edit reflects on /pages/about-us immediately. Edits an existing seeded section's
// title and restores it, so seed content is left intact.
//
//   E2E_REAL_STACK=1 npx playwright test admin-about-reflects
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

async function setFirstSectionTitle(page: Page, title: string): Promise<void> {
  await login(page);
  await page.goto("/admin/about");
  const input = page.locator('input[id^="ab-title-"]').first();
  await expect(input).toBeVisible({ timeout: 20000 });
  const id = (await input.getAttribute("id"))!.replace("ab-title-", "");
  await input.fill(title);
  const row = page.locator(".admin-panel").filter({ has: page.locator(`#ab-title-${id}`) });
  const [resp] = await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes(`/api/admin/about/${id}`) && r.request().method() === "PUT",
    ),
    row.getByRole("button", { name: /^save$/i }).click(),
  ]);
  expect(resp.status()).toBe(200);
  await expect(page.getByText(/section saved/i)).toBeVisible();
}

test("admin edit of an About section title reflects on /pages/about-us immediately", async ({ page }) => {
  const marker = `E2E Reflect About ${Date.now()}`;

  await login(page);
  await page.goto("/admin/about");
  const firstInput = page.locator('input[id^="ab-title-"]').first();
  await expect(firstInput).toBeVisible({ timeout: 20000 });
  const originalTitle = await firstInput.inputValue();

  try {
    await setFirstSectionTitle(page, marker);

    await page.goto("/pages/about-us");
    await expect(page.getByRole("heading", { name: marker, level: 2 })).toBeVisible({ timeout: 20000 });
  } finally {
    await setFirstSectionTitle(page, originalTitle);
  }
});
