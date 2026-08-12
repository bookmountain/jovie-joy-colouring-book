using System.Buffers.Binary;
using System.IO.Compression;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using JovieJoy.Api.Contracts;
using JovieJoy.Api.Controllers;
using JovieJoy.Api.Controllers.Admin;
using JovieJoy.Api.Data;
using JovieJoy.Api.Data.Entities;
using JovieJoy.Api.Services;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace JovieJoy.Api.Tests;

public class AdminCustomerDownloadUploadSafetyTests : IClassFixture<ApiFactory>
{
    private static readonly byte[] ValidPdf = CreateValidPdf();

    private static readonly byte[] ValidPng = Convert.FromBase64String(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=");

    private readonly ApiFactory _factory;

    public AdminCustomerDownloadUploadSafetyTests(ApiFactory factory) => _factory = factory;

    [Fact]
    public async Task Product_pdf_rejects_empty_mismatched_and_malformed_files_without_changing_the_old_download()
    {
        var slug = $"safe-pdf-reject-{Guid.NewGuid():N}";
        var oldUrl = CreateUpload("pdfs", $"{slug}-old.pdf", ValidPdf);
        await SeedProduct(slug, oldUrl);
        var admin = await _factory.CreateAdminClientAsync();

        var attempts = new[]
        {
            (FileName: "book.pdf", Mime: "application/pdf", Bytes: Array.Empty<byte>()),
            (FileName: "book.txt", Mime: "application/pdf", Bytes: ValidPdf),
            (FileName: "book.pdf", Mime: "application/octet-stream", Bytes: ValidPdf),
            (FileName: "book.pdf", Mime: "application/pdf", Bytes: Encoding.ASCII.GetBytes("not a pdf at all")),
            (FileName: "book.pdf", Mime: "application/pdf", Bytes: Encoding.ASCII.GetBytes("%PDF-1.7\nmissing eof")),
            (FileName: "book.pdf", Mime: "application/pdf", Bytes: Encoding.ASCII.GetBytes("%PDF-1.7\n%%EOF\ntrailing executable bytes")),
            (FileName: "book.pdf", Mime: "application/pdf", Bytes: Encoding.ASCII.GetBytes(
                "%PDF-1.7\n1 0 obj\n<< /Type /Catalog >>\nendobj\nstartxref\n0\n%%EOF\n")),
            (FileName: "book.pdf", Mime: "application/pdf", Bytes: ValidPdf[..^12]),
        };

        foreach (var attempt in attempts)
        {
            var response = await PostFile(
                admin,
                $"/api/admin/products/{slug}/pdf",
                attempt.FileName,
                attempt.Mime,
                attempt.Bytes);
            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        }

        var product = await admin.GetFromJsonAsync<AdminProductDto>($"/api/admin/products/{slug}");
        Assert.Equal(oldUrl, product!.PdfPath);
        Assert.True(File.Exists(ToAbsolute(oldUrl)));
        Assert.Equal(
            [ToAbsolute(oldUrl)],
            Directory.GetFiles(Path.GetDirectoryName(ToAbsolute(oldUrl))!, $"{slug}*"));
    }

    [Fact]
    public async Task Product_pdf_writes_valid_file_then_updates_reference_and_cleans_unreferenced_old_file()
    {
        var slug = $"safe-pdf-success-{Guid.NewGuid():N}";
        var oldUrl = CreateUpload("pdfs", $"{slug}-old.pdf", ValidPdf);
        await SeedProduct(slug, oldUrl);
        var admin = await _factory.CreateAdminClientAsync();

        var response = await PostFile(
            admin,
            $"/api/admin/products/{slug}/pdf",
            "replacement.pdf",
            "application/pdf",
            ValidPdf);

        response.EnsureSuccessStatusCode();
        var product = await response.Content.ReadFromJsonAsync<AdminProductDto>();
        Assert.NotNull(product?.PdfPath);
        Assert.NotEqual(oldUrl, product!.PdfPath);
        Assert.EndsWith(".pdf", product.PdfPath, StringComparison.Ordinal);
        Assert.True(File.Exists(ToAbsolute(product.PdfPath!)));
        Assert.False(File.Exists(ToAbsolute(oldUrl)));
    }

    [Fact]
    public async Task Freebie_cover_requires_matching_extension_and_mime_and_preserves_shared_old_asset()
    {
        var slug = $"safe-cover-{Guid.NewGuid():N}";
        var productSlug = $"safe-cover-product-{Guid.NewGuid():N}";
        var oldUrl = CreateUpload("freebies/covers", $"{slug}-old.png", ValidPng);
        await SeedFreebie(slug, oldUrl, "");
        await SeedProduct(productSlug, null, oldUrl);
        var admin = await _factory.CreateAdminClientAsync();

        var mismatch = await PostFile(
            admin,
            $"/api/admin/freebies/{slug}/cover",
            "cover.jpg",
            "image/png",
            ValidPng);
        Assert.Equal(HttpStatusCode.BadRequest, mismatch.StatusCode);
        Assert.True(File.Exists(ToAbsolute(oldUrl)));

        var empty = await PostFile(
            admin,
            $"/api/admin/freebies/{slug}/cover",
            "cover.png",
            "image/png",
            []);
        Assert.Equal(HttpStatusCode.BadRequest, empty.StatusCode);
        Assert.True(File.Exists(ToAbsolute(oldUrl)));

        var success = await PostFile(
            admin,
            $"/api/admin/freebies/{slug}/cover",
            "cover.png",
            "image/png",
            ValidPng);
        success.EnsureSuccessStatusCode();
        var updated = await success.Content.ReadFromJsonAsync<FreebieAdminDto>();
        Assert.NotNull(updated);
        Assert.NotEqual(oldUrl, updated!.CoverImage);
        Assert.True(File.Exists(ToAbsolute(updated.CoverImage)));
        Assert.True(File.Exists(ToAbsolute(oldUrl)));

        Assert.Equal(HttpStatusCode.NoContent, (await admin.DeleteAsync($"/api/admin/freebies/{slug}")).StatusCode);
        Assert.False(File.Exists(ToAbsolute(updated.CoverImage)));
        Assert.True(File.Exists(ToAbsolute(oldUrl)));

        Assert.Equal(HttpStatusCode.NoContent, (await admin.DeleteAsync($"/api/admin/products/{productSlug}")).StatusCode);
        Assert.False(File.Exists(ToAbsolute(oldUrl)));
    }

    [Fact]
    public async Task Freebie_file_accepts_valid_pdf_and_zip_and_cleans_each_replaced_unreferenced_file()
    {
        var slug = $"safe-freebie-file-{Guid.NewGuid():N}";
        var oldUrl = CreateUpload("freebies/files", $"{slug}-old.pdf", ValidPdf);
        await SeedFreebie(slug, "", oldUrl);
        var admin = await _factory.CreateAdminClientAsync();

        var pdfResponse = await PostFile(
            admin,
            $"/api/admin/freebies/{slug}/file",
            "pages.pdf",
            "application/pdf",
            ValidPdf);
        pdfResponse.EnsureSuccessStatusCode();
        var pdf = await pdfResponse.Content.ReadFromJsonAsync<FreebieAdminDto>();
        Assert.Equal("pdf", pdf!.FileKind);
        Assert.True(File.Exists(ToAbsolute(pdf.FilePath)));
        Assert.False(File.Exists(ToAbsolute(oldUrl)));

        var zipBytes = CreateZip(("pages/readme.txt", Encoding.UTF8.GetBytes("safe archive")));
        var zipResponse = await PostFile(
            admin,
            $"/api/admin/freebies/{slug}/file",
            "pages.zip",
            "application/zip",
            zipBytes);
        zipResponse.EnsureSuccessStatusCode();
        var zip = await zipResponse.Content.ReadFromJsonAsync<FreebieAdminDto>();
        Assert.Equal("zip", zip!.FileKind);
        Assert.Equal(zipBytes.Length, zip.FileSizeBytes);
        Assert.True(File.Exists(ToAbsolute(zip.FilePath)));
        Assert.False(File.Exists(ToAbsolute(pdf.FilePath)));
    }

    [Fact]
    public async Task Freebie_file_rejects_mismatches_corruption_encryption_traversal_and_zip_bombs_without_writes()
    {
        var slug = $"safe-freebie-reject-{Guid.NewGuid():N}";
        var oldUrl = CreateUpload("freebies/files", $"{slug}-old.pdf", ValidPdf);
        await SeedFreebie(slug, "", oldUrl);
        var admin = await _factory.CreateAdminClientAsync();

        var tooManyEntries = CreateZip(Enumerable.Range(0, UploadService.MaxZipEntries + 1)
            .Select(index => ($"entry-{index}.txt", Array.Empty<byte>())).ToArray());
        var excessiveRatio = CreateZip(("huge.txt", new byte[1024 * 1024]));
        var excessiveDeclaredSize = CreateZip(("declared-too-large.txt", Encoding.UTF8.GetBytes("tiny")));
        PatchZipUncompressedSize(excessiveDeclaredSize, checked((uint)UploadService.MaxZipUncompressedBytes + 1));
        var encrypted = CreateZip(("secret.txt", Encoding.UTF8.GetBytes("secret")));
        MarkZipEncrypted(encrypted);

        var attempts = new[]
        {
            (FileName: "pages.txt", Mime: "application/pdf", Bytes: ValidPdf),
            (FileName: "pages.pdf", Mime: "application/zip", Bytes: ValidPdf),
            (FileName: "pages.pdf", Mime: "application/pdf", Bytes: Encoding.ASCII.GetBytes("%PDF-1.7\nno eof")),
            (FileName: "pages.zip", Mime: "application/zip", Bytes: Encoding.ASCII.GetBytes("PK\u0003\u0004broken")),
            (FileName: "pages.zip", Mime: "application/zip", Bytes: CreateZip(("../escape.txt", Encoding.UTF8.GetBytes("no")))),
            (FileName: "pages.zip", Mime: "application/zip", Bytes: encrypted),
            (FileName: "pages.zip", Mime: "application/zip", Bytes: tooManyEntries),
            (FileName: "pages.zip", Mime: "application/zip", Bytes: excessiveRatio),
            (FileName: "pages.zip", Mime: "application/zip", Bytes: excessiveDeclaredSize),
        };

        foreach (var attempt in attempts)
        {
            var response = await PostFile(
                admin,
                $"/api/admin/freebies/{slug}/file",
                attempt.FileName,
                attempt.Mime,
                attempt.Bytes);
            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        }

        var freebie = await admin.GetFromJsonAsync<FreebieAdminDto>($"/api/admin/freebies/{slug}");
        Assert.Equal(oldUrl, freebie!.FilePath);
        Assert.True(File.Exists(ToAbsolute(oldUrl)));
        Assert.Equal(
            [ToAbsolute(oldUrl)],
            Directory.GetFiles(Path.GetDirectoryName(ToAbsolute(oldUrl))!, $"{slug}*"));
    }

    [Fact]
    public async Task Database_failures_remove_only_new_uploads_and_restore_product_and_freebie_references()
    {
        var contentRoot = Path.Combine(
            Path.GetTempPath(),
            $"jovie-joy-upload-failure-tests-{Guid.NewGuid():N}");
        Directory.CreateDirectory(contentRoot);
        try
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase($"upload-failure-{Guid.NewGuid():N}")
                .Options;
            await using var db = new FailNextSaveDbContext(options);
            var product = NewProduct("db-failure-product", "/uploads/pdfs/original.pdf");
            var freebie = NewFreebie(
                "db-failure-freebie",
                "/uploads/freebies/covers/original.png",
                "/uploads/freebies/files/original.pdf");
            db.AddRange(product, freebie);
            await db.SaveChangesAsync();

            WriteAbsoluteUpload(contentRoot, product.PdfPath!, ValidPdf);
            WriteAbsoluteUpload(contentRoot, freebie.CoverImage, ValidPng);
            WriteAbsoluteUpload(contentRoot, freebie.FilePath, ValidPdf);

            var environment = new TestWebHostEnvironment(contentRoot);
            var uploadService = new UploadService(environment, NullLogger<UploadService>.Instance);
            var cleanup = new AssetCleanupService(db, uploadService);
            var productController = new AdminProductsController(db, uploadService, cleanup);
            var freebieController = new AdminFreebiesController(
                db,
                uploadService,
                cleanup,
                new FakeEmailSender(),
                Options.Create(new FreebiesOptions { MaxFileSizeMb = 15 }),
                NullLogger<AdminFreebiesController>.Instance);

            db.FailNextSave = true;
            await Assert.ThrowsAsync<DbUpdateException>(() => productController.UploadImage(
                product.Slug,
                FormFile(ValidPng, "replacement.png", "image/png"),
                CancellationToken.None));
            Assert.Empty(product.Images);
            var productImageDirectory = Path.Combine(contentRoot, "uploads", "products");
            Assert.Empty(Directory.Exists(productImageDirectory)
                ? Directory.GetFiles(productImageDirectory)
                : []);

            db.FailNextSave = true;
            await Assert.ThrowsAsync<DbUpdateException>(() => productController.UploadPdf(
                product.Slug,
                FormFile(ValidPdf, "replacement.pdf", "application/pdf"),
                CancellationToken.None));
            Assert.Equal("/uploads/pdfs/original.pdf", product.PdfPath);
            Assert.Single(Directory.GetFiles(Path.Combine(contentRoot, "uploads", "pdfs")));

            db.FailNextSave = true;
            await Assert.ThrowsAsync<DbUpdateException>(() => freebieController.UploadCover(
                freebie.Slug,
                FormFile(ValidPng, "replacement.png", "image/png"),
                CancellationToken.None));
            Assert.Equal("/uploads/freebies/covers/original.png", freebie.CoverImage);
            Assert.Single(Directory.GetFiles(Path.Combine(contentRoot, "uploads", "freebies", "covers")));

            db.FailNextSave = true;
            await Assert.ThrowsAsync<DbUpdateException>(() => freebieController.UploadFile(
                freebie.Slug,
                FormFile(ValidPdf, "replacement.pdf", "application/pdf"),
                CancellationToken.None));
            Assert.Equal("/uploads/freebies/files/original.pdf", freebie.FilePath);
            Assert.Equal("pdf", freebie.FileKind);
            Assert.Single(Directory.GetFiles(Path.Combine(contentRoot, "uploads", "freebies", "files")));

            db.ChangeTracker.Clear();
            var persistedProduct = await db.Products.AsNoTracking().SingleAsync(row => row.Slug == product.Slug);
            var persistedFreebie = await db.Freebies.AsNoTracking().SingleAsync(row => row.Slug == freebie.Slug);
            Assert.Equal("/uploads/pdfs/original.pdf", persistedProduct.PdfPath);
            Assert.Equal("/uploads/freebies/covers/original.png", persistedFreebie.CoverImage);
            Assert.Equal("/uploads/freebies/files/original.pdf", persistedFreebie.FilePath);
            Assert.Equal("pdf", persistedFreebie.FileKind);

            Assert.True(File.Exists(Path.Combine(contentRoot, "uploads", "pdfs", "original.pdf")));
            Assert.True(File.Exists(Path.Combine(contentRoot, "uploads", "freebies", "covers", "original.png")));
            Assert.True(File.Exists(Path.Combine(contentRoot, "uploads", "freebies", "files", "original.pdf")));
        }
        finally
        {
            if (Directory.Exists(contentRoot)) Directory.Delete(contentRoot, recursive: true);
        }
    }

    private async Task SeedProduct(string slug, string? pdfPath, string? image = null)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var product = NewProduct(slug, pdfPath);
        if (image is not null) product.Images = [image];
        db.Products.Add(product);
        await db.SaveChangesAsync();
    }

    private async Task SeedFreebie(string slug, string coverImage, string filePath)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        db.Freebies.Add(NewFreebie(slug, coverImage, filePath));
        await db.SaveChangesAsync();
    }

    private static Product NewProduct(string slug, string? pdfPath) => new()
    {
        Slug = slug,
        Title = slug,
        Excerpt = "Upload safety test",
        Description = ["Description"],
        PriceCents = 100,
        Available = true,
        ProductType = ProductType.Digital,
        Images = [],
        Options = [new ProductOption("Format", ["Default Title"])],
        Tags = [],
        PdfPath = pdfPath,
        PublishedAt = DateTime.UtcNow.AddDays(-1),
    };

    private static Freebie NewFreebie(string slug, string coverImage, string filePath) => new()
    {
        Slug = slug,
        Title = slug,
        Excerpt = "Upload safety test",
        Description = ["Description"],
        CoverImage = coverImage,
        FilePath = filePath,
        FileKind = "pdf",
        FileSizeBytes = filePath.Length > 0 ? ValidPdf.Length : 0,
        Published = true,
    };

    private string CreateUpload(string folder, string fileName, byte[] bytes)
    {
        var relative = $"/uploads/{folder}/{fileName}";
        WriteAbsoluteUpload(_factory.ContentRoot, relative, bytes);
        return relative;
    }

    private string ToAbsolute(string relative) =>
        Path.Combine(_factory.ContentRoot, relative.TrimStart('/').Replace('/', Path.DirectorySeparatorChar));

    private static void WriteAbsoluteUpload(string contentRoot, string relative, byte[] bytes)
    {
        var absolute = Path.Combine(contentRoot, relative.TrimStart('/').Replace('/', Path.DirectorySeparatorChar));
        Directory.CreateDirectory(Path.GetDirectoryName(absolute)!);
        File.WriteAllBytes(absolute, bytes);
    }

    private static async Task<HttpResponseMessage> PostFile(
        HttpClient client,
        string path,
        string fileName,
        string contentType,
        byte[] bytes)
    {
        using var multipart = new MultipartFormDataContent();
        var content = new ByteArrayContent(bytes);
        content.Headers.ContentType = new MediaTypeHeaderValue(contentType);
        multipart.Add(content, "file", fileName);
        return await client.PostAsync(path, multipart);
    }

    private static IFormFile FormFile(byte[] bytes, string fileName, string contentType)
    {
        var file = new FormFile(new MemoryStream(bytes), 0, bytes.Length, "file", fileName)
        {
            Headers = new HeaderDictionary(),
            ContentType = contentType,
        };
        return file;
    }

    private static byte[] CreateZip(params (string Name, byte[] Bytes)[] entries)
    {
        using var memory = new MemoryStream();
        using (var archive = new ZipArchive(memory, ZipArchiveMode.Create, leaveOpen: true))
        {
            foreach (var (name, bytes) in entries)
            {
                var entry = archive.CreateEntry(name, CompressionLevel.Optimal);
                using var output = entry.Open();
                output.Write(bytes);
            }
        }
        return memory.ToArray();
    }

    private static byte[] CreateValidPdf()
    {
        var pdf = new StringBuilder("%PDF-1.7\n");
        var catalogOffset = pdf.Length;
        pdf.Append("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");
        var pagesOffset = pdf.Length;
        pdf.Append("2 0 obj\n<< /Type /Pages /Count 0 /Kids [] >>\nendobj\n");
        var xrefOffset = pdf.Length;
        pdf.Append("xref\n0 3\n")
            .Append("0000000000 65535 f \n")
            .Append(catalogOffset.ToString("D10", System.Globalization.CultureInfo.InvariantCulture))
            .Append(" 00000 n \n")
            .Append(pagesOffset.ToString("D10", System.Globalization.CultureInfo.InvariantCulture))
            .Append(" 00000 n \n")
            .Append("trailer\n<< /Size 3 /Root 1 0 R >>\nstartxref\n")
            .Append(xrefOffset.ToString(System.Globalization.CultureInfo.InvariantCulture))
            .Append("\n%%EOF\n");
        return Encoding.ASCII.GetBytes(pdf.ToString());
    }

    private static void MarkZipEncrypted(byte[] bytes)
    {
        var local = FindSignature(bytes, "PK\u0003\u0004"u8);
        var central = FindSignature(bytes, "PK\u0001\u0002"u8);
        Assert.True(local >= 0 && central >= 0);
        BinaryPrimitives.WriteUInt16LittleEndian(
            bytes.AsSpan(local + 6, 2),
            (ushort)(BinaryPrimitives.ReadUInt16LittleEndian(bytes.AsSpan(local + 6, 2)) | 1));
        BinaryPrimitives.WriteUInt16LittleEndian(
            bytes.AsSpan(central + 8, 2),
            (ushort)(BinaryPrimitives.ReadUInt16LittleEndian(bytes.AsSpan(central + 8, 2)) | 1));
    }

    private static void PatchZipUncompressedSize(byte[] bytes, uint size)
    {
        var local = FindSignature(bytes, "PK\u0003\u0004"u8);
        var central = FindSignature(bytes, "PK\u0001\u0002"u8);
        Assert.True(local >= 0 && central >= 0);
        BinaryPrimitives.WriteUInt32LittleEndian(bytes.AsSpan(local + 22, 4), size);
        BinaryPrimitives.WriteUInt32LittleEndian(bytes.AsSpan(central + 24, 4), size);
    }

    private static int FindSignature(byte[] bytes, ReadOnlySpan<byte> signature)
    {
        for (var index = 0; index <= bytes.Length - signature.Length; index++)
            if (bytes.AsSpan(index, signature.Length).SequenceEqual(signature)) return index;
        return -1;
    }

    private sealed class FailNextSaveDbContext(DbContextOptions<AppDbContext> options) : AppDbContext(options)
    {
        public bool FailNextSave { get; set; }

        public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
        {
            if (!FailNextSave) return base.SaveChangesAsync(cancellationToken);
            FailNextSave = false;
            return Task.FromException<int>(new DbUpdateException("Injected persistence failure"));
        }
    }

    private sealed class TestWebHostEnvironment(string contentRoot) : IWebHostEnvironment
    {
        public string ApplicationName { get; set; } = "JovieJoy.Api.Tests";
        public IFileProvider WebRootFileProvider { get; set; } = new NullFileProvider();
        public string WebRootPath { get; set; } = contentRoot;
        public string EnvironmentName { get; set; } = "Test";
        public string ContentRootPath { get; set; } = contentRoot;
        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
    }
}
