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

  test("loads every bounded API page for collection product pickers", async () => {
    fetchMock
      .mockResolvedValueOnce(new Response(JSON.stringify({ items: [{ slug: "a" }], total: 201, page: 1, pageSize: 100 }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ items: [{ slug: "b" }], total: 201, page: 2, pageSize: 100 }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ items: [{ slug: "c" }], total: 201, page: 3, pageSize: 100 }), { status: 200 }));
    const api = await load();

    await expect(api.adminListAllProducts()).resolves.toEqual([
      { slug: "a" }, { slug: "b" }, { slug: "c" },
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[0][0]).toContain("page=1");
    expect(fetchMock.mock.calls[1][0]).toContain("page=2");
    expect(fetchMock.mock.calls[2][0]).toContain("page=3");
    expect(fetchMock.mock.calls[2][0]).toContain("pageSize=100");
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
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ updated: 2, missing: [] }), { status: 200 }));
    const api = await load();
    const res = await api.adminBulkProducts({ slugs: ["a","b"], action: "add-to-collection", payload: { collectionSlug: "new" } });
    expect(res).toEqual({ updated: 2, missing: [] });
    const call = fetchMock.mock.calls[0];
    expect(JSON.parse(call[1].body)).toEqual({ slugs: ["a","b"], action: "add-to-collection", payload: { collectionSlug: "new" } });
  });

  test.each(["mark-available", "mark-unavailable"] as const)("POSTs the %s availability action separately", async (action) => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ updated: 1, missing: [] }), { status: 200 }));
    const api = await load();
    await api.adminBulkProducts({ slugs: ["legacy-product"], action });
    const call = fetchMock.mock.calls[0];
    expect(JSON.parse(call[1].body)).toEqual({ slugs: ["legacy-product"], action });
  });

  test("returns mixed bulk results so the UI can retain stale selections", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ updated: 1, missing: ["stale"] }), { status: 200 }));
    const api = await load();

    await expect(api.adminBulkProducts({ slugs: ["current", "stale"], action: "publish" }))
      .resolves.toEqual({ updated: 1, missing: ["stale"] });
  });

  test("surfaces an oversized bulk request as an API error", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ error: "A bulk action can target at most 100 products." }), { status: 400 }));
    const api = await load();

    await expect(api.adminBulkProducts({
      slugs: Array.from({ length: 101 }, (_, index) => `product-${index}`),
      action: "publish",
    })).rejects.toThrow("A bulk action can target at most 100 products.");
  });
});

describe("adminImportProductsCsv", () => {
  test("posts multipart preview without forcing a content type", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({
      valid: true, dryRun: true, mode: "create", totalRows: 1,
      createCount: 1, updateCount: 0, importedCount: 0, errors: [], rows: [],
    }), { status: 200 }));
    const api = await load();
    const file = new File(["slug,title,price_cents,product_type\na,A,100,physical"], "products.csv", { type: "text/csv" });

    await api.adminImportProductsCsv(file, "create", true);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/api/admin/products/import?mode=create&dryRun=true");
    expect(init.method).toBe("POST");
    expect(init.body).toBeInstanceOf(FormData);
    expect(new Headers(init.headers).has("Content-Type")).toBe(false);
  });

  test("returns structured row validation from a 422 response", async () => {
    const validation = {
      valid: false, dryRun: true, mode: "create", totalRows: 1,
      createCount: 0, updateCount: 0, importedCount: 0, errors: [],
      rows: [{ rowNumber: 2, slug: "bad", title: "Bad", action: "invalid", errors: ["price is invalid"] }],
    };
    fetchMock.mockResolvedValue(new Response(JSON.stringify(validation), { status: 422 }));
    const api = await load();
    const file = new File(["bad"], "products.csv", { type: "text/csv" });

    await expect(api.adminImportProductsCsv(file, "create", true)).resolves.toEqual(validation);
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

describe("product image upload intent", () => {
  test("keeps the legacy gallery URL and opts staged secondary assets out explicitly", async () => {
    fetchMock.mockImplementation(async () =>
      new Response(JSON.stringify({ url: "/uploads/products/x.png" }), { status: 200 }));
    const api = await load();
    const image = new File(["image"], "x.png", { type: "image/png" });

    await api.adminUploadProductImage("my product", image);
    await api.adminUploadProductImage("my product", image, "asset");

    expect(fetchMock.mock.calls[0][0]).toContain("/api/admin/products/my product/images");
    expect(fetchMock.mock.calls[0][0]).not.toContain("intent=");
    expect(fetchMock.mock.calls[1][0]).toContain("/api/admin/products/my product/images?intent=asset");
    expect(fetchMock.mock.calls[1][1].body).toBeInstanceOf(FormData);
  });

  test("requests reference-aware cleanup for a discarded staged upload", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    const api = await load();

    await api.adminDeleteStagedProductAsset("/uploads/products/staged image.png");

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/api/admin/products/assets?url=%2Fuploads%2Fproducts%2Fstaged+image.png");
    expect(init.method).toBe("DELETE");
  });
});
