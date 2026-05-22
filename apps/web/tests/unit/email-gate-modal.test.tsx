import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { EmailGateModal } from "@/components/storefront/EmailGateModal";
import type { FreebieListItem } from "@/lib/freebies";

vi.mock("@/lib/freebies", async (orig) => {
  const actual = await orig() as typeof import("@/lib/freebies");
  return { ...actual, requestFreebie: vi.fn() };
});

import * as freebiesLib from "@/lib/freebies";

const item: FreebieListItem = {
  slug: "demo", title: "Demo", excerpt: "Ex", coverImage: "/x.png",
  fileKind: "pdf", fileSizeBytes: 0, sortIndex: 0,
};

describe("EmailGateModal", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("renders the form with opt-in checked by default", () => {
    render(<EmailGateModal item={item} onClose={() => {}} />);
    const checkbox = screen.getByLabelText(/future colouring freebies/i) as HTMLInputElement;
    expect(checkbox.checked).toBe(true);
  });

  it("submits to requestFreebie and shows success state", async () => {
    (freebiesLib.requestFreebie as ReturnType<typeof vi.fn>).mockResolvedValueOnce(undefined);
    render(<EmailGateModal item={item} onClose={() => {}} />);
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "u@e.com" } });
    fireEvent.click(screen.getByRole("button", { name: /send me the link/i }));
    await waitFor(() => expect(screen.getByText(/check your inbox/i)).toBeInTheDocument());
    expect(freebiesLib.requestFreebie).toHaveBeenCalledWith("demo", "u@e.com", true);
  });

  it("shows an error message when the request fails", async () => {
    (freebiesLib.requestFreebie as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("Slow down"));
    render(<EmailGateModal item={item} onClose={() => {}} />);
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "u@e.com" } });
    fireEvent.click(screen.getByRole("button", { name: /send me the link/i }));
    await waitFor(() => expect(screen.getByText(/slow down/i)).toBeInTheDocument());
  });
});
