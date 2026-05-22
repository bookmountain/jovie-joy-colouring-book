using JovieJoy.Api.Data.Entities;

namespace JovieJoy.Api.Services;

public interface IEmailSender
{
    Task SendFreebieDownloadAsync(string to, Freebie freebie, string downloadUrl, CancellationToken ct);
}
