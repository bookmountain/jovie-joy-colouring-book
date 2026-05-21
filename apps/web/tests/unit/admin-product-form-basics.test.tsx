import { describe, expect, test, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ProductForm } from "@/components/admin/ProductForm";

vi.mock("@/lib/adminApi", () => ({
  adminListCollections: async () => [
    { slug: "new", title: "New Release" },
    { slug: "best", title: "Best Sellers" },
  ],
  adminUploadGeneral: async (_f: File, _folder?: string) => ({ url: "/u/x.png" }),
  adminUploadProductImage: async (_s: string, _f: File) => ({ url: "/u/x.png" }),
  adminUploadProductPdf: async () => ({}),
}));

beforeEach(() => { vi.clearAllMocks(); });

describe("ProductForm Basics + Sidebar", () => {
  test("fires onSubmit with all visible fields wired through", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<ProductForm onSubmit={onSubmit} submitLabel="Create" />);
    fireEvent.change(screen.getByLabelText(/^slug$/i), { target: { value: "x" } });
    fireEvent.change(screen.getByLabelText(/^title$/i), { target: { value: "Hello" } });
    fireEvent.change(screen.getByLabelText(/^excerpt$/i), { target: { value: "ex" } });
    fireEvent.change(screen.getByLabelText(/^description$/i), { target: { value: "para 1\n\npara 2" } });
    fireEvent.change(screen.getByLabelText(/^price$/i), { target: { value: "9.99" } });
    fireEvent.click(screen.getByRole("radio", { name: /digital/i }));
    fireEvent.click(screen.getByRole("button", { name: /create/i }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    const body = onSubmit.mock.calls[0][0];
    expect(body).toMatchObject({
      slug: "x",
      title: "Hello",
      excerpt: "ex",
      description: ["para 1", "para 2"],
      priceCents: 999,
      productType: "digital",
      available: true,
    });
    expect(body.options).toBeUndefined();
  });

  test("status derivation: when publishedAt empty (new product) → Draft badge", () => {
    render(<ProductForm onSubmit={vi.fn()} submitLabel="Create" />);
    expect(screen.getByText(/draft/i)).toBeTruthy();
  });

  test("compare-at price emits in body when present", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<ProductForm onSubmit={onSubmit} submitLabel="Create" />);
    fireEvent.change(screen.getByLabelText(/^slug$/i), { target: { value: "y" } });
    fireEvent.change(screen.getByLabelText(/^title$/i), { target: { value: "Y" } });
    fireEvent.change(screen.getByLabelText(/^excerpt$/i), { target: { value: "y-ex" } });
    fireEvent.change(screen.getByLabelText(/^price$/i), { target: { value: "10" } });
    fireEvent.change(screen.getByLabelText(/compare-at/i), { target: { value: "15" } });
    fireEvent.click(screen.getByRole("button", { name: /create/i }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ priceCents: 1000, compareAtPriceCents: 1500 });
  });

  test("toggling Available off and on changes status", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<ProductForm onSubmit={onSubmit} submitLabel="Create" />);
    // initially Draft (publishedAt empty)
    expect(screen.getByText(/draft/i)).toBeTruthy();
    // Toggling availability off should show out-of-stock badge
    const switches = screen.getAllByRole("switch");
    // The first switch is "Published", the second is "Available"
    const availableSwitch = switches.find((s) => s.getAttribute("aria-label") === "Available");
    fireEvent.click(availableSwitch!);
    expect(screen.getByText(/out of stock/i)).toBeTruthy();
  });

  test("adding tags via Enter populates the chip list and emits in body", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<ProductForm onSubmit={onSubmit} submitLabel="Create" />);
    fireEvent.change(screen.getByLabelText(/^slug$/i), { target: { value: "t" } });
    fireEvent.change(screen.getByLabelText(/^title$/i), { target: { value: "T" } });
    fireEvent.change(screen.getByLabelText(/^excerpt$/i), { target: { value: "ex" } });
    fireEvent.change(screen.getByLabelText(/^price$/i), { target: { value: "1" } });
    const tagInput = screen.getByPlaceholderText(/add tag/i);
    fireEvent.change(tagInput, { target: { value: "cozy" } });
    fireEvent.keyDown(tagInput, { key: "Enter" });
    fireEvent.click(screen.getByRole("button", { name: /create/i }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0].tags).toEqual(["cozy"]);
  });
});
