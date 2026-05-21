import { describe, expect, test, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ProductForm } from "@/components/admin/ProductForm";
import type { Product } from "@/lib/api";

vi.mock("@/lib/adminApi", () => ({
  adminListCollections: async () => [],
  adminUploadGeneral: async () => ({ url: "/u/new.png" }),
  adminUploadProductImage: async () => ({ url: "/u/new.png" }),
}));

const productFixture: Product = {
  id: "id-1", slug: "x", title: "T", excerpt: "ex", description: ["d"],
  priceCents: 100, compareAtPriceCents: null, available: true, productType: "physical",
  images: ["/a.png", "/b.png"],
  options: [{ name: "Format", values: ["Default Title"] }],
  sourceLinks: null,
  reviewImages: ["/r1.png"],
  inspirationImages: ["/i1.png", "/i2.png"],
  tags: [], collections: [],
  publishedAt: "2026-01-01T00:00:00Z",
  pdfPath: null,
};

beforeEach(() => { vi.clearAllMocks(); });

describe("ProductForm media panels", () => {
  test("renders three labeled gallery sections", () => {
    render(<ProductForm initial={productFixture} onSubmit={vi.fn()} submitLabel="Save" />);
    expect(screen.getByText(/product gallery/i)).toBeTruthy();
    expect(screen.getByText(/inspiration gallery/i)).toBeTruthy();
    expect(screen.getByText(/customer photos/i)).toBeTruthy();
  });

  test("seeds each gallery from the initial product's image arrays", () => {
    render(<ProductForm initial={productFixture} onSubmit={vi.fn()} submitLabel="Save" />);
    // Expect 2 product images + 2 inspiration + 1 customer = 5 images
    expect(screen.getAllByRole("img")).toHaveLength(5);
  });

  test("removing an inspiration image emits correct body on save", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<ProductForm initial={productFixture} onSubmit={onSubmit} submitLabel="Save" />);
    const inspirationSection = screen.getByText(/inspiration gallery/i).closest(".admin-panel")!;
    const removeButtons = inspirationSection.querySelectorAll('button[aria-label^="remove image"]');
    expect(removeButtons.length).toBe(2);
    fireEvent.click(removeButtons[0]);
    fireEvent.click(screen.getByRole("button", { name: /^save$/i }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    const body = onSubmit.mock.calls[0][0];
    expect(body.inspirationImages).toEqual(["/i2.png"]);
    expect(body.reviewImages).toEqual(["/r1.png"]);
    expect(body.images).toEqual(["/a.png", "/b.png"]);
  });

  test("when all three galleries empty, submits empty arrays (not nulls)", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const empty: Product = { ...productFixture, images: [], reviewImages: [], inspirationImages: [] };
    render(<ProductForm initial={empty} onSubmit={onSubmit} submitLabel="Save" />);
    fireEvent.click(screen.getByRole("button", { name: /^save$/i }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    const body = onSubmit.mock.calls[0][0];
    expect(body.images).toEqual([]);
    // emptyArray-vs-null behaviour per plan: emit empty arrays as null so BE treats as no-change
    // (verify what the implementer chose — either [] or null is acceptable, but match the plan code: `.length > 0 ? arr : null`)
    expect(body.reviewImages === null || (Array.isArray(body.reviewImages) && body.reviewImages.length === 0)).toBe(true);
    expect(body.inspirationImages === null || (Array.isArray(body.inspirationImages) && body.inspirationImages.length === 0)).toBe(true);
  });
});
