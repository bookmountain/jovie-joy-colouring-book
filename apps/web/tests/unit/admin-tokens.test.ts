import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const css = readFileSync(resolve(__dirname, "../../src/app/admin/admin.css"), "utf8");

describe("admin design tokens", () => {
  test("defines the cozy palette under body.admin-route scope", () => {
    expect(css).toMatch(/body\.admin-route\s*\{/);
    for (const token of [
      "--admin-paper:#efe6d2",
      "--admin-card:#fff8ec",
      "--admin-card-2:#fefaf0",
      "--admin-card-3:#fdf5e0",
      "--admin-line:#ead7b5",
      "--admin-line-soft:#f0e0bf",
      "--admin-ink:#3d2718",
      "--admin-ink-2:#5a3a1c",
      "--admin-muted:#9a7e5c",
      "--admin-muted-2:#bca78a",
      "--admin-coral:#d35d3c",
      "--admin-coral-soft:#fde2d7",
      "--admin-coral-2:#b94a2d",
      "--admin-honey:#e5a93b",
      "--admin-honey-soft:#fbeac6",
      "--admin-leaf:#5b8a3a",
      "--admin-leaf-soft:#dcecc8",
    ]) {
      expect(css.replace(/\s+/g, "")).toContain(token.replace(/\s+/g, ""));
    }
  });

  test("does not redefine any .coco-* class", () => {
    expect(css).not.toMatch(/\.coco-/);
  });
});
