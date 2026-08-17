import { describe, expect, test, vi, afterEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminModulesProvider } from "@/state/admin-modules";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode } & Record<string, unknown>) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

const adminGetContent = vi.hoisted(() => vi.fn());
vi.mock("@/lib/adminApi", () => ({ adminGetContent }));

function renderSidebar() {
  return render(
    <AdminModulesProvider>
      <AdminSidebar pathname="/admin" user={{ email: "a@b.c", role: "Owner" }} onSignOut={() => {}} />
    </AdminModulesProvider>,
  );
}

describe("AdminSidebar shop module visibility", () => {
  afterEach(() => { cleanup(); adminGetContent.mockReset(); });

  test("hides catalogue and commerce sections while the shop module is off", async () => {
    adminGetContent.mockResolvedValue({
      key: "site.modules", type: "SiteModules", data: { shop: false }, sortIndex: 0, updatedAt: "",
    });
    renderSidebar();

    await waitFor(() => expect(screen.queryByText("Products")).toBeNull());
    for (const hidden of ["Products", "Collections", "Orders", "Customers", "Notify me"]) {
      expect(screen.queryByText(hidden)).toBeNull();
    }
    // The whole Catalog group disappears; Commerce keeps only Subscribers.
    expect(screen.queryByText("Catalog")).toBeNull();
    expect(screen.getByText("Commerce")).toBeTruthy();
    expect(screen.getByText("Subscribers")).toBeTruthy();
    // Content sections are untouched.
    for (const kept of ["Dashboard", "Freebies page", "Home page", "Blog"]) {
      expect(screen.getByText(kept)).toBeTruthy();
    }
  });

  test("shows the full navigation while the shop module is on", async () => {
    adminGetContent.mockResolvedValue({
      key: "site.modules", type: "SiteModules", data: { shop: true }, sortIndex: 0, updatedAt: "",
    });
    renderSidebar();

    await waitFor(() => expect(adminGetContent).toHaveBeenCalled());
    for (const label of ["Products", "Collections", "Orders", "Customers", "Notify me", "Subscribers"]) {
      expect(screen.getByText(label)).toBeTruthy();
    }
  });

  test("falls back to the full navigation when the toggle block does not exist", async () => {
    adminGetContent.mockRejectedValue(new Error("not found"));
    renderSidebar();

    await waitFor(() => expect(adminGetContent).toHaveBeenCalled());
    expect(screen.getByText("Products")).toBeTruthy();
  });
});
