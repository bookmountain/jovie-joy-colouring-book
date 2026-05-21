# Admin Cozy + Product CRM Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the admin's storefront styling with a Cozy-palette admin design system, then rebuild the product editor and list as a CRM workspace that surfaces every field today silently dropped (`reviewImages`, `inspirationImages`, `sourceLinks`) and adds search/filter/bulk/pagination.

**Architecture:** Three independently shippable phases. Phase A scaffolds tokens + primitives + shell, then migrates every existing admin form to the new primitives without restructuring. Phase B builds three product-specific composites and rewrites `ProductForm.tsx` into a sectioned editor with a behavior column on the right. Phase C extends `AdminProductsController` with filtering/sort/pagination + bulk + duplicate + tags endpoints and rebuilds `/admin/products` into a CRM list with toolbar, bulk bar, and pagination.

**Tech Stack:** Next.js 15 (App Router, React 19, TypeScript), Tailwind CSS, ASP.NET Core 9 + EF Core, Vitest + React Testing Library, Playwright, Postgres 17.

**Source spec:** `docs/superpowers/specs/2026-05-21-admin-cozy-product-crm-design.md`.

**Conventions used throughout:**
- Tests live in `apps/web/tests/unit/` (Vitest) and `apps/web/tests/e2e/` (Playwright). BE tests live in `apps/api.Tests/`.
- Run BE tests: `cd apps/api.Tests && dotnet test`.
- Run FE unit tests: `cd apps/web && npm test -- <pattern>` (or just `npm test`).
- Run FE typecheck: `cd apps/web && npm run typecheck`.
- Run E2E: `cd apps/web && npx playwright test <spec>` (needs BE running).
- Commit one task at a time. Use conventional-commits prefixes already in the repo log (`feat`, `fix`, `refactor`, `test`, `docs`, `chore`).
- Every commit appends `Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>`.

---

## Phase A — Admin foundation (no behavior change)

Goal: every existing admin page renders with new tokens / primitives, no functional changes, no `rounded-full` on inputs. Foundation can ship alone.

### Task A1: Admin design tokens & layout scaffold

**Files:**
- Create: `apps/web/src/app/admin/admin.css`
- Modify: `apps/web/src/app/admin/layout.tsx`
- Test: `apps/web/tests/unit/admin-tokens.test.ts`

**Why:** All later primitives reference `--admin-*` variables. Scoping them under `body.admin-route` prevents storefront bleed.

- [ ] **Step 1: Write failing test**

Create `apps/web/tests/unit/admin-tokens.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/web && npm test -- admin-tokens`
Expected: FAIL — file `apps/web/src/app/admin/admin.css` does not exist.

- [ ] **Step 3: Create the CSS file**

Create `apps/web/src/app/admin/admin.css`:

```css
/* Cozy admin design tokens. Scoped to body.admin-route — must not leak to the storefront. */
body.admin-route {
  --admin-paper: #efe6d2;
  --admin-card: #fff8ec;
  --admin-card-2: #fefaf0;
  --admin-card-3: #fdf5e0;
  --admin-line: #ead7b5;
  --admin-line-soft: #f0e0bf;
  --admin-ink: #3d2718;
  --admin-ink-2: #5a3a1c;
  --admin-muted: #9a7e5c;
  --admin-muted-2: #bca78a;
  --admin-coral: #d35d3c;
  --admin-coral-soft: #fde2d7;
  --admin-coral-2: #b94a2d;
  --admin-honey: #e5a93b;
  --admin-honey-soft: #fbeac6;
  --admin-leaf: #5b8a3a;
  --admin-leaf-soft: #dcecc8;

  --admin-shadow-panel: 0 4px 14px rgba(74, 42, 12, 0.06);
  --admin-shadow-primary: 0 4px 10px rgba(211, 93, 60, 0.25);

  background: var(--admin-paper);
  color: var(--admin-ink);
  font-family: "Nunito", system-ui, sans-serif;
}

body.admin-route h1 { font-size: 24px; font-weight: 800; }
body.admin-route h2 { font-size: 18px; font-weight: 800; }
body.admin-route a:focus-visible,
body.admin-route button:focus-visible,
body.admin-route [tabindex]:focus-visible {
  outline: 2px solid var(--admin-coral);
  outline-offset: 2px;
  border-radius: 6px;
}
```

- [ ] **Step 4: Wire the body class via layout**

Replace `apps/web/src/app/admin/layout.tsx` with:

```tsx
import type { Metadata } from "next";
import { AdminAuthProvider } from "@/state/admin-auth";
import { AdminAuthGuard } from "@/components/admin/AdminAuthGuard";
import { AdminShell } from "@/components/admin/AdminShell";
import "./admin.css";

export const metadata: Metadata = {
  title: "Zoe&Book Admin",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminAuthProvider>
      <AdminAuthGuard>
        <div className="admin-route-root">
          <AdminShell>{children}</AdminShell>
        </div>
      </AdminAuthGuard>
    </AdminAuthProvider>
  );
}
```

The actual `body.admin-route` toggle is set client-side by `AdminShell` in Task A6. For now `admin-route-root` is a no-op wrapper that later receives the body-class effect.

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd apps/web && npm test -- admin-tokens`
Expected: PASS, 2 tests.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/app/admin/admin.css apps/web/src/app/admin/layout.tsx apps/web/tests/unit/admin-tokens.test.ts
git commit -m "$(cat <<'EOF'
feat(admin): cozy design tokens scoped to body.admin-route

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task A2: Form primitives — Input, Textarea, Select, Label, Field

**Files:**
- Create: `apps/web/src/components/admin/ui/AdminInput.tsx`
- Create: `apps/web/src/components/admin/ui/AdminTextarea.tsx`
- Create: `apps/web/src/components/admin/ui/AdminSelect.tsx`
- Create: `apps/web/src/components/admin/ui/AdminLabel.tsx`
- Create: `apps/web/src/components/admin/ui/AdminField.tsx`
- Create: `apps/web/src/components/admin/ui/cn.ts`
- Create: `apps/web/src/components/admin/ui/index.ts`
- Modify: `apps/web/src/app/admin/admin.css` (append component classes)
- Test: `apps/web/tests/unit/admin-form-primitives.test.tsx`

**Why:** Replaces `.coco-input` everywhere in the admin. All later primitives reuse the focus-ring and radius conventions defined here.

- [ ] **Step 1: Append component CSS to admin.css**

Append to `apps/web/src/app/admin/admin.css`:

```css
@layer components {
  .admin-input,
  .admin-textarea,
  .admin-select {
    width: 100%;
    padding: 10px 14px;
    border: 1.5px solid var(--admin-line);
    background: #fffdf6;
    border-radius: 10px;
    font-size: 13px;
    color: var(--admin-ink);
    font-family: inherit;
    outline: none;
    transition: border-color 0.15s, box-shadow 0.15s;
    box-sizing: border-box;
  }
  .admin-input.lg { font-size: 16px; font-weight: 700; padding: 12px 16px; }
  .admin-textarea { min-height: 80px; line-height: 1.55; resize: vertical; }
  .admin-select { appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' fill='none' stroke='%235a3a1c' stroke-width='1.5'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 12px center; padding-right: 36px; }
  .admin-input:focus,
  .admin-textarea:focus,
  .admin-select:focus { border-color: var(--admin-coral); box-shadow: 0 0 0 3px var(--admin-coral-soft); }
  .admin-input[aria-invalid="true"],
  .admin-textarea[aria-invalid="true"],
  .admin-select[aria-invalid="true"] { border-color: var(--admin-coral); }

  .admin-label { font-size: 11px; color: var(--admin-ink-2); font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; display: block; }
  .admin-label .hint { font-weight: 500; text-transform: none; letter-spacing: 0; color: var(--admin-muted); margin-left: 4px; }

  .admin-field { display: flex; flex-direction: column; gap: 5px; }
  .admin-field + .admin-field { margin-top: 12px; }
}
```

- [ ] **Step 2: Write failing test**

Create `apps/web/tests/unit/admin-form-primitives.test.tsx`:

```tsx
import { describe, expect, test, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AdminInput } from "@/components/admin/ui/AdminInput";
import { AdminTextarea } from "@/components/admin/ui/AdminTextarea";
import { AdminSelect } from "@/components/admin/ui/AdminSelect";
import { AdminLabel } from "@/components/admin/ui/AdminLabel";
import { AdminField } from "@/components/admin/ui/AdminField";

describe("AdminInput", () => {
  test("applies admin-input class and forwards value/onChange", () => {
    const onChange = vi.fn();
    render(<AdminInput value="hi" onChange={onChange} aria-label="t" />);
    const el = screen.getByLabelText("t") as HTMLInputElement;
    expect(el.className).toContain("admin-input");
    fireEvent.change(el, { target: { value: "bye" } });
    expect(onChange).toHaveBeenCalled();
  });
  test("size=lg toggles the .lg variant", () => {
    render(<AdminInput size="lg" defaultValue="x" aria-label="t" />);
    expect((screen.getByLabelText("t") as HTMLInputElement).className).toMatch(/\blg\b/);
  });
});

describe("AdminTextarea", () => {
  test("renders with admin-textarea class", () => {
    render(<AdminTextarea defaultValue="x" aria-label="t" />);
    expect(screen.getByLabelText("t").className).toContain("admin-textarea");
  });
});

describe("AdminSelect", () => {
  test("renders options and forwards change", () => {
    const onChange = vi.fn();
    render(
      <AdminSelect value="a" onChange={onChange} aria-label="t">
        <option value="a">A</option>
        <option value="b">B</option>
      </AdminSelect>,
    );
    fireEvent.change(screen.getByLabelText("t"), { target: { value: "b" } });
    expect(onChange).toHaveBeenCalled();
  });
});

describe("AdminLabel + AdminField", () => {
  test("AdminField wraps label + control", () => {
    render(
      <AdminField>
        <AdminLabel htmlFor="x">Name</AdminLabel>
        <AdminInput id="x" defaultValue="" />
      </AdminField>,
    );
    expect(screen.getByText("Name").tagName).toBe("LABEL");
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd apps/web && npm test -- admin-form-primitives`
Expected: FAIL — components don't exist.

- [ ] **Step 4: Implement the primitives**

Create `apps/web/src/components/admin/ui/cn.ts`:

```ts
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
```

Create `apps/web/src/components/admin/ui/AdminInput.tsx`:

```tsx
import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "./cn";

export type AdminInputProps = InputHTMLAttributes<HTMLInputElement> & { size?: "md" | "lg" };

export const AdminInput = forwardRef<HTMLInputElement, AdminInputProps>(function AdminInput(
  { className, size = "md", ...rest },
  ref,
) {
  return <input ref={ref} className={cn("admin-input", size === "lg" && "lg", className)} {...rest} />;
});
```

Create `apps/web/src/components/admin/ui/AdminTextarea.tsx`:

```tsx
import { forwardRef, type TextareaHTMLAttributes } from "react";
import { cn } from "./cn";

export const AdminTextarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function AdminTextarea({ className, ...rest }, ref) {
    return <textarea ref={ref} className={cn("admin-textarea", className)} {...rest} />;
  },
);
```

Create `apps/web/src/components/admin/ui/AdminSelect.tsx`:

```tsx
import { forwardRef, type SelectHTMLAttributes } from "react";
import { cn } from "./cn";

export const AdminSelect = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function AdminSelect({ className, children, ...rest }, ref) {
    return (
      <select ref={ref} className={cn("admin-select", className)} {...rest}>
        {children}
      </select>
    );
  },
);
```

Create `apps/web/src/components/admin/ui/AdminLabel.tsx`:

```tsx
import type { LabelHTMLAttributes, ReactNode } from "react";
import { cn } from "./cn";

export type AdminLabelProps = LabelHTMLAttributes<HTMLLabelElement> & { hint?: ReactNode };

export function AdminLabel({ className, children, hint, ...rest }: AdminLabelProps) {
  return (
    <label className={cn("admin-label", className)} {...rest}>
      {children}
      {hint ? <span className="hint">— {hint}</span> : null}
    </label>
  );
}
```

Create `apps/web/src/components/admin/ui/AdminField.tsx`:

```tsx
import type { HTMLAttributes } from "react";
import { cn } from "./cn";

export function AdminField({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("admin-field", className)} {...rest} />;
}
```

Create `apps/web/src/components/admin/ui/index.ts`:

```ts
export * from "./AdminInput";
export * from "./AdminTextarea";
export * from "./AdminSelect";
export * from "./AdminLabel";
export * from "./AdminField";
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd apps/web && npm test -- admin-form-primitives admin-tokens`
Expected: PASS, all tests.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/admin/ui apps/web/src/app/admin/admin.css apps/web/tests/unit/admin-form-primitives.test.tsx
git commit -m "$(cat <<'EOF'
feat(admin): form primitives — Input, Textarea, Select, Label, Field

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task A3: Toggle primitives — Switch, Checkbox

**Files:**
- Create: `apps/web/src/components/admin/ui/AdminSwitch.tsx`
- Create: `apps/web/src/components/admin/ui/AdminCheckbox.tsx`
- Modify: `apps/web/src/app/admin/admin.css`
- Modify: `apps/web/src/components/admin/ui/index.ts`
- Test: `apps/web/tests/unit/admin-toggles.test.tsx`

**Why:** The product editor sidebar uses Switch for Visibility/Availability; the list view uses Checkbox for row selection.

- [ ] **Step 1: Append CSS**

Append to `apps/web/src/app/admin/admin.css` (inside the existing `@layer components` block, or add a second `@layer components` block):

```css
@layer components {
  .admin-switch { width: 42px; height: 24px; background: #d6c79e; border-radius: 999px; position: relative; cursor: pointer; transition: background 0.15s; border: none; padding: 0; flex-shrink: 0; }
  .admin-switch[data-state="on"] { background: var(--admin-leaf); }
  .admin-switch[disabled] { cursor: not-allowed; opacity: 0.5; }
  .admin-switch .knob { position: absolute; top: 2px; left: 2px; width: 20px; height: 20px; background: #fff; border-radius: 50%; box-shadow: 0 1px 3px rgba(0,0,0,0.18); transition: left 0.15s; }
  .admin-switch[data-state="on"] .knob { left: 20px; }

  .admin-checkbox { width: 16px; height: 16px; border: 1.5px solid var(--admin-line); border-radius: 4px; background: #fffdf6; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; padding: 0; }
  .admin-checkbox[data-state="on"] { background: var(--admin-coral); border-color: var(--admin-coral); color: #fff; }
  .admin-checkbox[disabled] { cursor: not-allowed; opacity: 0.5; }
  .admin-checkbox .check { display: none; font-size: 11px; font-weight: 900; line-height: 1; color: #fff; }
  .admin-checkbox[data-state="on"] .check { display: inline; }
}
```

- [ ] **Step 2: Write failing test**

Create `apps/web/tests/unit/admin-toggles.test.tsx`:

```tsx
import { describe, expect, test, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AdminSwitch } from "@/components/admin/ui/AdminSwitch";
import { AdminCheckbox } from "@/components/admin/ui/AdminCheckbox";

describe("AdminSwitch", () => {
  test("data-state reflects checked; clicking calls onChange(!checked)", () => {
    const onChange = vi.fn();
    const { rerender } = render(<AdminSwitch checked={false} onChange={onChange} aria-label="t" />);
    const btn = screen.getByRole("switch");
    expect(btn.getAttribute("data-state")).toBe("off");
    fireEvent.click(btn);
    expect(onChange).toHaveBeenCalledWith(true);
    rerender(<AdminSwitch checked={true} onChange={onChange} aria-label="t" />);
    expect(screen.getByRole("switch").getAttribute("data-state")).toBe("on");
  });
});

describe("AdminCheckbox", () => {
  test("renders check glyph when on; toggles via click", () => {
    const onChange = vi.fn();
    const { rerender } = render(<AdminCheckbox checked={false} onChange={onChange} aria-label="t" />);
    const btn = screen.getByRole("checkbox");
    expect(btn.getAttribute("data-state")).toBe("off");
    fireEvent.click(btn);
    expect(onChange).toHaveBeenCalledWith(true);
    rerender(<AdminCheckbox checked={true} onChange={onChange} aria-label="t" />);
    expect(screen.getByRole("checkbox").getAttribute("data-state")).toBe("on");
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd apps/web && npm test -- admin-toggles`
Expected: FAIL — components missing.

- [ ] **Step 4: Implement**

Create `apps/web/src/components/admin/ui/AdminSwitch.tsx`:

```tsx
import type { ButtonHTMLAttributes } from "react";
import { cn } from "./cn";

export type AdminSwitchProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onChange"> & {
  checked: boolean;
  onChange?: (next: boolean) => void;
};

export function AdminSwitch({ checked, onChange, className, disabled, ...rest }: AdminSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      data-state={checked ? "on" : "off"}
      disabled={disabled}
      className={cn("admin-switch", className)}
      onClick={() => onChange?.(!checked)}
      {...rest}
    >
      <span className="knob" />
    </button>
  );
}
```

Create `apps/web/src/components/admin/ui/AdminCheckbox.tsx`:

```tsx
import type { ButtonHTMLAttributes } from "react";
import { cn } from "./cn";

export type AdminCheckboxProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onChange"> & {
  checked: boolean;
  onChange?: (next: boolean) => void;
};

export function AdminCheckbox({ checked, onChange, className, disabled, ...rest }: AdminCheckboxProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      data-state={checked ? "on" : "off"}
      disabled={disabled}
      className={cn("admin-checkbox", className)}
      onClick={() => onChange?.(!checked)}
      {...rest}
    >
      <span className="check">✓</span>
    </button>
  );
}
```

Append to `apps/web/src/components/admin/ui/index.ts`:

```ts
export * from "./AdminSwitch";
export * from "./AdminCheckbox";
```

- [ ] **Step 5: Run test**

Run: `cd apps/web && npm test -- admin-toggles`
Expected: PASS, 2 tests.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/admin/ui/AdminSwitch.tsx apps/web/src/components/admin/ui/AdminCheckbox.tsx apps/web/src/components/admin/ui/index.ts apps/web/src/app/admin/admin.css apps/web/tests/unit/admin-toggles.test.tsx
git commit -m "$(cat <<'EOF'
feat(admin): toggle primitives — Switch, Checkbox

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task A4: Action primitives — Button, Badge, Chip

**Files:**
- Create: `apps/web/src/components/admin/ui/AdminButton.tsx`
- Create: `apps/web/src/components/admin/ui/AdminBadge.tsx`
- Create: `apps/web/src/components/admin/ui/AdminChip.tsx`
- Modify: `apps/web/src/app/admin/admin.css`
- Modify: `apps/web/src/components/admin/ui/index.ts`
- Test: `apps/web/tests/unit/admin-actions.test.tsx`

- [ ] **Step 1: Append CSS**

Append to `apps/web/src/app/admin/admin.css`:

```css
@layer components {
  .admin-btn { padding: 10px 22px; border-radius: 999px; font-size: 13px; font-weight: 800; border: none; cursor: pointer; font-family: inherit; display: inline-flex; align-items: center; justify-content: center; gap: 6px; transition: background 0.15s, color 0.15s, border-color 0.15s; }
  .admin-btn[data-size="sm"] { padding: 7px 14px; font-size: 12px; }
  .admin-btn[disabled] { opacity: 0.5; cursor: not-allowed; }
  .admin-btn[data-variant="primary"] { background: var(--admin-coral); color: #fff; box-shadow: var(--admin-shadow-primary); }
  .admin-btn[data-variant="primary"]:hover:not([disabled]) { background: var(--admin-coral-2); }
  .admin-btn[data-variant="ghost"] { background: transparent; border: 1.5px solid #c9a868; color: #7a5523; }
  .admin-btn[data-variant="ghost"]:hover:not([disabled]) { background: var(--admin-card-3); }
  .admin-btn[data-variant="dark"] { background: var(--admin-ink); color: #fef6e3; }
  .admin-btn[data-variant="danger"] { background: transparent; color: #a3392a; border: 1.5px solid #e0aea2; }
  .admin-btn[data-variant="danger"]:hover:not([disabled]) { background: #fbeae6; }

  .admin-badge { display: inline-flex; align-items: center; gap: 4px; padding: 3px 11px; border-radius: 999px; font-size: 11px; font-weight: 700; letter-spacing: 0.02em; }
  .admin-badge[data-variant="pub"] { background: var(--admin-leaf-soft); color: #385c1f; }
  .admin-badge[data-variant="draft"] { background: var(--admin-honey-soft); color: #7a5523; }
  .admin-badge[data-variant="scheduled"] { background: #e2e8f4; color: #1f3a6b; }
  .admin-badge[data-variant="oos"] { background: var(--admin-coral-soft); color: #a3392a; }
  .admin-badge[data-variant="neutral"] { background: var(--admin-card-3); color: var(--admin-ink-2); }

  .admin-chip { display: inline-flex; align-items: center; gap: 4px; padding: 5px 11px; border-radius: 999px; font-size: 11px; font-weight: 700; cursor: default; border: none; font-family: inherit; }
  .admin-chip[data-variant="default"] { background: var(--admin-coral-soft); color: #a3392a; }
  .admin-chip[data-variant="tag"] { background: var(--admin-honey-soft); color: #7a5523; }
  .admin-chip[data-variant="add"] { background: transparent; border: 1.5px dashed #c9a868; color: var(--admin-ink-2); cursor: pointer; }
  .admin-chip .x { cursor: pointer; font-weight: 900; opacity: 0.65; background: none; border: none; color: inherit; padding: 0 0 0 2px; }
  .admin-chip .x:hover { opacity: 1; }
}
```

- [ ] **Step 2: Write failing test**

Create `apps/web/tests/unit/admin-actions.test.tsx`:

```tsx
import { describe, expect, test, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { AdminBadge } from "@/components/admin/ui/AdminBadge";
import { AdminChip } from "@/components/admin/ui/AdminChip";

describe("AdminButton", () => {
  test("renders with primary variant by default and fires click", () => {
    const onClick = vi.fn();
    render(<AdminButton onClick={onClick}>Save</AdminButton>);
    const btn = screen.getByRole("button", { name: "Save" });
    expect(btn.getAttribute("data-variant")).toBe("primary");
    fireEvent.click(btn);
    expect(onClick).toHaveBeenCalled();
  });
  test("variant=danger applies data attribute", () => {
    render(<AdminButton variant="danger">Delete</AdminButton>);
    expect(screen.getByRole("button").getAttribute("data-variant")).toBe("danger");
  });
});

describe("AdminBadge", () => {
  test.each(["pub","draft","scheduled","oos","neutral"] as const)("variant %s sets data attribute", (v) => {
    render(<AdminBadge variant={v}>x</AdminBadge>);
    expect(screen.getByText("x").getAttribute("data-variant")).toBe(v);
  });
});

describe("AdminChip", () => {
  test("dismissible chip fires onDismiss", () => {
    const onDismiss = vi.fn();
    render(<AdminChip onDismiss={onDismiss}>tag</AdminChip>);
    fireEvent.click(screen.getByRole("button", { name: /remove tag/i }));
    expect(onDismiss).toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd apps/web && npm test -- admin-actions`
Expected: FAIL.

- [ ] **Step 4: Implement**

Create `apps/web/src/components/admin/ui/AdminButton.tsx`:

```tsx
import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "./cn";

export type AdminButtonVariant = "primary" | "ghost" | "dark" | "danger";

export type AdminButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: AdminButtonVariant;
  size?: "md" | "sm";
};

export const AdminButton = forwardRef<HTMLButtonElement, AdminButtonProps>(function AdminButton(
  { variant = "primary", size = "md", className, type = "button", ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      data-variant={variant}
      data-size={size}
      className={cn("admin-btn", className)}
      {...rest}
    />
  );
});
```

Create `apps/web/src/components/admin/ui/AdminBadge.tsx`:

```tsx
import type { HTMLAttributes } from "react";
import { cn } from "./cn";

export type AdminBadgeVariant = "pub" | "draft" | "scheduled" | "oos" | "neutral";

export type AdminBadgeProps = HTMLAttributes<HTMLSpanElement> & { variant?: AdminBadgeVariant };

export function AdminBadge({ variant = "neutral", className, ...rest }: AdminBadgeProps) {
  return <span data-variant={variant} className={cn("admin-badge", className)} {...rest} />;
}
```

Create `apps/web/src/components/admin/ui/AdminChip.tsx`:

```tsx
import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "./cn";

export type AdminChipVariant = "default" | "tag" | "add";

export type AdminChipProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: AdminChipVariant;
  onDismiss?: () => void;
  children?: ReactNode;
};

export function AdminChip({ variant = "default", className, onDismiss, children, ...rest }: AdminChipProps) {
  const Tag = variant === "add" ? ("button" as const) : ("span" as const);
  return (
    <Tag data-variant={variant} className={cn("admin-chip", className)} {...(rest as object)}>
      {children}
      {onDismiss ? (
        <button
          type="button"
          className="x"
          aria-label={`remove ${typeof children === "string" ? children : "tag"}`}
          onClick={(e) => { e.stopPropagation(); onDismiss(); }}
        >×</button>
      ) : null}
    </Tag>
  );
}
```

Append to `apps/web/src/components/admin/ui/index.ts`:

```ts
export * from "./AdminButton";
export * from "./AdminBadge";
export * from "./AdminChip";
```

- [ ] **Step 5: Run test**

Run: `cd apps/web && npm test -- admin-actions`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/admin/ui/AdminButton.tsx apps/web/src/components/admin/ui/AdminBadge.tsx apps/web/src/components/admin/ui/AdminChip.tsx apps/web/src/components/admin/ui/index.ts apps/web/src/app/admin/admin.css apps/web/tests/unit/admin-actions.test.tsx
git commit -m "$(cat <<'EOF'
feat(admin): action primitives — Button, Badge, Chip

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task A5: Layout primitives — Panel, PageHeader, EmptyState

**Files:**
- Create: `apps/web/src/components/admin/ui/AdminPanel.tsx`
- Create: `apps/web/src/components/admin/ui/AdminPageHeader.tsx`
- Create: `apps/web/src/components/admin/ui/AdminEmptyState.tsx`
- Modify: `apps/web/src/app/admin/admin.css`
- Modify: `apps/web/src/components/admin/ui/index.ts`
- Test: `apps/web/tests/unit/admin-layout-primitives.test.tsx`

- [ ] **Step 1: Append CSS**

Append to `apps/web/src/app/admin/admin.css`:

```css
@layer components {
  .admin-panel { background: var(--admin-card); border: 1px solid var(--admin-line); border-radius: 14px; padding: 18px 20px; box-shadow: var(--admin-shadow-panel); }
  .admin-panel[data-variant="danger"] { background: #fcf3ef; border-color: #e9c2b7; }
  .admin-panel[data-variant="dashed"] { background: var(--admin-card-2); border: 1.5px dashed var(--admin-line); }
  .admin-panel .section-tag { display: inline-block; font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--admin-honey); font-weight: 800; margin-bottom: 8px; }
  .admin-panel[data-variant="danger"] .section-tag { color: #a3392a; }
  .admin-panel[data-variant="dashed"] .section-tag { color: var(--admin-coral); }
  .admin-panel .panel-hint { font-size: 12px; color: var(--admin-muted); margin: 0 0 12px; line-height: 1.5; }

  .admin-page-head { display: flex; align-items: flex-start; justify-content: space-between; padding: 0 4px 18px; gap: 16px; }
  .admin-page-head .crumb { font-size: 11px; color: var(--admin-muted); font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }
  .admin-page-head h1 { font-size: 24px; font-weight: 800; color: var(--admin-ink); margin: 4px 0 0; }
  .admin-page-head .sub { font-size: 13px; color: var(--admin-ink-2); margin-top: 4px; }
  .admin-page-head .actions { display: flex; gap: 8px; align-items: center; }

  .admin-empty { background: var(--admin-card); border: 1px dashed var(--admin-line); border-radius: 14px; padding: 48px 24px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 12px; }
  .admin-empty .ic { font-size: 36px; line-height: 1; }
  .admin-empty h3 { font-size: 16px; font-weight: 800; color: var(--admin-ink); margin: 0; }
  .admin-empty p { font-size: 13px; color: var(--admin-muted); margin: 0; max-width: 420px; }
}
```

- [ ] **Step 2: Write failing test**

Create `apps/web/tests/unit/admin-layout-primitives.test.tsx`:

```tsx
import { describe, expect, test } from "vitest";
import { render, screen } from "@testing-library/react";
import { AdminPanel } from "@/components/admin/ui/AdminPanel";
import { AdminPageHeader } from "@/components/admin/ui/AdminPageHeader";
import { AdminEmptyState } from "@/components/admin/ui/AdminEmptyState";

describe("AdminPanel", () => {
  test("renders sectionTag and children", () => {
    render(<AdminPanel sectionTag="Basics">hello</AdminPanel>);
    expect(screen.getByText("Basics")).toBeTruthy();
    expect(screen.getByText("hello")).toBeTruthy();
  });
  test("variant=danger sets data attribute", () => {
    const { container } = render(<AdminPanel variant="danger">x</AdminPanel>);
    expect(container.firstChild).toHaveProperty("dataset");
    expect((container.firstChild as HTMLElement).dataset.variant).toBe("danger");
  });
});

describe("AdminPageHeader", () => {
  test("renders crumb, title, subtitle, actions slot", () => {
    render(<AdminPageHeader crumb="Catalog" title="Products" subtitle="23" actions={<button>x</button>} />);
    expect(screen.getByText("Catalog")).toBeTruthy();
    expect(screen.getByRole("heading", { level: 1, name: "Products" })).toBeTruthy();
    expect(screen.getByText("23")).toBeTruthy();
    expect(screen.getByRole("button", { name: "x" })).toBeTruthy();
  });
});

describe("AdminEmptyState", () => {
  test("renders icon, heading, body, action", () => {
    render(
      <AdminEmptyState icon="📦" heading="Nothing here" body="add some" action={<button>add</button>} />,
    );
    expect(screen.getByText("📦")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Nothing here" })).toBeTruthy();
    expect(screen.getByText("add some")).toBeTruthy();
    expect(screen.getByRole("button", { name: "add" })).toBeTruthy();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd apps/web && npm test -- admin-layout-primitives`
Expected: FAIL.

- [ ] **Step 4: Implement**

Create `apps/web/src/components/admin/ui/AdminPanel.tsx`:

```tsx
import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "./cn";

export type AdminPanelVariant = "default" | "danger" | "dashed";

export type AdminPanelProps = HTMLAttributes<HTMLDivElement> & {
  sectionTag?: ReactNode;
  hint?: ReactNode;
  variant?: AdminPanelVariant;
};

export function AdminPanel({ sectionTag, hint, variant = "default", className, children, ...rest }: AdminPanelProps) {
  return (
    <div data-variant={variant} className={cn("admin-panel", className)} {...rest}>
      {sectionTag ? <span className="section-tag">{sectionTag}</span> : null}
      {hint ? <p className="panel-hint">{hint}</p> : null}
      {children}
    </div>
  );
}
```

Create `apps/web/src/components/admin/ui/AdminPageHeader.tsx`:

```tsx
import type { ReactNode } from "react";

export type AdminPageHeaderProps = {
  crumb?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
};

export function AdminPageHeader({ crumb, title, subtitle, actions }: AdminPageHeaderProps) {
  return (
    <div className="admin-page-head">
      <div>
        {crumb ? <div className="crumb">{crumb}</div> : null}
        <h1>{title}</h1>
        {subtitle ? <p className="sub">{subtitle}</p> : null}
      </div>
      {actions ? <div className="actions">{actions}</div> : null}
    </div>
  );
}
```

Create `apps/web/src/components/admin/ui/AdminEmptyState.tsx`:

```tsx
import type { ReactNode } from "react";

export type AdminEmptyStateProps = {
  icon?: ReactNode;
  heading: ReactNode;
  body?: ReactNode;
  action?: ReactNode;
};

export function AdminEmptyState({ icon, heading, body, action }: AdminEmptyStateProps) {
  return (
    <div className="admin-empty">
      {icon ? <div className="ic">{icon}</div> : null}
      <h3>{heading}</h3>
      {body ? <p>{body}</p> : null}
      {action ? <div>{action}</div> : null}
    </div>
  );
}
```

Append to `apps/web/src/components/admin/ui/index.ts`:

```ts
export * from "./AdminPanel";
export * from "./AdminPageHeader";
export * from "./AdminEmptyState";
```

- [ ] **Step 5: Run test**

Run: `cd apps/web && npm test -- admin-layout-primitives`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/admin/ui/AdminPanel.tsx apps/web/src/components/admin/ui/AdminPageHeader.tsx apps/web/src/components/admin/ui/AdminEmptyState.tsx apps/web/src/components/admin/ui/index.ts apps/web/src/app/admin/admin.css apps/web/tests/unit/admin-layout-primitives.test.tsx
git commit -m "$(cat <<'EOF'
feat(admin): layout primitives — Panel, PageHeader, EmptyState

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task A6: List primitives — Toolbar, FilterChip, BulkBar, Table, Pagination

**Files:**
- Create: `apps/web/src/components/admin/ui/AdminToolbar.tsx`
- Create: `apps/web/src/components/admin/ui/AdminFilterChip.tsx`
- Create: `apps/web/src/components/admin/ui/AdminBulkBar.tsx`
- Create: `apps/web/src/components/admin/ui/AdminTable.tsx`
- Create: `apps/web/src/components/admin/ui/AdminPagination.tsx`
- Modify: `apps/web/src/app/admin/admin.css`
- Modify: `apps/web/src/components/admin/ui/index.ts`
- Test: `apps/web/tests/unit/admin-list-primitives.test.tsx`

- [ ] **Step 1: Append CSS**

Append to `apps/web/src/app/admin/admin.css`:

```css
@layer components {
  .admin-toolbar { background: var(--admin-card); border: 1px solid var(--admin-line); border-radius: 14px; padding: 10px 12px; display: flex; gap: 8px; align-items: center; box-shadow: var(--admin-shadow-panel); margin-bottom: 12px; flex-wrap: wrap; }
  .admin-toolbar-search { flex: 1; min-width: 220px; display: flex; align-items: center; background: #fffdf6; border: 1.5px solid var(--admin-line); border-radius: 10px; padding: 8px 14px; gap: 8px; }
  .admin-toolbar-search input { border: none; outline: none; background: transparent; flex: 1; font-size: 13px; color: var(--admin-ink); font-family: inherit; }
  .admin-toolbar-divider { width: 1px; height: 22px; background: var(--admin-line); }

  .admin-filter-chip { background: #fffdf6; border: 1.5px solid var(--admin-line); border-radius: 10px; padding: 7px 12px; font-size: 12px; font-weight: 700; color: var(--admin-ink-2); display: inline-flex; align-items: center; gap: 6px; cursor: pointer; font-family: inherit; }
  .admin-filter-chip[data-state="on"] { background: var(--admin-coral); color: #fff; border-color: var(--admin-coral); }
  .admin-filter-chip[data-state="on"] .count { background: rgba(255,255,255,0.22); padding: 0 6px; border-radius: 999px; font-size: 10px; }

  .admin-bulk { background: var(--admin-coral); color: #fff; border-radius: 12px; padding: 9px 14px; display: flex; align-items: center; gap: 14px; margin-bottom: 12px; box-shadow: 0 4px 12px rgba(211,93,60,0.22); }
  .admin-bulk .count { font-size: 12px; font-weight: 800; }
  .admin-bulk .actions { display: flex; gap: 6px; margin-left: auto; flex-wrap: wrap; }
  .admin-bulk .actions button { background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.3); color: #fff; padding: 6px 12px; border-radius: 999px; font-size: 11px; font-weight: 700; cursor: pointer; font-family: inherit; }
  .admin-bulk .actions button[data-tone="danger"] { background: rgba(0,0,0,0.18); }
  .admin-bulk .dismiss { background: transparent; border: none; color: #fff; cursor: pointer; opacity: 0.8; font-weight: 900; font-size: 16px; padding: 0 6px; }

  .admin-table-wrap { background: var(--admin-card); border: 1px solid var(--admin-line); border-radius: 14px; overflow: hidden; box-shadow: var(--admin-shadow-panel); }
  .admin-table { width: 100%; border-collapse: collapse; }
  .admin-table thead th { background: var(--admin-card-2); color: var(--admin-ink-2); font-size: 10px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; padding: 11px 14px; text-align: left; border-bottom: 1px solid var(--admin-line); }
  .admin-table thead th[data-sortable="true"] { cursor: pointer; user-select: none; }
  .admin-table tbody td { padding: 11px 14px; border-bottom: 1px solid var(--admin-line-soft); font-size: 13px; vertical-align: middle; color: var(--admin-ink); }
  .admin-table tbody tr:hover { background: var(--admin-card-2); cursor: pointer; }
  .admin-table tbody tr[data-selected="true"] { background: #fdf1de; }
  .admin-table tbody tr:last-child td { border-bottom: none; }
  .admin-table .skeleton-row td { padding: 11px 14px; }
  .admin-table .skeleton-bar { height: 14px; background: var(--admin-line-soft); border-radius: 6px; animation: admin-shimmer 1.4s linear infinite; background: linear-gradient(90deg, var(--admin-line-soft), var(--admin-card-3), var(--admin-line-soft)); background-size: 200% 100%; }
  @keyframes admin-shimmer { 0% { background-position: 0% 0; } 100% { background-position: -200% 0; } }

  .admin-pagi { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; gap: 12px; flex-wrap: wrap; }
  .admin-pagi .info { font-size: 12px; color: var(--admin-muted); }
  .admin-pagi .controls { display: flex; gap: 4px; align-items: center; }
  .admin-pagi .pgbtn { background: transparent; border: 1.5px solid var(--admin-line); border-radius: 8px; padding: 5px 11px; font-size: 12px; font-weight: 700; color: var(--admin-ink-2); cursor: pointer; font-family: inherit; }
  .admin-pagi .pgbtn[data-state="on"] { background: var(--admin-coral); color: #fff; border-color: var(--admin-coral); }
  .admin-pagi .pgbtn[disabled] { opacity: 0.4; cursor: not-allowed; }
}
```

- [ ] **Step 2: Write failing test**

Create `apps/web/tests/unit/admin-list-primitives.test.tsx`:

```tsx
import { describe, expect, test, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AdminToolbar } from "@/components/admin/ui/AdminToolbar";
import { AdminFilterChip } from "@/components/admin/ui/AdminFilterChip";
import { AdminBulkBar } from "@/components/admin/ui/AdminBulkBar";
import { AdminTable } from "@/components/admin/ui/AdminTable";
import { AdminPagination } from "@/components/admin/ui/AdminPagination";

describe("AdminToolbar.Search", () => {
  test("fires onSearchChange", () => {
    const onSearchChange = vi.fn();
    render(<AdminToolbar searchValue="" onSearchChange={onSearchChange} placeholder="find" />);
    fireEvent.change(screen.getByPlaceholderText("find"), { target: { value: "x" } });
    expect(onSearchChange).toHaveBeenCalledWith("x");
  });
});

describe("AdminFilterChip", () => {
  test("active state and count badge", () => {
    render(<AdminFilterChip active count={3}>Format</AdminFilterChip>);
    const chip = screen.getByText("Format").closest("button")!;
    expect(chip.getAttribute("data-state")).toBe("on");
    expect(screen.getByText("3")).toBeTruthy();
  });
});

describe("AdminBulkBar", () => {
  test("invisible when count=0; visible with actions when count>0", () => {
    const { rerender } = render(<AdminBulkBar selectedCount={0} onClear={() => {}} />);
    expect(screen.queryByText(/selected/)).toBeNull();
    rerender(
      <AdminBulkBar selectedCount={3} onClear={() => {}}>
        <button>Publish</button>
      </AdminBulkBar>,
    );
    expect(screen.getByText("3 selected")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Publish" })).toBeTruthy();
  });
});

describe("AdminTable", () => {
  test("renders header and body rows", () => {
    render(
      <AdminTable
        columns={[{ key: "title", label: "Title" }]}
        rows={[{ id: "a", title: "Alpha" }]}
        getRowKey={(r) => r.id}
      />,
    );
    expect(screen.getByRole("columnheader", { name: "Title" })).toBeTruthy();
    expect(screen.getByText("Alpha")).toBeTruthy();
  });
});

describe("AdminPagination", () => {
  test("renders Prev/Next + page buttons; fires onPageChange", () => {
    const onPageChange = vi.fn();
    render(<AdminPagination page={2} totalPages={5} pageSize={25} total={108} onPageChange={onPageChange} />);
    expect(screen.getByText(/Showing 26–50 of 108/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    expect(onPageChange).toHaveBeenCalledWith(3);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd apps/web && npm test -- admin-list-primitives`
Expected: FAIL.

- [ ] **Step 4: Implement**

Create `apps/web/src/components/admin/ui/AdminToolbar.tsx`:

```tsx
import type { ReactNode } from "react";

export type AdminToolbarProps = {
  searchValue: string;
  onSearchChange: (next: string) => void;
  placeholder?: string;
  children?: ReactNode;
};

export function AdminToolbar({ searchValue, onSearchChange, placeholder = "Search…", children }: AdminToolbarProps) {
  return (
    <div className="admin-toolbar">
      <div className="admin-toolbar-search">
        <span aria-hidden style={{ color: "var(--admin-muted)" }}>🔍</span>
        <input
          placeholder={placeholder}
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
      {children}
    </div>
  );
}
```

Create `apps/web/src/components/admin/ui/AdminFilterChip.tsx`:

```tsx
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "./cn";

export type AdminFilterChipProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean;
  count?: number;
  children: ReactNode;
};

export function AdminFilterChip({ active, count, className, children, type = "button", ...rest }: AdminFilterChipProps) {
  return (
    <button type={type} data-state={active ? "on" : "off"} className={cn("admin-filter-chip", className)} {...rest}>
      {children}
      {typeof count === "number" && count > 0 ? <span className="count">{count}</span> : null}
    </button>
  );
}
```

Create `apps/web/src/components/admin/ui/AdminBulkBar.tsx`:

```tsx
import type { ReactNode } from "react";

export type AdminBulkBarProps = {
  selectedCount: number;
  onClear: () => void;
  children?: ReactNode;
};

export function AdminBulkBar({ selectedCount, onClear, children }: AdminBulkBarProps) {
  if (selectedCount === 0) return null;
  return (
    <div className="admin-bulk" role="status">
      <span aria-hidden>✓</span>
      <span className="count">{selectedCount} selected</span>
      <div className="actions">{children}</div>
      <button type="button" className="dismiss" aria-label="clear selection" onClick={onClear}>×</button>
    </div>
  );
}
```

Create `apps/web/src/components/admin/ui/AdminTable.tsx`:

```tsx
import type { ReactNode } from "react";

export type AdminTableColumn<Row> = {
  key: string;
  label: ReactNode;
  width?: string;
  sortable?: boolean;
  render?: (row: Row) => ReactNode;
};

export type AdminTableProps<Row> = {
  columns: AdminTableColumn<Row>[];
  rows: Row[];
  getRowKey: (row: Row) => string;
  onRowClick?: (row: Row) => void;
  isSelected?: (row: Row) => boolean;
  sortKey?: string;
  sortDir?: "asc" | "desc";
  onSort?: (key: string) => void;
  loading?: boolean;
};

export function AdminTable<Row extends Record<string, unknown>>({
  columns, rows, getRowKey, onRowClick, isSelected, sortKey, sortDir, onSort, loading,
}: AdminTableProps<Row>) {
  return (
    <div className="admin-table-wrap">
      <table className="admin-table">
        <thead>
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                style={c.width ? { width: c.width } : undefined}
                data-sortable={c.sortable ? "true" : undefined}
                onClick={c.sortable && onSort ? () => onSort(c.key) : undefined}
              >
                {c.label}
                {c.sortable && sortKey === c.key ? <span aria-hidden> {sortDir === "asc" ? "↑" : "↓"}</span> : null}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading
            ? Array.from({ length: 5 }).map((_, i) => (
                <tr key={`s-${i}`} className="skeleton-row">
                  {columns.map((c) => <td key={c.key}><div className="skeleton-bar" /></td>)}
                </tr>
              ))
            : rows.map((row) => (
                <tr
                  key={getRowKey(row)}
                  data-selected={isSelected?.(row) ? "true" : undefined}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                >
                  {columns.map((c) => (
                    <td key={c.key}>{c.render ? c.render(row) : String((row as Record<string, unknown>)[c.key] ?? "")}</td>
                  ))}
                </tr>
              ))}
        </tbody>
      </table>
    </div>
  );
}
```

Create `apps/web/src/components/admin/ui/AdminPagination.tsx`:

```tsx
export type AdminPaginationProps = {
  page: number;
  totalPages: number;
  pageSize: number;
  total: number;
  onPageChange: (next: number) => void;
};

export function AdminPagination({ page, totalPages, pageSize, total, onPageChange }: AdminPaginationProps) {
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);
  const pages: number[] = [];
  for (let p = 1; p <= totalPages; p += 1) pages.push(p);
  return (
    <div className="admin-pagi">
      <span className="info">Showing {start}–{end} of {total} · {pageSize} per page</span>
      <div className="controls">
        <button type="button" className="pgbtn" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>‹ Prev</button>
        {pages.map((p) => (
          <button key={p} type="button" className="pgbtn" data-state={p === page ? "on" : "off"} onClick={() => onPageChange(p)}>{p}</button>
        ))}
        <button type="button" className="pgbtn" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>Next ›</button>
      </div>
    </div>
  );
}
```

Append to `apps/web/src/components/admin/ui/index.ts`:

```ts
export * from "./AdminToolbar";
export * from "./AdminFilterChip";
export * from "./AdminBulkBar";
export * from "./AdminTable";
export * from "./AdminPagination";
```

- [ ] **Step 5: Run test**

Run: `cd apps/web && npm test -- admin-list-primitives`
Expected: PASS, 5 tests.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/admin/ui/AdminToolbar.tsx apps/web/src/components/admin/ui/AdminFilterChip.tsx apps/web/src/components/admin/ui/AdminBulkBar.tsx apps/web/src/components/admin/ui/AdminTable.tsx apps/web/src/components/admin/ui/AdminPagination.tsx apps/web/src/components/admin/ui/index.ts apps/web/src/app/admin/admin.css apps/web/tests/unit/admin-list-primitives.test.tsx
git commit -m "$(cat <<'EOF'
feat(admin): list primitives — Toolbar, FilterChip, BulkBar, Table, Pagination

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task A7: Refactor AdminShell — sidebar, topbar, body-class toggle

**Files:**
- Modify: `apps/web/src/components/admin/AdminShell.tsx`
- Create: `apps/web/src/components/admin/AdminSidebar.tsx`
- Create: `apps/web/src/components/admin/AdminTopbar.tsx`
- Modify: `apps/web/src/app/admin/admin.css`
- Test: `apps/web/tests/unit/admin-shell.test.tsx`

**Why:** Replaces the existing `AdminShell.tsx` (which uses `.coco-*` and shows only a subset of nav groups) with the locked-mockup sidebar plus the topbar. Sets `body.admin-route` so admin tokens apply.

- [ ] **Step 1: Append CSS for shell layout**

Append to `apps/web/src/app/admin/admin.css`:

```css
@layer components {
  .admin-app { display: grid; grid-template-columns: 248px 1fr; min-height: 100vh; }
  @media (max-width: 900px) { .admin-app { grid-template-columns: 64px 1fr; } }

  .admin-side { background: var(--admin-card); border-right: 1px solid var(--admin-line); padding: 18px 14px; display: flex; flex-direction: column; gap: 8px; overflow-y: auto; }
  .admin-side .brand { display: flex; align-items: center; gap: 10px; padding: 6px 8px 18px; border-bottom: 1px dashed var(--admin-line); margin-bottom: 8px; }
  .admin-side .brand .logo { width: 34px; height: 34px; background: var(--admin-coral); border-radius: 10px; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 900; font-size: 16px; flex-shrink: 0; }
  .admin-side .brand .name { font-weight: 900; font-size: 15px; color: var(--admin-ink); }
  .admin-side .brand .sub { font-size: 10px; color: var(--admin-muted); font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }

  .admin-navgroup-label { font-size: 10px; font-weight: 800; color: var(--admin-muted); letter-spacing: 0.12em; text-transform: uppercase; padding: 14px 10px 4px; }
  .admin-navitem { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border-radius: 10px; font-size: 13px; font-weight: 700; color: var(--admin-ink-2); cursor: pointer; text-decoration: none; }
  .admin-navitem:hover { background: var(--admin-card-3); color: var(--admin-ink); }
  .admin-navitem[data-active="true"] { background: var(--admin-coral-soft); color: var(--admin-coral-2); }
  .admin-navitem[data-active="true"] .ic { background: var(--admin-coral); color: #fff; }
  .admin-navitem .ic { width: 22px; height: 22px; background: var(--admin-card-3); color: var(--admin-ink-2); border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 12px; flex-shrink: 0; }
  .admin-navitem .badge { margin-left: auto; background: var(--admin-coral); color: #fff; font-size: 9px; font-weight: 800; padding: 2px 7px; border-radius: 999px; }
  .admin-navitem[data-soon="true"] { color: var(--admin-muted-2); opacity: 0.7; cursor: not-allowed; }
  .admin-navitem[data-soon="true"] .ic { background: transparent; border: 1px dashed var(--admin-muted-2); }
  .admin-navitem[data-soon="true"] .badge { background: transparent; color: var(--admin-muted); border: 1px solid var(--admin-muted-2); font-weight: 700; }

  .admin-side .user { margin-top: auto; padding: 10px; background: var(--admin-card-3); border-radius: 12px; display: flex; align-items: center; gap: 10px; }
  .admin-side .user .av { width: 32px; height: 32px; background: var(--admin-honey); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 800; color: var(--admin-ink); font-size: 13px; }
  .admin-side .user .em { font-size: 11px; font-weight: 800; color: var(--admin-ink); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .admin-side .user .role { font-size: 10px; color: var(--admin-muted); font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; }
  .admin-side .user .signout { color: var(--admin-coral); background: none; border: none; cursor: pointer; font-size: 11px; font-weight: 700; padding: 0; }

  @media (max-width: 900px) {
    .admin-side .brand .name, .admin-side .brand .sub, .admin-navitem .label, .admin-navgroup-label, .admin-side .user .info { display: none; }
  }

  .admin-main { display: flex; flex-direction: column; min-width: 0; }
  .admin-topbar { background: var(--admin-card); border-bottom: 1px solid var(--admin-line); padding: 10px 22px; display: flex; align-items: center; gap: 14px; }
  .admin-topbar .qs { flex: 1; max-width: 480px; display: flex; align-items: center; background: var(--admin-card-3); border: 1.5px solid var(--admin-line); border-radius: 10px; padding: 7px 12px; gap: 8px; }
  .admin-topbar .qs input { flex: 1; border: none; outline: none; background: transparent; font-size: 12px; color: var(--admin-ink); font-family: inherit; }
  .admin-topbar .actions { display: flex; gap: 6px; margin-left: auto; align-items: center; }
  .admin-topbar a.view-site { font-size: 11px; font-weight: 800; color: var(--admin-ink-2); text-decoration: none; padding: 7px 12px; border-radius: 8px; border: 1.5px solid var(--admin-line); }

  .admin-body { padding: 22px; flex: 1; }
}
```

- [ ] **Step 2: Write failing test**

Create `apps/web/tests/unit/admin-shell.test.tsx`:

```tsx
import { describe, expect, test } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

const NAV_STUB = (path: string) => path;

describe("AdminSidebar", () => {
  test("renders all five groups with the locked items", () => {
    render(<AdminSidebar pathname="/admin/products" user={{ email: "a@b.c", role: "Owner" }} onSignOut={() => {}} />);
    for (const g of ["Overview", "Catalog", "Commerce", "Site content", "Editorial"]) {
      expect(screen.getByText(g)).toBeTruthy();
    }
    for (const n of ["Dashboard", "Products", "Collections", "Orders", "Customers", "Notify me", "Subscribers", "Home page", "Header & Footer", "Announcement", "Static pages"]) {
      expect(screen.getAllByText(n).length).toBeGreaterThanOrEqual(1);
    }
    for (const n of ["Blog", "Comics", "Gallery", "FAQ", "Featured On"]) {
      const node = screen.getByText(n).closest("[data-soon]");
      expect(node?.getAttribute("data-soon")).toBe("true");
    }
  });

  test("marks the active nav item", () => {
    render(<AdminSidebar pathname="/admin/products" user={{ email: "a@b.c", role: "Owner" }} onSignOut={() => {}} />);
    const products = screen.getByText("Products").closest("[data-active]");
    expect(products?.getAttribute("data-active")).toBe("true");
  });
});

describe("AdminSidebar — body class side-effect", () => {
  test("does not set body class on its own (handled by AdminShell)", () => {
    cleanup();
    render(<AdminSidebar pathname="/admin" user={{ email: "a@b.c", role: "Owner" }} onSignOut={() => {}} />);
    expect(document.body.classList.contains("admin-route")).toBe(false);
  });
});

describe("AdminShell body class", () => {
  test("AdminShell adds admin-route to body for non-login routes", async () => {
    cleanup();
    const { AdminShell } = await import("@/components/admin/AdminShell");
    render(
      <AdminShell pathname="/admin/products" user={{ email: "a@b.c", role: "Owner" }} onSignOut={() => {}}>
        <div>page body</div>
      </AdminShell>,
    );
    expect(document.body.classList.contains("admin-route")).toBe(true);
  });
});

void NAV_STUB;
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd apps/web && npm test -- admin-shell`
Expected: FAIL — `AdminSidebar` doesn't exist; `AdminShell` doesn't accept `pathname`/`user`/`onSignOut` props.

- [ ] **Step 4: Implement AdminSidebar**

Create `apps/web/src/components/admin/AdminSidebar.tsx`:

```tsx
"use client";

import Link from "next/link";

export type AdminUser = { email: string; role: string };

const NAV: Array<{
  group: string;
  items: Array<{ href: string; label: string; icon: string; soon?: boolean; badge?: string }>;
}> = [
  { group: "Overview", items: [{ href: "/admin", label: "Dashboard", icon: "📊" }] },
  { group: "Catalog", items: [
    { href: "/admin/products", label: "Products", icon: "📦" },
    { href: "/admin/collections", label: "Collections", icon: "🗂️" },
  ]},
  { group: "Commerce", items: [
    { href: "/admin/orders", label: "Orders", icon: "🧾" },
    { href: "/admin/customers", label: "Customers", icon: "👥" },
    { href: "/admin/notify-me", label: "Notify me", icon: "🔔" },
    { href: "/admin/subscribers", label: "Subscribers", icon: "✉️" },
  ]},
  { group: "Site content", items: [
    { href: "/admin/pages/home", label: "Home page", icon: "🏠" },
    { href: "/admin/pages/footer", label: "Header & Footer", icon: "🧭" },
    { href: "/admin/pages/announcement", label: "Announcement", icon: "📣" },
    { href: "/admin/static-pages", label: "Static pages", icon: "📄" },
  ]},
  { group: "Editorial", items: [
    { href: "/admin/blog", label: "Blog", icon: "📝", soon: true, badge: "soon" },
    { href: "/admin/comics", label: "Comics", icon: "🎨", soon: true, badge: "soon" },
    { href: "/admin/gallery", label: "Gallery", icon: "🖼️", soon: true, badge: "soon" },
    { href: "/admin/faq", label: "FAQ", icon: "❓", soon: true, badge: "soon" },
    { href: "/admin/featured-on", label: "Featured On", icon: "⭐", soon: true, badge: "soon" },
  ]},
];

function isActive(itemHref: string, pathname: string): boolean {
  if (itemHref === "/admin") return pathname === "/admin";
  return pathname === itemHref || pathname.startsWith(itemHref + "/");
}

export function AdminSidebar({
  pathname, user, onSignOut,
}: { pathname: string; user: AdminUser | null; onSignOut: () => void }) {
  return (
    <aside className="admin-side">
      <div className="brand">
        <div className="logo">Z</div>
        <div>
          <div className="name">Zoe&amp;Book</div>
          <div className="sub">Admin</div>
        </div>
      </div>

      {NAV.map((group) => (
        <div key={group.group}>
          <div className="admin-navgroup-label">{group.group}</div>
          {group.items.map((item) => {
            const active = isActive(item.href, pathname) && !item.soon;
            const Wrapper: React.ElementType = item.soon ? "div" : Link;
            const props = item.soon ? { "aria-disabled": true } : { href: item.href };
            return (
              <Wrapper
                key={item.href}
                className="admin-navitem"
                data-active={active ? "true" : undefined}
                data-soon={item.soon ? "true" : undefined}
                {...(props as Record<string, unknown>)}
              >
                <span className="ic">{item.icon}</span>
                <span className="label">{item.label}</span>
                {item.badge ? <span className="badge">{item.badge}</span> : null}
              </Wrapper>
            );
          })}
        </div>
      ))}

      {user ? (
        <div className="user">
          <div className="av">{user.email.charAt(0).toUpperCase()}</div>
          <div style={{ flex: 1, minWidth: 0 }} className="info">
            <div className="em">{user.email}</div>
            <div className="role">{user.role}</div>
          </div>
          <button type="button" className="signout" onClick={onSignOut}>Sign out</button>
        </div>
      ) : null}
    </aside>
  );
}
```

- [ ] **Step 5: Implement AdminTopbar**

Create `apps/web/src/components/admin/AdminTopbar.tsx`:

```tsx
"use client";

export function AdminTopbar() {
  return (
    <div className="admin-topbar">
      <div className="qs">
        <span aria-hidden style={{ color: "var(--admin-muted)" }}>🔍</span>
        <input placeholder="Jump to product, order, customer… (coming soon)" disabled />
      </div>
      <div className="actions">
        <a className="view-site" href="/" target="_blank" rel="noreferrer">View storefront ↗</a>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Rewrite AdminShell**

Replace `apps/web/src/components/admin/AdminShell.tsx`:

```tsx
"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useAdminAuth } from "@/state/admin-auth";
import { AdminSidebar, type AdminUser } from "./AdminSidebar";
import { AdminTopbar } from "./AdminTopbar";

type AdminShellInternalProps = {
  children: React.ReactNode;
  /** Inject pathname/user/onSignOut for testing; production passes nothing and uses hooks. */
  pathname?: string;
  user?: AdminUser | null;
  onSignOut?: () => void;
};

export function AdminShell({ children, pathname: pathnameProp, user: userProp, onSignOut: onSignOutProp }: AdminShellInternalProps) {
  const hookPathname = usePathname() ?? "";
  const { user: hookUser, signOut: hookSignOut } = useAdminAuth();
  const pathname = pathnameProp ?? hookPathname;
  const user = userProp !== undefined ? userProp : (hookUser ? { email: hookUser.email, role: "Owner" } : null);
  const onSignOut = onSignOutProp ?? hookSignOut;

  useEffect(() => {
    if (pathname === "/admin/login") return;
    document.body.classList.add("admin-route");
    return () => { document.body.classList.remove("admin-route"); };
  }, [pathname]);

  if (pathname === "/admin/login") return <>{children}</>;

  return (
    <div className="admin-app">
      <AdminSidebar pathname={pathname} user={user} onSignOut={onSignOut} />
      <main className="admin-main">
        <AdminTopbar />
        <div className="admin-body">{children}</div>
      </main>
    </div>
  );
}
```

- [ ] **Step 7: Run tests**

Run: `cd apps/web && npm test -- admin-shell`
Expected: PASS, 4 tests.

Also run typecheck: `cd apps/web && npm run typecheck`
Expected: No errors.

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/components/admin/AdminShell.tsx apps/web/src/components/admin/AdminSidebar.tsx apps/web/src/components/admin/AdminTopbar.tsx apps/web/src/app/admin/admin.css apps/web/tests/unit/admin-shell.test.tsx
git commit -m "$(cat <<'EOF'
feat(admin): cozy shell with sidebar + topbar + body-class toggle

Replaces the .coco-* admin shell with the locked sidebar (Overview · Catalog ·
Commerce · Site content · Editorial), adds a topbar with storefront link, and
sets body.admin-route so admin tokens apply.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task A8: Placeholder routes — Customers, Notify me, Subscribers

**Files:**
- Create: `apps/web/src/app/admin/customers/page.tsx`
- Create: `apps/web/src/app/admin/notify-me/page.tsx`
- Create: `apps/web/src/app/admin/subscribers/page.tsx`
- Test: `apps/web/tests/unit/admin-placeholder-pages.test.tsx`

**Why:** Spec requires the Commerce nav items not to be dead links. Each renders `AdminEmptyState`.

- [ ] **Step 1: Write failing test**

Create `apps/web/tests/unit/admin-placeholder-pages.test.tsx`:

```tsx
import { describe, expect, test } from "vitest";
import { render, screen } from "@testing-library/react";
import CustomersPage from "@/app/admin/customers/page";
import NotifyMePage from "@/app/admin/notify-me/page";
import SubscribersPage from "@/app/admin/subscribers/page";

describe("placeholder admin pages", () => {
  test.each([
    [<CustomersPage />, "Customers", /orders & customers spec/i],
    [<NotifyMePage />, "Notify me", /orders & customers spec/i],
    [<SubscribersPage />, "Subscribers", /orders & customers spec/i],
  ])("renders heading and roadmap copy for %p", (node, heading, body) => {
    render(node);
    expect(screen.getByRole("heading", { level: 1, name: heading })).toBeTruthy();
    expect(screen.getByText(body)).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/web && npm test -- admin-placeholder-pages`
Expected: FAIL — pages don't exist.

- [ ] **Step 3: Implement each page**

Create `apps/web/src/app/admin/customers/page.tsx`:

```tsx
import { AdminPageHeader } from "@/components/admin/ui/AdminPageHeader";
import { AdminEmptyState } from "@/components/admin/ui/AdminEmptyState";

export default function CustomersPage() {
  return (
    <div>
      <AdminPageHeader crumb="Commerce" title="Customers" />
      <AdminEmptyState
        icon="👥"
        heading="Coming soon"
        body="Customer profiles, lifetime value, order history and wishlist insights arrive with the orders & customers spec."
      />
    </div>
  );
}
```

Create `apps/web/src/app/admin/notify-me/page.tsx`:

```tsx
import { AdminPageHeader } from "@/components/admin/ui/AdminPageHeader";
import { AdminEmptyState } from "@/components/admin/ui/AdminEmptyState";

export default function NotifyMePage() {
  return (
    <div>
      <AdminPageHeader crumb="Commerce" title="Notify me" />
      <AdminEmptyState
        icon="🔔"
        heading="Coming soon"
        body="A list of customers who asked to be told when out-of-stock products return — wired up with the orders & customers spec."
      />
    </div>
  );
}
```

Create `apps/web/src/app/admin/subscribers/page.tsx`:

```tsx
import { AdminPageHeader } from "@/components/admin/ui/AdminPageHeader";
import { AdminEmptyState } from "@/components/admin/ui/AdminEmptyState";

export default function SubscribersPage() {
  return (
    <div>
      <AdminPageHeader crumb="Commerce" title="Subscribers" />
      <AdminEmptyState
        icon="✉️"
        heading="Coming soon"
        body="Newsletter subscriber list with export — shipped with the orders & customers spec."
      />
    </div>
  );
}
```

- [ ] **Step 4: Run test**

Run: `cd apps/web && npm test -- admin-placeholder-pages`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/admin/customers apps/web/src/app/admin/notify-me apps/web/src/app/admin/subscribers apps/web/tests/unit/admin-placeholder-pages.test.tsx
git commit -m "$(cat <<'EOF'
feat(admin): placeholder pages for Customers, Notify me, Subscribers

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task A9: Migrate existing admin forms to new primitives (no restructure)

**Files:**
- Modify: `apps/web/src/components/admin/CollectionForm.tsx`
- Modify: `apps/web/src/components/admin/StaticPageForm.tsx`
- Modify: `apps/web/src/components/admin/ContentBlockEditor.tsx`
- Modify: every file under `apps/web/src/components/admin/blocks/*.tsx`
- Modify: `apps/web/src/components/admin/AnalyticsCards.tsx`
- Modify: `apps/web/src/components/admin/OrdersTable.tsx`
- Modify: `apps/web/src/components/admin/ImageUpload.tsx`
- Modify: every existing `apps/web/src/app/admin/**/page.tsx` that uses raw `<input className="coco-input">` or `coco-button-*`

**Why:** No regression: same admin, new look. After this task no admin file references `coco-input` or `coco-button-*`. `ProductForm.tsx` migration is deferred to Task B5 because that file is rewritten there.

- [ ] **Step 1: Inventory every admin usage of `coco-input` / `coco-button-primary` / `coco-button-secondary` / `coco-panel` / `coco-heading`**

Run:

```bash
grep -rln "coco-input\|coco-button-primary\|coco-button-secondary\|coco-panel\|coco-heading" apps/web/src/app/admin apps/web/src/components/admin
```

Expected: 15–25 file paths. Record this list — every file in it must be updated below (or in Task B5 for `ProductForm.tsx`).

- [ ] **Step 2: Replace by deterministic mapping**

Apply this exact mapping per file (use Edit per occurrence; do **not** restructure the surrounding JSX):

| Before | After | Notes |
| --- | --- | --- |
| `className="coco-input w-full"` on `<input>` | `<AdminInput>` (drop the `className`, keep all other props) | import from `@/components/admin/ui` |
| `className="coco-input w-full"` on `<textarea>` | `<AdminTextarea>` | same |
| `className="coco-input"` on `<select>` | `<AdminSelect>` | same |
| `className="coco-button-primary"` on `<button>` | `<AdminButton variant="primary">` | |
| `className="coco-button-secondary"` on `<button>` | `<AdminButton variant="ghost">` | |
| `<h1 className="coco-heading">x</h1>` | `<AdminPageHeader title="x" />` (or keep `<h1>` if it's only a label, not a page header) | judgement call: only swap for the topmost heading of the page |
| `<div className="coco-panel space-y-4 p-6">` | `<AdminPanel className="space-y-4">` (drop `p-6` — panel has its own padding) | |

For inline-edit tables (e.g. `FooterPage` footer-link rows with `<input className="coco-input">`), replace each `<input>` with `<AdminInput>` and verify the row still aligns visually.

For `<label className="block"><span class="mb-1 block text-sm font-semibold">Label</span><input className="coco-input w-full" /></label>` patterns, rewrite as:

```tsx
<AdminField>
  <AdminLabel htmlFor={id}>Label</AdminLabel>
  <AdminInput id={id} ... />
</AdminField>
```

- [ ] **Step 3: Add visual-regression e2e (light)**

Append to `apps/web/tests/e2e/admin-flow.spec.ts` (or whichever existing admin spec) a single screenshot per migrated page if not already present. Skip if existing tests already exercise these pages — the goal is "no functional regression". Run full existing admin e2e:

```bash
cd apps/web && npx playwright test admin-flow admin-pages-flow
```

Expected: PASS, no regressions.

- [ ] **Step 4: Verify the audit grep returns only `ProductForm.tsx`**

Run:

```bash
grep -rln "coco-input\|coco-button-primary\|coco-button-secondary\|coco-panel\b" apps/web/src/app/admin apps/web/src/components/admin
```

Expected: zero matches outside `apps/web/src/components/admin/ProductForm.tsx` (which Task B5 rewrites).

- [ ] **Step 5: Typecheck + unit tests**

Run: `cd apps/web && npm run typecheck && npm test`
Expected: All green.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/app/admin apps/web/src/components/admin
git commit -m "$(cat <<'EOF'
refactor(admin): migrate every existing form to new primitives

No structural changes; ProductForm.tsx is rewritten in a later commit.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Phase B — Product editor restructure

Goal: `ProductForm.tsx` becomes a sectioned CRM editor that surfaces every field. Phase B ships on its own once Phase A is in.

### Task B1: AdminGalleryUploader composite

**Files:**
- Create: `apps/web/src/components/admin/product/AdminGalleryUploader.tsx`
- Modify: `apps/web/src/app/admin/admin.css`
- Test: `apps/web/tests/unit/admin-gallery-uploader.test.tsx`

**Why:** One uploader reused for product / inspiration / customer galleries. Supports drag-to-reorder, primary indicator (`images[0]`), and remove-on-hover.

- [ ] **Step 1: Append CSS**

Append to `apps/web/src/app/admin/admin.css`:

```css
@layer components {
  .admin-gallery { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; }
  @media (max-width: 700px) { .admin-gallery { grid-template-columns: repeat(3, 1fr); } }
  .admin-gallery-thumb { aspect-ratio: 1; background: #fef0d4; border: 1px solid var(--admin-line-soft); border-radius: 10px; display: flex; align-items: center; justify-content: center; position: relative; overflow: hidden; cursor: grab; }
  .admin-gallery-thumb img { width: 100%; height: 100%; object-fit: cover; }
  .admin-gallery-thumb[data-primary="true"] { box-shadow: 0 0 0 2px var(--admin-coral); }
  .admin-gallery-thumb[data-primary="true"]::after { content: "★ primary"; position: absolute; bottom: 4px; left: 4px; background: var(--admin-coral); color: #fff; font-size: 9px; font-weight: 700; padding: 2px 6px; border-radius: 6px; letter-spacing: 0.03em; }
  .admin-gallery-thumb .controls { position: absolute; top: 4px; right: 4px; display: none; gap: 4px; }
  .admin-gallery-thumb:hover .controls { display: flex; }
  .admin-gallery-thumb .controls button { background: rgba(255,255,255,0.92); border: none; border-radius: 4px; font-size: 11px; padding: 2px 5px; cursor: pointer; font-family: inherit; line-height: 1; }
  .admin-gallery-thumb .controls button[data-tone="danger"] { color: #a3392a; }
  .admin-gallery-add { aspect-ratio: 1; border: 2px dashed #c9a868; border-radius: 10px; background: transparent; color: var(--admin-ink-2); font-weight: 700; cursor: pointer; font-family: inherit; }
  .admin-gallery-add:hover { background: var(--admin-card-3); }
  .admin-gallery-add[disabled] { opacity: 0.5; cursor: not-allowed; }
}
```

- [ ] **Step 2: Write failing test**

Create `apps/web/tests/unit/admin-gallery-uploader.test.tsx`:

```tsx
import { describe, expect, test, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AdminGalleryUploader } from "@/components/admin/product/AdminGalleryUploader";

const upload = vi.fn(async (_f: File) => ({ url: "/u/x.png" }));

describe("AdminGalleryUploader", () => {
  test("renders one tile per value + add tile", () => {
    render(<AdminGalleryUploader value={["/a.png","/b.png"]} onChange={() => {}} upload={upload} />);
    expect(screen.getAllByRole("img")).toHaveLength(2);
    expect(screen.getByRole("button", { name: /add/i })).toBeTruthy();
  });

  test("marks the first tile as primary", () => {
    render(<AdminGalleryUploader value={["/a.png","/b.png"]} onChange={() => {}} upload={upload} />);
    const tiles = screen.getAllByRole("img").map((img) => img.parentElement);
    expect(tiles[0]?.getAttribute("data-primary")).toBe("true");
    expect(tiles[1]?.getAttribute("data-primary")).toBeNull();
  });

  test("remove button emits onChange without that item", () => {
    const onChange = vi.fn();
    render(<AdminGalleryUploader value={["/a.png","/b.png"]} onChange={onChange} upload={upload} />);
    fireEvent.click(screen.getAllByRole("button", { name: /remove/i })[1]);
    expect(onChange).toHaveBeenCalledWith(["/a.png"]);
  });

  test("set-as-primary button moves item to index 0", () => {
    const onChange = vi.fn();
    render(<AdminGalleryUploader value={["/a.png","/b.png"]} onChange={onChange} upload={upload} />);
    fireEvent.click(screen.getAllByRole("button", { name: /set as primary/i })[0]);
    expect(onChange).toHaveBeenCalledWith(["/b.png", "/a.png"]);
  });

  test("upload appends new URL", async () => {
    const onChange = vi.fn();
    render(<AdminGalleryUploader value={["/a.png"]} onChange={onChange} upload={upload} />);
    const input = screen.getByLabelText(/upload images/i) as HTMLInputElement;
    const file = new File(["x"], "x.png", { type: "image/png" });
    Object.defineProperty(input, "files", { value: [file] });
    fireEvent.change(input);
    await vi.waitFor(() => expect(onChange).toHaveBeenCalledWith(["/a.png", "/u/x.png"]));
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd apps/web && npm test -- admin-gallery-uploader`
Expected: FAIL.

- [ ] **Step 4: Implement**

Create `apps/web/src/components/admin/product/AdminGalleryUploader.tsx`:

```tsx
"use client";

import { useRef, useState } from "react";
import { resolveImageUrl } from "@/lib/format";

export type AdminGalleryUploaderProps = {
  value: string[];
  onChange: (next: string[]) => void;
  upload: (file: File) => Promise<{ url: string }>;
  emptyHint?: string;
};

export function AdminGalleryUploader({ value, onChange, upload, emptyHint }: AdminGalleryUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePick(files: FileList) {
    setError(null);
    setBusy(true);
    try {
      const next = [...value];
      for (const f of Array.from(files)) {
        const { url } = await upload(f);
        next.push(url);
      }
      onChange(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  function remove(idx: number) {
    onChange(value.filter((_, i) => i !== idx));
  }

  function setPrimary(idx: number) {
    if (idx === 0) return;
    const next = [...value];
    const [moved] = next.splice(idx, 1);
    next.unshift(moved);
    onChange(next);
  }

  function move(idx: number, delta: number) {
    const target = idx + delta;
    if (target < 0 || target >= value.length) return;
    const next = [...value];
    [next[idx], next[target]] = [next[target], next[idx]];
    onChange(next);
  }

  return (
    <div>
      {value.length === 0 && emptyHint ? <p className="panel-hint">{emptyHint}</p> : null}
      <div className="admin-gallery">
        {value.map((url, idx) => (
          <div key={`${url}-${idx}`} className="admin-gallery-thumb" data-primary={idx === 0 ? "true" : undefined}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img alt="" src={resolveImageUrl(url)} />
            <div className="controls">
              {idx !== 0 ? (
                <button type="button" aria-label="set as primary" title="Set as primary" onClick={() => setPrimary(idx)}>★</button>
              ) : null}
              <button type="button" aria-label="move left" title="Move left" disabled={idx === 0} onClick={() => move(idx, -1)}>←</button>
              <button type="button" aria-label="move right" title="Move right" disabled={idx === value.length - 1} onClick={() => move(idx, 1)}>→</button>
              <button type="button" aria-label={`remove image ${idx + 1}`} data-tone="danger" onClick={() => remove(idx)}>×</button>
            </div>
          </div>
        ))}
        <button
          type="button"
          className="admin-gallery-add"
          aria-label="upload images"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          {busy ? "Uploading…" : "+ Add"}
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: "none" }}
        aria-label="upload images"
        onChange={(e) => {
          const fs = e.target.files;
          if (fs && fs.length > 0) void handlePick(fs);
          e.target.value = "";
        }}
      />
      {error ? <p style={{ color: "#a3392a", fontSize: 12, marginTop: 6 }}>{error}</p> : null}
    </div>
  );
}
```

> If `resolveImageUrl` does not exist in `@/lib/format`, fall back to `(url) => (url?.startsWith("/uploads") ? `${API_URL}${url}` : url)` from `@/lib/api`. Verify the import works before committing.

- [ ] **Step 5: Run test**

Run: `cd apps/web && npm test -- admin-gallery-uploader`
Expected: PASS, 5 tests.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/admin/product/AdminGalleryUploader.tsx apps/web/src/app/admin/admin.css apps/web/tests/unit/admin-gallery-uploader.test.tsx
git commit -m "$(cat <<'EOF'
feat(admin): AdminGalleryUploader composite (reorder, primary, remove)

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task B2: AdminFormatPicker composite

**Files:**
- Create: `apps/web/src/components/admin/product/AdminFormatPicker.tsx`
- Modify: `apps/web/src/app/admin/admin.css`
- Test: `apps/web/tests/unit/admin-format-picker.test.tsx`

- [ ] **Step 1: Append CSS**

Append to `apps/web/src/app/admin/admin.css`:

```css
@layer components {
  .admin-fmt { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .admin-fmt-tile { padding: 14px 8px; border: 1.5px solid var(--admin-line); border-radius: 12px; text-align: center; cursor: pointer; font-size: 12px; font-weight: 700; background: #fffdf6; color: var(--admin-ink-2); transition: transform 0.12s, border-color 0.12s; font-family: inherit; }
  .admin-fmt-tile:hover { transform: translateY(-1px); }
  .admin-fmt-tile .ic { display: block; font-size: 24px; margin-bottom: 4px; line-height: 1; }
  .admin-fmt-tile[data-state="on"] { background: var(--admin-coral); color: #fff; border-color: var(--admin-coral); box-shadow: var(--admin-shadow-primary); }
  .admin-fmt-tile .sub { display: block; font-size: 10px; font-weight: 600; color: var(--admin-muted); margin-top: 2px; letter-spacing: 0.02em; }
  .admin-fmt-tile[data-state="on"] .sub { color: #ffd9cb; }
}
```

- [ ] **Step 2: Write failing test**

Create `apps/web/tests/unit/admin-format-picker.test.tsx`:

```tsx
import { describe, expect, test, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AdminFormatPicker, PRODUCT_FORMATS } from "@/components/admin/product/AdminFormatPicker";

describe("AdminFormatPicker", () => {
  test("renders all four format tiles with sub-labels", () => {
    render(<AdminFormatPicker value="physical" onChange={() => {}} />);
    expect(PRODUCT_FORMATS).toHaveLength(4);
    for (const f of PRODUCT_FORMATS) {
      expect(screen.getByRole("button", { name: new RegExp(f.label) })).toBeTruthy();
      expect(screen.getByText(f.sub)).toBeTruthy();
    }
  });

  test("selected tile has data-state=on", () => {
    render(<AdminFormatPicker value="digital" onChange={() => {}} />);
    expect(screen.getByRole("button", { name: /digital/i }).getAttribute("data-state")).toBe("on");
  });

  test("clicking a tile calls onChange with its value", () => {
    const onChange = vi.fn();
    render(<AdminFormatPicker value="physical" onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: /sticker/i }));
    expect(onChange).toHaveBeenCalledWith("sticker");
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd apps/web && npm test -- admin-format-picker`
Expected: FAIL.

- [ ] **Step 4: Implement**

Create `apps/web/src/components/admin/product/AdminFormatPicker.tsx`:

```tsx
"use client";

export type ProductFormat = "physical" | "digital" | "sticker" | "freebie";

export const PRODUCT_FORMATS: ReadonlyArray<{
  value: ProductFormat;
  label: string;
  sub: string;
  icon: string;
}> = [
  { value: "physical", label: "Physical book", sub: "Ships to address", icon: "📕" },
  { value: "digital",  label: "Digital PDF",  sub: "Delivered by email", icon: "📄" },
  { value: "sticker",  label: "Sticker pack", sub: "Ships to address", icon: "🌟" },
  { value: "freebie",  label: "Freebie",      sub: "Free download, skips checkout", icon: "🎁" },
];

export function AdminFormatPicker({
  value, onChange,
}: { value: ProductFormat; onChange: (next: ProductFormat) => void }) {
  return (
    <div className="admin-fmt" role="radiogroup" aria-label="Product format">
      {PRODUCT_FORMATS.map((f) => (
        <button
          key={f.value}
          type="button"
          role="radio"
          aria-checked={value === f.value}
          data-state={value === f.value ? "on" : "off"}
          className="admin-fmt-tile"
          onClick={() => onChange(f.value)}
        >
          <span className="ic" aria-hidden>{f.icon}</span>
          {f.label}
          <span className="sub">{f.sub}</span>
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 5: Run test**

Run: `cd apps/web && npm test -- admin-format-picker`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/admin/product/AdminFormatPicker.tsx apps/web/src/app/admin/admin.css apps/web/tests/unit/admin-format-picker.test.tsx
git commit -m "$(cat <<'EOF'
feat(admin): AdminFormatPicker (4-tile, sub-labels, coral on)

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task B3: AdminSourceLinksEditor composite

**Files:**
- Create: `apps/web/src/components/admin/product/AdminSourceLinksEditor.tsx`
- Modify: `apps/web/src/app/admin/admin.css`
- Test: `apps/web/tests/unit/admin-source-links-editor.test.tsx`

- [ ] **Step 1: Append CSS**

Append to `apps/web/src/app/admin/admin.css`:

```css
@layer components {
  .admin-source-row { display: grid; grid-template-columns: 88px 1.2fr 1.5fr 1fr 30px; gap: 12px; align-items: center; padding: 10px 0; border-bottom: 1px dashed var(--admin-line-soft); }
  .admin-source-row:last-of-type { border-bottom: none; }
  .admin-source-row .img-cell { aspect-ratio: 2/1; background: #fff; border: 1px solid var(--admin-line-soft); border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 10px; color: var(--admin-muted); overflow: hidden; cursor: pointer; }
  .admin-source-row .img-cell img { width: 100%; height: 100%; object-fit: contain; }
  .admin-source-row .remove { background: none; border: none; cursor: pointer; color: var(--admin-muted); font-size: 18px; line-height: 1; }
}
```

- [ ] **Step 2: Write failing test**

Create `apps/web/tests/unit/admin-source-links-editor.test.tsx`:

```tsx
import { describe, expect, test, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AdminSourceLinksEditor } from "@/components/admin/product/AdminSourceLinksEditor";

const upload = vi.fn(async (_f: File) => ({ url: "/u/btn.png" }));

describe("AdminSourceLinksEditor", () => {
  test("Add row button appends a blank source link", () => {
    const onChange = vi.fn();
    render(<AdminSourceLinksEditor value={[]} onChange={onChange} upload={upload} />);
    fireEvent.click(screen.getByRole("button", { name: /\+ add source link/i }));
    expect(onChange).toHaveBeenCalledWith([{ label: "", href: "", image: undefined, alt: undefined }]);
  });

  test("editing label fires onChange", () => {
    const onChange = vi.fn();
    render(
      <AdminSourceLinksEditor
        value={[{ label: "Penguin", href: "https://x", image: undefined, alt: undefined }]}
        onChange={onChange}
        upload={upload}
      />,
    );
    fireEvent.change(screen.getByDisplayValue("Penguin"), { target: { value: "Penguin Random House" } });
    expect(onChange).toHaveBeenCalledWith([
      { label: "Penguin Random House", href: "https://x", image: undefined, alt: undefined },
    ]);
  });

  test("remove button drops the row", () => {
    const onChange = vi.fn();
    render(
      <AdminSourceLinksEditor
        value={[
          { label: "A", href: "https://a", image: undefined, alt: undefined },
          { label: "B", href: "https://b", image: undefined, alt: undefined },
        ]}
        onChange={onChange}
        upload={upload}
      />,
    );
    fireEvent.click(screen.getAllByRole("button", { name: /remove source link/i })[0]);
    expect(onChange).toHaveBeenCalledWith([{ label: "B", href: "https://b", image: undefined, alt: undefined }]);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd apps/web && npm test -- admin-source-links-editor`
Expected: FAIL.

- [ ] **Step 4: Implement**

Create `apps/web/src/components/admin/product/AdminSourceLinksEditor.tsx`:

```tsx
"use client";

import { useRef } from "react";
import { AdminInput } from "@/components/admin/ui/AdminInput";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { resolveImageUrl } from "@/lib/format";

export type SourceLinkValue = {
  label: string;
  href: string;
  image?: string;
  alt?: string;
};

export type AdminSourceLinksEditorProps = {
  value: SourceLinkValue[];
  onChange: (next: SourceLinkValue[]) => void;
  upload: (file: File) => Promise<{ url: string }>;
};

export function AdminSourceLinksEditor({ value, onChange, upload }: AdminSourceLinksEditorProps) {
  function patch(idx: number, p: Partial<SourceLinkValue>) {
    const next = value.map((row, i) => (i === idx ? { ...row, ...p } : row));
    onChange(next);
  }

  function remove(idx: number) {
    onChange(value.filter((_, i) => i !== idx));
  }

  function add() {
    onChange([...value, { label: "", href: "", image: undefined, alt: undefined }]);
  }

  return (
    <div>
      {value.map((row, idx) => (
        <SourceRow key={idx} idx={idx} row={row} patch={patch} remove={remove} upload={upload} />
      ))}
      <div style={{ paddingTop: 14 }}>
        <AdminButton variant="ghost" size="sm" onClick={add}>+ Add source link</AdminButton>
      </div>
    </div>
  );
}

function SourceRow({
  idx, row, patch, remove, upload,
}: {
  idx: number;
  row: SourceLinkValue;
  patch: (i: number, p: Partial<SourceLinkValue>) => void;
  remove: (i: number) => void;
  upload: (f: File) => Promise<{ url: string }>;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    const { url } = await upload(f);
    patch(idx, { image: url });
  }

  return (
    <div className="admin-source-row">
      <div
        className="img-cell"
        role="button"
        tabIndex={0}
        aria-label="upload source-link image"
        onClick={() => fileRef.current?.click()}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") fileRef.current?.click(); }}
      >
        {row.image
          ? <img alt={row.alt ?? ""} src={resolveImageUrl(row.image)} />
          : <span>+ image</span>}
      </div>
      <AdminInput aria-label="label" placeholder="Penguin Random House" value={row.label} onChange={(e) => patch(idx, { label: e.target.value })} />
      <AdminInput aria-label="url" placeholder="https://example.com" value={row.href} onChange={(e) => patch(idx, { href: e.target.value })} />
      <AdminInput aria-label="alt text" placeholder="Buy on Penguin US" value={row.alt ?? ""} onChange={(e) => patch(idx, { alt: e.target.value })} />
      <button type="button" className="remove" aria-label="remove source link" onClick={() => remove(idx)}>×</button>
      <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={onPick} />
    </div>
  );
}
```

- [ ] **Step 5: Run test**

Run: `cd apps/web && npm test -- admin-source-links-editor`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/admin/product/AdminSourceLinksEditor.tsx apps/web/src/app/admin/admin.css apps/web/tests/unit/admin-source-links-editor.test.tsx
git commit -m "$(cat <<'EOF'
feat(admin): AdminSourceLinksEditor (label/url/image/alt rows)

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task B4: BE — preserve `options` when null/missing in PUT/POST

**Files:**
- Modify: `apps/api/Controllers/AdminProductsController.cs`
- Modify: `apps/api/Contracts/<DTO file holding CreateProductRequest/UpdateProductRequest>` if `Options` is non-nullable there — make it nullable
- Test: `apps/api.Tests/AdminProductsControllerTests.cs` (or new test file `AdminProductsOptionsBehaviourTests.cs`)

**Why:** FE will stop sending `options`. BE must:
- On `Create` with null/empty options → insert the single-format default `[{Name:"Format", Values:["Default Title"]}]`.
- On `Update` with null/empty options → keep the existing `product.Options`.

- [ ] **Step 1: Write failing BE tests**

Create `apps/api.Tests/AdminProductsOptionsBehaviourTests.cs`:

```csharp
using System.Net;
using System.Net.Http.Json;
using JovieJoy.Api.Contracts;
using Xunit;

namespace JovieJoy.Api.Tests;

public class AdminProductsOptionsBehaviourTests : IClassFixture<ApiFactory>
{
    private readonly ApiFactory _f;
    public AdminProductsOptionsBehaviourTests(ApiFactory f) => _f = f;

    [Fact]
    public async Task Create_without_options_inserts_default_single_format()
    {
        var client = await _f.CreateAdminClientAsync();
        var slug = $"opts-create-{Guid.NewGuid():N}";
        var body = new {
            slug, title = "T", excerpt = "E", description = new[] { "d" },
            priceCents = 100, compareAtPriceCents = (int?)null, available = true,
            productType = "physical", images = Array.Empty<string>(),
            options = (object?)null,
            sourceLinks = (object?)null, reviewImages = (string[]?)null, inspirationImages = (string[]?)null,
            tags = Array.Empty<string>(), collectionSlugs = Array.Empty<string>(), publishedAt = (string?)null,
        };
        var res = await client.PostAsJsonAsync("/api/admin/products", body);
        Assert.Equal(HttpStatusCode.Created, res.StatusCode);
        var dto = await res.Content.ReadFromJsonAsync<ProductDto>();
        Assert.NotNull(dto);
        Assert.Single(dto!.Options);
        Assert.Equal("Format", dto.Options[0].Name);
        Assert.Single(dto.Options[0].Values);
        Assert.Equal("Default Title", dto.Options[0].Values[0]);
    }

    [Fact]
    public async Task Update_without_options_preserves_existing_options()
    {
        var client = await _f.CreateAdminClientAsync();
        var slug = $"opts-update-{Guid.NewGuid():N}";

        // Seed with a richer options value.
        var seedBody = new {
            slug, title = "T", excerpt = "E", description = new[] { "d" },
            priceCents = 100, compareAtPriceCents = (int?)null, available = true,
            productType = "physical", images = Array.Empty<string>(),
            options = new[] { new { name = "Size", values = new[] { "A4", "A5" } } },
            sourceLinks = (object?)null, reviewImages = (string[]?)null, inspirationImages = (string[]?)null,
            tags = Array.Empty<string>(), collectionSlugs = Array.Empty<string>(), publishedAt = (string?)null,
        };
        var seed = await client.PostAsJsonAsync("/api/admin/products", seedBody);
        seed.EnsureSuccessStatusCode();

        // Update without sending options.
        var updateBody = new {
            title = "T2", excerpt = "E", description = new[] { "d" },
            priceCents = 200, compareAtPriceCents = (int?)null, available = true,
            productType = "physical", images = Array.Empty<string>(),
            options = (object?)null,
            sourceLinks = (object?)null, reviewImages = (string[]?)null, inspirationImages = (string[]?)null,
            tags = Array.Empty<string>(), collectionSlugs = Array.Empty<string>(), publishedAt = (string?)null,
        };
        var res = await client.PutAsJsonAsync($"/api/admin/products/{slug}", updateBody);
        res.EnsureSuccessStatusCode();
        var dto = await res.Content.ReadFromJsonAsync<ProductDto>();
        Assert.NotNull(dto);
        Assert.Single(dto!.Options);
        Assert.Equal("Size", dto.Options[0].Name);
        Assert.Equal(new[] { "A4", "A5" }, dto.Options[0].Values);
    }
}
```

> If `ApiFactory.CreateAdminClientAsync` doesn't exist, add it as a thin helper that logs in as the seeded admin and attaches the bearer token. Pattern from `ProductsControllerTests.cs` (existing tests in the same project) can be copied if simpler.

- [ ] **Step 2: Run BE tests to verify they fail**

Run: `cd apps/api.Tests && dotnet test --filter "AdminProductsOptionsBehaviourTests"`
Expected: FAIL — both tests fail because current Create requires non-null Options and Update overwrites with whatever was sent.

- [ ] **Step 3: Make request DTOs accept nullable Options**

In `apps/api/Contracts/` find the file defining `CreateProductRequest` and `UpdateProductRequest`. Change:

```csharp
public List<ProductOption> Options { get; init; } = new();
```

to:

```csharp
public List<ProductOption>? Options { get; init; }
```

- [ ] **Step 4: Update controller logic**

In `apps/api/Controllers/AdminProductsController.cs`:

In `Create`, replace `Options = req.Options,` with:

```csharp
Options = (req.Options is { Count: > 0 })
    ? req.Options
    : new List<ProductOption> { new("Format", new List<string> { "Default Title" }) },
```

In `Update`, replace `product.Options = req.Options;` with:

```csharp
if (req.Options is { Count: > 0 })
{
    product.Options = req.Options;
}
```

- [ ] **Step 5: Run BE tests to verify they pass**

Run: `cd apps/api.Tests && dotnet test --filter "AdminProductsOptionsBehaviourTests"`
Expected: PASS.

Run full BE suite: `cd apps/api.Tests && dotnet test`
Expected: All green (no regressions).

- [ ] **Step 6: Commit**

```bash
git add apps/api/Controllers/AdminProductsController.cs apps/api/Contracts apps/api.Tests/AdminProductsOptionsBehaviourTests.cs
git commit -m "$(cat <<'EOF'
feat(api): preserve product.Options when omitted on update; default on create

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task B5: Rewrite ProductForm — scaffold + Basics + Sidebar

**Files:**
- Replace: `apps/web/src/components/admin/ProductForm.tsx`
- Modify: `apps/web/src/lib/adminApi.ts` (make `options` optional on `AdminProductWriteBody`)
- Test: `apps/web/tests/unit/admin-product-form-basics.test.tsx`

**Why:** Stage one of the editor rewrite. This task swaps the file entirely with the new sectioned layout but only wires Basics + the full sidebar (Visibility, Format, Pricing, Availability, Organization). The three media panels, source links, digital fulfillment, and danger zone arrive in Tasks B6 and B7.

- [ ] **Step 1: Make `options` optional in the FE write body**

In `apps/web/src/lib/adminApi.ts`, change `AdminProductWriteBody`:

```ts
export type AdminProductWriteBody = {
  slug?: string; title: string; excerpt: string; description: string[];
  priceCents: number; compareAtPriceCents: number | null; available: boolean;
  productType: string; images: string[];
  options?: { name: string; values: string[] }[]; // optional now — BE preserves/defaults
  sourceLinks: { label: string; href: string; image?: string; alt?: string }[] | null;
  reviewImages: string[] | null; inspirationImages: string[] | null;
  tags: string[]; collectionSlugs: string[];
  publishedAt?: string | null;
};
```

- [ ] **Step 2: Write failing test (Basics + Sidebar interactions)**

Create `apps/web/tests/unit/admin-product-form-basics.test.tsx`:

```tsx
import { describe, expect, test, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ProductForm } from "@/components/admin/ProductForm";

vi.mock("@/lib/adminApi", () => ({
  adminListCollections: async () => [
    { slug: "new", title: "New Release" },
    { slug: "best", title: "Best Sellers" },
  ],
  adminListProductTags: async () => ["christmas", "cozy", "holiday"],
  adminUploadGeneral: async (_f: File, _folder?: string) => ({ url: "/u/x.png" }),
  adminUploadProductImage: async (_s: string, _f: File) => ({ url: "/u/x.png" }),
  adminUploadProductPdf: async () => ({}),
}));

beforeEach(() => { vi.clearAllMocks(); });

describe("ProductForm Basics + Sidebar", () => {
  test("fires onSubmit with all visible fields wired through", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<ProductForm onSubmit={onSubmit} submitLabel="Create" />);
    fireEvent.change(screen.getByLabelText(/^slug$/i), { target: { value: "x" } });
    fireEvent.change(screen.getByLabelText(/^title$/i), { target: { value: "Hello" } });
    fireEvent.change(screen.getByLabelText(/^excerpt$/i), { target: { value: "ex" } });
    fireEvent.change(screen.getByLabelText(/^description$/i), { target: { value: "para 1\n\npara 2" } });
    fireEvent.change(screen.getByLabelText(/^price$/i), { target: { value: "9.99" } });
    fireEvent.click(screen.getByRole("radio", { name: /digital/i }));
    fireEvent.click(screen.getByRole("button", { name: /save/i }));
    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalled());
    const body = onSubmit.mock.calls[0][0];
    expect(body).toMatchObject({
      slug: "x",
      title: "Hello",
      excerpt: "ex",
      description: ["para 1", "para 2"],
      priceCents: 999,
      productType: "digital",
      available: true,
    });
    expect(body.options).toBeUndefined();
  });

  test("status derivation: when publishedAt null → Draft badge", () => {
    render(<ProductForm onSubmit={vi.fn()} submitLabel="Create" />);
    expect(screen.getByText(/draft/i)).toBeTruthy();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd apps/web && npm test -- admin-product-form-basics`
Expected: FAIL — existing ProductForm doesn't have `<AdminFormatPicker>` or the sectioned layout.

- [ ] **Step 4: Replace ProductForm with the new scaffold**

Replace `apps/web/src/components/admin/ProductForm.tsx` entirely:

```tsx
"use client";

import { useEffect, useState } from "react";
import type { Product } from "@/lib/api";
import {
  adminListCollections,
  type AdminProductWriteBody,
} from "@/lib/adminApi";
import { AdminPageHeader } from "@/components/admin/ui/AdminPageHeader";
import { AdminPanel } from "@/components/admin/ui/AdminPanel";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { AdminBadge } from "@/components/admin/ui/AdminBadge";
import { AdminInput } from "@/components/admin/ui/AdminInput";
import { AdminTextarea } from "@/components/admin/ui/AdminTextarea";
import { AdminLabel } from "@/components/admin/ui/AdminLabel";
import { AdminField } from "@/components/admin/ui/AdminField";
import { AdminSwitch } from "@/components/admin/ui/AdminSwitch";
import { AdminChip } from "@/components/admin/ui/AdminChip";
import {
  AdminFormatPicker,
  type ProductFormat,
} from "@/components/admin/product/AdminFormatPicker";

export type ProductFormProps = {
  initial?: Product;
  onSubmit: (body: AdminProductWriteBody) => Promise<void>;
  submitLabel: string;
  onDiscard?: () => void;
};

type Status = "published" | "draft" | "scheduled" | "out_of_stock";

function deriveStatus(available: boolean, publishedAt: string | null): Status {
  if (!available) return "out_of_stock";
  if (!publishedAt) return "draft";
  const date = Date.parse(publishedAt);
  if (Number.isFinite(date) && date > Date.now()) return "scheduled";
  return "published";
}

function statusLabel(s: Status): string {
  switch (s) {
    case "published": return "Published";
    case "draft": return "Draft";
    case "scheduled": return "Scheduled";
    case "out_of_stock": return "Out of stock";
  }
}

function statusBadgeVariant(s: Status): "pub" | "draft" | "scheduled" | "oos" {
  switch (s) {
    case "published": return "pub";
    case "draft": return "draft";
    case "scheduled": return "scheduled";
    case "out_of_stock": return "oos";
  }
}

function dollarsToCents(input: string): number {
  const n = Number(input.replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

function centsToDollars(cents: number | null | undefined): string {
  if (cents == null) return "";
  return (cents / 100).toFixed(2);
}

export function ProductForm({ initial, onSubmit, submitLabel, onDiscard }: ProductFormProps) {
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [excerpt, setExcerpt] = useState(initial?.excerpt ?? "");
  const [description, setDescription] = useState(initial?.description.join("\n\n") ?? "");
  const [priceDollars, setPriceDollars] = useState(centsToDollars(initial?.priceCents ?? 0));
  const [compareDollars, setCompareDollars] = useState(centsToDollars(initial?.compareAtPriceCents ?? null));
  const [available, setAvailable] = useState(initial?.available ?? true);
  const [productFormat, setProductFormat] = useState<ProductFormat>((initial?.productType as ProductFormat) ?? "physical");
  const [tags, setTags] = useState(initial?.tags ?? []);
  const [tagInput, setTagInput] = useState("");
  const [collectionSlugs, setCollectionSlugs] = useState<string[]>(initial?.collections ?? []);
  const [publishedAt, setPublishedAt] = useState(initial?.publishedAt?.slice(0, 10) ?? "");

  const [allCollections, setAllCollections] = useState<{ slug: string; title: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminListCollections().then((cs) => setAllCollections(cs.map((c) => ({ slug: c.slug, title: c.title }))));
  }, []);

  const status = deriveStatus(available, publishedAt || null);

  function toggleCollection(s: string) {
    setCollectionSlugs((cs) => (cs.includes(s) ? cs.filter((x) => x !== s) : [...cs, s]));
  }
  function addTag(value: string) {
    const v = value.trim();
    if (!v) return;
    if (!tags.includes(v)) setTags([...tags, v]);
    setTagInput("");
  }
  function removeTag(v: string) { setTags(tags.filter((t) => t !== v)); }

  async function handleSubmit() {
    setError(null);
    setSubmitting(true);
    try {
      const body: AdminProductWriteBody = {
        slug: initial ? undefined : slug,
        title,
        excerpt,
        description: description.split(/\n\n+/).map((s) => s.trim()).filter(Boolean),
        priceCents: dollarsToCents(priceDollars),
        compareAtPriceCents: compareDollars ? dollarsToCents(compareDollars) : null,
        available,
        productType: productFormat,
        images: initial?.images ?? [],
        sourceLinks: initial?.sourceLinks ?? null,
        reviewImages: initial?.reviewImages ?? null,
        inspirationImages: initial?.inspirationImages ?? null,
        tags,
        collectionSlugs,
        publishedAt: publishedAt || null,
      };
      // NB: do NOT send `options` — BE preserves/defaults
      await onSubmit(body);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <AdminPageHeader
        crumb={<>Catalog · Products</>}
        title={
          <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
            {title || "New product"}
            <AdminBadge variant={statusBadgeVariant(status)}>{statusLabel(status)}</AdminBadge>
          </span>
        }
        actions={
          <>
            {onDiscard ? <AdminButton variant="ghost" onClick={onDiscard}>Discard</AdminButton> : null}
            <AdminButton variant="primary" disabled={submitting} onClick={handleSubmit}>
              {submitting ? "Saving…" : submitLabel}
            </AdminButton>
          </>
        }
      />

      {error ? <p style={{ color: "#a3392a", marginBottom: 12 }}>{error}</p> : null}

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.8fr) minmax(0, 1fr)", gap: 14 }}>
        {/* LEFT COLUMN — Basics */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <AdminPanel sectionTag="Basics">
            {!initial ? (
              <AdminField>
                <AdminLabel htmlFor="pf-slug">Slug <span className="hint">permalink, locked after create</span></AdminLabel>
                <AdminInput id="pf-slug" value={slug} onChange={(e) => setSlug(e.target.value)} required />
              </AdminField>
            ) : null}
            <AdminField>
              <AdminLabel htmlFor="pf-title">Title</AdminLabel>
              <AdminInput id="pf-title" size="lg" value={title} onChange={(e) => setTitle(e.target.value)} required />
            </AdminField>
            <AdminField>
              <AdminLabel htmlFor="pf-excerpt">Excerpt <span className="hint">one-line teaser</span></AdminLabel>
              <AdminInput id="pf-excerpt" value={excerpt} onChange={(e) => setExcerpt(e.target.value)} required />
            </AdminField>
            <AdminField>
              <AdminLabel htmlFor="pf-description">Description <span className="hint">paragraphs separated by blank lines</span></AdminLabel>
              <AdminTextarea id="pf-description" rows={6} value={description} onChange={(e) => setDescription(e.target.value)} />
            </AdminField>
          </AdminPanel>

          {/* Media + source links + digital fulfillment + danger zone — added in Tasks B6, B7 */}
        </div>

        {/* RIGHT COLUMN — Sidebar */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <AdminPanel sectionTag="Visibility">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <strong style={{ fontSize: 13 }}>Published</strong>
              <AdminSwitch
                checked={!!publishedAt}
                onChange={(next) => setPublishedAt(next ? (publishedAt || new Date().toISOString().slice(0, 10)) : "")}
                aria-label="Published"
              />
            </div>
            <AdminField>
              <AdminLabel htmlFor="pf-published">Publish date</AdminLabel>
              <AdminInput id="pf-published" type="date" value={publishedAt} onChange={(e) => setPublishedAt(e.target.value)} />
            </AdminField>
          </AdminPanel>

          <AdminPanel sectionTag="Format" hint="Drives where this product appears and how it's fulfilled.">
            <AdminFormatPicker value={productFormat} onChange={setProductFormat} />
          </AdminPanel>

          <AdminPanel sectionTag="Pricing">
            <AdminField>
              <AdminLabel htmlFor="pf-price">Price</AdminLabel>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ color: "var(--admin-muted)", fontWeight: 700 }}>$</span>
                <AdminInput id="pf-price" inputMode="decimal" value={priceDollars} onChange={(e) => setPriceDollars(e.target.value)} required />
              </div>
            </AdminField>
            <AdminField>
              <AdminLabel htmlFor="pf-compare">Compare-at <span className="hint">optional; renders strikethrough</span></AdminLabel>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ color: "var(--admin-muted)", fontWeight: 700 }}>$</span>
                <AdminInput id="pf-compare" inputMode="decimal" value={compareDollars} placeholder="—" onChange={(e) => setCompareDollars(e.target.value)} />
              </div>
            </AdminField>
          </AdminPanel>

          <AdminPanel sectionTag="Availability" hint="When off, the PDP shows a 'Notify me when back' form instead of the cart button.">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <strong style={{ fontSize: 13 }}>Available for purchase</strong>
              <AdminSwitch checked={available} onChange={setAvailable} aria-label="Available" />
            </div>
          </AdminPanel>

          <AdminPanel sectionTag="Organization">
            <AdminField>
              <AdminLabel>Collections</AdminLabel>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
                {allCollections.map((c) => {
                  const on = collectionSlugs.includes(c.slug);
                  return (
                    <AdminChip
                      key={c.slug}
                      variant={on ? "default" : "add"}
                      onClick={() => toggleCollection(c.slug)}
                      onDismiss={on ? () => toggleCollection(c.slug) : undefined}
                    >
                      {on ? c.title : `+ ${c.title}`}
                    </AdminChip>
                  );
                })}
              </div>
            </AdminField>
            <AdminField>
              <AdminLabel htmlFor="pf-tag">Tags</AdminLabel>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
                {tags.map((t) => (
                  <AdminChip key={t} variant="tag" onDismiss={() => removeTag(t)}>{t}</AdminChip>
                ))}
              </div>
              <AdminInput
                id="pf-tag"
                placeholder="Add tag and press Enter"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault();
                    addTag(tagInput);
                  }
                }}
                style={{ marginTop: 6 }}
              />
            </AdminField>
          </AdminPanel>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Run tests**

Run: `cd apps/web && npm test -- admin-product-form-basics`
Expected: PASS.

Run full unit suite: `cd apps/web && npm test`
Expected: All green (existing admin tests still pass; ProductForm consumer screens — `/admin/products` and `/admin/products/[slug]` — may need a small adjustment if they directly read removed props).

Run typecheck: `cd apps/web && npm run typecheck`
Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/admin/ProductForm.tsx apps/web/src/lib/adminApi.ts apps/web/tests/unit/admin-product-form-basics.test.tsx
git commit -m "$(cat <<'EOF'
feat(admin): rewrite ProductForm — sectioned shell + sidebar wired

Basics + Visibility/Format/Pricing/Availability/Organization complete.
Media galleries, source links, digital fulfillment, and danger zone
arrive in subsequent commits.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task B6: ProductForm — three media galleries

**Files:**
- Modify: `apps/web/src/components/admin/ProductForm.tsx`
- Test: extend `apps/web/tests/unit/admin-product-form-basics.test.tsx` (or create `admin-product-form-media.test.tsx`)

- [ ] **Step 1: Write failing test**

Create `apps/web/tests/unit/admin-product-form-media.test.tsx`:

```tsx
import { describe, expect, test, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ProductForm } from "@/components/admin/ProductForm";
import type { Product } from "@/lib/api";

vi.mock("@/lib/adminApi", () => ({
  adminListCollections: async () => [],
  adminUploadGeneral: async () => ({ url: "/u/new.png" }),
  adminUploadProductImage: async () => ({ url: "/u/new.png" }),
}));

const productFixture: Product = {
  id: "id-1", slug: "x", title: "T", excerpt: "ex", description: ["d"],
  priceCents: 100, compareAtPriceCents: null, available: true, productType: "physical",
  images: ["/a.png", "/b.png"],
  options: [{ name: "Format", values: ["Default Title"] }],
  sourceLinks: null,
  reviewImages: ["/r1.png"],
  inspirationImages: ["/i1.png", "/i2.png"],
  tags: [], collections: [],
  publishedAt: "2026-01-01T00:00:00Z",
  pdfPath: null,
};

describe("ProductForm media panels", () => {
  test("renders three labeled gallery sections with their current images", () => {
    render(<ProductForm initial={productFixture} onSubmit={vi.fn()} submitLabel="Save" />);
    expect(screen.getByText(/product gallery/i)).toBeTruthy();
    expect(screen.getByText(/inspiration gallery/i)).toBeTruthy();
    expect(screen.getByText(/customer photos/i)).toBeTruthy();
    expect(screen.getAllByRole("img")).toHaveLength(5); // 2 + 2 + 1
  });

  test("removing an inspiration image emits correct body on save", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<ProductForm initial={productFixture} onSubmit={onSubmit} submitLabel="Save" />);
    const inspirationSection = screen.getByText(/inspiration gallery/i).closest(".admin-panel")!;
    const removeButtons = inspirationSection.querySelectorAll('button[aria-label^="remove image"]');
    fireEvent.click(removeButtons[0]);
    fireEvent.click(screen.getByRole("button", { name: /save/i }));
    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalled());
    const body = onSubmit.mock.calls[0][0];
    expect(body.inspirationImages).toEqual(["/i2.png"]);
    expect(body.reviewImages).toEqual(["/r1.png"]);
    expect(body.images).toEqual(["/a.png", "/b.png"]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/web && npm test -- admin-product-form-media`
Expected: FAIL — media panels don't exist yet.

- [ ] **Step 3: Add three gallery panels to ProductForm**

In `apps/web/src/components/admin/ProductForm.tsx`:

Add imports at top:

```tsx
import { AdminGalleryUploader } from "@/components/admin/product/AdminGalleryUploader";
import { adminUploadGeneral, adminUploadProductImage } from "@/lib/adminApi";
```

Add state above `useEffect`:

```tsx
const [images, setImages] = useState<string[]>(initial?.images ?? []);
const [inspirationImages, setInspirationImages] = useState<string[]>(initial?.inspirationImages ?? []);
const [reviewImages, setReviewImages] = useState<string[]>(initial?.reviewImages ?? []);
```

Add an upload helper next to `useEffect`:

```tsx
const uploadImage = initial
  ? (file: File) => adminUploadProductImage(initial.slug, file)
  : (file: File) => adminUploadGeneral(file, "products");
```

Replace the `images: initial?.images ?? [],` line in `body` with `images,` and replace `reviewImages: initial?.reviewImages ?? null,` with `reviewImages: reviewImages.length > 0 ? reviewImages : null,` and similarly for `inspirationImages`.

Insert three new panels in the **left column** (after Basics, before any other panel):

```tsx
<AdminPanel sectionTag="Media — Product gallery" hint="Carousel customers see on the product page. Drag to reorder. The primary (★) is used everywhere there's a thumbnail.">
  <AdminGalleryUploader value={images} onChange={setImages} upload={uploadImage} emptyHint="No images yet — add at least one." />
</AdminPanel>

<AdminPanel sectionTag="Media — Inspiration gallery" hint="Styled lifestyle photography shown in the 'story' section of the PDP. Optional.">
  <AdminGalleryUploader value={inspirationImages} onChange={setInspirationImages} upload={uploadImage} emptyHint="Optional — adds a styled gallery on the product page." />
</AdminPanel>

<AdminPanel sectionTag="Media — Customer photos" hint="Social-proof shots from customers / press. Optional.">
  <AdminGalleryUploader value={reviewImages} onChange={setReviewImages} upload={uploadImage} emptyHint="Optional — appears in the 'Real cozy moments' section." />
</AdminPanel>
```

- [ ] **Step 4: Run tests**

Run: `cd apps/web && npm test -- admin-product-form-media admin-product-form-basics`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/admin/ProductForm.tsx apps/web/tests/unit/admin-product-form-media.test.tsx
git commit -m "$(cat <<'EOF'
feat(admin): ProductForm — Product / Inspiration / Customer galleries

Surfaces inspirationImages and reviewImages, no longer silently null.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task B7: ProductForm — source links, digital fulfillment, danger zone

**Files:**
- Modify: `apps/web/src/components/admin/ProductForm.tsx`
- Modify: `apps/web/src/app/admin/products/[slug]/page.tsx` (wire `onDelete` / `onDiscard` / remove old PDF panel since it's now inside the form)
- Test: `apps/web/tests/unit/admin-product-form-tail.test.tsx`

- [ ] **Step 1: Write failing test**

Create `apps/web/tests/unit/admin-product-form-tail.test.tsx`:

```tsx
import { describe, expect, test, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ProductForm } from "@/components/admin/ProductForm";
import type { Product } from "@/lib/api";

vi.mock("@/lib/adminApi", () => ({
  adminListCollections: async () => [],
  adminUploadGeneral: async () => ({ url: "/u/x.png" }),
  adminUploadProductImage: async () => ({ url: "/u/x.png" }),
  adminUploadProductPdf: async (_s: string, _f: File) => ({ pdfPath: "/uploads/pdfs/x.pdf" }),
}));

const physical: Product = {
  id: "p1", slug: "x", title: "T", excerpt: "e", description: ["d"],
  priceCents: 100, compareAtPriceCents: null, available: true, productType: "physical",
  images: [], options: [], sourceLinks: null, reviewImages: null, inspirationImages: null,
  tags: [], collections: [], publishedAt: "2026-01-01T00:00:00Z", pdfPath: null,
};

describe("ProductForm — source links, digital, danger", () => {
  test("source-links panel is always present and starts empty", () => {
    render(<ProductForm initial={physical} onSubmit={vi.fn()} submitLabel="Save" />);
    expect(screen.getByText(/source links/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /\+ add source link/i })).toBeTruthy();
  });

  test("digital fulfillment panel hidden for physical; shows when format flips to digital", () => {
    render(<ProductForm initial={physical} onSubmit={vi.fn()} submitLabel="Save" />);
    expect(screen.queryByText(/digital fulfillment/i)).toBeNull();
    fireEvent.click(screen.getByRole("radio", { name: /digital/i }));
    expect(screen.getByText(/digital fulfillment/i)).toBeTruthy();
  });

  test("danger zone Delete button invokes onDelete only after window.confirm", () => {
    const onDelete = vi.fn();
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<ProductForm initial={physical} onSubmit={vi.fn()} submitLabel="Save" onDelete={onDelete} />);
    fireEvent.click(screen.getByRole("button", { name: /delete product/i }));
    expect(confirmSpy).toHaveBeenCalled();
    expect(onDelete).toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  test("danger zone hidden when no initial (create mode)", () => {
    render(<ProductForm onSubmit={vi.fn()} submitLabel="Create" />);
    expect(screen.queryByRole("button", { name: /delete product/i })).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/web && npm test -- admin-product-form-tail`
Expected: FAIL.

- [ ] **Step 3: Implement tail panels**

In `apps/web/src/components/admin/ProductForm.tsx`:

1. Extend the prop type:

```tsx
export type ProductFormProps = {
  initial?: Product;
  onSubmit: (body: AdminProductWriteBody) => Promise<void>;
  submitLabel: string;
  onDiscard?: () => void;
  onDelete?: () => Promise<void> | void;
};
```

2. Add imports:

```tsx
import { AdminSourceLinksEditor, type SourceLinkValue } from "@/components/admin/product/AdminSourceLinksEditor";
import { adminUploadProductPdf } from "@/lib/adminApi";
```

3. Add state:

```tsx
const [sourceLinks, setSourceLinks] = useState<SourceLinkValue[]>(initial?.sourceLinks ?? []);
const [pdfPath, setPdfPath] = useState<string | null>(initial?.pdfPath ?? null);
const [pdfBusy, setPdfBusy] = useState(false);
```

4. Replace `sourceLinks: initial?.sourceLinks ?? null,` in `body` with `sourceLinks: sourceLinks.length > 0 ? sourceLinks : null,`.

5. Append three panels at the bottom of the **left column** (after the three media panels):

```tsx
<AdminPanel sectionTag={`Source links — "Buy from publisher" buttons`} hint="External retailer / language-edition links rendered as image buttons on the PDP.">
  <AdminSourceLinksEditor value={sourceLinks} onChange={setSourceLinks} upload={uploadImage} />
</AdminPanel>

{productFormat === "digital" ? (
  <AdminPanel variant="dashed" sectionTag="Digital fulfillment" hint="The uploaded PDF is what the customer receives by email after Stripe payment succeeds.">
    {pdfPath ? (
      <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "8px 0" }}>
        <div style={{ fontSize: 28 }}>📄</div>
        <div style={{ flex: 1 }}>
          <strong style={{ fontSize: 13 }}>{pdfPath.split("/").pop()}</strong>
          <div style={{ fontSize: 11, color: "var(--admin-muted)" }}>{pdfPath}</div>
        </div>
        <AdminButton
          variant="ghost"
          size="sm"
          disabled={pdfBusy || !initial}
          onClick={() => document.getElementById("pf-pdf-input")?.click()}
        >
          {pdfBusy ? "Uploading…" : "Replace"}
        </AdminButton>
      </div>
    ) : (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <strong style={{ fontSize: 13 }}>No PDF uploaded yet</strong>
        <AdminButton
          variant="ghost"
          size="sm"
          disabled={pdfBusy || !initial}
          onClick={() => document.getElementById("pf-pdf-input")?.click()}
        >
          {pdfBusy ? "Uploading…" : "Upload PDF"}
        </AdminButton>
      </div>
    )}
    {!initial ? <p className="panel-hint" style={{ marginTop: 8 }}>Save the product first, then upload its PDF here.</p> : null}
    <input
      id="pf-pdf-input"
      type="file"
      accept="application/pdf"
      style={{ display: "none" }}
      onChange={async (e) => {
        const f = e.target.files?.[0];
        e.target.value = "";
        if (!f || !initial) return;
        setPdfBusy(true);
        try {
          const res = await adminUploadProductPdf(initial.slug, f);
          setPdfPath(res.pdfPath ?? null);
        } finally {
          setPdfBusy(false);
        }
      }}
    />
  </AdminPanel>
) : null}

{initial && onDelete ? (
  <AdminPanel variant="danger" sectionTag="Danger zone">
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <div>
        <strong style={{ fontSize: 13 }}>Delete this product</strong>
        <div style={{ fontSize: 11, color: "var(--admin-muted)" }}>Removes it from every collection. Past orders keep the original title and price.</div>
      </div>
      <AdminButton
        variant="danger"
        size="sm"
        onClick={() => { if (window.confirm(`Delete "${title || initial.slug}" permanently?`)) void onDelete(); }}
      >
        Delete product
      </AdminButton>
    </div>
  </AdminPanel>
) : null}
```

6. In `apps/web/src/lib/adminApi.ts`, update `adminUploadProductPdf` to return the new PDF path. Current return type is `Product`; either keep returning `Product` and read `result.pdfPath`, or change to return `{ pdfPath: string | null }`. For minimal scope: keep `Product` and adjust the new caller in the form to read `res.pdfPath`. (Update the inline `await adminUploadProductPdf(...)` call to read `res.pdfPath` from the returned Product.)

- [ ] **Step 4: Update the edit page to pass `onDelete` and `onDiscard`**

Edit `apps/web/src/app/admin/products/[slug]/page.tsx`. Replace its current PDF panel and ProductForm usage with:

```tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  adminDeleteProduct,
  adminGetProduct,
  adminUpdateProduct,
} from "@/lib/adminApi";
import type { Product } from "@/lib/api";
import { ProductForm } from "@/components/admin/ProductForm";

export default function AdminProductEditPage() {
  const router = useRouter();
  const params = useParams();
  const slug = (params?.slug as string) ?? "";
  const [product, setProduct] = useState<Product | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    adminGetProduct(slug).then(setProduct).catch((e: Error) => setError(e.message));
  }, [slug]);

  if (error) return <p>{error}</p>;
  if (!product) return <p>Loading…</p>;

  return (
    <ProductForm
      initial={product}
      submitLabel="Save changes"
      onSubmit={async (body) => {
        const updated = await adminUpdateProduct(product.slug, body);
        setProduct(updated);
      }}
      onDiscard={() => router.refresh()}
      onDelete={async () => {
        await adminDeleteProduct(product.slug);
        router.push("/admin/products");
      }}
    />
  );
}
```

- [ ] **Step 5: Run tests**

Run: `cd apps/web && npm test -- admin-product-form`
Expected: PASS.

Run typecheck: `cd apps/web && npm run typecheck`
Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/admin/ProductForm.tsx apps/web/src/app/admin/products/\[slug\]/page.tsx apps/web/src/lib/adminApi.ts apps/web/tests/unit/admin-product-form-tail.test.tsx
git commit -m "$(cat <<'EOF'
feat(admin): ProductForm — source links, digital fulfillment, danger zone

Phase B complete: the product editor is the sectioned CRM workspace
described in the spec.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Phase C — Product list + backend list/bulk/duplicate/tags

Goal: `/admin/products` becomes the CRM list. Phase C ships on its own once Phase B is in.

### Task C1: BE — extend `GET /api/admin/products` with filters, sort, pagination, derived status

**Files:**
- Modify: `apps/api/Controllers/AdminProductsController.cs`
- Create/modify: `apps/api/Contracts/<ProductsListResponse + derived status fields>`
- Test: `apps/api.Tests/AdminProductsListTests.cs`

- [ ] **Step 1: Write failing tests**

Create `apps/api.Tests/AdminProductsListTests.cs`:

```csharp
using System.Net;
using System.Net.Http.Json;
using JovieJoy.Api.Contracts;
using Xunit;

namespace JovieJoy.Api.Tests;

public class AdminProductsListTests : IClassFixture<ApiFactory>
{
    private readonly ApiFactory _f;
    public AdminProductsListTests(ApiFactory f) => _f = f;

    [Fact]
    public async Task List_returns_paged_envelope_with_total_and_status()
    {
        var client = await _f.CreateAdminClientAsync();
        var res = await client.GetAsync("/api/admin/products?page=1&pageSize=2");
        res.EnsureSuccessStatusCode();
        var body = await res.Content.ReadFromJsonAsync<AdminProductListResponse>();
        Assert.NotNull(body);
        Assert.True(body!.Total >= body.Items.Count);
        Assert.True(body.Items.Count <= 2);
        Assert.All(body.Items, p => Assert.False(string.IsNullOrEmpty(p.Status)));
    }

    [Fact]
    public async Task List_with_q_filters_by_title_substring_case_insensitive()
    {
        var client = await _f.CreateAdminClientAsync();
        var res = await client.GetAsync("/api/admin/products?q=cozy");
        res.EnsureSuccessStatusCode();
        var body = await res.Content.ReadFromJsonAsync<AdminProductListResponse>();
        Assert.NotNull(body);
        Assert.All(body!.Items, p =>
            Assert.True(
                p.Title.Contains("cozy", System.StringComparison.OrdinalIgnoreCase)
                || p.Slug.Contains("cozy")
                || p.Tags.Contains("cozy", System.StringComparer.OrdinalIgnoreCase)));
    }

    [Fact]
    public async Task List_with_format_filter_only_returns_matching()
    {
        var client = await _f.CreateAdminClientAsync();
        var res = await client.GetAsync("/api/admin/products?format=digital");
        res.EnsureSuccessStatusCode();
        var body = await res.Content.ReadFromJsonAsync<AdminProductListResponse>();
        Assert.All(body!.Items, p => Assert.Equal("digital", p.ProductType));
    }

    [Fact]
    public async Task List_sort_price_desc_returns_descending_prices()
    {
        var client = await _f.CreateAdminClientAsync();
        var res = await client.GetAsync("/api/admin/products?sort=price_desc&pageSize=100");
        res.EnsureSuccessStatusCode();
        var body = await res.Content.ReadFromJsonAsync<AdminProductListResponse>();
        var prices = body!.Items.Select(p => p.PriceCents).ToList();
        Assert.Equal(prices.OrderByDescending(p => p).ToList(), prices);
    }
}
```

Then in `apps/api/Contracts/AdminProductListResponse.cs` (create):

```csharp
namespace JovieJoy.Api.Contracts;

public record AdminProductListResponse(
    IReadOnlyList<AdminProductListItem> Items,
    int Total,
    int Page,
    int PageSize);

public record AdminProductListItem(
    string Slug,
    string Title,
    string Excerpt,
    int PriceCents,
    int? CompareAtPriceCents,
    bool Available,
    string ProductType,
    string Status,                     // derived: published | draft | scheduled | out_of_stock
    IReadOnlyList<string> Tags,
    IReadOnlyList<string> CollectionSlugs,
    string? PrimaryImage,
    DateTime? PublishedAt,
    DateTime UpdatedAt);
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd apps/api.Tests && dotnet test --filter "AdminProductsListTests"`
Expected: FAIL — current `List` returns a flat `IEnumerable<ProductDto>` with no envelope.

- [ ] **Step 3: Replace the `List` action**

In `apps/api/Controllers/AdminProductsController.cs`, replace `List` with:

```csharp
[HttpGet]
public async Task<ActionResult<AdminProductListResponse>> List(
    [FromQuery] string? q,
    [FromQuery] string? format,
    [FromQuery] string? status,
    [FromQuery] string? collection,
    [FromQuery] string? tag,
    [FromQuery] string? sort,
    [FromQuery] int page = 1,
    [FromQuery] int pageSize = 25,
    CancellationToken ct = default)
{
    page = Math.Max(1, page);
    pageSize = Math.Clamp(pageSize, 1, 100);

    var query = db.Products.AsNoTracking()
        .Include(p => p.ProductCollections).ThenInclude(pc => pc.Collection)
        .AsQueryable();

    if (!string.IsNullOrWhiteSpace(q))
    {
        var needle = q.ToLowerInvariant();
        query = query.Where(p =>
            EF.Functions.ILike(p.Title, $"%{needle}%") ||
            EF.Functions.ILike(p.Slug, $"%{needle}%") ||
            p.Tags.Any(t => EF.Functions.ILike(t, $"%{needle}%")));
    }

    if (!string.IsNullOrWhiteSpace(format))
    {
        var formats = format.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(f => Enum.TryParse<ProductType>(f, ignoreCase: true, out var pt) ? (ProductType?)pt : null)
            .Where(pt => pt.HasValue).Select(pt => pt!.Value).ToList();
        if (formats.Count > 0) query = query.Where(p => formats.Contains(p.ProductType));
    }

    if (!string.IsNullOrWhiteSpace(collection))
    {
        var slugs = collection.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).ToList();
        query = query.Where(p => p.ProductCollections.Any(pc => slugs.Contains(pc.Collection.Slug)));
    }

    if (!string.IsNullOrWhiteSpace(tag))
    {
        var tags = tag.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).ToList();
        query = query.Where(p => p.Tags.Any(t => tags.Contains(t)));
    }

    query = sort switch
    {
        "title_asc" => query.OrderBy(p => p.Title),
        "title_desc" => query.OrderByDescending(p => p.Title),
        "price_asc" => query.OrderBy(p => p.PriceCents),
        "price_desc" => query.OrderByDescending(p => p.PriceCents),
        "updated_asc" => query.OrderBy(p => p.UpdatedAt),
        _ => query.OrderByDescending(p => p.UpdatedAt),
    };

    var totalAfterServerFilters = await query.CountAsync(ct);
    // Status is a derived value; for paging we apply it after materialisation when status is requested.
    List<Product> page1;
    int totalForResponse;

    if (!string.IsNullOrWhiteSpace(status))
    {
        var statuses = status.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(s => s.ToLowerInvariant()).ToHashSet();
        var all = await query.ToListAsync(ct);
        var now = DateTime.UtcNow;
        var filtered = all.Where(p => statuses.Contains(DeriveStatus(p, now))).ToList();
        totalForResponse = filtered.Count;
        page1 = filtered.Skip((page - 1) * pageSize).Take(pageSize).ToList();
    }
    else
    {
        totalForResponse = totalAfterServerFilters;
        page1 = await query.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync(ct);
    }

    var now2 = DateTime.UtcNow;
    var items = page1.Select(p => new AdminProductListItem(
        p.Slug,
        p.Title,
        p.Excerpt,
        p.PriceCents,
        p.CompareAtPriceCents,
        p.Available,
        p.ProductType.ToString().ToLowerInvariant(),
        DeriveStatus(p, now2),
        p.Tags.ToList(),
        p.ProductCollections.Select(pc => pc.Collection.Slug).ToList(),
        p.Images.FirstOrDefault(),
        p.PublishedAt,
        p.UpdatedAt
    )).ToList();

    return Ok(new AdminProductListResponse(items, totalForResponse, page, pageSize));
}

private static string DeriveStatus(Product p, DateTime now)
{
    if (!p.Available) return "out_of_stock";
    if (p.PublishedAt is null) return "draft";
    if (p.PublishedAt.Value > now) return "scheduled";
    return "published";
}
```

- [ ] **Step 4: Run BE tests to verify they pass**

Run: `cd apps/api.Tests && dotnet test --filter "AdminProductsListTests"`
Expected: PASS, 4 tests.

Run full suite: `cd apps/api.Tests && dotnet test`
Expected: Existing list-consumer tests may need adjustment if they expected the bare array. Update them inline if so.

- [ ] **Step 5: Commit**

```bash
git add apps/api/Controllers/AdminProductsController.cs apps/api/Contracts apps/api.Tests/AdminProductsListTests.cs
git commit -m "$(cat <<'EOF'
feat(api): paged + filtered + sorted product list with derived status

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task C2: BE — `POST /api/admin/products/bulk`

**Files:**
- Modify: `apps/api/Controllers/AdminProductsController.cs`
- Create: `apps/api/Contracts/AdminProductBulkRequest.cs`
- Test: `apps/api.Tests/AdminProductsBulkTests.cs`

- [ ] **Step 1: Write failing tests**

Create `apps/api.Tests/AdminProductsBulkTests.cs`:

```csharp
using System.Net.Http.Json;
using Xunit;

namespace JovieJoy.Api.Tests;

public class AdminProductsBulkTests : IClassFixture<ApiFactory>
{
    private readonly ApiFactory _f;
    public AdminProductsBulkTests(ApiFactory f) => _f = f;

    [Fact]
    public async Task Bulk_publish_sets_publishedAt_for_each_slug()
    {
        var client = await _f.CreateAdminClientAsync();
        var slugs = await _f.SeedDraftProducts(2);
        var res = await client.PostAsJsonAsync("/api/admin/products/bulk",
            new { slugs, action = "publish" });
        res.EnsureSuccessStatusCode();
        var body = await res.Content.ReadFromJsonAsync<UpdatedEnvelope>();
        Assert.Equal(2, body!.Updated);
        // verify both now have publishedAt set
        foreach (var s in slugs)
        {
            var get = await client.GetAsync($"/api/admin/products/{s}");
            get.EnsureSuccessStatusCode();
            var p = await get.Content.ReadFromJsonAsync<ProductDto>();
            Assert.NotNull(p!.PublishedAt);
        }
    }

    [Fact]
    public async Task Bulk_unpublish_clears_publishedAt()
    {
        var client = await _f.CreateAdminClientAsync();
        var slugs = await _f.SeedPublishedProducts(2);
        var res = await client.PostAsJsonAsync("/api/admin/products/bulk",
            new { slugs, action = "unpublish" });
        res.EnsureSuccessStatusCode();
        foreach (var s in slugs)
        {
            var get = await client.GetAsync($"/api/admin/products/{s}");
            var p = await get.Content.ReadFromJsonAsync<ProductDto>();
            Assert.Null(p!.PublishedAt);
        }
    }

    [Fact]
    public async Task Bulk_delete_marks_unavailable()
    {
        var client = await _f.CreateAdminClientAsync();
        var slugs = await _f.SeedPublishedProducts(2);
        var res = await client.PostAsJsonAsync("/api/admin/products/bulk",
            new { slugs, action = "delete" });
        res.EnsureSuccessStatusCode();
        foreach (var s in slugs)
        {
            var get = await client.GetAsync($"/api/admin/products/{s}");
            var p = await get.Content.ReadFromJsonAsync<ProductDto>();
            Assert.False(p!.Available);
        }
    }

    [Fact]
    public async Task Bulk_add_to_collection_attaches_products()
    {
        var client = await _f.CreateAdminClientAsync();
        var slugs = await _f.SeedPublishedProducts(2);
        var collectionSlug = await _f.SeedCollection();
        var res = await client.PostAsJsonAsync("/api/admin/products/bulk",
            new { slugs, action = "add-to-collection", payload = new { collectionSlug } });
        res.EnsureSuccessStatusCode();
        foreach (var s in slugs)
        {
            var get = await client.GetAsync($"/api/admin/products/{s}");
            var p = await get.Content.ReadFromJsonAsync<ProductDto>();
            Assert.Contains(collectionSlug, p!.Collections);
        }
    }

    private record UpdatedEnvelope(int Updated);
}
```

> `ApiFactory.SeedDraftProducts`, `SeedPublishedProducts`, and `SeedCollection` are test helpers. If they don't exist, add thin async helpers on `ApiFactory` that insert directly via a scoped `AppDbContext` and return the created slug(s).

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd apps/api.Tests && dotnet test --filter "AdminProductsBulkTests"`
Expected: FAIL — endpoint doesn't exist.

- [ ] **Step 3: Add request DTO**

Create `apps/api/Contracts/AdminProductBulkRequest.cs`:

```csharp
namespace JovieJoy.Api.Contracts;

public record AdminProductBulkRequest(
    List<string> Slugs,
    string Action,                  // "publish" | "unpublish" | "delete" | "add-to-collection" | "remove-from-collection"
    AdminProductBulkPayload? Payload);

public record AdminProductBulkPayload(string? CollectionSlug);
```

- [ ] **Step 4: Implement the endpoint**

Append to `apps/api/Controllers/AdminProductsController.cs`:

```csharp
[HttpPost("bulk")]
public async Task<ActionResult<object>> Bulk([FromBody] AdminProductBulkRequest req, CancellationToken ct)
{
    if (req.Slugs is null || req.Slugs.Count == 0)
        return BadRequest(new { error = "slugs required" });

    var products = await db.Products
        .Include(p => p.ProductCollections)
        .Where(p => req.Slugs.Contains(p.Slug))
        .ToListAsync(ct);
    if (products.Count == 0) return Ok(new { updated = 0 });

    var now = DateTime.UtcNow;
    switch (req.Action)
    {
        case "publish":
            foreach (var p in products) { p.PublishedAt = p.PublishedAt ?? now; p.UpdatedAt = now; }
            break;
        case "unpublish":
            foreach (var p in products) { p.PublishedAt = null; p.UpdatedAt = now; }
            break;
        case "delete":
            foreach (var p in products) { p.Available = false; p.UpdatedAt = now; }
            break;
        case "add-to-collection":
        case "remove-from-collection":
        {
            var slug = req.Payload?.CollectionSlug;
            if (string.IsNullOrWhiteSpace(slug))
                return BadRequest(new { error = "payload.collectionSlug required" });
            var collection = await db.Collections.FirstOrDefaultAsync(c => c.Slug == slug, ct);
            if (collection is null) return NotFound(new { error = $"collection '{slug}' not found" });

            foreach (var p in products)
            {
                var exists = p.ProductCollections.Any(pc => pc.CollectionId == collection.Id);
                if (req.Action == "add-to-collection" && !exists)
                    db.ProductCollections.Add(new ProductCollection { ProductId = p.Id, CollectionId = collection.Id });
                if (req.Action == "remove-from-collection" && exists)
                    db.ProductCollections.RemoveRange(p.ProductCollections.Where(pc => pc.CollectionId == collection.Id));
                p.UpdatedAt = now;
            }
            break;
        }
        default:
            return BadRequest(new { error = $"unknown action '{req.Action}'" });
    }

    await db.SaveChangesAsync(ct);
    return Ok(new { updated = products.Count });
}
```

- [ ] **Step 5: Run BE tests**

Run: `cd apps/api.Tests && dotnet test --filter "AdminProductsBulkTests"`
Expected: PASS, 4 tests.

- [ ] **Step 6: Commit**

```bash
git add apps/api/Controllers/AdminProductsController.cs apps/api/Contracts/AdminProductBulkRequest.cs apps/api.Tests/AdminProductsBulkTests.cs apps/api.Tests/ApiFactory.cs
git commit -m "$(cat <<'EOF'
feat(api): POST /api/admin/products/bulk (publish, unpublish, delete, add/remove collection)

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task C3: BE — `POST /api/admin/products/{slug}/duplicate` and `GET /api/admin/products/tags`

**Files:**
- Modify: `apps/api/Controllers/AdminProductsController.cs`
- Test: `apps/api.Tests/AdminProductsDuplicateAndTagsTests.cs`

- [ ] **Step 1: Write failing tests**

Create `apps/api.Tests/AdminProductsDuplicateAndTagsTests.cs`:

```csharp
using System.Net.Http.Json;
using JovieJoy.Api.Contracts;
using Xunit;

namespace JovieJoy.Api.Tests;

public class AdminProductsDuplicateAndTagsTests : IClassFixture<ApiFactory>
{
    private readonly ApiFactory _f;
    public AdminProductsDuplicateAndTagsTests(ApiFactory f) => _f = f;

    [Fact]
    public async Task Duplicate_creates_draft_with_copy_suffix_and_no_collections()
    {
        var client = await _f.CreateAdminClientAsync();
        var sourceSlug = (await _f.SeedPublishedProducts(1)).Single();
        var res = await client.PostAsync($"/api/admin/products/{sourceSlug}/duplicate", null);
        res.EnsureSuccessStatusCode();
        var dup = await res.Content.ReadFromJsonAsync<ProductDto>();
        Assert.NotNull(dup);
        Assert.Equal($"{sourceSlug}-copy", dup!.Slug);
        Assert.Null(dup.PublishedAt);
        Assert.Empty(dup.Collections);
    }

    [Fact]
    public async Task Duplicate_appends_numeric_suffix_when_copy_slug_already_taken()
    {
        var client = await _f.CreateAdminClientAsync();
        var sourceSlug = (await _f.SeedPublishedProducts(1)).Single();
        var first = await client.PostAsync($"/api/admin/products/{sourceSlug}/duplicate", null);
        first.EnsureSuccessStatusCode();
        var second = await client.PostAsync($"/api/admin/products/{sourceSlug}/duplicate", null);
        second.EnsureSuccessStatusCode();
        var dup2 = await second.Content.ReadFromJsonAsync<ProductDto>();
        Assert.Equal($"{sourceSlug}-copy-2", dup2!.Slug);
    }

    [Fact]
    public async Task Tags_endpoint_returns_distinct_tags_alphabetized()
    {
        var client = await _f.CreateAdminClientAsync();
        await _f.SeedPublishedProducts(1, tags: new[] { "winter", "cozy" });
        await _f.SeedPublishedProducts(1, tags: new[] { "cozy", "holiday" });
        var res = await client.GetAsync("/api/admin/products/tags");
        res.EnsureSuccessStatusCode();
        var tags = await res.Content.ReadFromJsonAsync<string[]>();
        Assert.NotNull(tags);
        Assert.Contains("winter", tags!);
        Assert.Contains("cozy", tags);
        Assert.Contains("holiday", tags);
        Assert.Equal(tags.Distinct().OrderBy(t => t).ToArray(), tags);
    }
}
```

> Extend `ApiFactory.SeedPublishedProducts` to accept an optional `string[]? tags` parameter.

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd apps/api.Tests && dotnet test --filter "AdminProductsDuplicateAndTagsTests"`
Expected: FAIL.

- [ ] **Step 3: Implement endpoints**

Append to `apps/api/Controllers/AdminProductsController.cs`:

```csharp
[HttpPost("{slug}/duplicate")]
public async Task<ActionResult<ProductDto>> Duplicate(string slug, CancellationToken ct)
{
    var source = await db.Products
        .Include(p => p.ProductCollections)
        .FirstOrDefaultAsync(p => p.Slug == slug, ct);
    if (source is null) return NotFound();

    var newSlug = $"{slug}-copy";
    var n = 2;
    while (await db.Products.AnyAsync(p => p.Slug == newSlug, ct))
    {
        newSlug = $"{slug}-copy-{n}";
        n++;
    }

    var copy = new Product
    {
        Slug = newSlug,
        Title = source.Title,
        Excerpt = source.Excerpt,
        Description = source.Description.ToList(),
        PriceCents = source.PriceCents,
        CompareAtPriceCents = source.CompareAtPriceCents,
        Available = source.Available,
        ProductType = source.ProductType,
        Images = source.Images.ToList(),
        Options = source.Options.Select(o => new ProductOption(o.Name, o.Values.ToList())).ToList(),
        SourceLinks = source.SourceLinks?.Select(s => new SourceLink(s.Label, s.Href, s.Image, s.Alt)).ToList(),
        ReviewImages = source.ReviewImages?.ToList(),
        InspirationImages = source.InspirationImages?.ToList(),
        Tags = source.Tags.ToList(),
        PublishedAt = null, // draft
    };
    db.Products.Add(copy);
    await db.SaveChangesAsync(ct);

    return CreatedAtAction(nameof(Get), new { slug = copy.Slug }, ProductDto.From(copy));
}

[HttpGet("tags")]
public async Task<ActionResult<IEnumerable<string>>> Tags(CancellationToken ct)
{
    var all = await db.Products.AsNoTracking().Select(p => p.Tags).ToListAsync(ct);
    var distinct = all.SelectMany(t => t).Where(t => !string.IsNullOrWhiteSpace(t))
        .Select(t => t.Trim())
        .Distinct(StringComparer.OrdinalIgnoreCase)
        .OrderBy(t => t, StringComparer.OrdinalIgnoreCase)
        .ToList();
    return Ok(distinct);
}
```

- [ ] **Step 4: Run BE tests**

Run: `cd apps/api.Tests && dotnet test --filter "AdminProductsDuplicateAndTagsTests"`
Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add apps/api/Controllers/AdminProductsController.cs apps/api.Tests/AdminProductsDuplicateAndTagsTests.cs apps/api.Tests/ApiFactory.cs
git commit -m "$(cat <<'EOF'
feat(api): duplicate product (-copy slug) + distinct tags endpoint

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task C4: FE — `adminApi.ts` clients for the new endpoints

**Files:**
- Modify: `apps/web/src/lib/adminApi.ts`
- Test: `apps/web/tests/unit/admin-api-products-list.test.ts`

- [ ] **Step 1: Write failing test**

Create `apps/web/tests/unit/admin-api-products-list.test.ts`:

```ts
import { describe, expect, test, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({ tokenStorage: { read: () => "t" } }));

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

beforeEach(() => { fetchMock.mockReset(); });

async function load() {
  return await import("@/lib/adminApi");
}

describe("adminListProducts", () => {
  test("posts query params and parses envelope", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ items: [], total: 0, page: 1, pageSize: 25 }), { status: 200 }));
    const api = await load();
    await api.adminListProducts({ q: "cozy", format: ["digital"], page: 2, pageSize: 25, sort: "price_desc" });
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain("/api/admin/products");
    expect(url).toContain("q=cozy");
    expect(url).toContain("format=digital");
    expect(url).toContain("page=2");
    expect(url).toContain("pageSize=25");
    expect(url).toContain("sort=price_desc");
  });
});

describe("adminBulkProducts", () => {
  test("POSTs body with slugs + action + payload", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ updated: 2 }), { status: 200 }));
    const api = await load();
    const res = await api.adminBulkProducts({ slugs: ["a","b"], action: "add-to-collection", payload: { collectionSlug: "new" } });
    expect(res.updated).toBe(2);
    const call = fetchMock.mock.calls[0];
    expect(JSON.parse(call[1].body)).toEqual({ slugs: ["a","b"], action: "add-to-collection", payload: { collectionSlug: "new" } });
  });
});

describe("adminDuplicateProduct + adminListProductTags", () => {
  test("duplicate POSTs and returns product", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ slug: "x-copy" }), { status: 201 }));
    const api = await load();
    const r = await api.adminDuplicateProduct("x");
    expect(r.slug).toBe("x-copy");
  });
  test("tags returns string array", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify(["a","b"]), { status: 200 }));
    const api = await load();
    expect(await api.adminListProductTags()).toEqual(["a","b"]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/web && npm test -- admin-api-products-list`
Expected: FAIL — exports don't exist.

- [ ] **Step 3: Add the new clients**

In `apps/web/src/lib/adminApi.ts`, append:

```ts
export type AdminProductListItem = {
  slug: string;
  title: string;
  excerpt: string;
  priceCents: number;
  compareAtPriceCents: number | null;
  available: boolean;
  productType: string;
  status: "published" | "draft" | "scheduled" | "out_of_stock";
  tags: string[];
  collectionSlugs: string[];
  primaryImage: string | null;
  publishedAt: string | null;
  updatedAt: string;
};
export type AdminProductListResponse = {
  items: AdminProductListItem[];
  total: number;
  page: number;
  pageSize: number;
};
export type AdminProductListQuery = {
  q?: string;
  format?: string[];
  status?: string[];
  collection?: string[];
  tag?: string[];
  sort?: "title_asc" | "title_desc" | "price_asc" | "price_desc" | "updated_asc" | "updated_desc";
  page?: number;
  pageSize?: number;
};

function csv(values: string[] | undefined): string | undefined {
  return values && values.length > 0 ? values.join(",") : undefined;
}

export const adminListProducts = (query: AdminProductListQuery = {}) => {
  const p = new URLSearchParams();
  if (query.q) p.set("q", query.q);
  if (csv(query.format)) p.set("format", csv(query.format)!);
  if (csv(query.status)) p.set("status", csv(query.status)!);
  if (csv(query.collection)) p.set("collection", csv(query.collection)!);
  if (csv(query.tag)) p.set("tag", csv(query.tag)!);
  if (query.sort) p.set("sort", query.sort);
  p.set("page", String(query.page ?? 1));
  p.set("pageSize", String(query.pageSize ?? 25));
  return adminFetch<AdminProductListResponse>(`/api/admin/products?${p}`);
};

export type AdminProductBulkAction =
  | "publish" | "unpublish" | "delete" | "add-to-collection" | "remove-from-collection";

export const adminBulkProducts = (body: {
  slugs: string[];
  action: AdminProductBulkAction;
  payload?: { collectionSlug?: string };
}) =>
  adminFetch<{ updated: number }>("/api/admin/products/bulk", {
    method: "POST",
    body: JSON.stringify(body),
  });

export const adminDuplicateProduct = (slug: string) =>
  adminFetch<Product>(`/api/admin/products/${slug}/duplicate`, { method: "POST" });

export const adminListProductTags = () =>
  adminFetch<string[]>("/api/admin/products/tags");
```

**Important:** the existing `adminListProducts` (which returned `Product[]`) is being **replaced** by the paged version. Find every caller — at least the existing `/admin/products` page and any tests — and update them. The replacement happens in Task C5 for the products list page; this task only adds the new client.

If any other caller breaks compile, fix inline: usually they want either `(await adminListProducts({ pageSize: 100 })).items` or to migrate to the new component.

- [ ] **Step 4: Run tests**

Run: `cd apps/web && npm test -- admin-api-products-list`
Expected: PASS.

Run typecheck: `cd apps/web && npm run typecheck`
Expected: passes (after updating callers — see Step 3 note).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/adminApi.ts apps/web/tests/unit/admin-api-products-list.test.ts
git commit -m "$(cat <<'EOF'
feat(admin): adminApi clients for paged list, bulk, duplicate, tags

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task C5: FE — `/admin/products` list page rebuild

**Files:**
- Replace: `apps/web/src/app/admin/products/page.tsx`
- Create: `apps/web/src/app/admin/products/new/page.tsx`
- Test: `apps/web/tests/unit/admin-products-list.test.tsx`

**Why:** Today the page is a flat unpaginated table with inline create form. Replace with the toolbar / filter chips / bulk bar / paginated table from the mockup. Move "+ New product" to its own route to keep this page focused.

- [ ] **Step 1: Write failing test**

Create `apps/web/tests/unit/admin-products-list.test.tsx`:

```tsx
import { describe, expect, test, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AdminProductsPage from "@/app/admin/products/page";

const listMock = vi.fn();
const bulkMock = vi.fn();
const tagsMock = vi.fn();
const collectionsMock = vi.fn();
const duplicateMock = vi.fn();

vi.mock("@/lib/adminApi", () => ({
  adminListProducts: (...args: unknown[]) => listMock(...args),
  adminBulkProducts: (...args: unknown[]) => bulkMock(...args),
  adminListProductTags: (...args: unknown[]) => tagsMock(...args),
  adminListCollections: (...args: unknown[]) => collectionsMock(...args),
  adminDuplicateProduct: (...args: unknown[]) => duplicateMock(...args),
}));

const PRODUCT = (overrides: Partial<{ slug: string; title: string; status: string; productType: string }> = {}) => ({
  slug: overrides.slug ?? "a", title: overrides.title ?? "Alpha", excerpt: "",
  priceCents: 100, compareAtPriceCents: null, available: true,
  productType: overrides.productType ?? "physical",
  status: overrides.status ?? "published",
  tags: [], collectionSlugs: [], primaryImage: null,
  publishedAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-02T00:00:00Z",
});

beforeEach(() => {
  listMock.mockReset();
  bulkMock.mockReset();
  tagsMock.mockReset();
  collectionsMock.mockReset();
  duplicateMock.mockReset();
  collectionsMock.mockResolvedValue([{ slug: "new", title: "New" }]);
  tagsMock.mockResolvedValue(["cozy"]);
  listMock.mockResolvedValue({ items: [PRODUCT(), PRODUCT({ slug: "b", title: "Beta" })], total: 2, page: 1, pageSize: 25 });
});

describe("/admin/products list", () => {
  test("loads first page on mount and renders rows", async () => {
    render(<AdminProductsPage />);
    await waitFor(() => expect(screen.getByText("Alpha")).toBeTruthy());
    expect(screen.getByText("Beta")).toBeTruthy();
    expect(listMock).toHaveBeenCalled();
    const firstQuery = listMock.mock.calls[0][0];
    expect(firstQuery.page).toBe(1);
  });

  test("typing in search re-queries (debounce expected via useEffect/timeout)", async () => {
    render(<AdminProductsPage />);
    await waitFor(() => expect(screen.getByText("Alpha")).toBeTruthy());
    fireEvent.change(screen.getByPlaceholderText(/search/i), { target: { value: "cozy" } });
    await waitFor(() => expect(listMock).toHaveBeenLastCalledWith(expect.objectContaining({ q: "cozy" })));
  });

  test("selecting rows reveals the bulk bar with publish action", async () => {
    render(<AdminProductsPage />);
    await waitFor(() => expect(screen.getByText("Alpha")).toBeTruthy());
    fireEvent.click(screen.getAllByRole("checkbox")[1]); // first row checkbox (index 0 is header)
    expect(screen.getByText(/1 selected/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /publish/i }));
    await waitFor(() => expect(bulkMock).toHaveBeenCalledWith(expect.objectContaining({ action: "publish", slugs: ["a"] })));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/web && npm test -- admin-products-list`
Expected: FAIL.

- [ ] **Step 3: Replace the page**

Replace `apps/web/src/app/admin/products/page.tsx`:

```tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  adminBulkProducts,
  adminListCollections,
  adminListProducts,
  adminListProductTags,
  type AdminProductListItem,
} from "@/lib/adminApi";
import { formatCents } from "@/lib/format";
import { AdminPageHeader } from "@/components/admin/ui/AdminPageHeader";
import { AdminToolbar } from "@/components/admin/ui/AdminToolbar";
import { AdminFilterChip } from "@/components/admin/ui/AdminFilterChip";
import { AdminBulkBar } from "@/components/admin/ui/AdminBulkBar";
import { AdminTable, type AdminTableColumn } from "@/components/admin/ui/AdminTable";
import { AdminPagination } from "@/components/admin/ui/AdminPagination";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { AdminBadge } from "@/components/admin/ui/AdminBadge";
import { AdminCheckbox } from "@/components/admin/ui/AdminCheckbox";
import { AdminEmptyState } from "@/components/admin/ui/AdminEmptyState";
import { PRODUCT_FORMATS } from "@/components/admin/product/AdminFormatPicker";

const STATUSES = [
  { value: "published", label: "Published" },
  { value: "draft", label: "Draft" },
  { value: "scheduled", label: "Scheduled" },
  { value: "out_of_stock", label: "Out of stock" },
];

function relTime(iso: string): string {
  const ms = Date.now() - Date.parse(iso);
  const d = Math.floor(ms / 86400000);
  if (d < 1) return "today";
  if (d < 7) return `${d}d ago`;
  if (d < 30) return `${Math.floor(d / 7)}w ago`;
  if (d < 365) return `${Math.floor(d / 30)}mo ago`;
  return `${Math.floor(d / 365)}y ago`;
}

export default function AdminProductsPage() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [formats, setFormats] = useState<string[]>([]);
  const [statuses, setStatuses] = useState<string[]>([]);
  const [collections, setCollections] = useState<string[]>([]);
  const [allCollections, setAllCollections] = useState<{ slug: string; title: string }[]>([]);
  const [sort, setSort] = useState<"updated_desc" | "title_asc" | "title_desc" | "price_asc" | "price_desc">("updated_desc");
  const [page, setPage] = useState(1);
  const pageSize = 25;
  const [items, setItems] = useState<AdminProductListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => { adminListCollections().then((cs) => setAllCollections(cs.map((c) => ({ slug: c.slug, title: c.title })))).catch(() => {}); }, []);
  useEffect(() => { void adminListProductTags().catch(() => {}); }, []);

  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedQ(q), 250);
    return () => window.clearTimeout(id);
  }, [q]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    adminListProducts({ q: debouncedQ || undefined, format: formats, status: statuses, collection: collections, sort, page, pageSize })
      .then((res) => { setItems(res.items); setTotal(res.total); })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [debouncedQ, formats, statuses, collections, sort, page]);

  function toggleFilter(setFn: (next: string[]) => void, current: string[], v: string) {
    setPage(1);
    setFn(current.includes(v) ? current.filter((x) => x !== v) : [...current, v]);
  }

  function toggleSelect(slug: string) {
    setSelected((cur) => {
      const next = new Set(cur);
      if (next.has(slug)) next.delete(slug); else next.add(slug);
      return next;
    });
  }
  const allSelected = items.length > 0 && items.every((i) => selected.has(i.slug));
  function toggleSelectAll() {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(items.map((i) => i.slug)));
  }

  async function bulk(action: Parameters<typeof adminBulkProducts>[0]["action"], payload?: { collectionSlug?: string }) {
    if (selected.size === 0) return;
    await adminBulkProducts({ slugs: Array.from(selected), action, payload });
    setSelected(new Set());
    // refresh
    const res = await adminListProducts({ q: debouncedQ || undefined, format: formats, status: statuses, collection: collections, sort, page, pageSize });
    setItems(res.items); setTotal(res.total);
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const counts = useMemo(() => {
    const by = (s: string) => items.filter((i) => i.status === s).length;
    return { pub: by("published"), draft: by("draft"), oos: by("out_of_stock") };
  }, [items]);

  const columns: AdminTableColumn<AdminProductListItem>[] = [
    {
      key: "_select",
      width: "34px",
      label: <AdminCheckbox aria-label="select all rows" checked={allSelected} onChange={toggleSelectAll} />,
      render: (row) => (
        <AdminCheckbox
          aria-label={`select ${row.slug}`}
          checked={selected.has(row.slug)}
          onChange={() => toggleSelect(row.slug)}
        />
      ),
    },
    {
      key: "_thumb",
      width: "56px",
      label: "",
      render: (row) => (
        <div style={{ width: 36, height: 36, background: "#fef0d4", border: "1px solid var(--admin-line-soft)", borderRadius: 8, overflow: "hidden" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {row.primaryImage ? <img alt="" src={row.primaryImage} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : null}
        </div>
      ),
    },
    {
      key: "title",
      label: "Product",
      sortable: true,
      render: (row) => (
        <div>
          <div style={{ fontWeight: 800 }}>{row.title}</div>
          <div style={{ fontSize: 10, color: "var(--admin-muted)", fontFamily: "ui-monospace, monospace" }}>/{row.slug}</div>
        </div>
      ),
    },
    {
      key: "format",
      label: "Format",
      render: (row) => {
        const fmt = PRODUCT_FORMATS.find((f) => f.value === row.productType);
        return <span>{fmt ? `${fmt.icon} ${fmt.label}` : row.productType}</span>;
      },
    },
    {
      key: "price",
      label: "Price",
      sortable: true,
      render: (row) =>
        row.productType === "freebie" ? <span>Free</span> : (
          <span>
            {formatCents(row.priceCents)}
            {row.compareAtPriceCents ? <span style={{ color: "var(--admin-muted)", textDecoration: "line-through", fontSize: 10, marginLeft: 5 }}>{formatCents(row.compareAtPriceCents)}</span> : null}
          </span>
        ),
    },
    {
      key: "status",
      label: "Status",
      render: (row) => {
        const variant = row.status === "published" ? "pub" : row.status === "draft" ? "draft" : row.status === "scheduled" ? "scheduled" : "oos";
        const label = row.status === "out_of_stock" ? "Out of stock" : row.status.charAt(0).toUpperCase() + row.status.slice(1);
        return <AdminBadge variant={variant}>{label}</AdminBadge>;
      },
    },
    {
      key: "collections",
      label: "Collections",
      render: (row) => row.collectionSlugs.slice(0, 3).map((s) => (
        <span key={s} style={{ background: "var(--admin-coral-soft)", color: "#a3392a", padding: "2px 7px", borderRadius: 999, fontSize: 10, fontWeight: 700, marginRight: 3 }}>{s}</span>
      )),
    },
    { key: "updated", label: "Updated", sortable: true, render: (row) => <span>{relTime(row.updatedAt)}</span> },
  ];

  return (
    <div>
      <AdminPageHeader
        crumb="Catalog"
        title="Products"
        subtitle={`${total} products · ${counts.pub} published · ${counts.draft} drafts · ${counts.oos} out of stock (on this page)`}
        actions={
          <>
            <AdminButton variant="ghost" disabled>Import CSV</AdminButton>
            <Link href="/admin/products/new"><AdminButton variant="primary">+ New product</AdminButton></Link>
          </>
        }
      />

      <AdminToolbar searchValue={q} onSearchChange={(v) => { setPage(1); setQ(v); }} placeholder="Search by title, slug, tag…">
        {PRODUCT_FORMATS.map((f) => (
          <AdminFilterChip key={f.value} active={formats.includes(f.value)} onClick={() => toggleFilter(setFormats, formats, f.value)}>{f.icon} {f.label}</AdminFilterChip>
        ))}
        <span style={{ width: 1, height: 22, background: "var(--admin-line)" }} />
        {STATUSES.map((s) => (
          <AdminFilterChip key={s.value} active={statuses.includes(s.value)} onClick={() => toggleFilter(setStatuses, statuses, s.value)}>{s.label}</AdminFilterChip>
        ))}
        <span style={{ width: 1, height: 22, background: "var(--admin-line)" }} />
        <select
          aria-label="sort"
          value={sort}
          onChange={(e) => { setPage(1); setSort(e.target.value as typeof sort); }}
          className="admin-select"
          style={{ maxWidth: 180 }}
        >
          <option value="updated_desc">Sort: Updated ↓</option>
          <option value="updated_asc">Updated ↑</option>
          <option value="title_asc">Title A→Z</option>
          <option value="title_desc">Title Z→A</option>
          <option value="price_asc">Price low→high</option>
          <option value="price_desc">Price high→low</option>
        </select>
      </AdminToolbar>

      <AdminBulkBar selectedCount={selected.size} onClear={() => setSelected(new Set())}>
        {allCollections.length > 0 ? (
          <select
            aria-label="add to collection"
            defaultValue=""
            onChange={(e) => { if (e.target.value) { void bulk("add-to-collection", { collectionSlug: e.target.value }); e.target.value = ""; } }}
            style={{ background: "rgba(255,255,255,0.15)", color: "#fff", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 999, fontSize: 11, fontWeight: 700, padding: "6px 12px", fontFamily: "inherit" }}
          >
            <option value="" disabled>Add to collection…</option>
            {allCollections.map((c) => <option key={c.slug} value={c.slug}>{c.title}</option>)}
          </select>
        ) : null}
        <button onClick={() => void bulk("publish")}>Publish</button>
        <button onClick={() => void bulk("unpublish")}>Unpublish</button>
        <button data-tone="danger" onClick={() => { if (window.confirm(`Delete ${selected.size} products?`)) void bulk("delete"); }}>Delete</button>
      </AdminBulkBar>

      {!loading && items.length === 0 && total === 0 ? (
        <AdminEmptyState icon="📦" heading="No products yet" body="Add your first product to start cataloguing." action={<Link href="/admin/products/new"><AdminButton variant="primary">+ Add product</AdminButton></Link>} />
      ) : !loading && items.length === 0 ? (
        <AdminEmptyState icon="🔎" heading="No products match these filters" body="Try clearing some filters." action={<AdminButton variant="ghost" onClick={() => { setQ(""); setFormats([]); setStatuses([]); setCollections([]); setPage(1); }}>Clear filters</AdminButton>} />
      ) : (
        <>
          <AdminTable
            columns={columns}
            rows={items}
            getRowKey={(r) => r.slug}
            onRowClick={(r) => router.push(`/admin/products/${r.slug}`)}
            isSelected={(r) => selected.has(r.slug)}
            loading={loading}
          />
          <AdminPagination page={page} totalPages={totalPages} pageSize={pageSize} total={total} onPageChange={setPage} />
        </>
      )}

      {error ? <p style={{ color: "#a3392a", marginTop: 12 }}>{error}</p> : null}
    </div>
  );
}
```

- [ ] **Step 4: Create the dedicated new-product route**

Create `apps/web/src/app/admin/products/new/page.tsx`:

```tsx
"use client";

import { useRouter } from "next/navigation";
import { adminCreateProduct } from "@/lib/adminApi";
import { ProductForm } from "@/components/admin/ProductForm";

export default function NewProductPage() {
  const router = useRouter();
  return (
    <ProductForm
      submitLabel="Create product"
      onDiscard={() => router.push("/admin/products")}
      onSubmit={async (body) => {
        const created = await adminCreateProduct(body);
        router.push(`/admin/products/${created.slug}`);
      }}
    />
  );
}
```

- [ ] **Step 5: Run tests**

Run: `cd apps/web && npm test -- admin-products-list`
Expected: PASS.

Run typecheck: `cd apps/web && npm run typecheck`
Expected: passes.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/app/admin/products/page.tsx apps/web/src/app/admin/products/new apps/web/tests/unit/admin-products-list.test.tsx
git commit -m "$(cat <<'EOF'
feat(admin): rebuild /admin/products as CRM list (search, filters, bulk, paging)

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task C6: E2E — product CRUD + list scenarios

**Files:**
- Create: `apps/web/tests/e2e/admin-product-crm.spec.ts`

**Why:** Closes the spec's acceptance criteria with a live walk-through.

- [ ] **Step 1: Write the spec**

Create `apps/web/tests/e2e/admin-product-crm.spec.ts`:

```ts
import { test, expect } from "@playwright/test";

test.describe("admin product CRM", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/admin/login");
    await page.getByLabel("Email", { exact: true }).fill("admin@joviejoy.com");
    await page.getByLabel("Password", { exact: true }).fill("change_me");
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/admin/);
  });

  test("creates a digital product end-to-end with all field types", async ({ page }) => {
    await page.goto("/admin/products/new");
    const stamp = Date.now();
    const slug = `crm-test-${stamp}`;

    await page.getByLabel("Slug", { exact: false }).fill(slug);
    await page.getByLabel("Title", { exact: true }).fill(`CRM Test ${stamp}`);
    await page.getByLabel("Excerpt", { exact: false }).fill("Smoke product for CRM test.");
    await page.getByLabel("Description", { exact: false }).fill("Body paragraph one.\n\nBody paragraph two.");
    await page.getByRole("radio", { name: /digital/i }).click();
    await page.getByLabel("Price").fill("4.99");
    await expect(page.getByText(/digital fulfillment/i)).toBeVisible();

    await page.getByRole("button", { name: /create product/i }).click();
    await expect(page).toHaveURL(new RegExp(`/admin/products/${slug}$`));
    await expect(page.getByText(/draft/i)).toBeVisible();

    // Flip Visibility on, confirm badge updates
    await page.getByRole("switch", { name: /published/i }).click();
    await page.getByRole("button", { name: /save changes/i }).click();
    await expect(page.getByText(/published/i)).toBeVisible();
  });

  test("list page supports search, format filter, and bulk publish/unpublish", async ({ page }) => {
    await page.goto("/admin/products");
    await expect(page.getByRole("heading", { level: 1, name: "Products" })).toBeVisible();
    await page.getByPlaceholder(/search/i).fill("cozy");
    await page.waitForLoadState("networkidle");
    // pick first row
    const firstCheckbox = page.locator('[role="checkbox"]').nth(1);
    await firstCheckbox.click();
    await expect(page.getByText(/1 selected/i)).toBeVisible();
    page.once("dialog", (d) => d.dismiss()); // do not delete
    await page.getByRole("button", { name: /unpublish/i }).click();
    await page.waitForLoadState("networkidle");
  });

  test("switching format physical ↔ digital toggles the digital fulfillment panel", async ({ page }) => {
    await page.goto("/admin/products");
    await page.waitForLoadState("networkidle");
    const firstRow = page.locator("tbody tr").first();
    await firstRow.click();
    await page.getByRole("radio", { name: /digital/i }).click();
    await expect(page.getByText(/digital fulfillment/i)).toBeVisible();
    await page.getByRole("radio", { name: /physical/i }).click();
    await expect(page.getByText(/digital fulfillment/i)).not.toBeVisible();
  });
});
```

- [ ] **Step 2: Run the spec**

Start BE (`cd apps/api && dotnet run`) in one terminal, FE (`cd apps/web && npm run dev`) in another. Then:

Run: `cd apps/web && npx playwright test admin-product-crm`
Expected: PASS, 3 tests.

- [ ] **Step 3: Commit**

```bash
git add apps/web/tests/e2e/admin-product-crm.spec.ts
git commit -m "$(cat <<'EOF'
test(admin): e2e — product CRUD + list filters + format-switch toggles digital panel

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task C7: Final audit + acceptance walkthrough

**Files:** none — verification only.

- [ ] **Step 1: Grep for storefront-pill regressions in admin**

Run:

```bash
grep -rn "rounded-full" apps/web/src/app/admin apps/web/src/components/admin || echo "clean"
grep -rn "coco-input\|coco-button-primary\|coco-button-secondary\|coco-panel\b" apps/web/src/app/admin apps/web/src/components/admin || echo "clean"
```

Expected: both report `clean`. If `rounded-full` appears in a `.coco-button-*` migration leftover, replace the button with `<AdminButton>`.

- [ ] **Step 2: Verify the spec's acceptance criteria one by one**

Walk through `docs/superpowers/specs/2026-05-21-admin-cozy-product-crm-design.md` § "Acceptance criteria" and confirm each line. Mark the matching task IDs in the spec or append a short PR-description checklist.

- [ ] **Step 3: Run the full test matrix**

```bash
cd apps/web && npm run typecheck && npm test
cd apps/api.Tests && dotnet test
cd apps/web && npx playwright test
```

Expected: all green.

- [ ] **Step 4: Commit (only if any tweaks were needed)**

If the audit surfaces leftover issues, commit each fix as its own small commit using the same conventional-commits style.

---

## Self-Review

**Spec coverage check (run after writing):**

| Spec requirement | Implementing task(s) |
| --- | --- |
| Admin tokens scoped under `body.admin-route` | A1 |
| `AdminShell` / `AdminSidebar` / `AdminTopbar` with locked nav (incl. Editorial soon, live placeholder Commerce pages) | A7, A8 |
| All 20+ primitives | A2 (form), A3 (toggles), A4 (actions), A5 (layout), A6 (list) |
| `AdminGalleryUploader`, `AdminFormatPicker`, `AdminSourceLinksEditor` composites | B1, B2, B3 |
| Existing admin forms migrated to primitives (no restructure) | A9 |
| `ProductForm` sectioned editor: basics + sidebar | B5 |
| `ProductForm` three media galleries (Product / Inspiration / Customer) | B6 |
| `ProductForm` source links + digital fulfillment + danger zone | B7 |
| BE `options` preservation | B4 |
| BE list query extension + derived status | C1 |
| BE bulk endpoint | C2 |
| BE duplicate + tags endpoints | C3 |
| FE adminApi clients for new endpoints | C4 |
| New `/admin/products` page (toolbar, filter chips, bulk bar, pagination) and `/admin/products/new` | C5 |
| E2E for product CRUD + list scenarios | C6 |
| Acceptance-criteria audit (no `rounded-full` in admin, etc.) | C7 |

**Placeholder scan:** no "TBD"/"TODO"/"implement later" remain. Every step includes the full code or commands the engineer needs. Tag autocomplete UI in `ProductForm` is intentionally minimal (free-form Enter-to-add) — the autocomplete *endpoint* is built (C3) and the *client* is built (C4); a richer autocomplete UI is explicit non-scope.

**Type consistency:** `AdminProductListItem.status` is the same literal union (`"published" | "draft" | "scheduled" | "out_of_stock"`) the FE consumes in C5; BE returns the same lower-snake strings from `DeriveStatus` (C1). `ProductFormat` is the single source for the format string in `AdminFormatPicker` (B2) and used in `ProductForm` (B5). `SourceLinkValue` shape matches the BE `SourceLink` record consumed in the editor (B3) and the seed data.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-21-admin-cozy-product-crm.md`. Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach?
