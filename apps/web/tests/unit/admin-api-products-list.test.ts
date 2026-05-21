import { describe, expect, test, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({ tokenStorage: { read: () => "t" } }));

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

beforeEach(() => { fetchMock.mockReset(); });

async function load() {
  return await import("@/lib/adminApi");
}

describe("adminListProducts", () => {
  test("posts query params and parses envelope", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ items: [], total: 0, page: 1, pageSize: 25 }), { status: 200 }));
    const api = await load();
    await api.adminListProducts({ q: "cozy", format: ["digital"], page: 2, pageSize: 25, sort: "price_desc" });
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain("/api/admin/products");
    expect(url).toContain("q=cozy");
    expect(url).toContain("format=digital");
    expect(url).toContain("page=2");
    expect(url).toContain("pageSize=25");
    expect(url).toContain("sort=price_desc");
  });

  test("omits empty filter params and uses default page/pageSize", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ items: [], total: 0, page: 1, pageSize: 25 }), { status: 200 }));
    const api = await load();
    await api.adminListProducts();
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain("/api/admin/products");
    expect(url).toContain("page=1");
    expect(url).toContain("pageSize=25");
    expect(url).not.toContain("q=");
    expect(url).not.toContain("format=");
    expect(url).not.toContain("status=");
  });
});

describe("adminBulkProducts", () => {
  test("POSTs body with slugs + action + payload", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ updated: 2 }), { status: 200 }));
    const api = await load();
    const res = await api.adminBulkProducts({ slugs: ["a","b"], action: "add-to-collection", payload: { collectionSlug: "new" } });
    expect(res.updated).toBe(2);
    const call = fetchMock.mock.calls[0];
    expect(JSON.parse(call[1].body)).toEqual({ slugs: ["a","b"], action: "add-to-collection", payload: { collectionSlug: "new" } });
  });
});

describe("adminDuplicateProduct + adminListProductTags", () => {
  test("duplicate POSTs and returns product", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ slug: "x-copy" }), { status: 201 }));
    const api = await load();
    const r = await api.adminDuplicateProduct("x");
    expect(r.slug).toBe("x-copy");
  });
  test("tags returns string array", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify(["a","b"]), { status: 200 }));
    const api = await load();
    expect(await api.adminListProductTags()).toEqual(["a","b"]);
  });
});
