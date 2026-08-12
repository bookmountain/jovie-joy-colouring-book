import { expect, test, type Page } from "@playwright/test";

const TOKEN = "navigation-admin-token";
const USER = {
  id: "admin-1",
  email: "admin@joviejoy.com",
  name: "Admin",
  avatarUrl: null,
  isAdmin: true,
};

const root = {
  id: "00000000-0000-0000-0000-000000000001",
  parentId: null,
  label: "Books",
  href: "/products",
  sortIndex: 0,
  enabled: true,
};
const child = {
  id: "00000000-0000-0000-0000-000000000002",
  parentId: root.id,
  label: "Physical books",
  href: "/collections/physical",
  sortIndex: 0,
  enabled: true,
};

async function login(page: Page) {
  await page.route("**/auth/admin/login", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ token: TOKEN, user: USER }),
  }));
  await page.route("**/auth/me", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(USER),
  }));
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill(USER.email);
  await page.getByLabel("Password").fill("test-password");
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL((url) => url.pathname === "/admin");
}

test.describe("navigation CMS and admin quick search", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("edits and saves a nested navigation tree with its loaded revision", async ({ page }) => {
    let saveBody: { items: typeof root[]; expectedRevision: string } | null = null;
    await page.route("**/api/admin/navigation", async (route) => {
      if (route.request().method() === "PUT") {
        saveBody = route.request().postDataJSON();
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ items: saveBody!.items, revision: "revision-2" }),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ items: [root, child], revision: "revision-1" }),
      });
    });

    await page.goto("/admin/navigation");
    await expect(page.getByRole("heading", { level: 1, name: "Navigation" })).toBeVisible();
    await page.locator('input[value="Books"]').fill("Books & Gifts");
    await page.getByRole("switch", { name: "Hide Books & Gifts on storefront" }).click();
    await page.getByRole("button", { name: "Save navigation" }).click();
    await expect(page.getByText(/navigation saved/i)).toBeVisible();

    expect(saveBody).not.toBeNull();
    expect(saveBody!.expectedRevision).toBe("revision-1");
    expect(saveBody!.items).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: root.id, label: "Books & Gifts", parentId: null, enabled: false }),
      expect.objectContaining({ id: child.id, parentId: root.id }),
    ]));
  });

  test("quick search opens the matching CMS route", async ({ page }) => {
    await page.route("**/api/admin/search?*", (route) => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        items: [{
          type: "cms",
          id: "navigation",
          title: "Navigation",
          subtitle: "Storefront navigation CMS",
          href: "/admin/navigation",
        }],
      }),
    }));
    await page.route("**/api/admin/navigation", (route) => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ items: [root, child], revision: "revision-1" }),
    }));

    await page.goto("/admin");
    const quickSearch = page.getByRole("combobox", { name: "Quick search" });
    await quickSearch.fill("navigation");
    const result = page.getByRole("option", { name: /Navigation/ });
    await expect(result).toBeVisible();
    await result.click();

    await expect(page).toHaveURL(/\/admin\/navigation$/);
    await expect(page.getByRole("heading", { level: 1, name: "Navigation" })).toBeVisible();
  });
});
