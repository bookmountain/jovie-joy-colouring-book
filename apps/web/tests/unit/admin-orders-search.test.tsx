import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { OrdersTable } from "@/components/admin/OrdersTable";

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  query: new URLSearchParams("q=first@example.com&order=order-1"),
}));

vi.mock("next/navigation", () => ({ useSearchParams: () => mocks.query }));
vi.mock("@/lib/adminApi", () => ({
  adminListOrders: (...args: unknown[]) => mocks.list(...args),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.query = new URLSearchParams("q=first@example.com&order=order-1");
  mocks.list.mockResolvedValue({
    items: [{ id: "order-1", email: "first@example.com", status: "Paid", totalCents: 1234, createdAt: "2026-08-12T00:00:00Z", paidAt: "2026-08-12T00:00:00Z", items: [] }],
    total: 1, page: 1, pageSize: 20,
  });
});

describe("OrdersTable search deep links", () => {
  it("loads query search, expands the linked order, and has labelled filters", async () => {
    render(<OrdersTable />);
    await waitFor(() => expect(mocks.list).toHaveBeenCalledWith(undefined, 1, 20, "first@example.com"));
    expect(screen.getByLabelText("Search")).toHaveValue("first@example.com");
    expect(screen.getByLabelText("Status")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("button", { name: "Hide" })).toBeInTheDocument());
  });

  it("synchronizes when a second same-route quick-search link changes query params", async () => {
    const rendered = render(<OrdersTable />);
    await waitFor(() => expect(screen.getByLabelText("Search")).toHaveValue("first@example.com"));

    mocks.query = new URLSearchParams("q=order-2&order=order-2");
    rendered.rerender(<OrdersTable />);
    await waitFor(() => expect(screen.getByLabelText("Search")).toHaveValue("order-2"));
    await waitFor(() => expect(mocks.list).toHaveBeenLastCalledWith(undefined, 1, 20, "order-2"));

    fireEvent.change(screen.getByLabelText("Status"), { target: { value: "paid" } });
    await waitFor(() => expect(mocks.list).toHaveBeenLastCalledWith("paid", 1, 20, "order-2"));
  });

  it("does not let a slower old search overwrite newer results", async () => {
    let resolveSlow!: (value: unknown) => void;
    let resolveSecond!: (value: unknown) => void;
    mocks.list
      .mockResolvedValueOnce({
        items: [{ id: "order-1", email: "first@example.com", status: "Paid", totalCents: 1234, createdAt: "2026-08-12T00:00:00Z", paidAt: null, items: [] }],
        total: 1, page: 1, pageSize: 20,
      })
      .mockImplementationOnce(() => new Promise((resolve) => { resolveSlow = resolve; }))
      .mockImplementationOnce(() => new Promise((resolve) => { resolveSecond = resolve; }));
    render(<OrdersTable />);
    await waitFor(() => expect(screen.getByLabelText("Search")).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText("Search"), { target: { value: "slow@example.com" } });
    await waitFor(() => expect(mocks.list).toHaveBeenCalledTimes(2));
    fireEvent.change(screen.getByLabelText("Search"), { target: { value: "second@example.com" } });
    await waitFor(() => expect(mocks.list).toHaveBeenCalledTimes(3));
    resolveSecond({
      items: [{ id: "order-2", email: "second@example.com", status: "Paid", totalCents: 500, createdAt: "2026-08-12T00:00:00Z", paidAt: null, items: [] }],
      total: 1, page: 1, pageSize: 20,
    });
    await waitFor(() => expect(screen.getByText("second@example.com")).toBeInTheDocument());

    resolveSlow({
      items: [{ id: "order-1", email: "stale@example.com", status: "Paid", totalCents: 500, createdAt: "2026-08-12T00:00:00Z", paidAt: null, items: [] }],
      total: 1, page: 1, pageSize: 20,
    });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(screen.queryByText("stale@example.com")).not.toBeInTheDocument();
  });
});
