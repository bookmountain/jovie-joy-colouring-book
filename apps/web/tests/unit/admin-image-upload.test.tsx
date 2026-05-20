import { describe, expect, test, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ImageUpload } from "@/components/admin/ImageUpload";

describe("ImageUpload", () => {
  test("calls upload and emits returned URL", async () => {
    const upload = vi.fn(async () => ({ url: "/uploads/x.png" }));
    const onChange = vi.fn();
    const { container } = render(
      <ImageUpload label="Hero" onChange={onChange} upload={upload} value={null} />,
    );

    const file = new File(["x"], "x.png", { type: "image/png" });
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    Object.defineProperty(input, "files", { value: [file] });
    fireEvent.change(input);

    await waitFor(() => {
      expect(upload).toHaveBeenCalledWith(file);
      expect(onChange).toHaveBeenCalledWith("/uploads/x.png");
    });
  });

  test("Remove clears value", () => {
    const onChange = vi.fn();
    render(
      <ImageUpload onChange={onChange} upload={vi.fn()} value="/uploads/existing.png" />,
    );
    fireEvent.click(screen.getByText("Remove"));
    expect(onChange).toHaveBeenCalledWith(null);
  });
});
