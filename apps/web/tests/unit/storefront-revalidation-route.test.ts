import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const cacheMocks = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

vi.mock("next/cache", () => cacheMocks);

import { POST } from "@/app/api/internal/revalidate/route";

const SECRET = "storefront-test-secret-32-characters-minimum";

function request(body: unknown, secret = SECRET, contentType = "application/json") {
  return new Request("http://localhost/api/internal/revalidate", {
    method: "POST",
    headers: {
      "content-type": contentType,
      "x-cache-revalidation-secret": secret,
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.stubEnv("CACHE_REVALIDATION_SECRET", SECRET);
  cacheMocks.revalidatePath.mockReset();
  cacheMocks.revalidateTag.mockReset();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("storefront revalidation endpoint", () => {
  test("fails closed when the server secret is missing", async () => {
    vi.stubEnv("CACHE_REVALIDATION_SECRET", "");

    const response = await POST(request({ scopes: ["catalog"] }));

    expect(response.status).toBe(503);
    expect(cacheMocks.revalidateTag).not.toHaveBeenCalled();
    expect(cacheMocks.revalidatePath).not.toHaveBeenCalled();
  });

  test.each([null, "wrong-secret-that-is-still-long-enough"])(
    "rejects a missing or incorrect secret (%s)",
    async (secret) => {
      const input = request({ scopes: ["catalog"] });
      if (secret === null) input.headers.delete("x-cache-revalidation-secret");
      else input.headers.set("x-cache-revalidation-secret", secret);

      const response = await POST(input);

      expect(response.status).toBe(401);
      expect(cacheMocks.revalidateTag).not.toHaveBeenCalled();
      expect(cacheMocks.revalidatePath).not.toHaveBeenCalled();
    },
  );

  test("requires JSON", async () => {
    const response = await POST(request({ scopes: ["catalog"] }, SECRET, "text/plain"));

    expect(response.status).toBe(415);
    expect(cacheMocks.revalidateTag).not.toHaveBeenCalled();
  });

  test.each([
    ["malformed JSON", "{"],
    ["an empty scope list", { scopes: [] }],
    ["non-string scopes", { scopes: [1] }],
    ["unknown scopes", { scopes: ["everything"] }],
  ])("rejects %s", async (_label, body) => {
    const response = await POST(request(body));

    expect(response.status).toBe(400);
    expect(cacheMocks.revalidateTag).not.toHaveBeenCalled();
    expect(cacheMocks.revalidatePath).not.toHaveBeenCalled();
  });

  test("rejects an oversized body before invalidating", async () => {
    const response = await POST(request("x".repeat(4_097)));

    expect(response.status).toBe(413);
    expect(cacheMocks.revalidateTag).not.toHaveBeenCalled();
    expect(cacheMocks.revalidatePath).not.toHaveBeenCalled();
  });

  test("invalidates only allowlisted tags and affected paths", async () => {
    const response = await POST(request({ scopes: ["catalog", "gallery", "catalog"] }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      revalidated: true,
      scopes: ["catalog", "gallery"],
    });
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(cacheMocks.revalidateTag.mock.calls).toEqual([
      ["storefront:catalog"],
      ["storefront:gallery"],
    ]);
    expect(cacheMocks.revalidatePath.mock.calls).toEqual([
      ["/", "page"],
      ["/products", "page"],
      ["/products/[slug]", "page"],
      ["/collections", "page"],
      ["/collections/[slug]", "page"],
      ["/collections/[slug]/products/[productSlug]", "page"],
      ["/pages/gallery", "page"],
    ]);
  });

  test("a layout-content change expires the complete storefront layout", async () => {
    const response = await POST(request({ scopes: ["content"] }));

    expect(response.status).toBe(200);
    expect(cacheMocks.revalidateTag).toHaveBeenCalledWith("storefront:content");
    expect(cacheMocks.revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  test.each([
    ["blogs", [["/", "page"], ["/blogs/[slug]", "page"], ["/blogs/[slug]/[articleSlug]", "page"]]],
    ["comics", [["/pages/comics", "page"]]],
    ["about", [["/pages/about-us", "page"]]],
    ["pages", [["/pages/[slug]", "page"]]],
    ["faqs", [["/", "page"], ["/pages/faq", "page"], ["/pages/faqs", "page"]]],
    ["freebies", [["/pages/freebies", "page"]]],
  ] as const)("maps the %s scope to its storefront routes", async (scope, paths) => {
    const response = await POST(request({ scopes: [scope] }));

    expect(response.status).toBe(200);
    expect(cacheMocks.revalidateTag).toHaveBeenCalledWith(`storefront:${scope}`);
    expect(cacheMocks.revalidatePath.mock.calls).toEqual(paths);
  });
});
