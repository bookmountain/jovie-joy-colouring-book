import { describe, expect, test, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import AdminProductsPage from "@/app/admin/products/page";

const listMock = vi.fn();
const bulkMock = vi.fn();
const tagsMock = vi.fn();
const collectionsMock = vi.fn();
const duplicateMock = vi.fn();
const importMock = vi.fn();

vi.mock("@/lib/adminApi", () => ({
  adminListProducts: (...args: unknown[]) => listMock(...args),
  adminBulkProducts: (...args: unknown[]) => bulkMock(...args),
  adminListProductTags: (...args: unknown[]) => tagsMock(...args),
  adminListCollections: (...args: unknown[]) => collectionsMock(...args),
  adminDuplicateProduct: (...args: unknown[]) => duplicateMock(...args),
  adminImportProductsCsv: (...args: unknown[]) => importMock(...args),
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode } & Record<string, unknown>) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

const PRODUCT = (overrides: Partial<{ slug: string; title: string; status: string; productType: string; primaryImage: string | null }> = {}) => ({
  slug: overrides.slug ?? "a", title: overrides.title ?? "Alpha", excerpt: "",
  priceCents: 100, compareAtPriceCents: null, available: true,
  productType: overrides.productType ?? "physical",
  status: overrides.status ?? "published",
  tags: [], collectionSlugs: [],
  primaryImage: overrides.primaryImage ?? null,
  publishedAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-02T00:00:00Z",
});

beforeEach(() => {
  listMock.mockReset();
  bulkMock.mockReset();
  tagsMock.mockReset();
  collectionsMock.mockReset();
  duplicateMock.mockReset();
  importMock.mockReset();
  collectionsMock.mockResolvedValue([{ slug: "new", title: "New" }]);
  tagsMock.mockResolvedValue(["cozy"]);
  bulkMock.mockResolvedValue({ updated: 1, missing: [] });
  listMock.mockResolvedValue({ items: [PRODUCT(), PRODUCT({ slug: "b", title: "Beta" })], total: 2, page: 1, pageSize: 25 });
});

describe("/admin/products list", () => {
  test("loads first page on mount and renders rows", async () => {
    render(<AdminProductsPage />);
    await waitFor(() => expect(screen.getByText("Alpha")).toBeTruthy());
    expect(screen.getByText("Beta")).toBeTruthy();
    expect(listMock).toHaveBeenCalled();
    const firstQuery = listMock.mock.calls[0][0];
    expect(firstQuery.page).toBe(1);
  });

  test("typing in search re-queries (debounce expected via useEffect/timeout)", async () => {
    render(<AdminProductsPage />);
    await waitFor(() => expect(screen.getByText("Alpha")).toBeTruthy());
    fireEvent.change(screen.getByPlaceholderText(/search/i), { target: { value: "cozy" } });
    await waitFor(() => expect(listMock).toHaveBeenLastCalledWith(expect.objectContaining({ q: "cozy" })), { timeout: 1000 });
  });

  test("selecting rows reveals the bulk bar with publish action", async () => {
    render(<AdminProductsPage />);
    await waitFor(() => expect(screen.getByText("Alpha")).toBeTruthy());
    // Row checkboxes — the first checkbox is the header "select all", subsequent are per-row
    const checkboxes = screen.getAllByRole("checkbox");
    fireEvent.click(checkboxes[1]);
    expect(within(screen.getByRole("status")).getByText(/1 selected/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /^publish$/i }));
    await waitFor(() => expect(bulkMock).toHaveBeenCalledWith(expect.objectContaining({ action: "publish", slugs: ["a"] })));
  });

  test.each([
    ["In stock", "mark-available"],
    ["Out of stock", "mark-unavailable"],
  ])("bulk %s sends an explicit availability-only action", async (label, action) => {
    render(<AdminProductsPage />);
    await waitFor(() => expect(screen.getByText("Alpha")).toBeTruthy());
    fireEvent.click(screen.getByRole("checkbox", { name: "select a" }));
    fireEvent.click(within(screen.getByRole("status")).getByRole("button", { name: label }));
    await waitFor(() => expect(bulkMock).toHaveBeenCalledWith({ slugs: ["a"], action, payload: undefined }));
  });

  test("clears the bulk selection when the search result scope changes", async () => {
    render(<AdminProductsPage />);
    await waitFor(() => expect(screen.getByText("Alpha")).toBeTruthy());
    fireEvent.click(screen.getByRole("checkbox", { name: "select a" }));
    expect(screen.getByText(/1 selected/)).toBeTruthy();

    fireEvent.change(screen.getByPlaceholderText(/search/i), { target: { value: "different scope" } });

    await waitFor(() => expect(listMock).toHaveBeenLastCalledWith(expect.objectContaining({ q: "different scope" })), { timeout: 1000 });
    await waitFor(() => expect(screen.queryByText(/1 selected/)).toBeNull());
  });

  test("reports mixed results and retains only missing product selections", async () => {
    bulkMock.mockResolvedValueOnce({ updated: 1, missing: ["b"] });
    render(<AdminProductsPage />);
    await waitFor(() => expect(screen.getByText("Alpha")).toBeTruthy());
    fireEvent.click(screen.getByRole("checkbox", { name: "select a" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "select b" }));

    fireEvent.click(within(screen.getByRole("status")).getByRole("button", { name: "Publish" }));

    const warning = await screen.findByRole("alert");
    expect(warning.textContent).toMatch(/1 selected product no longer exists/i);
    expect(warning.textContent).toContain("b");
    expect(within(screen.getByRole("status")).getByText(/1 selected/)).toBeTruthy();
    expect(screen.getByRole("checkbox", { name: "select a" }).getAttribute("aria-checked")).toBe("false");
    expect(screen.getByRole("checkbox", { name: "select b" }).getAttribute("aria-checked")).toBe("true");
  });

  test("warns and retains the selection when the API rejects an oversized bulk request", async () => {
    const products = Array.from({ length: 101 }, (_, index) => PRODUCT({
      slug: `product-${index}`,
      title: `Product ${index}`,
    }));
    listMock.mockResolvedValue({ items: products, total: products.length, page: 1, pageSize: 25 });
    bulkMock.mockRejectedValueOnce(new Error("A bulk action can target at most 100 products."));
    render(<AdminProductsPage />);
    await waitFor(() => expect(screen.getByText("Product 0")).toBeTruthy());
    fireEvent.click(screen.getByRole("checkbox", { name: "select all rows" }));
    expect(screen.getByText(/101 selected/)).toBeTruthy();

    fireEvent.click(within(screen.getByRole("status")).getByRole("button", { name: "Publish" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("A bulk action can target at most 100 products.");
    expect(screen.getByText(/101 selected/)).toBeTruthy();
    expect(screen.getByRole("checkbox", { name: "select product-100" }).getAttribute("aria-checked")).toBe("true");
  });

  test("renders uploaded product thumbnails from the API host", async () => {
    listMock.mockResolvedValue({
      items: [PRODUCT({ primaryImage: "/uploads/products/alpha.png" })],
      total: 1,
      page: 1,
      pageSize: 25,
    });
    const { container } = render(<AdminProductsPage />);
    await waitFor(() => expect(screen.getByText("Alpha")).toBeTruthy());
    expect(container.querySelector("img")?.getAttribute("src")).toBe("http://localhost:8080/uploads/products/alpha.png");
  });

  test("empty state shows 'Add your first product' when total=0", async () => {
    listMock.mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 25 });
    render(<AdminProductsPage />);
    await waitFor(() => expect(screen.getByText(/no products yet/i)).toBeTruthy());
  });
});
