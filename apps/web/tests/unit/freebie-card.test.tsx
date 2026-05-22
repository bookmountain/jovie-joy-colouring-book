import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FreebieCard } from "@/components/storefront/FreebieCard";
import type { FreebieListItem } from "@/lib/freebies";

const item: FreebieListItem = {
  slug: "demo",
  title: "Demo Freebie",
  excerpt: "Short excerpt",
  coverImage: "/uploads/freebies/covers/demo.png",
  fileKind: "pdf",
  fileSizeBytes: 524288,
  sortIndex: 0,
};

describe("FreebieCard", () => {
  it("renders title, excerpt, and file pill", () => {
    render(<FreebieCard item={item} onOpen={() => {}} />);
    expect(screen.getByText("Demo Freebie")).toBeInTheDocument();
    expect(screen.getByText("Short excerpt")).toBeInTheDocument();
    expect(screen.getByText(/PDF/i)).toBeInTheDocument();
  });

  it("does not render an anchor to /products/...", () => {
    const { container } = render(<FreebieCard item={item} onOpen={() => {}} />);
    expect(container.querySelector('a[href^="/products/"]')).toBeNull();
  });

  it("calls onOpen when the Get-for-free button is clicked", () => {
    const onOpen = vi.fn();
    render(<FreebieCard item={item} onOpen={onOpen} />);
    fireEvent.click(screen.getByRole("button", { name: /get for free/i }));
    expect(onOpen).toHaveBeenCalledWith(item);
  });
});
