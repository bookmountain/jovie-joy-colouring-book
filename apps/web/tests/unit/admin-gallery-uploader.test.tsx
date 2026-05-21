import { describe, expect, test, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AdminGalleryUploader } from "@/components/admin/product/AdminGalleryUploader";

const upload = vi.fn(async (_f: File) => ({ url: "/u/x.png" }));

beforeEach(() => { upload.mockClear(); });

describe("AdminGalleryUploader", () => {
  test("renders one tile per value + add tile", () => {
    render(<AdminGalleryUploader value={["/a.png","/b.png"]} onChange={() => {}} upload={upload} />);
    expect(screen.getAllByRole("img")).toHaveLength(2);
    expect(screen.getByRole("button", { name: /upload images/i })).toBeTruthy();
  });

  test("marks the first tile as primary", () => {
    render(<AdminGalleryUploader value={["/a.png","/b.png"]} onChange={() => {}} upload={upload} />);
    const tiles = screen.getAllByRole("img").map((img) => img.parentElement);
    expect(tiles[0]?.getAttribute("data-primary")).toBe("true");
    expect(tiles[1]?.getAttribute("data-primary")).toBeNull();
  });

  test("remove button emits onChange without that item", () => {
    const onChange = vi.fn();
    render(<AdminGalleryUploader value={["/a.png","/b.png"]} onChange={onChange} upload={upload} />);
    fireEvent.click(screen.getAllByRole("button", { name: /^remove image/i })[1]);
    expect(onChange).toHaveBeenCalledWith(["/a.png"]);
  });

  test("set-as-primary button moves item to index 0", () => {
    const onChange = vi.fn();
    render(<AdminGalleryUploader value={["/a.png","/b.png"]} onChange={onChange} upload={upload} />);
    fireEvent.click(screen.getByRole("button", { name: /set as primary/i }));
    expect(onChange).toHaveBeenCalledWith(["/b.png", "/a.png"]);
  });

  test("move-right swaps with neighbor", () => {
    const onChange = vi.fn();
    render(<AdminGalleryUploader value={["/a.png","/b.png","/c.png"]} onChange={onChange} upload={upload} />);
    fireEvent.click(screen.getAllByRole("button", { name: /^move right$/i })[0]);
    expect(onChange).toHaveBeenCalledWith(["/b.png", "/a.png", "/c.png"]);
  });

  test("upload appends new URL", async () => {
    const onChange = vi.fn();
    render(<AdminGalleryUploader value={["/a.png"]} onChange={onChange} upload={upload} />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["x"], "x.png", { type: "image/png" });
    Object.defineProperty(input, "files", { value: [file] });
    fireEvent.change(input);
    await vi.waitFor(() => expect(onChange).toHaveBeenCalledWith(["/a.png", "/u/x.png"]));
  });

  test("emptyHint shows when value is empty", () => {
    render(<AdminGalleryUploader value={[]} onChange={() => {}} upload={upload} emptyHint="Optional gallery" />);
    expect(screen.getByText("Optional gallery")).toBeTruthy();
  });

  test("emptyHint hidden when value is non-empty", () => {
    render(<AdminGalleryUploader value={["/a.png"]} onChange={() => {}} upload={upload} emptyHint="Optional gallery" />);
    expect(screen.queryByText("Optional gallery")).toBeNull();
  });
});
