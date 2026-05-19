import { expect, test } from "@playwright/test";

test("product → cart → checkout redirects to Stripe", async ({ page }) => {
  await page.route("**/api/checkout", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        checkoutUrl: "https://example.com/stripe-mock",
        orderId: "test-order",
      }),
    });
  });

  await page.goto("/products/cozy-christmas-coloring-book");
  await expect(
    page.getByRole("heading", { name: /cozy christmas coloring book/i }),
  ).toBeVisible();

  await page.getByRole("button", { name: /add to cart/i }).first().click();

  // CartDrawer opens automatically on add
  const emailInput = page.getByPlaceholder("you@example.com");
  await expect(emailInput).toBeVisible();
  await emailInput.fill("test@example.com");

  const navigation = page.waitForURL(/example\.com\/stripe-mock/);
  await page.getByRole("button", { name: /^checkout/i }).click();
  await navigation;
});
