import { beforeEach, describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import CustomersPage from "@/app/admin/customers/page";
import NotifyMePage from "@/app/admin/notify-me/page";
import SubscribersPage from "@/app/admin/subscribers/page";

const customersMock = vi.fn();
const notifyMeMock = vi.fn();
const subscribersMock = vi.fn();

vi.mock("@/lib/adminApi", () => ({
  adminListCustomers: (...args: unknown[]) => customersMock(...args),
  adminListNotifyMe: (...args: unknown[]) => notifyMeMock(...args),
  adminListSubscribers: (...args: unknown[]) => subscribersMock(...args),
}));

beforeEach(() => {
  customersMock.mockReset().mockResolvedValue({
    items: [{
      email: "ada@example.com", name: "Ada Artist", registered: true,
      orderCount: 2, lifetimeSpendCents: 2500,
      lastOrderAt: "2026-01-05T00:00:00Z", joinedAt: "2026-01-01T00:00:00Z",
    }],
    total: 1, page: 1, pageSize: 25,
  });
  notifyMeMock.mockReset().mockResolvedValue({
    items: [{
      id: "request-1", email: "waiting@example.com", productSlug: "moon-book",
      productTitle: "Moon Book", createdAt: "2026-02-01T00:00:00Z",
    }],
    total: 1, page: 1, pageSize: 25,
  });
  subscribersMock.mockReset().mockResolvedValue({
    items: [{ email: "reader@example.com", createdAt: "2026-03-01T00:00:00Z" }],
    total: 1, page: 1, pageSize: 25,
  });
});

describe("audience admin pages", () => {
  test("CustomersPage loads customer metrics and searches", async () => {
    render(<CustomersPage />);
    expect(screen.getByRole("heading", { level: 1, name: "Customers" })).toBeTruthy();
    await waitFor(() => expect(screen.getByText("Ada Artist")).toBeTruthy());
    expect(screen.getByText("ada@example.com")).toBeTruthy();
    expect(screen.getByText("$25.00")).toBeTruthy();
    expect(screen.getByText("Registered")).toBeTruthy();

    fireEvent.change(screen.getByPlaceholderText(/search customers/i), { target: { value: "ada" } });
    await waitFor(() => expect(customersMock).toHaveBeenLastCalledWith("ada", 1, 25));
  });

  test("NotifyMePage loads email, product, and request date", async () => {
    render(<NotifyMePage />);
    expect(screen.getByRole("heading", { level: 1, name: "Notify me" })).toBeTruthy();
    await waitFor(() => expect(screen.getByText("waiting@example.com")).toBeTruthy());
    expect(screen.getByText("Moon Book")).toBeTruthy();
    expect(screen.getByText("/moon-book")).toBeTruthy();
  });

  test("SubscribersPage loads subscribers and handles an empty search", async () => {
    render(<SubscribersPage />);
    expect(screen.getByRole("heading", { level: 1, name: "Subscribers" })).toBeTruthy();
    await waitFor(() => expect(screen.getByText("reader@example.com")).toBeTruthy());

    subscribersMock.mockResolvedValueOnce({ items: [], total: 0, page: 1, pageSize: 25 });
    fireEvent.change(screen.getByPlaceholderText(/search subscribers/i), { target: { value: "missing" } });
    await waitFor(() => expect(screen.getByText("No matching subscribers")).toBeTruthy());
  });
});
