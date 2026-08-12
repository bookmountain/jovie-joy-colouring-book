import { expect, test, type Page } from "@playwright/test";

test.skip(!process.env.E2E_REAL_STACK, "requires the disposable real local stack");

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8080";
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "";
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "";
test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, "set explicit E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD credentials");

async function login(page: Page) {
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill(ADMIN_EMAIL);
  await page.getByLabel("Password").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL((url) => url.pathname === "/admin");
}

test("CSV preview imports atomically and reflects on the storefront", async ({ page, request }) => {
  const stamp = Date.now();
  const slug = `e2e-csv-product-${stamp}`;
  const title = `E2E CSV Product ${stamp}`;
  const csv = [
    "slug,title,excerpt,price_cents,available,product_type,tags,published_at",
    `${slug},${title},Disposable real-stack CSV product,1234,true,physical,e2e|csv,2026-08-12T00:00:00Z`,
  ].join("\n");

  const auth = await request.post(`${API_URL}/auth/admin/login`, {
    data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  });
  expect(auth.ok()).toBeTruthy();
  const { token } = await auth.json() as { token: string };

  try {
    await login(page);
    await page.goto("/admin/products");
    await page.getByRole("button", { name: "Import CSV" }).click();
    await page.getByLabel("CSV file").setInputFiles({
      name: "products.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(csv),
    });
    await expect(page.getByText("Ready: 1 to create and 0 to update.")).toBeVisible();
    await page.getByRole("button", { name: "Import 1 product" }).click();
    await expect(page.getByText("Imported 1 product.")).toBeVisible();
    await page.getByRole("button", { name: "Close", exact: true }).click();

    await page.goto(`/products/${slug}`);
    await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
  } finally {
    await request.delete(`${API_URL}/api/admin/products/${slug}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }
});
