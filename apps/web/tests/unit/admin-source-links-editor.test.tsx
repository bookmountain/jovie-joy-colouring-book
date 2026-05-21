import { describe, expect, test, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AdminSourceLinksEditor } from "@/components/admin/product/AdminSourceLinksEditor";

const upload = vi.fn(async (_f: File) => ({ url: "/u/btn.png" }));

describe("AdminSourceLinksEditor", () => {
  test("Add row button appends a blank source link", () => {
    const onChange = vi.fn();
    render(<AdminSourceLinksEditor value={[]} onChange={onChange} upload={upload} />);
    fireEvent.click(screen.getByRole("button", { name: /\+ add source link/i }));
    expect(onChange).toHaveBeenCalledWith([{ label: "", href: "", image: undefined, alt: undefined }]);
  });

  test("editing label fires onChange", () => {
    const onChange = vi.fn();
    render(
      <AdminSourceLinksEditor
        value={[{ label: "Penguin", href: "https://x", image: undefined, alt: undefined }]}
        onChange={onChange}
        upload={upload}
      />,
    );
    fireEvent.change(screen.getByDisplayValue("Penguin"), { target: { value: "Penguin Random House" } });
    expect(onChange).toHaveBeenCalledWith([
      { label: "Penguin Random House", href: "https://x", image: undefined, alt: undefined },
    ]);
  });

  test("editing href fires onChange", () => {
    const onChange = vi.fn();
    render(
      <AdminSourceLinksEditor
        value={[{ label: "Penguin", href: "https://x", image: undefined, alt: undefined }]}
        onChange={onChange}
        upload={upload}
      />,
    );
    fireEvent.change(screen.getByDisplayValue("https://x"), { target: { value: "https://y" } });
    expect(onChange).toHaveBeenCalledWith([
      { label: "Penguin", href: "https://y", image: undefined, alt: undefined },
    ]);
  });

  test("remove button drops the row", () => {
    const onChange = vi.fn();
    render(
      <AdminSourceLinksEditor
        value={[
          { label: "A", href: "https://a", image: undefined, alt: undefined },
          { label: "B", href: "https://b", image: undefined, alt: undefined },
        ]}
        onChange={onChange}
        upload={upload}
      />,
    );
    fireEvent.click(screen.getAllByRole("button", { name: /remove source link/i })[0]);
    expect(onChange).toHaveBeenCalledWith([{ label: "B", href: "https://b", image: undefined, alt: undefined }]);
  });

  test("empty state renders only the Add button", () => {
    render(<AdminSourceLinksEditor value={[]} onChange={() => {}} upload={upload} />);
    expect(screen.queryByDisplayValue(/./)).toBeNull();
    expect(screen.getByRole("button", { name: /\+ add source link/i })).toBeTruthy();
  });
});
