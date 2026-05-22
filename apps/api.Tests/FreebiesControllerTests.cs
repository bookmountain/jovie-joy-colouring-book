using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using JovieJoy.Api.Contracts;

namespace JovieJoy.Api.Tests;

public class FreebiesControllerTests : IClassFixture<ApiFactory>
{
    private readonly ApiFactory _factory;
    public FreebiesControllerTests(ApiFactory f) => _factory = f;

    [Fact]
    public async Task List_returns_only_published()
    {
        await _factory.SeedFreebie("pub-1", published: true);
        await _factory.SeedFreebie("draft-1", published: false);

        var client = _factory.CreateClient();
        var items = await client.GetFromJsonAsync<List<FreebieListItemDto>>("/api/freebies");

        items.Should().NotBeNull();
        items!.Should().Contain(x => x.Slug == "pub-1");
        items.Should().NotContain(x => x.Slug == "draft-1");
    }

    [Fact]
    public async Task Get_by_slug_returns_published_freebie()
    {
        await _factory.SeedFreebie("getme", published: true);
        var client = _factory.CreateClient();
        var dto = await client.GetFromJsonAsync<FreebieDto>("/api/freebies/getme");
        dto.Should().NotBeNull();
        dto!.Slug.Should().Be("getme");
    }

    [Fact]
    public async Task Get_by_slug_returns_404_when_unpublished()
    {
        await _factory.SeedFreebie("hidden", published: false);
        var client = _factory.CreateClient();
        var resp = await client.GetAsync("/api/freebies/hidden");
        resp.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }
}
