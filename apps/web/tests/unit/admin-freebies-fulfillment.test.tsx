import { beforeEach, describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import AdminFreebiesPage from "@/app/admin/freebies/page";
import { FreebieForm } from "@/components/admin/freebie/FreebieForm";

const createMock = vi.fn();
const downloadMock = vi.fn();
const pushMock = vi.fn();

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: pushMock }) }));
vi.mock("@/components/admin/StaticPageHeaderEditor", () => ({ StaticPageHeaderEditor: () => null }));
vi.mock("@/components/admin/ImageUpload", () => ({ ImageUpload: () => null }));
vi.mock("@/lib/freebies", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/freebies")>();
  return {
    ...actual,
    adminListFreebies: vi.fn().mockResolvedValue([]),
    adminCreateFreebie: (...args: unknown[]) => createMock(...args),
    adminDownloadFreebieFile: (...args: unknown[]) => downloadMock(...args),
    adminUpdateFreebie: vi.fn().mockResolvedValue(undefined),
    adminDeleteFreebie: vi.fn().mockResolvedValue(undefined),
    adminUploadFreebieCover: vi.fn(),
    adminUploadFreebieFile: vi.fn(),
  };
});

beforeEach(() => {
  createMock.mockReset().mockResolvedValue({});
  downloadMock.mockReset().mockResolvedValue(undefined);
  pushMock.mockReset();
});

describe("freebie fulfillment CMS", () => {
  test("new freebies are always created as drafts", async () => {
    render(<AdminFreebiesPage />);
    await screen.findByText(/no freebies yet/i);
    fireEvent.click(screen.getByRole("button", { name: /new freebie/i }));
    fireEvent.change(screen.getByPlaceholderText("Mini Coloring Book"), { target: { value: "Safe Sample" } });
    expect(screen.queryByText(/publish immediately/i)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /create & edit/i }));

    await waitFor(() => expect(createMock).toHaveBeenCalledWith(expect.objectContaining({
      slug: "safe-sample",
      published: false,
    })));
  });

  test("download a copy uses the authenticated admin download function", () => {
    render(<FreebieForm
      initial={{
        id: "f1", slug: "safe-sample", title: "Safe Sample", excerpt: "", description: [],
        coverImage: "", filePath: "/uploads/freebies/files/safe.pdf", fileKind: "pdf",
        fileSizeBytes: 1024, sortIndex: 0, published: false, requestCount: 0,
        lastRequestedAt: null, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z",
      }}
      onSaved={vi.fn()}
      onDeleted={vi.fn()}
    />);

    fireEvent.click(screen.getByRole("button", { name: /download a copy/i }));
    expect(downloadMock).toHaveBeenCalledWith("safe-sample");
  });
});
