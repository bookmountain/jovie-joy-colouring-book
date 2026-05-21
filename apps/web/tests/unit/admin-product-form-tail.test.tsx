import { describe, expect, test, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ProductForm } from "@/components/admin/ProductForm";
import type { Product } from "@/lib/api";

vi.mock("@/lib/adminApi", () => ({
  adminListCollections: async () => [],
  adminUploadGeneral: async () => ({ url: "/u/x.png" }),
  adminUploadProductImage: async () => ({ url: "/u/x.png" }),
  adminUploadProductPdf: async (_s: string, _f: File) => ({ pdfPath: "/uploads/pdfs/x.pdf" }),
}));

beforeEach(() => { vi.clearAllMocks(); });

const physical: Product = {
  id: "p1", slug: "x", title: "T", excerpt: "e", description: ["d"],
  priceCents: 100, compareAtPriceCents: null, available: true, productType: "physical",
  images: [], options: [], sourceLinks: null, reviewImages: null, inspirationImages: null,
  tags: [], collections: [], publishedAt: "2026-01-01T00:00:00Z", pdfPath: null,
};

describe("ProductForm — source links, digital, danger", () => {
  test("source-links panel is always present and starts empty", () => {
    render(<ProductForm initial={physical} onSubmit={vi.fn()} submitLabel="Save" />);
    expect(screen.getByText(/source links/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /\+ add source link/i })).toBeTruthy();
  });

  test("digital fulfillment panel hidden for physical; shows when format flips to digital", () => {
    render(<ProductForm initial={physical} onSubmit={vi.fn()} submitLabel="Save" />);
    expect(screen.queryByText(/digital fulfillment/i)).toBeNull();
    fireEvent.click(screen.getByRole("radio", { name: /digital/i }));
    expect(screen.getByText(/digital fulfillment/i)).toBeTruthy();
  });

  test("digital fulfillment shows empty state when no pdfPath", () => {
    render(<ProductForm initial={{ ...physical, productType: "digital" }} onSubmit={vi.fn()} submitLabel="Save" />);
    expect(screen.getByText(/no pdf uploaded yet/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /^upload pdf$/i })).toBeTruthy();
  });

  test("danger zone Delete button invokes onDelete only after window.confirm", () => {
    const onDelete = vi.fn();
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<ProductForm initial={physical} onSubmit={vi.fn()} submitLabel="Save" onDelete={onDelete} />);
    fireEvent.click(screen.getByRole("button", { name: /delete product/i }));
    expect(confirmSpy).toHaveBeenCalled();
    expect(onDelete).toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  test("danger zone Delete is skipped if user cancels confirm", () => {
    const onDelete = vi.fn();
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<ProductForm initial={physical} onSubmit={vi.fn()} submitLabel="Save" onDelete={onDelete} />);
    fireEvent.click(screen.getByRole("button", { name: /delete product/i }));
    expect(onDelete).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  test("danger zone hidden when no initial (create mode)", () => {
    render(<ProductForm onSubmit={vi.fn()} submitLabel="Create" />);
    expect(screen.queryByRole("button", { name: /delete product/i })).toBeNull();
  });

  test("danger zone hidden when initial present but onDelete not provided", () => {
    render(<ProductForm initial={physical} onSubmit={vi.fn()} submitLabel="Save" />);
    expect(screen.queryByRole("button", { name: /delete product/i })).toBeNull();
  });
});
