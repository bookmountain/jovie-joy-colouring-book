using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using JovieJoy.Api.Contracts;

namespace JovieJoy.Api.Tests;

public class AdminUploadSafetyTests : IClassFixture<ApiFactory>
{
    private readonly ApiFactory _factory;

    public AdminUploadSafetyTests(ApiFactory factory) => _factory = factory;

    [Fact]
    public async Task General_upload_rejects_a_folder_outside_uploads()
    {
        var admin = await _factory.CreateAdminClientAsync();
        using var body = ImageForm("../../outside", "cover.png");

        var response = await admin.PostAsync("/api/admin/uploads", body);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.False(Directory.Exists(Path.Combine(_factory.ContentRoot, "outside")));
    }

    [Fact]
    public async Task General_upload_uses_the_verified_content_type_extension()
    {
        var admin = await _factory.CreateAdminClientAsync();
        using var body = ImageForm("safe-folder", "looks-like-html.html");

        var response = await admin.PostAsync("/api/admin/uploads", body);

        response.EnsureSuccessStatusCode();
        var upload = await response.Content.ReadFromJsonAsync<UploadResponse>();
        Assert.NotNull(upload);
        Assert.StartsWith("/uploads/safe-folder/asset_", upload!.Url);
        Assert.EndsWith(".png", upload.Url);
        Assert.True(File.Exists(Path.Combine(
            _factory.ContentRoot,
            upload.Url.TrimStart('/').Replace('/', Path.DirectorySeparatorChar))));
        var served = await admin.GetAsync(upload.Url);
        served.EnsureSuccessStatusCode();
        Assert.Equal("nosniff", Assert.Single(served.Headers.GetValues("X-Content-Type-Options")));
    }

    [Fact]
    public async Task General_upload_rejects_spoofed_image_content()
    {
        var admin = await _factory.CreateAdminClientAsync();
        using var body = ImageForm("safe-folder", "payload.png", "image/png", "<script>alert(1)</script>"u8.ToArray());

        var response = await admin.PostAsync("/api/admin/uploads", body);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Empty(Directory.Exists(Path.Combine(_factory.ContentRoot, "uploads", "safe-folder"))
            ? Directory.GetFiles(Path.Combine(_factory.ContentRoot, "uploads", "safe-folder"))
            : []);
    }

    [Fact]
    public async Task General_upload_rejects_structurally_corrupt_images_without_writes()
    {
        var admin = await _factory.CreateAdminClientAsync();
        var validPng = Convert.FromBase64String(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=");
        var badPngCrc = validPng.ToArray();
        badPngCrc[32] ^= 0xff;

        var attempts = new[]
        {
            (FileName: "bad-crc.png", Mime: "image/png", Bytes: badPngCrc),
            (FileName: "truncated.png", Mime: "image/png", Bytes: validPng[..^8]),
            (FileName: "header-only.jpg", Mime: "image/jpeg", Bytes: new byte[] { 0xff, 0xd8, 0xff, 0xd9 }),
            (FileName: "no-frame.gif", Mime: "image/gif", Bytes: "GIF89a\u0001\0\u0001\0\0\0\0;"u8.ToArray()),
            (FileName: "truncated.webp", Mime: "image/webp", Bytes: "RIFF\u0010\0\0\0WEBPVP8 \u0010\0\0\0"u8.ToArray()),
        };

        foreach (var attempt in attempts)
        {
            using var body = ImageForm("structural-rejections", attempt.FileName, attempt.Mime, attempt.Bytes);
            var response = await admin.PostAsync("/api/admin/uploads", body);
            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        }

        Assert.Empty(Directory.Exists(Path.Combine(_factory.ContentRoot, "uploads", "structural-rejections"))
            ? Directory.GetFiles(Path.Combine(_factory.ContentRoot, "uploads", "structural-rejections"))
            : []);
    }

    [Fact]
    public async Task General_upload_keeps_accepting_structurally_valid_supported_image_formats()
    {
        var admin = await _factory.CreateAdminClientAsync();
        var files = new[]
        {
            (Name: "pixel.png", Mime: "image/png", Bytes: Convert.FromBase64String(
                "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=")),
            (Name: "pixel.jpg", Mime: "image/jpeg", Bytes: Convert.FromBase64String(
                "/9j/4AAQSkZJRgABAgAAAQABAAD//gAQTGF2YzYwLjMxLjEwMgD/2wBDAAgEBAQEBAUFBQUFBQYGBgYGBgYGBgYGBgYHBwcICAgHBwcGBgcHCAgICAkJCQgICAgJCQoKCgwMCwsODg4RERT/xABMAAEBAAAAAAAAAAAAAAAAAAAABgEBAQAAAAAAAAAAAAAAAAAABgcQAQAAAAAAAAAAAAAAAAAAAAARAQAAAAAAAAAAAAAAAAAAAAD/wAARCAACAAIDASIAAhEAAxEA/9oADAMBAAIRAxEAPwCLAFF/f//Z")),
            (Name: "pixel.gif", Mime: "image/gif", Bytes: Convert.FromBase64String(
                "R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAkwBADs=")),
            (Name: "pixel.webp", Mime: "image/webp", Bytes: Convert.FromBase64String(
                "UklGRjwAAABXRUJQVlA4IDAAAADQAQCdASoCAAIAAgA0JaACdLoB+AADsAD+8Oj3/yC5YXXI1/8gP+QH/ID/+PIAAAA=")),
        };

        foreach (var file in files)
        {
            using var body = ImageForm("structural-valid-formats", file.Name, file.Mime, file.Bytes);
            var response = await admin.PostAsync("/api/admin/uploads", body);
            Assert.True(
                response.IsSuccessStatusCode,
                $"{file.Name}: {(int)response.StatusCode} {await response.Content.ReadAsStringAsync()}");
        }

        Assert.Equal(4, Directory.GetFiles(
            Path.Combine(_factory.ContentRoot, "uploads", "structural-valid-formats")).Length);
    }

    [Fact]
    public async Task General_upload_rejects_active_svg_content()
    {
        var admin = await _factory.CreateAdminClientAsync();
        using var body = ImageForm(
            "safe-folder",
            "active.svg",
            "image/svg+xml",
            "<svg xmlns='http://www.w3.org/2000/svg'><script>alert(1)</script></svg>"u8.ToArray());

        var response = await admin.PostAsync("/api/admin/uploads", body);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    private static MultipartFormDataContent ImageForm(
        string folder,
        string fileName,
        string contentType = "image/png",
        byte[]? bytes = null)
    {
        var body = new MultipartFormDataContent();
        var image = new ByteArrayContent(bytes ?? Convert.FromBase64String(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="));
        image.Headers.ContentType = new MediaTypeHeaderValue(contentType);
        body.Add(image, "file", fileName);
        body.Add(new StringContent(folder), "folder");
        return body;
    }
}
