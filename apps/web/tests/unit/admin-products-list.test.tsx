import { describe, expect, test, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AdminProductsPage from "@/app/admin/products/page";

const listMock = vi.fn();
const bulkMock = vi.fn();
const tagsMock = vi.fn();
const collectionsMock = vi.fn();
const duplicateMock = vi.fn();

vi.mock("@/lib/adminApi", () => ({
  adminListProducts: (...args: unknown[]) => listMock(...args),
  adminBulkProducts: (...args: unknown[]) => bulkMock(...args),
  adminListProductTags: (...args: unknown[]) => tagsMock(...args),
  adminListCollections: (...args: unknown[]) => collectionsMock(...args),
  adminDuplicateProduct: (...args: unknown[]) => duplicateMock(...args),
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
  collectionsMock.mockResolvedValue([{ slug: "new", title: "New" }]);
  tagsMock.mockResolvedValue(["cozy"]);
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
    expect(screen.getByText(/1 selected/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /^publish$/i }));
    await waitFor(() => expect(bulkMock).toHaveBeenCalledWith(expect.objectContaining({ action: "publish", slugs: ["a"] })));
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
