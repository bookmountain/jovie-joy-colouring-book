import { expect, test } from "@playwright/test";

test("guest wishlist → /auth/callback triggers BE merge", async ({ page }) => {
  let resolveMerge!: (slugs: string[]) => void;
  const mergedSlugs = new Promise<string[]>((resolve) => {
    resolveMerge = resolve;
  });

  await page.route("**/api/wishlist/merge", async (route) => {
    const body = JSON.parse(route.request().postData() ?? "{}");
    resolveMerge(body.productSlugs ?? []);
    await route.fulfill({ status: 204, body: "" });
  });

  await page.route("**/auth/me", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: "test-user",
        email: "test@example.com",
        name: "Test User",
        avatarUrl: null,
        isAdmin: false,
      }),
    });
  });

  // Seed the guest wishlist directly in localStorage so the test is deterministic.
  // (UI wishlist toggle is covered by tests/e2e/interactions.spec.ts.)
  await page.goto("/");
  await page.evaluate(() => {
    window.localStorage.setItem(
      "coco-wyo-learning-store",
      JSON.stringify({ wishlist: ["cozy-christmas-coloring-book"] }),
    );
  });

  await page.goto("/auth/callback?token=fake-test-token&return=/wishlist");

  const slugs = await mergedSlugs;
  expect(slugs).toContain("cozy-christmas-coloring-book");
});
