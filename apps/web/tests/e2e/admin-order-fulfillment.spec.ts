import { expect, test } from "@playwright/test";

const ORDER_ID = "11111111-1111-1111-1111-111111111111";
const ADMIN_USER = {
  id: "admin-1",
  email: "admin@joviejoy.com",
  name: "Admin",
  avatarUrl: null,
  isAdmin: true,
};

test("shows delivery state and resends paid digital downloads", async ({ page }) => {
  await page.route("**/auth/admin/login", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ token: "orders-admin-token", user: ADMIN_USER }),
  }));
  await page.route("**/auth/me", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(ADMIN_USER),
  }));
  await page.route("**/api/admin/analytics/summary", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      totalOrders: 1,
      paidOrders: 1,
      totalRevenueCents: 1200,
      revenueThisMonthCents: 1200,
      ordersThisMonth: 1,
      last30Days: [],
      topProducts: [],
    }),
  }));

  await page.goto("/admin/login");
  await page.getByLabel("Email").fill(ADMIN_USER.email);
  await page.getByLabel("Password").fill("test-password");
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL((url) => url.pathname === "/admin");

  await page.route("**/api/admin/analytics/orders?*", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      items: [{
        id: ORDER_ID,
        email: "buyer@example.com",
        status: "Paid",
        totalCents: 1200,
        createdAt: "2026-08-12T00:00:00Z",
        paidAt: "2026-08-12T00:01:00Z",
        downloadEmailSentAt: null,
        digitalItemCount: 1,
        downloadGrantCount: 0,
        activeDownloadGrantCount: 0,
        expiredDownloadGrantCount: 0,
        deliveryStatus: "ready_to_send",
        items: [{ productSlug: "digital-book", title: "Digital book", qty: 1, unitPriceCents: 1200 }],
      }],
      total: 1,
      page: 1,
      pageSize: 20,
    }),
  }));

  let resendCount = 0;
  await page.route(`**/api/admin/orders/${ORDER_ID}/resend-downloads`, (route) => {
    resendCount += 1;
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        orderId: ORDER_ID,
        downloadEmailSentAt: "2026-08-12T01:00:00Z",
        grantCount: 1,
        activeGrantCount: 1,
        expiredGrantCount: 0,
        regeneratedExpiredLinks: true,
      }),
    });
  });

  await page.goto(`/admin/orders?order=${ORDER_ID}`);
  await expect(page.getByText("Ready to send")).toBeVisible();
  await page.getByRole("button", { name: "Send downloads" }).click();

  await expect(page.getByText("Fresh download links were emailed to buyer@example.com.", { exact: true })).toBeVisible();
  await expect(page.getByText("Delivered")).toBeVisible();
  await expect(page.getByRole("button", { name: "Resend downloads" })).toBeVisible();
  expect(resendCount).toBe(1);
  await page.screenshot({ path: "/tmp/jovie-admin-order-delivery.png", fullPage: true });
});
