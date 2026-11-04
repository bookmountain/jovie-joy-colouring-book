import { beforeEach, describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import EmailsPage from "@/app/admin/emails/page";
import EmailReviewPage from "@/app/admin/emails/[id]/page";

const listMock = vi.fn();
const getMock = vi.fn();
const previewMock = vi.fn();
const updateMock = vi.fn();
const sendMock = vi.fn();
const testMock = vi.fn();
const skipMock = vi.fn();

vi.mock("@/lib/adminApi", () => ({
  adminListEmailCampaigns: (...args: unknown[]) => listMock(...args),
  adminGetEmailCampaign: (...args: unknown[]) => getMock(...args),
  adminPreviewEmailCampaign: (...args: unknown[]) => previewMock(...args),
  adminUpdateEmailCampaign: (...args: unknown[]) => updateMock(...args),
  adminSendEmailCampaign: (...args: unknown[]) => sendMock(...args),
  adminTestEmailCampaign: (...args: unknown[]) => testMock(...args),
  adminSkipEmailCampaign: (...args: unknown[]) => skipMock(...args),
  adminRestoreEmailCampaign: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "c1" }),
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/state/admin-auth", () => ({
  useAdminAuth: () => ({ user: { email: "jovie@example.com", role: "admin" } }),
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const draft = {
  id: "c1", kind: "Product", itemSlug: "moon", itemTitle: "Moon Book", status: "Draft",
  subject: "New from Zoe&Book: Moon Book", preheader: "Dreamy", headline: "Moon Book",
  body: "Hi friend,", buttonLabel: "Take a look", imageUrl: "", priceLabel: "$5.00 USD",
  itemLive: true, subscriberCount: 3, recipientCount: 0, sentCount: 0, failedCount: 0, skippedCount: 0,
  createdAt: "2026-01-01T00:00:00Z", approvedAt: null, sentAt: null,
};

beforeEach(() => {
  listMock.mockReset().mockResolvedValue({
    items: [
      { ...draft },
      { ...draft, id: "c2", itemTitle: "Old Book", status: "Sent", recipientCount: 3, sentCount: 3 },
    ],
    subscriberCount: 3,
  });
  getMock.mockReset().mockResolvedValue(draft);
  previewMock.mockReset().mockResolvedValue({ subject: draft.subject, preheader: "", html: "<p>Hi</p>", text: "Hi" });
  updateMock.mockReset().mockImplementation(async (_id, content) => ({ ...draft, ...content }));
  sendMock.mockReset().mockResolvedValue({ recipientCount: 3 });
  testMock.mockReset().mockResolvedValue({ ok: true });
  skipMock.mockReset();
});

describe("Emails list", () => {
  test("opens on drafts to review and hides sent ones until asked", async () => {
    render(<EmailsPage />);

    expect(await screen.findByText(/📦 Moon Book/)).toBeInTheDocument();
    expect(screen.queryByText(/📦 Old Book/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Sent/ }));
    expect(await screen.findByText(/📦 Old Book/)).toBeInTheDocument();
    expect(screen.getByText("3 of 3")).toBeInTheDocument();
  });
});

describe("Email review", () => {
  test("nothing sends until the confirm dialog is accepted", async () => {
    render(<EmailReviewPage />);

    fireEvent.click(await screen.findByRole("button", { name: "Send to 3 people" }));
    expect(sendMock).not.toHaveBeenCalled();
    expect(screen.getByText("Send to 3 people?")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Yes, send it" }));
    await waitFor(() => expect(sendMock).toHaveBeenCalledWith("c1"));
  });

  test("unsaved edits are saved before sending so what was reviewed is what goes out", async () => {
    render(<EmailReviewPage />);

    fireEvent.change(await screen.findByLabelText("Subject"), { target: { value: "Better subject" } });
    fireEvent.click(screen.getByRole("button", { name: "Send to 3 people" }));
    fireEvent.click(screen.getByRole("button", { name: "Yes, send it" }));

    await waitFor(() => expect(sendMock).toHaveBeenCalled());
    expect(updateMock).toHaveBeenCalledWith("c1", expect.objectContaining({ subject: "Better subject" }));
    expect(updateMock.mock.invocationCallOrder[0]).toBeLessThan(sendMock.mock.invocationCallOrder[0]);
  });

  test("test send defaults to the signed-in admin and never approves", async () => {
    render(<EmailReviewPage />);

    fireEvent.click(await screen.findByRole("button", { name: "Send test" }));

    await waitFor(() => expect(testMock).toHaveBeenCalledWith("c1", "jovie@example.com"));
    expect(sendMock).not.toHaveBeenCalled();
  });

  test("preview runs in a fully locked iframe", async () => {
    render(<EmailReviewPage />);

    const frame = await screen.findByTitle("Email preview");
    expect(frame).toHaveAttribute("sandbox", "");
    expect(frame).toHaveAttribute("srcdoc", "<p>Hi</p>");
  });

  test("blocks sending when the item is not live", async () => {
    getMock.mockResolvedValue({ ...draft, itemLive: false });
    render(<EmailReviewPage />);

    expect(await screen.findByRole("button", { name: "Send to 3 people" })).toBeDisabled();
  });

  test("a sent email is read-only with no send button", async () => {
    getMock.mockResolvedValue({ ...draft, status: "Sent", recipientCount: 3, sentCount: 3 });
    render(<EmailReviewPage />);

    expect(await screen.findByLabelText("Subject")).toBeDisabled();
    expect(screen.queryByRole("button", { name: /Send/ })).not.toBeInTheDocument();
    expect(screen.getByText(/Reached 3 of 3/)).toBeInTheDocument();
  });
});
