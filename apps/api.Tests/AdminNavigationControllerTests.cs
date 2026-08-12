using System.Net;
using System.Net.Http.Json;
using JovieJoy.Api.Contracts;

namespace JovieJoy.Api.Tests;

public class AdminNavigationControllerTests : IClassFixture<ApiFactory>
{
    private readonly ApiFactory _factory;

    public AdminNavigationControllerTests(ApiFactory factory) => _factory = factory;

    [Fact]
    public async Task Replace_roundtrips_three_level_tree_into_public_bundle()
    {
        var root = Guid.NewGuid();
        var child = Guid.NewGuid();
        var grandchild = Guid.NewGuid();
        var admin = await _factory.CreateAdminClientAsync();
        var before = await admin.GetFromJsonAsync<AdminNavigationResponse>("/api/admin/navigation");

        var response = await admin.PutAsJsonAsync("/api/admin/navigation", new ReplaceAdminNavigationRequest([
            // Deliberately supply descendants first: API persistence must not depend
            // on request order or EF relationship fix-up order.
            new(grandchild, child, "Paperback", "/collections/paperback", 0),
            new(child, root, "Physical books", "/collections/physical", 0),
            new(root, null, "Books", "/products", 0),
        ], before!.Revision));

        response.EnsureSuccessStatusCode();
        var saved = await response.Content.ReadFromJsonAsync<AdminNavigationResponse>();
        Assert.Equal(3, saved!.Items.Count);
        Assert.NotEqual(before.Revision, saved.Revision);

        var publicBundle = await _factory.CreateClient()
            .GetFromJsonAsync<SiteContentBundleDto>("/api/content");
        var savedRoot = Assert.Single(publicBundle!.Navigation);
        Assert.Equal("Books", savedRoot.Label);
        var savedChild = Assert.Single(savedRoot.Children);
        Assert.Equal("Physical books", savedChild.Label);
        Assert.Equal("Paperback", Assert.Single(savedChild.Children).Label);
    }

    [Theory]
    [MemberData(nameof(InvalidTrees))]
    public async Task Replace_rejects_invalid_relationships_and_fields(
        List<AdminNavigationItemDto> items,
        string expectedError)
    {
        var admin = await _factory.CreateAdminClientAsync();
        var before = await admin.GetFromJsonAsync<AdminNavigationResponse>("/api/admin/navigation");
        var response = await admin.PutAsJsonAsync(
            "/api/admin/navigation",
            new ReplaceAdminNavigationRequest(items, before!.Revision));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains(expectedError, body, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task Navigation_requires_admin_auth()
    {
        var anonymous = _factory.CreateClient();
        Assert.Equal(HttpStatusCode.Unauthorized, (await anonymous.GetAsync("/api/admin/navigation")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await anonymous.PutAsJsonAsync(
            "/api/admin/navigation",
            new ReplaceAdminNavigationRequest([new(Guid.NewGuid(), null, "Home", "/", 0)], "stale"))).StatusCode);
    }

    [Fact]
    public async Task Replace_rejects_the_second_client_when_both_loaded_the_same_revision()
    {
        var firstClient = await _factory.CreateAdminClientAsync();
        var secondClient = await _factory.CreateAdminClientAsync();
        var firstLoad = await firstClient.GetFromJsonAsync<AdminNavigationResponse>("/api/admin/navigation");
        var secondLoad = await secondClient.GetFromJsonAsync<AdminNavigationResponse>("/api/admin/navigation");
        Assert.Equal(firstLoad!.Revision, secondLoad!.Revision);

        var firstSave = await firstClient.PutAsJsonAsync(
            "/api/admin/navigation",
            new ReplaceAdminNavigationRequest([
                new(Guid.NewGuid(), null, "First editor", "/first", 0),
            ], firstLoad.Revision));
        firstSave.EnsureSuccessStatusCode();

        var staleSave = await secondClient.PutAsJsonAsync(
            "/api/admin/navigation",
            new ReplaceAdminNavigationRequest([
                new(Guid.NewGuid(), null, "Stale editor", "/stale", 0),
            ], secondLoad.Revision));
        Assert.Equal(HttpStatusCode.Conflict, staleSave.StatusCode);
        Assert.Contains("changed since", await staleSave.Content.ReadAsStringAsync(), StringComparison.OrdinalIgnoreCase);

        var after = await firstClient.GetFromJsonAsync<AdminNavigationResponse>("/api/admin/navigation");
        Assert.Equal("First editor", Assert.Single(after!.Items).Label);
    }

    [Fact]
    public async Task Visibility_roundtrips_to_public_bundle_changes_revision_and_survives_an_older_payload()
    {
        var root = Guid.NewGuid();
        var child = Guid.NewGuid();
        var admin = await _factory.CreateAdminClientAsync();
        var before = await admin.GetFromJsonAsync<AdminNavigationResponse>("/api/admin/navigation");

        var hiddenSave = await admin.PutAsJsonAsync(
            "/api/admin/navigation",
            new ReplaceAdminNavigationRequest([
                new(root, null, "Gallery", "/pages/gallery", 0, false),
                new(child, root, "Gallery child", "/pages/gallery/child", 0, true),
            ], before!.Revision));
        hiddenSave.EnsureSuccessStatusCode();
        var hidden = await hiddenSave.Content.ReadFromJsonAsync<AdminNavigationResponse>();
        Assert.False(Assert.Single(hidden!.Items, item => item.Id == root).Enabled);
        Assert.NotEqual(before.Revision, hidden.Revision);

        var publicBundle = await _factory.CreateClient().GetFromJsonAsync<SiteContentBundleDto>("/api/content");
        var publicRoot = Assert.Single(publicBundle!.Navigation);
        Assert.False(publicRoot.Enabled);
        Assert.True(Assert.Single(publicRoot.Children).Enabled);

        // A rolling-deploy/older client omits Enabled. Existing rows keep their values.
        var oldClientSave = await admin.PutAsJsonAsync(
            "/api/admin/navigation",
            new ReplaceAdminNavigationRequest([
                new(root, null, "Gallery renamed", "/pages/gallery", 0),
                new(child, root, "Gallery child", "/pages/gallery/child", 0),
            ], hidden.Revision));
        oldClientSave.EnsureSuccessStatusCode();
        var preserved = await oldClientSave.Content.ReadFromJsonAsync<AdminNavigationResponse>();
        Assert.False(Assert.Single(preserved!.Items, item => item.Id == root).Enabled);
        Assert.True(Assert.Single(preserved.Items, item => item.Id == child).Enabled);
    }

    public static IEnumerable<object[]> InvalidTrees()
    {
        var root = Guid.NewGuid();
        var child = Guid.NewGuid();
        var grandchild = Guid.NewGuid();
        var greatGrandchild = Guid.NewGuid();
        yield return [new List<AdminNavigationItemDto>(), "at least one"];
        yield return [new List<AdminNavigationItemDto> { new(Guid.Empty, null, "Home", "/", 0) }, "non-empty id"];
        yield return [new List<AdminNavigationItemDto> { new(root, root, "Loop", "/", 0) }, "own parent"];
        yield return [new List<AdminNavigationItemDto> { new(root, child, "A", "/a", 0), new(child, root, "B", "/b", 0) }, "cycle"];
        yield return [new List<AdminNavigationItemDto> { new(root, Guid.NewGuid(), "Missing", "/", 0) }, "missing parent"];
        yield return [new List<AdminNavigationItemDto>
        {
            new(root, null, "One", "/one", 0),
            new(Guid.NewGuid(), null, "Two", "/two", 0),
        }, "unique sort"];
        yield return [new List<AdminNavigationItemDto>
        {
            new(root, null, "L1", "/1", 0),
            new(child, root, "L2", "/2", 0),
            new(grandchild, child, "L3", "/3", 0),
            new(greatGrandchild, grandchild, "L4", "/4", 0),
        }, "at most 3"];
        yield return [new List<AdminNavigationItemDto> { new(root, null, "Bad", "javascript:alert(1)", 0) }, "local path"];
        yield return [new List<AdminNavigationItemDto> { new(root, null, "Bad", "/\\evil.example", 0) }, "local path"];
        yield return [new List<AdminNavigationItemDto> { new(root, null, " ", "/", 0) }, "label"];
    }
}
