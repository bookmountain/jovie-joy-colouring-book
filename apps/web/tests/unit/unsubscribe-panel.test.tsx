import { beforeEach, describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { UnsubscribePanel } from "@/components/storefront/UnsubscribePanel";

const unsubscribeMock = vi.fn();

vi.mock("@/lib/api", () => ({
  apiNewsletterUnsubscribe: (...args: unknown[]) => unsubscribeMock(...args),
}));

beforeEach(() => {
  unsubscribeMock.mockReset().mockResolvedValue({ ok: true });
});

describe("UnsubscribePanel", () => {
  test("does nothing until the button is clicked", async () => {
    render(<UnsubscribePanel token="abc" />);
    expect(unsubscribeMock).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Yes, unsubscribe me" }));

    expect(await screen.findByText("You're unsubscribed")).toBeInTheDocument();
    expect(unsubscribeMock).toHaveBeenCalledWith("abc");
  });

  test("shows a helpful message for a bad link", async () => {
    unsubscribeMock.mockRejectedValue(new Error("nope"));
    render(<UnsubscribePanel token="bad" />);

    fireEvent.click(screen.getByRole("button", { name: "Yes, unsubscribe me" }));

    expect(await screen.findByText("This link isn't working")).toBeInTheDocument();
  });

  test("missing token never offers the button", () => {
    render(<UnsubscribePanel token="" />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
