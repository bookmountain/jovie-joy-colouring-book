import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { fetchCurrentUser, tokenStorage } from "@/lib/auth";

const TOKEN = "valid-admin-token";

function mockMe(handler: () => Promise<Response> | Response) {
  globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
    if (String(input).endsWith("/auth/me")) return handler();
    return new Response("", { status: 404 });
  }) as typeof fetch;
}

beforeEach(() => {
  tokenStorage.write(TOKEN);
});

afterEach(() => {
  tokenStorage.clear();
  vi.restoreAllMocks();
});

describe("fetchCurrentUser session resilience", () => {
  test("returns the user and keeps the token on success", async () => {
    mockMe(() =>
      new Response(JSON.stringify({ id: "u1", email: "a@b.com", isAdmin: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    const user = await fetchCurrentUser();
    expect(user).toMatchObject({ id: "u1", isAdmin: true });
    expect(tokenStorage.read()).toBe(TOKEN);
  });

  test("clears the token on a definitive 401", async () => {
    mockMe(() => new Response("", { status: 401 }));
    const user = await fetchCurrentUser();
    expect(user).toBeNull();
    expect(tokenStorage.read()).toBeNull();
  });

  test("KEEPS the token on a transient 500 (does not log the admin out)", async () => {
    mockMe(() => new Response("", { status: 500 }));
    const user = await fetchCurrentUser();
    expect(user).toBeNull();
    expect(tokenStorage.read()).toBe(TOKEN);
  });

  test("KEEPS the token on a network error", async () => {
    mockMe(() => Promise.reject(new Error("network down")));
    const user = await fetchCurrentUser();
    expect(user).toBeNull();
    expect(tokenStorage.read()).toBe(TOKEN);
  });
});
