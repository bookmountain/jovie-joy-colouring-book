import { test, expect, type Page } from "@playwright/test";

// REAL end-to-end integration flow (no API mocking): requires the seeded .NET API
// on :8080 plus the Playwright webServer (Next on :3100). Proves an admin FAQ edit
// reflects on /pages/faqs immediately. Edits an existing seeded question and
// restores it.
//
//   E2E_REAL_STACK=1 npx playwright test admin-faq-reflects
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

async function setFirstFaqQuestion(page: Page, question: string): Promise<void> {
  await login(page);
  await page.goto("/admin/faq");
  const input = page.locator('input[id^="q-"]').first();
  await expect(input).toBeVisible({ timeout: 20000 });
  const slug = (await input.getAttribute("id"))!.replace("q-", "");
  await input.fill(question);
  const row = page.locator(".admin-panel").filter({ has: page.locator(`#q-${slug}`) });
  const [resp] = await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes(`/api/admin/faqs/${slug}`) && r.request().method() === "PUT",
    ),
    row.getByRole("button", { name: /^save$/i }).click(),
  ]);
  expect(resp.status()).toBe(200);
  await expect(page.getByText(/faq saved/i)).toBeVisible();
}

test("admin edit of a FAQ question reflects on /pages/faqs immediately", async ({ page }) => {
  const marker = `E2E Reflect FAQ ${Date.now()}?`;

  await login(page);
  await page.goto("/admin/faq");
  const firstInput = page.locator('input[id^="q-"]').first();
  await expect(firstInput).toBeVisible({ timeout: 20000 });
  const originalQuestion = await firstInput.inputValue();

  try {
    await setFirstFaqQuestion(page, marker);

    await page.goto("/pages/faqs");
    await expect(page.getByText(marker)).toBeVisible({ timeout: 20000 });
  } finally {
    await setFirstFaqQuestion(page, originalQuestion);
  }
});
