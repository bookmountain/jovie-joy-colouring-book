import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FaqLinksEditor } from "@/components/admin/FaqLinksEditor";
import { FaqLinks } from "@/components/content/faq-links";

describe("FAQ retailer links", () => {
  it("renders the CMS links as retailer buttons", () => {
    render(
      <FaqLinks
        links={[
          { label: "Amazon", href: "https://www.amazon.com/" },
          { label: "Penguin Random House", href: "https://www.penguinrandomhouse.com/" },
        ]}
      />,
    );

    expect(screen.getByRole("link", { name: "Amazon" })).toHaveAttribute("href", "https://www.amazon.com/");
    expect(screen.getByRole("link", { name: "Penguin Random House" })).toHaveAttribute(
      "href",
      "https://www.penguinrandomhouse.com/",
    );
  });

  it("adds, edits, and removes retailer links in the CMS editor", () => {
    const addChange = vi.fn();
    const { rerender } = render(<FaqLinksEditor idPrefix="faq" onChange={addChange} value={[]} />);
    fireEvent.click(screen.getByRole("button", { name: "+ Add retailer" }));
    expect(addChange).toHaveBeenCalledWith([{ label: "", href: "" }]);

    const editChange = vi.fn();
    rerender(
      <FaqLinksEditor
        idPrefix="faq"
        onChange={editChange}
        value={[{ label: "Amazon", href: "https://www.amazon.com/" }]}
      />,
    );
    fireEvent.change(screen.getByLabelText("Button label"), { target: { value: "Amazon AU" } });
    expect(editChange).toHaveBeenCalledWith([{ label: "Amazon AU", href: "https://www.amazon.com/" }]);

    fireEvent.click(screen.getByRole("button", { name: "Remove Amazon button" }));
    expect(editChange).toHaveBeenCalledWith([]);
  });
});
