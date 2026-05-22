import { describe, expect, test, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AdminFormatPicker, PRODUCT_FORMATS } from "@/components/admin/product/AdminFormatPicker";

describe("AdminFormatPicker", () => {
  test("renders all three format tiles with sub-labels", () => {
    render(<AdminFormatPicker value="physical" onChange={() => {}} />);
    expect(PRODUCT_FORMATS).toHaveLength(3);
    for (const f of PRODUCT_FORMATS) {
      expect(screen.getByRole("radio", { name: new RegExp(f.label, "i") })).toBeTruthy();
    }
    // Verify all sub-labels are present (some may be duplicated like "Ships to address")
    expect(screen.getAllByText("Ships to address")).toHaveLength(2);
    expect(screen.getByText("Delivered by email")).toBeTruthy();
  });

  test("selected tile has data-state=on and aria-checked=true", () => {
    render(<AdminFormatPicker value="digital" onChange={() => {}} />);
    const tile = screen.getByRole("radio", { name: /digital/i });
    expect(tile.getAttribute("data-state")).toBe("on");
    expect(tile.getAttribute("aria-checked")).toBe("true");
  });

  test("non-selected tiles have data-state=off and aria-checked=false", () => {
    render(<AdminFormatPicker value="digital" onChange={() => {}} />);
    const tile = screen.getByRole("radio", { name: /physical/i });
    expect(tile.getAttribute("data-state")).toBe("off");
    expect(tile.getAttribute("aria-checked")).toBe("false");
  });

  test("clicking a tile calls onChange with its value", () => {
    const onChange = vi.fn();
    render(<AdminFormatPicker value="physical" onChange={onChange} />);
    fireEvent.click(screen.getByRole("radio", { name: /sticker/i }));
    expect(onChange).toHaveBeenCalledWith("sticker");
  });

  test("PRODUCT_FORMATS exports the three expected values in order", () => {
    expect(PRODUCT_FORMATS.map((f) => f.value)).toEqual(["physical", "digital", "sticker"]);
  });
});
