import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("@/lib/auth", () => ({ tokenStorage: { read: () => "test-token" } }));

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockResolvedValue(new Response(JSON.stringify({ items: [], total: 0, page: 1, pageSize: 25 }), { status: 200 }));
});

async function loadAdminApi() {
  return await import("@/lib/adminApi");
}

describe("admin audience API", () => {
  test.each([
    ["adminListCustomers", "/api/admin/customers"],
    ["adminListNotifyMe", "/api/admin/notify-me"],
    ["adminListSubscribers", "/api/admin/subscribers"],
  ] as const)("%s sends search and pagination", async (method, path) => {
    const api = await loadAdminApi();
    await api[method]("moon book", 2, 10);

    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain(path);
    expect(url).toContain("q=moon+book");
    expect(url).toContain("page=2");
    expect(url).toContain("pageSize=10");
    expect((fetchMock.mock.calls[0][1].headers as Headers).get("Authorization")).toBe("Bearer test-token");
  });
});
