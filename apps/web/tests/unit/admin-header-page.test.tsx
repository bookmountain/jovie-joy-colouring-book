import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AdminHeaderPage from "@/app/admin/pages/header/page";

const mocks = vi.hoisted(() => ({
  adminGetContent: vi.fn(),
  adminUpsertContent: vi.fn(),
}));

vi.mock("@/lib/adminApi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/adminApi")>();
  return {
    ...actual,
    adminGetContent: mocks.adminGetContent,
    adminUpsertContent: mocks.adminUpsertContent,
  };
});

describe("Admin header page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.adminGetContent.mockResolvedValue({
      key: "header.brand",
      type: "HeaderBrand",
      data: { name: "Jovie & Joy", searchPlaceholder: "Search books" },
      sortIndex: 0,
      updatedAt: "2026-08-12T00:00:00Z",
    });
  });

  it("describes its fields and links to the real navigation editor", async () => {
    const { container } = render(<AdminHeaderPage />);

    expect(screen.getByText(/Brand text and the search prompt shown in both the header and search drawer/)).toBeInTheDocument();
    expect(container.querySelector('a[href="/admin/navigation"]')).not.toBeNull();

    await waitFor(() => {
      expect(screen.getByLabelText("Brand name")).toHaveValue("Jovie & Joy");
      expect(screen.getByLabelText("Search placeholder")).toHaveValue("Search books");
    });
  });
});
