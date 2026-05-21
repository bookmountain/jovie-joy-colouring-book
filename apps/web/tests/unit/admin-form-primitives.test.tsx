import { describe, expect, test, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AdminInput } from "@/components/admin/ui/AdminInput";
import { AdminTextarea } from "@/components/admin/ui/AdminTextarea";
import { AdminSelect } from "@/components/admin/ui/AdminSelect";
import { AdminLabel } from "@/components/admin/ui/AdminLabel";
import { AdminField } from "@/components/admin/ui/AdminField";

describe("AdminInput", () => {
  test("applies admin-input class and forwards value/onChange", () => {
    const onChange = vi.fn();
    render(<AdminInput value="hi" onChange={onChange} aria-label="t" />);
    const el = screen.getByLabelText("t") as HTMLInputElement;
    expect(el.className).toContain("admin-input");
    fireEvent.change(el, { target: { value: "bye" } });
    expect(onChange).toHaveBeenCalled();
  });
  test("size=lg toggles the .lg variant", () => {
    render(<AdminInput size="lg" defaultValue="x" aria-label="t" />);
    expect((screen.getByLabelText("t") as HTMLInputElement).className).toMatch(/\blg\b/);
  });
});

describe("AdminTextarea", () => {
  test("renders with admin-textarea class", () => {
    render(<AdminTextarea defaultValue="x" aria-label="t" />);
    expect(screen.getByLabelText("t").className).toContain("admin-textarea");
  });
});

describe("AdminSelect", () => {
  test("renders options and forwards change", () => {
    const onChange = vi.fn();
    render(
      <AdminSelect value="a" onChange={onChange} aria-label="t">
        <option value="a">A</option>
        <option value="b">B</option>
      </AdminSelect>,
    );
    fireEvent.change(screen.getByLabelText("t"), { target: { value: "b" } });
    expect(onChange).toHaveBeenCalled();
  });
});

describe("AdminLabel + AdminField", () => {
  test("AdminField wraps label + control", () => {
    render(
      <AdminField>
        <AdminLabel htmlFor="x">Name</AdminLabel>
        <AdminInput id="x" defaultValue="" />
      </AdminField>,
    );
    expect(screen.getByText("Name").tagName).toBe("LABEL");
  });
  test("AdminLabel renders hint text when provided", () => {
    render(<AdminLabel hint="optional">Name</AdminLabel>);
    expect(screen.getByText(/Name/)).toBeTruthy();
    expect(screen.getByText(/—\s*optional/)).toBeTruthy();
  });
});
