import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { AdminAuthProvider, useAdminAuth } from "@/state/admin-auth";

function Probe() {
  const { user, status } = useAdminAuth();
  return (
    <div data-testid="probe">
      {status}-{user?.email ?? "none"}
    </div>
  );
}

beforeEach(() => {
  window.localStorage.setItem("zoe-book-token", "stub");
  globalThis.fetch = vi.fn(async () =>
    new Response(
      JSON.stringify({
        id: "u1",
        email: "admin@x.com",
        name: null,
        avatarUrl: null,
        isAdmin: true,
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    )) as typeof fetch;
});

afterEach(() => {
  vi.restoreAllMocks();
  window.localStorage.clear();
});

describe("AdminAuthProvider", () => {
  test("loads current user when token present", async () => {
    render(
      <AdminAuthProvider>
        <Probe />
      </AdminAuthProvider>,
    );
    await waitFor(() =>
      expect(screen.getByTestId("probe").textContent).toBe("ready-admin@x.com"),
    );
  });
});
