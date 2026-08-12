namespace JovieJoy.Api.Contracts;

public record ProductCsvImportRowResult(
    int RowNumber,
    string Slug,
    string Title,
    string Action,
    List<string> Errors);

public record ProductCsvImportResponse(
    bool Valid,
    bool DryRun,
    string Mode,
    int TotalRows,
    int CreateCount,
    int UpdateCount,
    int ImportedCount,
    List<string> Errors,
    List<ProductCsvImportRowResult> Rows);
