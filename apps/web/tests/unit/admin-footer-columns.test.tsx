import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AdminFooterPage from "@/app/admin/pages/footer/page";

const mocks = vi.hoisted(() => ({
  getContent: vi.fn(),
  upsertContent: vi.fn(),
  listFooter: vi.fn(),
  createFooter: vi.fn(),
  updateFooter: vi.fn(),
  deleteFooter: vi.fn(),
}));

vi.mock("@/lib/adminApi", () => ({
  adminGetContent: (...a: unknown[]) => mocks.getContent(...a),
  adminUpsertContent: (...a: unknown[]) => mocks.upsertContent(...a),
  adminListFooterLinks: (...a: unknown[]) => mocks.listFooter(...a),
  adminCreateFooterLink: (...a: unknown[]) => mocks.createFooter(...a),
  adminUpdateFooterLink: (...a: unknown[]) => mocks.updateFooter(...a),
  adminDeleteFooterLink: (...a: unknown[]) => mocks.deleteFooter(...a),
  adminListSocialLinks: () => Promise.resolve([]),
  adminCreateSocialLink: vi.fn(),
  adminUpdateSocialLink: vi.fn(),
  adminDeleteSocialLink: vi.fn(),
  adminListTrendingTerms: () => Promise.resolve([]),
  adminCreateTrendingTerm: vi.fn(),
  adminDeleteTrendingTerm: vi.fn(),
}));
vi.mock("@/lib/toast", () => ({ notifySaved: vi.fn(), notifyDeleted: vi.fn(), notifyError: vi.fn() }));

const INFO_LINKS = [
  { id: "1", groupKey: "info", groupTitle: "Info", label: "About us", href: "/pages/about-us", sortIndex: 0 },
  { id: "2", groupKey: "info", groupTitle: "Info", label: "FAQs", href: "/pages/faqs", sortIndex: 1 },
];

describe("Admin footer columns", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getContent.mockResolvedValue({ data: {} });
    mocks.listFooter.mockResolvedValue([...INFO_LINKS]);
    mocks.updateFooter.mockImplementation((id: string, body: Record<string, unknown>) =>
      Promise.resolve({ ...body, id }));
    mocks.createFooter.mockImplementation((body: Record<string, unknown>) =>
      Promise.resolve({ ...body, id: "new" }));
  });

  it("never exposes the internal group key", async () => {
    render(<AdminFooterPage />);
    await screen.findByDisplayValue("Info");

    expect(screen.queryByPlaceholderText("groupKey")).toBeNull();
    expect(screen.queryByText(/groupKey/i)).toBeNull();
    // The key itself is never rendered as an editable value either.
    expect(screen.queryByDisplayValue("info")).toBeNull();
  });

  it("renames every link in a column so the group cannot split in two", async () => {
    render(<AdminFooterPage />);
    const heading = await screen.findByDisplayValue("Info");

    fireEvent.blur(heading, { target: { value: "Information" } });

    await waitFor(() => expect(mocks.updateFooter).toHaveBeenCalledTimes(2));
    for (const id of ["1", "2"]) {
      expect(mocks.updateFooter).toHaveBeenCalledWith(
        id,
        expect.objectContaining({ groupKey: "info", groupTitle: "Information" }),
      );
    }
  });

  it("adds a link to an existing column without asking for the key", async () => {
    render(<AdminFooterPage />);
    await screen.findByDisplayValue("Info");

    fireEvent.change(screen.getByLabelText("New link label for Info"), { target: { value: "Contact" } });
    fireEvent.change(screen.getByLabelText("New link URL for Info"), { target: { value: "/pages/contact" } });
    fireEvent.click(screen.getByRole("button", { name: "+ Add link" }));

    await waitFor(() => expect(mocks.createFooter).toHaveBeenCalledWith(expect.objectContaining({
      groupKey: "info", groupTitle: "Info", label: "Contact", href: "/pages/contact", sortIndex: 2,
    })));
  });

  it("derives a key from the heading when a new column is added", async () => {
    render(<AdminFooterPage />);
    await screen.findByDisplayValue("Info");

    fireEvent.change(screen.getByLabelText("New column heading"), { target: { value: "Help & Support" } });
    fireEvent.change(screen.getByLabelText("New column first link label"), { target: { value: "Contact" } });
    fireEvent.change(screen.getByLabelText("New column first link URL"), { target: { value: "/pages/contact" } });
    fireEvent.click(screen.getByRole("button", { name: "+ Add column" }));

    await waitFor(() => expect(mocks.createFooter).toHaveBeenCalledWith(expect.objectContaining({
      groupKey: "help-support", groupTitle: "Help & Support",
    })));
  });
});
