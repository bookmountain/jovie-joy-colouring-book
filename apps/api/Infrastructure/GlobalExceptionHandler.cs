using Microsoft.AspNetCore.Diagnostics;

namespace JovieJoy.Api.Infrastructure;

/// <summary>
/// Catches any unhandled exception, logs the full detail server-side (so it shows up
/// in the API container logs), and returns a small JSON body the frontend can display.
/// Without this, ASP.NET returns a bare 500 with an empty body in Production — which is
/// why admin saves failed with "only 500, no message".
/// </summary>
public sealed class GlobalExceptionHandler(ILogger<GlobalExceptionHandler> logger) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext ctx, Exception ex, CancellationToken ct)
    {
        var traceId = ctx.TraceIdentifier;
        logger.LogError(
            ex,
            "Unhandled exception on {Method} {Path} (traceId={TraceId})",
            ctx.Request.Method, ctx.Request.Path, traceId);

        ctx.Response.StatusCode = StatusCodes.Status500InternalServerError;
        // Surface the exception message + a traceId so admins see *something* and can
        // correlate with the server log line above. (Message only — no stack trace.)
        await ctx.Response.WriteAsJsonAsync(new
        {
            error = "The request failed on the server.",
            detail = ex.Message,
            traceId,
        }, ct);
        return true;
    }
}
