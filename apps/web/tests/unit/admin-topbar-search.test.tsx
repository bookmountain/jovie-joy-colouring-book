import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminTopbar } from "@/components/admin/AdminTopbar";

const searchMock = vi.fn();
vi.mock("@/lib/adminApi", () => ({
  adminQuickSearch: (...args: unknown[]) => searchMock(...args),
}));
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode } & Record<string, unknown>) =>
    <a href={href} {...props}>{children}</a>,
}));

beforeEach(() => {
  vi.clearAllMocks();
  searchMock.mockResolvedValue({
    items: [
      { type: "product", id: "moon", title: "Moon Book", subtitle: "physical · /moon", href: "/admin/products/moon" },
      { type: "cms", id: "navigation", title: "Navigation", subtitle: "Storefront navigation CMS", href: "/admin/navigation" },
    ],
  });
});

describe("AdminTopbar quick search", () => {
  it("debounces one cross-entity request and supports keyboard selection", async () => {
    render(<AdminTopbar />);
    const input = screen.getByRole("combobox", { name: "Quick search" });
    fireEvent.change(input, { target: { value: "moon" } });

    await waitFor(() => expect(searchMock).toHaveBeenCalledWith("moon", 12), { timeout: 1000 });
    expect(screen.getByRole("option", { name: /Moon Book/ })).toHaveAttribute("href", "/admin/products/moon");
    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(screen.getByRole("option", { name: /Navigation/ })).toHaveAttribute("aria-selected", "true");
  });

  it("opens and focuses from the command shortcut", () => {
    render(<AdminTopbar />);
    const input = screen.getByRole("combobox", { name: "Quick search" });
    fireEvent.keyDown(document, { key: "k", metaKey: true });
    expect(input).toHaveFocus();
    expect(input).toHaveAttribute("aria-expanded", "true");
  });

  it("announces completed result counts to assistive technology", async () => {
    render(<AdminTopbar />);
    fireEvent.change(screen.getByRole("combobox", { name: "Quick search" }), {
      target: { value: "moon" },
    });

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent("2 search results");
    });
  });

  it("clears the active descendant when Escape closes the results", async () => {
    render(<AdminTopbar />);
    const input = screen.getByRole("combobox", { name: "Quick search" });
    fireEvent.change(input, { target: { value: "moon" } });
    await waitFor(() => expect(screen.getAllByRole("option")).toHaveLength(2));
    expect(input).toHaveAttribute("aria-activedescendant", "admin-search-result-0");

    fireEvent.keyDown(input, { key: "Escape" });

    expect(input).not.toHaveAttribute("aria-activedescendant");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });
});
