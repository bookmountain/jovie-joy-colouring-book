using JovieJoy.Api.Data;
using JovieJoy.Api.Infrastructure;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace JovieJoy.Api.Tests;

public class AdminMutationLockMiddlewareTests
{
    [Fact]
    public async Task Admin_mutations_share_one_critical_section()
    {
        var firstEntered = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        var releaseFirst = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        var calls = 0;
        var active = 0;
        var maximumActive = 0;
        var middleware = new AdminMutationLockMiddleware(async _ =>
        {
            var call = Interlocked.Increment(ref calls);
            var nowActive = Interlocked.Increment(ref active);
            maximumActive = Math.Max(maximumActive, nowActive);
            if (call == 1)
            {
                firstEntered.SetResult();
                await releaseFirst.Task;
            }
            Interlocked.Decrement(ref active);
        });

        await using var firstDb = CreateContext();
        await using var secondDb = CreateContext();
        var first = middleware.InvokeAsync(AdminMutation(HttpMethods.Post), firstDb);
        await firstEntered.Task.WaitAsync(TimeSpan.FromSeconds(2));
        var second = middleware.InvokeAsync(AdminMutation(HttpMethods.Delete), secondDb);

        await Task.Delay(50);
        Assert.Equal(1, calls);
        releaseFirst.SetResult();
        await Task.WhenAll(first, second);

        Assert.Equal(2, calls);
        Assert.Equal(1, maximumActive);
    }

    [Theory]
    [InlineData("GET", "/api/admin/products")]
    [InlineData("POST", "/api/newsletter/subscribe")]
    public async Task Read_only_or_public_requests_bypass_the_admin_mutation_gate(
        string method,
        string path)
    {
        var called = false;
        var middleware = new AdminMutationLockMiddleware(_ =>
        {
            called = true;
            return Task.CompletedTask;
        });
        await using var db = CreateContext();
        var context = new DefaultHttpContext();
        context.Request.Method = method;
        context.Request.Path = path;

        await middleware.InvokeAsync(context, db);

        Assert.True(called);
    }

    private static DefaultHttpContext AdminMutation(string method)
    {
        var context = new DefaultHttpContext();
        context.Request.Method = method;
        context.Request.Path = "/api/admin/products/example";
        return context;
    }

    private static AppDbContext CreateContext() =>
        new(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase($"admin-mutation-lock-{Guid.NewGuid():N}")
            .Options);
}
