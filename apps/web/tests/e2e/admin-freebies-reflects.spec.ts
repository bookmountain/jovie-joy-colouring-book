import { test, expect, type Page } from "@playwright/test";

// REAL end-to-end integration flow (no API mocking): requires the seeded .NET API
// on :8080 plus the Playwright webServer (Next on :3100). Proves an admin freebie
// publish reflects on /pages/freebies immediately. Creates a throwaway published
// freebie, asserts it on the public grid, then deletes it.
//
//   E2E_REAL_STACK=1 npx playwright test admin-freebies-reflects
test.skip(!process.env.E2E_REAL_STACK, "requires the real local stack (API on :8080) — set E2E_REAL_STACK=1");

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "";
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "";
test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, "set explicit E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD credentials");

async function login(page: Page) {
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill(ADMIN_EMAIL);
  await page.getByLabel("Password").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/admin/login") && /\/admin(\/|$)/.test(u.pathname));
}

function validPdf(): Buffer {
  let pdf = "%PDF-1.7\n";
  const catalogOffset = Buffer.byteLength(pdf, "ascii");
  pdf += "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n";
  const pagesOffset = Buffer.byteLength(pdf, "ascii");
  pdf += "2 0 obj\n<< /Type /Pages /Count 0 /Kids [] >>\nendobj\n";
  const xrefOffset = Buffer.byteLength(pdf, "ascii");
  pdf += [
    "xref",
    "0 3",
    "0000000000 65535 f ",
    `${catalogOffset.toString().padStart(10, "0")} 00000 n `,
    `${pagesOffset.toString().padStart(10, "0")} 00000 n `,
    "trailer",
    "<< /Size 3 /Root 1 0 R >>",
    "startxref",
    xrefOffset.toString(),
    "%%EOF",
    "",
  ].join("\n");
  return Buffer.from(pdf, "ascii");
}

test("admin publish of a freebie reflects on /pages/freebies immediately", async ({ page }) => {
  const stamp = Date.now();
  const title = `E2E Reflect Freebie ${stamp}`;
  const slug = `e2e-reflect-freebie-${stamp}`;

  await login(page);
  await page.goto("/admin/freebies");

  // New freebies intentionally start as drafts. Create one first, then follow
  // the same upload-before-publish safety flow an editor uses in production.
  await page.getByRole("button", { name: /\+ new freebie/i }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Title").fill(title);
  await dialog.getByLabel("Excerpt").fill("Throwaway freebie for the reflect e2e.");
  const [createResp] = await Promise.all([
    page.waitForResponse(
      (r) => r.url().endsWith("/api/admin/freebies") && r.request().method() === "POST",
    ),
    dialog.getByRole("button", { name: /create & edit/i }).click(),
  ]);
  expect(createResp.ok()).toBeTruthy();
  // Create redirects to the edit page.
  await page.waitForURL(`**/admin/freebies/${slug}`);

  const fileInput = page.locator('input[type="file"][accept=".pdf,.zip"]');
  await expect(fileInput).toBeAttached();
  const [uploadResp] = await Promise.all([
    page.waitForResponse(
      (r) => r.url().endsWith(`/api/admin/freebies/${slug}/file`) && r.request().method() === "POST",
    ),
    fileInput.setInputFiles({
      name: "reflect-fixture.pdf",
      mimeType: "application/pdf",
      buffer: validPdf(),
    }),
  ]);
  expect(uploadResp.ok()).toBeTruthy();
  await expect(page.getByText(/Current: PDF/i)).toBeVisible();

  await page.getByRole("checkbox", { name: "Published" }).check();
  const [publishResp] = await Promise.all([
    page.waitForResponse(
      (r) => r.url().endsWith(`/api/admin/freebies/${slug}`) && r.request().method() === "PUT",
    ),
    page.getByRole("button", { name: /^save$/i }).click(),
  ]);
  expect(publishResp.ok()).toBeTruthy();

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
