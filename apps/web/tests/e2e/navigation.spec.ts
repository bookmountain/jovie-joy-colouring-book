import { expect, test } from "@playwright/test";

test("site branding uses Zoe&Book text logo", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle(/Zoe&Book/);
  await expect(
    page.getByRole("link", { exact: true, name: "Zoe&Book" }).first(),
  ).toBeVisible();
  await expect(page.getByText("Coco Wyo")).toHaveCount(0);
  await expect(page.getByRole("img", { name: "COCO WYO" })).toHaveCount(0);
});

test("desktop header exposes Zoe&Book navigation and dropdowns", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByText("Welcome to cozy world")).toBeVisible();
  await page.getByRole("button", { name: "Products" }).click();
  await page.getByRole("button", { name: "Products" }).hover();
  await expect(page.getByRole("link", { name: "Sticker Packs" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Physical Books" })).toBeVisible();
  await page.getByRole("link", { exact: true, name: "Physical Books" }).hover();
  await expect(
    page.getByRole("link", { exact: true, name: "Paperback" }),
  ).toHaveAttribute("href", "/collections/paperback-coloring-book");
  await page.getByRole("button", { name: "Blogs" }).hover();
  await expect(page.getByRole("link", { name: "Go to Products" })).toBeHidden();
  await expect(
    page.getByRole("link", { name: "How To Color Series" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { exact: true, name: "Tools & Tips" }),
  ).toHaveAttribute("href", "/blogs/coloring-book-guide");
});

test("Coco public routes render with local Zoe&Book branding", async ({
  page,
}) => {
  const routes = [
    {
      path: "/pages/faq",
      text: "Where can I buy Zoe&Book physical coloring books?",
    },
    { path: "/pages/wishlist", text: "My wish list" },
    { path: "/collections/paperback-coloring-book", text: "Paperback" },
    { path: "/blogs/coloring-book-guide", text: "Tools & Tips" },
    { path: "/blogs/diy", text: "Lifestyle & DIY" },
  ];

  for (const route of routes) {
    await page.goto(route.path);
    await expect(
      page.locator("main").getByText(route.text).first(),
    ).toBeVisible();
    await expect(page.getByText("Coco Wyo")).toHaveCount(0);
  }
});

test("legacy learning-clone route aliases still resolve", async ({ page }) => {
  const aliases = [
    {
      path: "/pages/faqs",
      text: "Where can I buy Zoe&Book physical coloring books?",
    },
    { path: "/wishlist", text: "My wish list" },
    { path: "/collections/paperback", text: "Paperback" },
    { path: "/blogs/tools-tips", text: "Tools & Tips" },
    { path: "/blogs/lifestyle-diy", text: "Lifestyle & DIY" },
  ];

  for (const route of aliases) {
    await page.goto(route.path);
    await expect(
      page.locator("main").getByText(route.text).first(),
    ).toBeVisible();
  }
});

test("desktop dropdown remains usable while hovering into options", async ({
  page,
}) => {
  await page.goto("/");

  const productsButton = page.getByRole("button", { name: "Products" });
  const stickerPacks = page.getByRole("link", { name: "Sticker Packs" });

  await productsButton.hover();
  await expect(stickerPacks).toBeVisible();

  const buttonBox = await productsButton.boundingBox();
  const optionBox = await stickerPacks.boundingBox();
  expect(buttonBox).not.toBeNull();
  expect(optionBox).not.toBeNull();

  if (!buttonBox || !optionBox) {
    return;
  }

  await page.mouse.move(
    buttonBox.x + buttonBox.width / 2,
    buttonBox.y + buttonBox.height / 2,
  );
  await page.mouse.move(buttonBox.x - 8, buttonBox.y + buttonBox.height + 6);
  await page.waitForTimeout(120);
  await expect(stickerPacks).toBeVisible();
  await page.mouse.move(
    optionBox.x + 24,
    optionBox.y + optionBox.height / 2,
    { steps: 12 },
  );

  await expect(stickerPacks).toBeVisible();
  await expect(stickerPacks).toHaveCSS("pointer-events", "auto");
});
