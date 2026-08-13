import { afterEach, describe, expect, test, vi } from "vitest";
import { revalidate } from "@/app/(public)/layout";
import {
  apiGetAbout,
  apiGetArticle,
  apiGetBlog,
  apiGetBlogs,
  apiGetCollection,
  apiGetCollections,
  apiGetComics,
  apiGetContent,
  apiGetFaqs,
  apiGetGallery,
  apiGetPage,
  apiGetProduct,
  apiGetProducts,
} from "@/lib/api";
import { getFreebie, listFreebies } from "@/lib/freebies";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("storefront cache policy", () => {
  test("all anonymous storefront routes revalidate every 60 seconds", () => {
    expect(revalidate).toBe(60);
  });

  test("all anonymous API reads use the 60-second data cache", async () => {
    globalThis.fetch = vi.fn(async () => new Response("{}", {
      status: 200,
      headers: { "content-type": "application/json" },
    })) as typeof fetch;

    await Promise.all([
      apiGetProducts(),
      apiGetProduct("cozy-book"),
      apiGetCollections(),
      apiGetCollection("new-release"),
      apiGetBlogs(),
      apiGetBlog("diy"),
      apiGetArticle("diy", "colouring-tips"),
      apiGetComics(),
      apiGetAbout(),
      apiGetGallery(),
      apiGetPage("gallery"),
      apiGetFaqs(),
      apiGetContent(),
      listFreebies(),
      getFreebie("sample-pack"),
    ]);

    const calls = vi.mocked(fetch).mock.calls;
    expect(calls).toHaveLength(15);
    const tags = calls.map(([, init]) =>
      (init as { next: { tags: string[] } }).next.tags[0],
    );
    expect(tags).toEqual([
      "storefront:catalog",
      "storefront:catalog",
      "storefront:catalog",
      "storefront:catalog",
      "storefront:blogs",
      "storefront:blogs",
      "storefront:blogs",
      "storefront:comics",
      "storefront:about",
      "storefront:gallery",
      "storefront:pages",
      "storefront:faqs",
      "storefront:content",
      "storefront:freebies",
      "storefront:freebies",
    ]);
    for (const [, init] of calls) {
      expect((init as { next: { revalidate: number } }).next.revalidate).toBe(60);
    }
  });
});
