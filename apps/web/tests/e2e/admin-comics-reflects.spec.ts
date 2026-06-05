import { test, expect, type Page } from "@playwright/test";

// REAL end-to-end integration flow (no API mocking): requires the seeded .NET API
// on :8080 plus the Playwright webServer (Next on :3100). Proves an admin Comics
// edit reflects on /pages/comics immediately. Edits an existing seeded world's
// title and restores it.
//
//   E2E_REAL_STACK=1 npx playwright test admin-comics-reflects
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

async function setFirstWorldTitle(page: Page, title: string): Promise<void> {
  await login(page);
  await page.goto("/admin/comics");
  const input = page.locator('input[id^="cw-title-"]').first();
  await expect(input).toBeVisible({ timeout: 20000 });
  const id = (await input.getAttribute("id"))!.replace("cw-title-", "");
  await input.fill(title);
  const row = page.locator(".admin-panel").filter({ has: page.locator(`#cw-title-${id}`) });
  const [resp] = await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes(`/api/admin/comics/${id}`) && r.request().method() === "PUT",
    ),
    row.getByRole("button", { name: /^save$/i }).click(),
  ]);
  expect(resp.status()).toBe(200);
  await expect(page.getByText(/world saved/i)).toBeVisible();
}

test("admin edit of a comic world title reflects on /pages/comics immediately", async ({ page }) => {
  const marker = `E2E Reflect World ${Date.now()}`;

  await login(page);
  await page.goto("/admin/comics");
  const firstInput = page.locator('input[id^="cw-title-"]').first();
  await expect(firstInput).toBeVisible({ timeout: 20000 });
  const originalTitle = await firstInput.inputValue();

  try {
    await setFirstWorldTitle(page, marker);

    await page.goto("/pages/comics");
    await expect(page.getByRole("heading", { name: marker, level: 2 })).toBeVisible({ timeout: 20000 });
  } finally {
    await setFirstWorldTitle(page, originalTitle);
  }
});
