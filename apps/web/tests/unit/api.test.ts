import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { apiGetProducts, apiCreateCheckout } from "@/lib/api";

beforeEach(() => {
  globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.endsWith("/api/products")) {
      return new Response(JSON.stringify([{ slug: "x", priceCents: 100 }]), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }
    if (url.endsWith("/api/checkout")) {
      return new Response(
        JSON.stringify({ checkoutUrl: "https://stripe/x", orderId: "abc" }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }
    return new Response("", { status: 404 });
  }) as typeof fetch;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("api client", () => {
  test("apiGetProducts returns parsed JSON", async () => {
    const result = await apiGetProducts();
    expect(result).toEqual([{ slug: "x", priceCents: 100 }]);
  });

  test("apiCreateCheckout posts items and parses response", async () => {
    const resp = await apiCreateCheckout({
      email: "a@b.com",
      items: [{ productSlug: "x", quantity: 1 }],
    });
    expect(resp.checkoutUrl).toBe("https://stripe/x");
    expect(resp.orderId).toBe("abc");
  });

  test("non-OK fetch throws", async () => {
    globalThis.fetch = vi.fn(
      async () => new Response("", { status: 500 }),
    ) as typeof fetch;
    await expect(apiGetProducts()).rejects.toThrow();
  });
});
