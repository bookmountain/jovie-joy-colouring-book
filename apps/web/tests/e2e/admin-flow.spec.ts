import { expect, test } from "@playwright/test";

const TOKEN = "fake-admin-token";

const ADMIN_USER = {
  id: "u1",
  email: "admin@joviejoy.com",
  name: "Admin",
  avatarUrl: null,
  isAdmin: true,
};

test.describe("admin flow", () => {
  test("login → dashboard → products → content", async ({ page }) => {
    await page.route("**/auth/admin/login", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ token: TOKEN, user: ADMIN_USER }),
      });
    });

    await page.route("**/auth/me", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(ADMIN_USER),
      });
    });

    await page.route("**/api/admin/analytics/summary", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          totalOrders: 0,
          paidOrders: 0,
          totalRevenueCents: 0,
          revenueThisMonthCents: 0,
          ordersThisMonth: 0,
          last30Days: [],
          topProducts: [],
        }),
      });
    });

    await page.route("**/api/admin/products", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
    });

    await page.route("**/api/admin/content", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
    });

    await page.goto("/admin/login");
    await page.getByLabel("Email").fill("admin@joviejoy.com");
    await page.getByLabel("Password").fill("anything");
    await page.locator('button[type="submit"]', { hasText: /sign in/i }).click();

    await page.waitForURL(/\/admin(\/|$)/, { timeout: 60_000 });
    await expect(page.getByRole("heading", { name: /dashboard/i })).toBeVisible({
      timeout: 30_000,
    });

    await page.getByRole("link", { name: "Products" }).click();
    await expect(page.getByRole("heading", { level: 1, name: /products/i })).toBeVisible();

    await page.getByRole("link", { name: "Content" }).click();
    await expect(page.getByRole("heading", { level: 1, name: /content/i })).toBeVisible();
  });
});
