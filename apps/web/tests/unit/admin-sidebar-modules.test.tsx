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

function renderSidebar(data: unknown) {
  adminGetContent.mockResolvedValue({
    key: "site.modules", type: "SiteModules", data, sortIndex: 0, updatedAt: "",
  });
  return render(
    <AdminModulesProvider>
      <AdminSidebar pathname="/admin" user={{ email: "a@b.c", role: "Owner" }} onSignOut={() => {}} />
    </AdminModulesProvider>,
  );
}

describe("AdminSidebar module visibility", () => {
  afterEach(() => { cleanup(); adminGetContent.mockReset(); });

  test("keeps Products and Collections editable when both modules are off", async () => {
    renderSidebar({ cart: false, accounts: false });

    await waitFor(() => expect(screen.queryByText("Orders")).toBeNull());
    // The catalogue is the shop window for retailer links — never hidden.
    for (const kept of ["Products", "Collections", "Notify me", "Subscribers", "Freebies page"]) {
      expect(screen.getByText(kept)).toBeTruthy();
    }
    expect(screen.getByText("Catalog")).toBeTruthy();
    // Only the sections that depend on a disabled module disappear.
    expect(screen.queryByText("Orders")).toBeNull();
    expect(screen.queryByText("Customers")).toBeNull();
  });

  test("hides only Orders when just the cart is off", async () => {
    renderSidebar({ cart: false, accounts: true });

    await waitFor(() => expect(screen.queryByText("Orders")).toBeNull());
    expect(screen.getByText("Customers")).toBeTruthy();
  });

  test("hides only Customers when just accounts are off", async () => {
    renderSidebar({ cart: true, accounts: false });

    await waitFor(() => expect(screen.queryByText("Customers")).toBeNull());
    expect(screen.getByText("Orders")).toBeTruthy();
  });

  test("shows the full navigation while both modules are on", async () => {
    renderSidebar({ cart: true, accounts: true });

    await waitFor(() => expect(adminGetContent).toHaveBeenCalled());
    for (const label of ["Products", "Collections", "Orders", "Customers", "Notify me", "Subscribers"]) {
      expect(screen.getByText(label)).toBeTruthy();
    }
  });

  test("falls back to the full navigation when the toggle block does not exist", async () => {
    adminGetContent.mockRejectedValue(new Error("not found"));
    render(
      <AdminModulesProvider>
        <AdminSidebar pathname="/admin" user={{ email: "a@b.c", role: "Owner" }} onSignOut={() => {}} />
      </AdminModulesProvider>,
    );

    await waitFor(() => expect(adminGetContent).toHaveBeenCalled());
    expect(screen.getByText("Orders")).toBeTruthy();
  });
});
