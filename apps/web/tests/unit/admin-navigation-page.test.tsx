import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AdminNavigationPage from "@/app/admin/navigation/page";

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  replace: vi.fn(),
}));

vi.mock("@/lib/adminApi", () => ({
  adminListNavigation: (...args: unknown[]) => mocks.list(...args),
  adminReplaceNavigation: (...args: unknown[]) => mocks.replace(...args),
}));
vi.mock("@/lib/toast", () => ({ notifySaved: vi.fn(), notifyError: vi.fn() }));

const ROOT = { id: "00000000-0000-0000-0000-000000000001", parentId: null, label: "Books", href: "/products", sortIndex: 0, enabled: true };
const CHILD = { id: "00000000-0000-0000-0000-000000000002", parentId: ROOT.id, label: "Physical", href: "/collections/physical", sortIndex: 0, enabled: true };

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("crypto", { randomUUID: vi.fn(() => "00000000-0000-0000-0000-000000000099") });
  mocks.list.mockResolvedValue({ items: [ROOT, CHILD], revision: "revision-1" });
  mocks.replace.mockImplementation(async (items) => ({ items, revision: "revision-2" }));
});

describe("Admin navigation page", () => {
  it("loads the tree, edits rows, adds a child, and saves one normalized request", async () => {
    render(<AdminNavigationPage />);
    await waitFor(() => expect(screen.getByDisplayValue("Books")).toBeInTheDocument());
    expect(screen.getByText("Level 1")).toBeInTheDocument();
    expect(screen.getByText("Level 2")).toBeInTheDocument();

    fireEvent.change(screen.getByDisplayValue("Books"), { target: { value: "Books & Gifts" } });
    fireEvent.click(screen.getByRole("button", { name: "Add child to Books & Gifts" }));
    expect(screen.getByDisplayValue("New link")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Save navigation" }));
    await waitFor(() => expect(mocks.replace).toHaveBeenCalledTimes(1));
    const items = mocks.replace.mock.calls[0][0];
    expect(mocks.replace).toHaveBeenCalledWith(expect.any(Array), "revision-1");
    expect(items).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: ROOT.id, label: "Books & Gifts", parentId: null }),
      expect.objectContaining({ id: "00000000-0000-0000-0000-000000000099", parentId: ROOT.id }),
    ]));
  });

  it("shows the API conflict instead of silently overwriting a newer tree", async () => {
    mocks.replace.mockRejectedValueOnce(new Error("Navigation changed since this editor loaded it. Reload before saving."));
    render(<AdminNavigationPage />);
    await waitFor(() => expect(screen.getByDisplayValue("Books")).toBeInTheDocument());
    fireEvent.change(screen.getByDisplayValue("Books"), { target: { value: "Stale edit" } });
    fireEvent.click(screen.getByRole("button", { name: "Save navigation" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(/changed since/i));
  });

  it("toggles storefront visibility and includes it in the saved tree", async () => {
    render(<AdminNavigationPage />);
    await waitFor(() => expect(screen.getByDisplayValue("Books")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("switch", { name: "Hide Books on storefront" }));
    expect(screen.getByRole("switch", { name: "Show Books on storefront" })).toHaveAttribute("aria-checked", "false");
    fireEvent.click(screen.getByRole("button", { name: "Save navigation" }));

    await waitFor(() => expect(mocks.replace).toHaveBeenCalledTimes(1));
    expect(mocks.replace.mock.calls[0][0]).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: ROOT.id, enabled: false }),
      expect.objectContaining({ id: CHILD.id, enabled: true }),
    ]));
  });

  it("confirms parent deletion and removes descendants from the save payload", async () => {
    render(<AdminNavigationPage />);
    await waitFor(() => expect(screen.getByDisplayValue("Books")).toBeInTheDocument());
    const rootRow = screen.getByDisplayValue("Books").closest(".admin-navigation-row")!;
    fireEvent.click(within(rootRow as HTMLElement).getByRole("button", { name: "Delete Books" }));
    expect(screen.getByText(/also removes its descendants/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Remove link" }));
    await waitFor(() => expect(screen.getByText(/needs at least one link/i)).toBeInTheDocument());
  });
});
