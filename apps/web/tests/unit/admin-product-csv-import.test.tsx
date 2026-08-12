import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProductCsvImportDialog } from "@/components/admin/product/ProductCsvImportDialog";

const importMock = vi.fn();

vi.mock("@/lib/adminApi", () => ({
  adminImportProductsCsv: (...args: unknown[]) => importMock(...args),
}));

const preview = {
  valid: true,
  dryRun: true,
  mode: "create" as const,
  totalRows: 2,
  createCount: 2,
  updateCount: 0,
  importedCount: 0,
  errors: [],
  rows: [
    { rowNumber: 2, slug: "alpha", title: "Alpha", action: "create" as const, errors: [] },
    { rowNumber: 3, slug: "beta", title: "Beta", action: "create" as const, errors: [] },
  ],
};

describe("ProductCsvImportDialog", () => {
  beforeEach(() => importMock.mockReset());

  it("previews a CSV before enabling the all-or-nothing import and reports completion", async () => {
    const imported = vi.fn();
    importMock
      .mockResolvedValueOnce(preview)
      .mockResolvedValueOnce({ ...preview, dryRun: false, importedCount: 2 });
    render(<ProductCsvImportDialog open onClose={() => {}} onImported={imported} />);
    const file = new File(["slug,title,price_cents,product_type\na,A,100,physical"], "products.csv", { type: "text/csv" });

    fireEvent.change(screen.getByLabelText("CSV file"), { target: { files: [file] } });

    await waitFor(() => expect(importMock).toHaveBeenCalledWith(file, "create", true));
    expect(await screen.findByText("Ready: 2 to create and 0 to update.")).toBeInTheDocument();
    const importButton = screen.getByRole("button", { name: "Import 2 products" });
    expect(importButton).toBeEnabled();

    fireEvent.click(importButton);

    await waitFor(() => expect(importMock).toHaveBeenLastCalledWith(file, "create", false));
    expect(await screen.findByText("Imported 2 products.")).toBeInTheDocument();
    expect(imported).toHaveBeenCalledWith(2);
  });

  it("shows structured row errors and keeps import disabled", async () => {
    importMock.mockResolvedValue({
      ...preview,
      valid: false,
      createCount: 0,
      rows: [{ rowNumber: 2, slug: "bad", title: "Bad", action: "invalid", errors: ["price_cents must be a whole number."] }],
    });
    render(<ProductCsvImportDialog open onClose={() => {}} onImported={() => {}} />);
    const file = new File(["bad"], "products.csv", { type: "text/csv" });

    fireEvent.change(screen.getByLabelText("CSV file"), { target: { files: [file] } });

    expect(await screen.findByText(/Validation failed/)).toBeInTheDocument();
    expect(screen.getByText("price_cents must be a whole number.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Import 2 products" })).toBeDisabled();
  });

  it("rejects a file over 2 MB before making a request", async () => {
    render(<ProductCsvImportDialog open onClose={() => {}} onImported={() => {}} />);
    const file = new File([new Uint8Array(2 * 1024 * 1024 + 1)], "products.csv", { type: "text/csv" });

    fireEvent.change(screen.getByLabelText("CSV file"), { target: { files: [file] } });

    expect(await screen.findByRole("alert")).toHaveTextContent("2 MB or smaller");
    expect(importMock).not.toHaveBeenCalled();
  });

  it("revalidates the selected file when switching to create or update", async () => {
    importMock.mockResolvedValue(preview);
    render(<ProductCsvImportDialog open onClose={() => {}} onImported={() => {}} />);
    const file = new File(["csv"], "products.csv", { type: "text/csv" });
    fireEvent.change(screen.getByLabelText("CSV file"), { target: { files: [file] } });
    await waitFor(() => expect(importMock).toHaveBeenCalledWith(file, "create", true));

    fireEvent.change(screen.getByRole("combobox", { name: "Import behavior" }), { target: { value: "upsert" } });

    await waitFor(() => expect(importMock).toHaveBeenLastCalledWith(file, "upsert", true));
  });

  it("prevents closing while validation is busy and restores close after it finishes", async () => {
    let resolvePreview: (value: typeof preview) => void = () => {};
    importMock.mockReturnValue(new Promise<typeof preview>((resolve) => { resolvePreview = resolve; }));
    const close = vi.fn();
    render(<ProductCsvImportDialog open onClose={close} onImported={() => {}} />);
    const file = new File(["csv"], "products.csv", { type: "text/csv" });

    fireEvent.change(screen.getByLabelText("CSV file"), { target: { files: [file] } });
    await waitFor(() => expect(screen.getByText(/Validating products\.csv/)).toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(close).not.toHaveBeenCalled();

    resolvePreview(preview);
    await waitFor(() => expect(screen.getByRole("button", { name: "Cancel" })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(close).toHaveBeenCalledTimes(1);
  });
});
