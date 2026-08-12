using JovieJoy.Api.Data;
namespace JovieJoy.Api.Infrastructure;

/// <summary>
/// Serializes authenticated admin mutations while they update CMS references and
/// remove newly orphaned upload files. The process gate covers non-relational tests
/// and same-instance requests; PostgreSQL's session advisory lock extends the same
/// critical section across API replicas.
/// </summary>
public sealed class AdminMutationLockMiddleware(RequestDelegate next)
{
    public async Task InvokeAsync(HttpContext context, AppDbContext db)
    {
        if (!IsAdminMutation(context.Request))
        {
            await next(context);
            return;
        }

        await using var lease = await CmsMutationCoordination.AcquireAsync(db, context.RequestAborted);
        await next(context);
    }

    private static bool IsAdminMutation(HttpRequest request) =>
        request.Path.StartsWithSegments("/api/admin") &&
        (HttpMethods.IsPost(request.Method) ||
         HttpMethods.IsPut(request.Method) ||
         HttpMethods.IsPatch(request.Method) ||
         HttpMethods.IsDelete(request.Method));
}
