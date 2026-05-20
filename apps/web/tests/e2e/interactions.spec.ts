import { expect, test } from "@playwright/test";

test("search drawer shows trending terms and matching products", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Search" }).click();
  await expect(page.getByRole("heading", { name: "Search" })).toBeVisible();
  await expect(page.getByText("Trending Now")).toBeVisible();
  await page.getByPlaceholder("Search the store").fill("cozy");
  await expect(
    page.getByRole("link", { name: /Cozy Christmas Coloring Book/ }),
  ).toBeVisible();
});

test("wishlist page reflects toggled products", async ({ page }) => {
  await page.goto("/");
  await page
    .getByRole("button", {
      name: /Add Cozy Christmas Coloring Book to wishlist/,
    })
    .first()
    .click();
  await page.goto("/pages/wishlist");
  await expect(page.getByRole("heading", { name: "My wish list" })).toBeVisible();
  await expect(page.getByText("Cozy Christmas Coloring Book")).toBeVisible();
});

test("login and back-in-stock modals open and close", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText("Email Address *")).toBeVisible();
  await page.getByRole("button", { name: "Close login" }).click();
  await page.getByRole("button", { name: "Back In Stock Notification" }).click();
  await expect(page.getByText("Leave your email and we will notify")).toBeVisible();
});
