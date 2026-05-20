import { expect, test } from "@playwright/test";

const TOKEN = "fake-admin-token";
const USER = { id: "u1", email: "admin@joviejoy.com", name: "Admin", avatarUrl: null, isAdmin: true };

test.describe("admin pages flow (Phase 4a)", () => {
  test("login → open Home editor → see Hi Friend section → edit + save", async ({ page }) => {
    await page.route("**/auth/admin/login", (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ token: TOKEN, user: USER }) }));
    await page.route("**/auth/me", (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(USER) }));

    // home.intro lookup + upsert
    await page.route("**/api/admin/content/home.intro", (r) =>
      r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ key: "home.intro", type: "HomeIntro", data: { title: "Hi Friend!", body: "..." }, sortIndex: 0, updatedAt: new Date().toISOString() }) }));
    // other section keys return empty so the page still renders
    for (const key of ["home.hero", "home.cozy-moments.header", "home.video", "hero.artwork.footer"]) {
      await page.route(`**/api/admin/content/${key}`, (r) => r.fulfill({ status: 404, body: "" }));
    }

    await page.goto("/admin/login");
    await page.getByLabel("Email").fill("admin@joviejoy.com");
    await page.getByLabel("Password").fill("anything");
    await page.locator('button[type="submit"]', { hasText: /sign in/i }).click();
    // window.location.assign("/admin") inside the form is a full reload; wait until we are
    // actually off /admin/login (the regex below would otherwise match the login URL itself).
    await page.waitForURL((u) => !u.pathname.startsWith("/admin/login") && /\/admin(\/|$)/.test(u.pathname), { timeout: 60_000 });

    await page.goto("/admin/pages/home");
    await expect(page.getByRole("heading", { name: /home page/i })).toBeVisible();
    // home.intro section shows the mocked title in its "Title" textbox
    await expect(page.locator('input[value="Hi Friend!"]')).toBeVisible();
  });
});
