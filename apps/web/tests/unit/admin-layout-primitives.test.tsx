import { describe, expect, test } from "vitest";
import { render, screen } from "@testing-library/react";
import { AdminPanel } from "@/components/admin/ui/AdminPanel";
import { AdminPageHeader } from "@/components/admin/ui/AdminPageHeader";
import { AdminEmptyState } from "@/components/admin/ui/AdminEmptyState";

describe("AdminPanel", () => {
  test("renders sectionTag and children", () => {
    render(<AdminPanel sectionTag="Basics">hello</AdminPanel>);
    expect(screen.getByText("Basics")).toBeTruthy();
    expect(screen.getByText("hello")).toBeTruthy();
  });
  test("renders panel-hint when hint prop given", () => {
    const { container } = render(<AdminPanel hint="some hint">x</AdminPanel>);
    expect(container.querySelector(".panel-hint")?.textContent).toBe("some hint");
  });
  test.each(["default","danger","dashed"] as const)("variant %s sets data attribute", (v) => {
    const { container } = render(<AdminPanel variant={v}>x</AdminPanel>);
    expect((container.firstChild as HTMLElement).dataset.variant).toBe(v);
  });
  test("defaults to default variant", () => {
    const { container } = render(<AdminPanel>x</AdminPanel>);
    expect((container.firstChild as HTMLElement).dataset.variant).toBe("default");
  });
});

describe("AdminPageHeader", () => {
  test("renders crumb, title (h1), subtitle, actions slot", () => {
    render(<AdminPageHeader crumb="Catalog" title="Products" subtitle="23" actions={<button>x</button>} />);
    expect(screen.getByText("Catalog")).toBeTruthy();
    expect(screen.getByRole("heading", { level: 1, name: "Products" })).toBeTruthy();
    expect(screen.getByText("23")).toBeTruthy();
    expect(screen.getByRole("button", { name: "x" })).toBeTruthy();
  });
  test("omits crumb, subtitle, and actions when not provided", () => {
    const { container } = render(<AdminPageHeader title="Solo" />);
    expect(container.querySelector(".crumb")).toBeNull();
    expect(container.querySelector(".sub")).toBeNull();
    expect(container.querySelector(".actions")).toBeNull();
  });
});

describe("AdminEmptyState", () => {
  test("renders icon, heading, body, action", () => {
    render(
      <AdminEmptyState icon="📦" heading="Nothing here" body="add some" action={<button>add</button>} />,
    );
    expect(screen.getByText("📦")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Nothing here" })).toBeTruthy();
    expect(screen.getByText("add some")).toBeTruthy();
    expect(screen.getByRole("button", { name: "add" })).toBeTruthy();
  });
  test("omits optional slots when not provided", () => {
    const { container } = render(<AdminEmptyState heading="Bare" />);
    expect(container.querySelector(".ic")).toBeNull();
    expect(container.querySelector("p")).toBeNull();
  });
});
