import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSiteContent: vi.fn(),
  notFound: vi.fn(),
}));

vi.mock("@/data/site-content", () => ({ getSiteContent: mocks.getSiteContent }));
vi.mock("next/navigation", () => ({ notFound: mocks.notFound }));

import { requireNavigationRoute } from "@/lib/require-navigation-route";

describe("navigation route guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSiteContent.mockResolvedValue({
      navigation: [{
        id: "gallery",
        label: "Gallery",
        href: "/pages/gallery",
        enabled: false,
        children: [],
      }],
    });
  });

  it("invokes the Next not-found boundary for a disabled direct URL", async () => {
    await requireNavigationRoute("/pages/gallery");
    expect(mocks.notFound).toHaveBeenCalledTimes(1);
  });

  it("leaves unlisted routes accessible", async () => {
    await requireNavigationRoute("/pages/about-us");
    expect(mocks.notFound).not.toHaveBeenCalled();
  });
});
