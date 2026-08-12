import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { adminDownloadFreebieFile } from "@/lib/freebies";
import { tokenStorage } from "@/lib/auth";

describe("admin freebie file download", () => {
  let downloadedName = "";

  beforeEach(() => {
    tokenStorage.write("admin-token");
    downloadedName = "";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(
      new Blob(["zip bytes"], { type: "application/zip" }),
      {
        status: 200,
        headers: {
          "Content-Disposition": "attachment; filename*=UTF-8''activity-bundle.zip",
        },
      },
    )));
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: vi.fn(() => "blob:test-download"),
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: vi.fn(),
    });
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
      downloadedName = this.download;
    });
  });

  afterEach(() => {
    tokenStorage.clear();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  test("uses the authenticated response filename, including ZIP extension", async () => {
    await adminDownloadFreebieFile("activity-bundle");

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/admin/freebies/activity-bundle/file"),
      expect.objectContaining({
        headers: { Authorization: "Bearer admin-token" },
      }),
    );
    expect(downloadedName).toBe("activity-bundle.zip");
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:test-download");
  });
});
