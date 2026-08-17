import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AdminContentPage from "@/app/admin/content/page";

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  upsert: vi.fn(),
  remove: vi.fn(),
}));

vi.mock("@/lib/adminApi", () => ({
  adminListContent: (...args: unknown[]) => mocks.list(...args),
  adminUpsertContent: (...args: unknown[]) => mocks.upsert(...args),
  adminDeleteContent: (...args: unknown[]) => mocks.remove(...args),
}));
vi.mock("@/lib/toast", () => ({ notifyDeleted: vi.fn(), notifyError: vi.fn() }));

describe("Content CMS homepage visibility", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.list.mockResolvedValue([]);
    mocks.upsert.mockResolvedValue({
      key: "home.visibility",
      type: "HomeSectionVisibility",
      data: {},
      sortIndex: 0,
      updatedAt: "2026-08-12T00:00:00Z",
    });
  });

  it("synthesizes all-on switches and saves explicit visibility", async () => {
    render(<AdminContentPage />);

    const blogSwitch = await screen.findByRole("switch", { name: "Show Blog posts on homepage" });
    // 13 homepage sections plus the shop-module toggle.
    expect(screen.getAllByRole("switch")).toHaveLength(14);
    expect(blogSwitch).toHaveAttribute("aria-checked", "true");

    fireEvent.click(blogSwitch);
    expect(blogSwitch).toHaveAttribute("aria-checked", "false");
    fireEvent.click(screen.getByRole("button", { name: "Save homepage visibility" }));

    await waitFor(() => expect(mocks.upsert).toHaveBeenCalledWith(
      "home.visibility",
      expect.objectContaining({
        type: "HomeSectionVisibility",
        data: expect.objectContaining({ blogPosts: false, heroCarousel: true }),
      }),
    ));
  });

  it("saves the shop module toggle immediately", async () => {
    mocks.upsert.mockResolvedValue({
      key: "site.modules",
      type: "SiteModules",
      data: { shop: false },
      sortIndex: 0,
      updatedAt: "2026-08-12T00:00:00Z",
    });
    render(<AdminContentPage />);

    const shopSwitch = await screen.findByRole("switch", { name: "Enable shop and checkout" });
    expect(shopSwitch).toHaveAttribute("aria-checked", "true");

    fireEvent.click(shopSwitch);

    await waitFor(() => expect(mocks.upsert).toHaveBeenCalledWith(
      "site.modules",
      expect.objectContaining({
        type: "SiteModules",
        data: expect.objectContaining({ shop: false }),
      }),
    ));
  });
});
