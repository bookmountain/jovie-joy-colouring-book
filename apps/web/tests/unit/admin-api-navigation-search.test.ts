import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({ tokenStorage: { read: () => "admin-token" } }));
const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockResolvedValue(new Response(JSON.stringify({ items: [], revision: "revision-2" }), { status: 200 }));
});

describe("navigation and quick-search admin API client", () => {
  it("replaces the full navigation tree", async () => {
    const api = await import("@/lib/adminApi");
    const items = [{ id: "id", parentId: null, label: "Home", href: "/", sortIndex: 0 }];
    await api.adminReplaceNavigation(items, "revision-1");
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain("/api/admin/navigation");
    expect(init.method).toBe("PUT");
    expect(JSON.parse(init.body)).toEqual({ items, expectedRevision: "revision-1" });
  });

  it("encodes quick-search query and limit", async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ items: [] }), { status: 200 }));
    const api = await import("@/lib/adminApi");
    await api.adminQuickSearch("moon book", 8);
    expect(fetchMock.mock.calls[0][0]).toContain("/api/admin/search?q=moon+book&limit=8");
  });
});
