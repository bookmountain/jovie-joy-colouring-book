import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode } & Record<string, unknown>) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

describe("AdminSidebar", () => {
  afterEach(() => cleanup());

  test("renders all five groups with the locked items", () => {
    render(<AdminSidebar pathname="/admin/products" user={{ email: "a@b.c", role: "Owner" }} onSignOut={() => {}} />);
    for (const g of ["Overview", "Catalog", "Commerce", "Site content", "Editorial"]) {
      expect(screen.getByText(g)).toBeTruthy();
    }
    for (const n of ["Dashboard", "Products", "Collections", "Orders", "Customers", "Notify me", "Subscribers", "Home page", "Header & Footer", "Announcement", "Static pages"]) {
      expect(screen.getAllByText(n).length).toBeGreaterThanOrEqual(1);
    }
    for (const n of ["Blog", "Comics", "Gallery", "FAQ", "Featured On"]) {
      const node = screen.getByText(n).closest("[data-soon]");
      expect(node?.getAttribute("data-soon")).toBe("true");
    }
  });

  test("marks the active nav item", () => {
    render(<AdminSidebar pathname="/admin/products" user={{ email: "a@b.c", role: "Owner" }} onSignOut={() => {}} />);
    const products = screen.getByText("Products").closest("[data-active]");
    expect(products?.getAttribute("data-active")).toBe("true");
  });

  test("sub-routes still mark parent active (/admin/products/abc)", () => {
    render(<AdminSidebar pathname="/admin/products/cozy-christmas" user={{ email: "a@b.c", role: "Owner" }} onSignOut={() => {}} />);
    const products = screen.getByText("Products").closest("[data-active]");
    expect(products?.getAttribute("data-active")).toBe("true");
  });

  test("does NOT set body.admin-route on its own (AdminShell handles that)", () => {
    cleanup();
    document.body.classList.remove("admin-route");
    render(<AdminSidebar pathname="/admin" user={{ email: "a@b.c", role: "Owner" }} onSignOut={() => {}} />);
    expect(document.body.classList.contains("admin-route")).toBe(false);
  });
});

describe("AdminShell body class side-effect", () => {
  beforeEach(() => { document.body.classList.remove("admin-route"); });
  afterEach(() => { cleanup(); document.body.classList.remove("admin-route"); });

  test("AdminShell adds admin-route to body for non-login routes", async () => {
    const { AdminShell } = await import("@/components/admin/AdminShell");
    render(
      <AdminShell pathname="/admin/products" user={{ email: "a@b.c", role: "Owner" }} onSignOut={() => {}}>
        <div>page body</div>
      </AdminShell>,
    );
    expect(document.body.classList.contains("admin-route")).toBe(true);
  });

  test("AdminShell renders children only on /admin/login (no sidebar/topbar) but still applies admin-route so design tokens work", async () => {
    const { AdminShell } = await import("@/components/admin/AdminShell");
    const { container } = render(
      <AdminShell pathname="/admin/login" user={null} onSignOut={() => {}}>
        <div>login form</div>
      </AdminShell>,
    );
    // Tokens MUST be available so the login form's AdminButton/AdminPanel render correctly.
    expect(document.body.classList.contains("admin-route")).toBe(true);
    // But the sidebar / topbar should NOT be rendered on the login route.
    expect(container.querySelector(".admin-side")).toBeNull();
    expect(container.querySelector(".admin-topbar")).toBeNull();
    expect(screen.getByText("login form")).toBeTruthy();
  });
});
