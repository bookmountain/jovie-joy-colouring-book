import { expect, test } from "@playwright/test";

test("homepage shows Zoe&Book storefront sections", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Hi Friend!" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "New Release" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Best Seller" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Collection" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Blog Posts" })).toBeVisible();
});

test("homepage includes the visual learning blocks from the reference layout", async ({ page }) => {
  await page.goto("/");

  const videoSection = page.getByLabel("Zoe&Book video showcase");
  await expect(videoSection.locator("video[autoplay][muted][loop]")).toBeVisible();
  await expect(videoSection.locator("source")).toHaveAttribute(
    "src",
    /cocowyo\.com\/cdn\/shop\/videos/,
  );

  const featuredOn = page.getByLabel("Featured On");
  await expect(featuredOn.getByRole("heading", { name: "Featured On" })).toBeVisible();
  await expect(featuredOn.getByRole("link")).toHaveCount(4);
  await expect(featuredOn.getByAltText("Penguin Random House feature badge")).toBeVisible();
  await expect(featuredOn.getByAltText("Etsy feature badge")).toBeVisible();
  await expect(featuredOn.getByAltText("Amazon feature badge")).toBeVisible();
  await expect(featuredOn.getByAltText("TikTok Shop feature badge")).toBeVisible();

  await expect(page.getByAltText("Zoe&Book FAQ illustration")).toBeVisible();
  await page
    .getByRole("button", { name: "1. Where can I buy Zoe&Book physical coloring books?" })
    .click();
  await expect(page.getByText("Available on Amazon in the US")).toBeVisible();

  const homeFooterArt = page.getByLabel("Homepage footer art");
  const footerIllustration = homeFooterArt.getByAltText("Zoe&Book footer illustration");
  await expect(footerIllustration).toBeVisible();
  await expect(footerIllustration).toHaveAttribute("src", /footer-characters-desktop/);
  await expect(
    page.locator("footer").getByAltText("Zoe&Book footer illustration"),
  ).toHaveCount(0);
});
