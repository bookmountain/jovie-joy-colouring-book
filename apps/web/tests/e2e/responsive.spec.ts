import { expect, test } from "@playwright/test";

test("mobile menu exposes primary navigation", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Open menu" }).click();
  await expect(page.getByRole("link", { name: "Home" })).toBeVisible();
  await expect(page.getByRole("link", { name: "FAQs" })).toBeVisible();
});

test("mobile product page keeps actions usable", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/products/cozy-christmas-coloring-book");
  await expect(page.getByRole("button", { name: "Add to cart" })).toBeVisible();
});
