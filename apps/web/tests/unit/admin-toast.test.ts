import { describe, it, expect, vi } from "vitest";
import { toast as sonner } from "sonner";
import { notifySaved, notifyDeleted, notifyError } from "@/lib/toast";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

describe("admin toast helpers", () => {
  it("notifySaved shows a success toast with the given label", () => {
    notifySaved("Category");
    expect(sonner.success).toHaveBeenCalledWith("Category saved");
  });

  it("notifyDeleted shows a delete success toast", () => {
    notifyDeleted("Category");
    expect(sonner.success).toHaveBeenCalledWith("Category deleted");
  });

  it("notifyError shows the error message", () => {
    notifyError(new Error("boom"));
    expect(sonner.error).toHaveBeenCalledWith("boom");
  });

  it("notifyError falls back to a generic message for non-Errors", () => {
    notifyError({ weird: true });
    expect(sonner.error).toHaveBeenCalledWith("Something went wrong");
  });
});
