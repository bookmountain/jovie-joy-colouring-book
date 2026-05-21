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
  test("renders children alongside search", () => {
    render(<AdminToolbar searchValue="" onSearchChange={() => {}}><span>extra</span></AdminToolbar>);
    expect(screen.getByText("extra")).toBeTruthy();
  });
  test("input gets aria-label from searchAriaLabel prop, else falls back to placeholder", () => {
    const { rerender } = render(<AdminToolbar searchValue="" onSearchChange={() => {}} placeholder="P" />);
    expect((screen.getByPlaceholderText("P") as HTMLInputElement).getAttribute("aria-label")).toBe("P");
    rerender(<AdminToolbar searchValue="" onSearchChange={() => {}} placeholder="P" searchAriaLabel="Search products" />);
    expect((screen.getByPlaceholderText("P") as HTMLInputElement).getAttribute("aria-label")).toBe("Search products");
  });
});

describe("AdminFilterChip", () => {
  test("active state and count badge", () => {
    render(<AdminFilterChip active count={3}>Format</AdminFilterChip>);
    const chip = screen.getByText("Format").closest("button")!;
    expect(chip.getAttribute("data-state")).toBe("on");
    expect(screen.getByText("3")).toBeTruthy();
  });
  test("count omitted when 0 or undefined", () => {
    const { rerender, container } = render(<AdminFilterChip>Format</AdminFilterChip>);
    expect(container.querySelector(".count")).toBeNull();
    rerender(<AdminFilterChip count={0}>Format</AdminFilterChip>);
    expect(container.querySelector(".count")).toBeNull();
  });
});

describe("AdminBulkBar", () => {
  test("returns null when selectedCount=0", () => {
    const { container } = render(<AdminBulkBar selectedCount={0} onClear={() => {}} />);
    expect(container.firstChild).toBeNull();
  });
  test("visible with actions when count>0", () => {
    render(
      <AdminBulkBar selectedCount={3} onClear={() => {}}>
        <button>Publish</button>
      </AdminBulkBar>,
    );
    expect(screen.getByText("3 selected")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Publish" })).toBeTruthy();
  });
  test("dismiss button fires onClear", () => {
    const onClear = vi.fn();
    render(<AdminBulkBar selectedCount={2} onClear={onClear} />);
    fireEvent.click(screen.getByRole("button", { name: /clear selection/i }));
    expect(onClear).toHaveBeenCalled();
  });
});

describe("AdminTable", () => {
  test("renders header and body rows with default render", () => {
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
  test("uses custom render when provided", () => {
    render(
      <AdminTable
        columns={[{ key: "title", label: "Title", render: (r) => <b>{r.title}</b> }]}
        rows={[{ id: "a", title: "Alpha" }]}
        getRowKey={(r) => r.id}
      />,
    );
    expect(screen.getByText("Alpha").tagName).toBe("B");
  });
  test("row click fires onRowClick", () => {
    const onRowClick = vi.fn();
    render(
      <AdminTable
        columns={[{ key: "title", label: "Title" }]}
        rows={[{ id: "a", title: "Alpha" }]}
        getRowKey={(r) => r.id}
        onRowClick={onRowClick}
      />,
    );
    fireEvent.click(screen.getByText("Alpha"));
    expect(onRowClick).toHaveBeenCalledWith({ id: "a", title: "Alpha" });
  });
  test("isSelected marks the row data-selected=true", () => {
    render(
      <AdminTable
        columns={[{ key: "title", label: "Title" }]}
        rows={[{ id: "a", title: "Alpha" }, { id: "b", title: "Beta" }]}
        getRowKey={(r) => r.id}
        isSelected={(r) => r.id === "b"}
      />,
    );
    const rows = screen.getAllByRole("row");
    // rows[0] is header; rows[1] is "a"; rows[2] is "b"
    expect(rows[1].getAttribute("data-selected")).toBeNull();
    expect(rows[2].getAttribute("data-selected")).toBe("true");
  });
  test("sortable header click fires onSort", () => {
    const onSort = vi.fn();
    render(
      <AdminTable
        columns={[{ key: "title", label: "Title", sortable: true }]}
        rows={[]}
        getRowKey={() => ""}
        onSort={onSort}
      />,
    );
    fireEvent.click(screen.getByRole("columnheader", { name: /title/i }));
    expect(onSort).toHaveBeenCalledWith("title");
  });
  test("loading state renders skeleton rows", () => {
    const { container } = render(
      <AdminTable
        columns={[{ key: "title", label: "Title" }]}
        rows={[]}
        getRowKey={() => ""}
        loading
      />,
    );
    expect(container.querySelectorAll(".skeleton-row")).toHaveLength(5);
  });
  test("rows with onRowClick are keyboard-accessible (Enter/Space fire onRowClick)", () => {
    const onRowClick = vi.fn();
    const { container } = render(
      <AdminTable
        columns={[{ key: "title", label: "Title" }]}
        rows={[{ id: "a", title: "Alpha" }]}
        getRowKey={(r) => r.id}
        onRowClick={onRowClick}
      />,
    );
    // Get the data row (skip header)
    const rows = container.querySelectorAll("tbody tr");
    expect(rows.length).toBe(1);
    const row = rows[0] as HTMLTableRowElement;
    expect(row.getAttribute("role")).toBe("button");
    expect(row.getAttribute("tabindex")).toBe("0");
    fireEvent.keyDown(row, { key: "Enter" });
    expect(onRowClick).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(row, { key: " " });
    expect(onRowClick).toHaveBeenCalledTimes(2);
  });
  test("rows without onRowClick are not keyboard-activatable", () => {
    const { container } = render(
      <AdminTable
        columns={[{ key: "title", label: "Title" }]}
        rows={[{ id: "a", title: "Alpha" }]}
        getRowKey={(r) => r.id}
      />,
    );
    // Get the data row (skip header)
    const rows = container.querySelectorAll("tbody tr");
    expect(rows.length).toBe(1);
    const row = rows[0] as HTMLTableRowElement;
    expect(row.getAttribute("role")).toBeNull();
    expect(row.getAttribute("tabindex")).toBeNull();
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
  test("Prev disabled on page 1; Next disabled on last page", () => {
    const { rerender } = render(<AdminPagination page={1} totalPages={3} pageSize={25} total={70} onPageChange={() => {}} />);
    expect((screen.getByRole("button", { name: /prev/i }) as HTMLButtonElement).disabled).toBe(true);
    rerender(<AdminPagination page={3} totalPages={3} pageSize={25} total={70} onPageChange={() => {}} />);
    expect((screen.getByRole("button", { name: /next/i }) as HTMLButtonElement).disabled).toBe(true);
  });
  test("info shows 0–0 of 0 when total=0", () => {
    render(<AdminPagination page={1} totalPages={1} pageSize={25} total={0} onPageChange={() => {}} />);
    expect(screen.getByText(/Showing 0–0 of 0/)).toBeTruthy();
  });
});
