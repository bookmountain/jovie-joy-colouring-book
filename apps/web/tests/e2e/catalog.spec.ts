import { expect, test } from "@playwright/test";

test("collection pages support sorting and page size controls", async ({
  page,
}) => {
  await page.goto("/collections/all");
  await expect(page.getByRole("heading", { name: "Products" })).toBeVisible();
  await page.getByLabel("Items per page").selectOption("10");
  await expect(page.locator("[data-testid='product-card']")).toHaveCount(10);
  await page.getByLabel("Sort by").selectOption("price-ascending");
  await expect(page).toHaveURL(/sort=price-ascending/);
});

test("product page supports quantity, wishlist, and add to cart", async ({
  page,
}) => {
  await page.goto("/collections/frontpage/products/cozy-christmas-coloring-book");
  await expect(
    page.getByRole("heading", { name: "Cozy Christmas Coloring Book" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Increase quantity" }).click();
  await page.getByRole("button", { name: "Add to cart" }).click();
  await expect(page.getByRole("heading", { name: "Shopping cart" })).toBeVisible();
  await expect(page.getByText("2 items")).toBeVisible();
});

test("product page mirrors the reference media and recommendation sections", async ({
  page,
}) => {
  await page.goto("/products/cozy-christmas-coloring-book");

  const gallery = page.getByLabel("Cozy Christmas Coloring Book media gallery");
  await expect(gallery.getByRole("button", { name: /Show product image/ })).toHaveCount(11);
  await gallery.getByRole("button", { name: "Show product image 4" }).click();
  await expect(gallery.getByAltText("Cozy Christmas Coloring Book image 4")).toBeVisible();

  await expect(page.getByText("Buy the book from:")).toBeVisible();
  await expect(page.getByAltText("Buy on Penguin US")).toBeVisible();

  await expect(page.getByAltText("Review Image 1")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Get inspired" })).toBeVisible();
  await expect(page.getByAltText("Inspiration Image 4")).toBeVisible();

  const recommendations = page.getByLabel("You may also like");
  await expect(recommendations.getByRole("heading", { name: "You may also like" })).toBeVisible();
  await expect(recommendations.locator("[data-testid='product-card']")).toHaveCount(5);

  await page.goto("/products/comfy-corner-coloring-book");
  const recent = page.getByLabel("Recently viewed");
  await expect(recent.getByRole("heading", { name: "Recently viewed" })).toBeVisible();
  await expect(
    recent.getByRole("link", { name: "Cozy Christmas Coloring Book" }).first(),
  ).toBeVisible();
});
