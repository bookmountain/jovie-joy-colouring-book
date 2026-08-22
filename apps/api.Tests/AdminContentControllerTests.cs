using System;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Threading.Tasks;
using Xunit;

namespace JovieJoy.Api.Tests;

public class AdminContentControllerTests : IClassFixture<ApiFactory>
{
    private readonly ApiFactory _f;
    public AdminContentControllerTests(ApiFactory f) => _f = f;

    [Fact]
    public async Task Upsert_then_update_then_delete_roundtrip()
    {
        var client = await _f.CreateAdminClientAsync();
        var key = $"test.block.{Guid.NewGuid():N}";

        // Upsert creates the block.
        var create = await client.PutAsJsonAsync($"/api/admin/content/{key}", new
        {
            type = "HomeVideo",
            data = new { title = "Original" },
            sortIndex = 0,
        });
        create.EnsureSuccessStatusCode();

        // Upsert again updates it.
        var update = await client.PutAsJsonAsync($"/api/admin/content/{key}", new
        {
            type = "HomeVideo",
            data = new { title = "Renamed" },
            sortIndex = 3,
        });
        update.EnsureSuccessStatusCode();

        var got = await client.GetFromJsonAsync<JsonElement>($"/api/admin/content/{key}");
        Assert.Equal(3, got.GetProperty("sortIndex").GetInt32());
        Assert.Equal("Renamed", got.GetProperty("data").GetProperty("title").GetString());

        var del = await client.DeleteAsync($"/api/admin/content/{key}");
        Assert.Equal(HttpStatusCode.NoContent, del.StatusCode);
        var after = await client.GetAsync($"/api/admin/content/{key}");
        Assert.Equal(HttpStatusCode.NotFound, after.StatusCode);
    }

    [Theory]
    [InlineData("HomeHero")]
    [InlineData("AboutSection")]
    [InlineData("FaqEntry")]
    [InlineData("FooterGroup")]
    [InlineData("FeaturedOn")]
    public async Task Retired_content_types_cannot_be_written(string type)
    {
        var client = await _f.CreateAdminClientAsync();
        var key = $"retired.block.{Guid.NewGuid():N}";

        var response = await client.PutAsJsonAsync($"/api/admin/content/{key}", new
        {
            type,
            data = new { title = "Ignored" },
            sortIndex = 0,
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains("retired", body, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task Video_upload_accepts_a_valid_mp4_and_rejects_mismatched_bytes()
    {
        var client = await _f.CreateAdminClientAsync();
        var key = $"video.block.{Guid.NewGuid():N}";

        // Minimal MP4: an 8-byte box whose type at offset 4 is "ftyp".
        var mp4 = new byte[] { 0x00, 0x00, 0x00, 0x08, (byte)'f', (byte)'t', (byte)'y', (byte)'p', 0x69, 0x73, 0x6f, 0x6d };
        using (var form = new MultipartFormDataContent())
        {
            var part = new ByteArrayContent(mp4);
            part.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue("video/mp4");
            form.Add(part, "file", "clip.mp4");
            var ok = await client.PostAsync($"/api/admin/content/{key}/video", form);
            ok.EnsureSuccessStatusCode();
            var body = await ok.Content.ReadFromJsonAsync<JsonElement>();
            var url = body.GetProperty("url").GetString();
            Assert.NotNull(url);
            Assert.StartsWith("/uploads/content/", url);
            Assert.EndsWith(".mp4", url);
        }

        using (var form = new MultipartFormDataContent())
        {
            var part = new ByteArrayContent(new byte[] { 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12 });
            part.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue("video/mp4");
            form.Add(part, "file", "clip.mp4");
            var bad = await client.PostAsync($"/api/admin/content/{key}/video", form);
            Assert.Equal(HttpStatusCode.BadRequest, bad.StatusCode);
        }

        using (var form = new MultipartFormDataContent())
        {
            var part = new ByteArrayContent(mp4);
            part.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue("video/mp4");
            form.Add(part, "file", "clip.avi");
            var wrongExtension = await client.PostAsync($"/api/admin/content/{key}/video", form);
            Assert.Equal(HttpStatusCode.BadRequest, wrongExtension.StatusCode);
        }
    }

    [Fact]
    public async Task Chunked_video_upload_reassembles_sequential_chunks()
    {
        var client = await _f.CreateAdminClientAsync();
        var key = $"video.block.{Guid.NewGuid():N}";

        var start = await client.PostAsync($"/api/admin/content/{key}/video/chunk-sessions", null);
        start.EnsureSuccessStatusCode();
        var uploadId = (await start.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("uploadId").GetString();
        Assert.False(string.IsNullOrEmpty(uploadId));

        var mp4 = new byte[] { 0x00, 0x00, 0x00, 0x08, (byte)'f', (byte)'t', (byte)'y', (byte)'p', 0x69, 0x73, 0x6f, 0x6d, 0xaa, 0xbb };
        var first = mp4[..8];
        var second = mp4[8..];

        async Task<HttpResponseMessage> SendChunk(byte[] bytes, long offset)
        {
            using var form = new MultipartFormDataContent();
            form.Add(new ByteArrayContent(bytes), "file", "chunk.bin");
            form.Add(new StringContent(offset.ToString()), "offset");
            return await client.PostAsync($"/api/admin/content/{key}/video/chunk-sessions/{uploadId}", form);
        }

        (await SendChunk(first, 0)).EnsureSuccessStatusCode();

        // A wrong offset (stale retry) is rejected instead of corrupting the file.
        Assert.Equal(HttpStatusCode.BadRequest, (await SendChunk(second, 0)).StatusCode);

        (await SendChunk(second, first.Length)).EnsureSuccessStatusCode();

        var complete = await client.PostAsJsonAsync(
            $"/api/admin/content/{key}/video/chunk-sessions/{uploadId}/complete",
            new { fileName = "clip.mp4", contentType = "video/mp4" });
        complete.EnsureSuccessStatusCode();
        var url = (await complete.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("url").GetString();
        Assert.NotNull(url);
        Assert.StartsWith("/uploads/content/", url);
        Assert.EndsWith(".mp4", url);

        // Completing twice fails — the session file has been moved into place.
        var again = await client.PostAsJsonAsync(
            $"/api/admin/content/{key}/video/chunk-sessions/{uploadId}/complete",
            new { fileName = "clip.mp4", contentType = "video/mp4" });
        Assert.Equal(HttpStatusCode.BadRequest, again.StatusCode);
    }

    [Fact]
    public async Task Requires_admin_auth()
    {
        var anon = _f.CreateClient();
        Assert.Equal(HttpStatusCode.Unauthorized, (await anon.GetAsync("/api/admin/content")).StatusCode);
    }
}
