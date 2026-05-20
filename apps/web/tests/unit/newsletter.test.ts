import { describe, expect, it } from "vitest";
import { subscribeEmail } from "@/lib/newsletter";

describe("newsletter subscription state", () => {
  it("accepts a new email and rejects duplicates", () => {
    const first = subscribeEmail([], "friend@example.com");
    const second = subscribeEmail(first.emails, "FRIEND@example.com");
    expect(first.status).toBe("subscribed");
    expect(second.status).toBe("duplicate");
  });
});
