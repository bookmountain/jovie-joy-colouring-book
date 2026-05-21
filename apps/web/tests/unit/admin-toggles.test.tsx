import { describe, expect, test, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AdminSwitch } from "@/components/admin/ui/AdminSwitch";
import { AdminCheckbox } from "@/components/admin/ui/AdminCheckbox";

describe("AdminSwitch", () => {
  test("data-state reflects checked; clicking calls onChange(!checked)", () => {
    const onChange = vi.fn();
    const { rerender } = render(<AdminSwitch checked={false} onChange={onChange} aria-label="t" />);
    const btn = screen.getByRole("switch");
    expect(btn.getAttribute("data-state")).toBe("off");
    fireEvent.click(btn);
    expect(onChange).toHaveBeenCalledWith(true);
    rerender(<AdminSwitch checked={true} onChange={onChange} aria-label="t" />);
    expect(screen.getByRole("switch").getAttribute("data-state")).toBe("on");
  });

  test("aria-checked reflects checked prop", () => {
    const { rerender } = render(<AdminSwitch checked={false} onChange={() => {}} aria-label="t" />);
    expect(screen.getByRole("switch").getAttribute("aria-checked")).toBe("false");
    rerender(<AdminSwitch checked={true} onChange={() => {}} aria-label="t" />);
    expect(screen.getByRole("switch").getAttribute("aria-checked")).toBe("true");
  });

  test("disabled switch does not fire onChange when clicked", () => {
    const onChange = vi.fn();
    render(<AdminSwitch checked={false} onChange={onChange} disabled aria-label="t" />);
    fireEvent.click(screen.getByRole("switch"));
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe("AdminCheckbox", () => {
  test("renders check glyph when on; toggles via click", () => {
    const onChange = vi.fn();
    const { rerender } = render(<AdminCheckbox checked={false} onChange={onChange} aria-label="t" />);
    const btn = screen.getByRole("checkbox");
    expect(btn.getAttribute("data-state")).toBe("off");
    fireEvent.click(btn);
    expect(onChange).toHaveBeenCalledWith(true);
    rerender(<AdminCheckbox checked={true} onChange={onChange} aria-label="t" />);
    expect(screen.getByRole("checkbox").getAttribute("data-state")).toBe("on");
  });

  test("aria-checked reflects checked prop", () => {
    const { rerender } = render(<AdminCheckbox checked={false} onChange={() => {}} aria-label="t" />);
    expect(screen.getByRole("checkbox").getAttribute("aria-checked")).toBe("false");
    rerender(<AdminCheckbox checked={true} onChange={() => {}} aria-label="t" />);
    expect(screen.getByRole("checkbox").getAttribute("aria-checked")).toBe("true");
  });

  test("disabled checkbox does not fire onChange when clicked", () => {
    const onChange = vi.fn();
    render(<AdminCheckbox checked={false} onChange={onChange} disabled aria-label="t" />);
    fireEvent.click(screen.getByRole("checkbox"));
    expect(onChange).not.toHaveBeenCalled();
  });
});
