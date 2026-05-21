import { describe, expect, test, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { AdminBadge } from "@/components/admin/ui/AdminBadge";
import { AdminChip } from "@/components/admin/ui/AdminChip";

describe("AdminButton", () => {
  test("renders with primary variant by default and fires click", () => {
    const onClick = vi.fn();
    render(<AdminButton onClick={onClick}>Save</AdminButton>);
    const btn = screen.getByRole("button", { name: "Save" });
    expect(btn.getAttribute("data-variant")).toBe("primary");
    expect(btn.getAttribute("data-size")).toBe("md");
    fireEvent.click(btn);
    expect(onClick).toHaveBeenCalled();
  });
  test.each(["primary","ghost","dark","danger"] as const)("variant %s sets data attribute", (v) => {
    render(<AdminButton variant={v}>x</AdminButton>);
    expect(screen.getByRole("button").getAttribute("data-variant")).toBe(v);
  });
  test("size=sm sets data attribute", () => {
    render(<AdminButton size="sm">x</AdminButton>);
    expect(screen.getByRole("button").getAttribute("data-size")).toBe("sm");
  });
  test("disabled button does not fire onClick", () => {
    const onClick = vi.fn();
    render(<AdminButton disabled onClick={onClick}>x</AdminButton>);
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).not.toHaveBeenCalled();
  });
  test("type defaults to button (not submit)", () => {
    render(<AdminButton>x</AdminButton>);
    expect(screen.getByRole("button").getAttribute("type")).toBe("button");
  });
});

describe("AdminBadge", () => {
  test.each(["pub","draft","scheduled","oos","neutral"] as const)("variant %s sets data attribute", (v) => {
    render(<AdminBadge variant={v}>x</AdminBadge>);
    expect(screen.getByText("x").getAttribute("data-variant")).toBe(v);
  });
  test("defaults to neutral when no variant given", () => {
    render(<AdminBadge>x</AdminBadge>);
    expect(screen.getByText("x").getAttribute("data-variant")).toBe("neutral");
  });
});

describe("AdminChip", () => {
  test("default variant renders without dismiss button", () => {
    render(<AdminChip>tag</AdminChip>);
    expect(screen.getByText("tag").getAttribute("data-variant")).toBe("default");
    expect(screen.queryByRole("button", { name: /remove tag/i })).toBeNull();
  });
  test("dismissible chip fires onDismiss", () => {
    const onDismiss = vi.fn();
    render(<AdminChip onDismiss={onDismiss}>tag</AdminChip>);
    fireEvent.click(screen.getByRole("button", { name: /remove tag/i }));
    expect(onDismiss).toHaveBeenCalled();
  });
  test("dismiss button click does not bubble to parent click handler", () => {
    const onParentClick = vi.fn();
    const onDismiss = vi.fn();
    render(
      <div onClick={onParentClick}>
        <AdminChip onDismiss={onDismiss}>tag</AdminChip>
      </div>,
    );
    fireEvent.click(screen.getByRole("button", { name: /remove tag/i }));
    expect(onDismiss).toHaveBeenCalled();
    expect(onParentClick).not.toHaveBeenCalled();
  });
  test("add variant renders as button (clickable)", () => {
    const onClick = vi.fn();
    render(<AdminChip variant="add" onClick={onClick}>+ add</AdminChip>);
    const btn = screen.getByRole("button", { name: /\+ add/ });
    fireEvent.click(btn);
    expect(onClick).toHaveBeenCalled();
  });
});
