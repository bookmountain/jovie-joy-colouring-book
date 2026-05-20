import { expect, test } from "@playwright/test";

test("blog category and article routes render", async ({ page }) => {
  await page.goto("/blogs/htc");
  await expect(page.getByRole("heading", { name: /How to Color/i })).toBeVisible();
  await expect(
    page
      .getByRole("main")
      .getByRole("link", { name: /Coloring Cozy Scenes/ })
      .first(),
  ).toHaveAttribute("href", "/blogs/htc/how-to-color-cozy-scenes");
  await page.goto("/blogs/htc/how-to-color-cozy-scenes");
  await expect(page.locator("article")).toBeVisible();
});

test("gallery and faq pages render Zoe&Book content", async ({ page }) => {
  await page.goto("/pages/gallery");
  await expect(page.getByRole("heading", { name: "Gallery" })).toBeVisible();
  await page.goto("/pages/faq");
  await expect(
    page.getByText("Where can I buy Zoe&Book physical coloring books?"),
  ).toBeVisible();
});

test("about page renders Zoe&Book story panels", async ({ page }) => {
  await page.goto("/pages/about-us");

  await expect(page.getByRole("heading", { name: "About Us" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Little team with a cozy dream" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Life can be uncomfy, we know that" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "A corner sparks tender creativity" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "We're not perfect!" }),
  ).toBeVisible();
  await expect(
    page.getByAltText("Zoe&Book team with a cozy dream"),
  ).toBeVisible();
  await expect(page.getByLabel("Homepage footer art")).toHaveCount(0);
  await expect(page.getByAltText("Zoe&Book footer illustration")).toHaveCount(0);
  await expect(page.getByText("Coco Wyo")).toHaveCount(0);
});

test("comics page renders world sections and download actions", async ({
  page,
}) => {
  await page.goto("/pages/comics");

  await expect(page.getByRole("heading", { name: "Comics" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Spooky Cutie World" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Cozy Friend World" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Lala Friends World" }),
  ).toBeVisible();

  for (const title of [
    "Twisted Potato",
    "Fried Egg",
    '"That\'s my type" of day',
    "Aquarium Trip",
    "Crocie's Bakery",
    "Crocie's Bakery Menu",
    "Grocery Day",
    "Bugatti Challenge",
    "Big Fish",
  ]) {
    await expect(
      page.getByRole("heading", { exact: true, name: title }),
    ).toBeVisible();
  }

  await expect(page.getByRole("link", { name: "Get Free Comic" })).toHaveCount(
    8,
  );
  await expect(
    page.getByAltText("Twisted Potato comic page 1"),
  ).toBeVisible();
  await expect
    .poll(async () =>
      page
        .getByAltText("Crocie's Bakery Menu comic page 1")
        .evaluate((image) => (image as HTMLImageElement).naturalWidth > 0),
    )
    .toBe(true);
});
