using JovieJoy.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Stripe;
using Stripe.Checkout;

namespace JovieJoy.Api.Controllers;

[ApiController]
[Route("webhooks")]
public class WebhooksController(
    IOrderService orders,
    IConfiguration config,
    ILogger<WebhooksController> log) : ControllerBase
{
    [HttpPost("stripe")]
    public async Task<IActionResult> Stripe(CancellationToken ct)
    {
        var secret = config["Stripe:WebhookSecret"]
            ?? throw new InvalidOperationException("Stripe__WebhookSecret not configured");

        string payload;
        using (var reader = new StreamReader(Request.Body))
            payload = await reader.ReadToEndAsync(ct);

        Event stripeEvent;
        try
        {
            stripeEvent = EventUtility.ConstructEvent(
                payload,
                Request.Headers["Stripe-Signature"],
                secret);
        }
        catch (StripeException ex)
        {
            log.LogWarning(ex, "Stripe webhook signature verification failed");
            return BadRequest();
        }

        switch (stripeEvent.Type)
        {
            case "checkout.session.completed":
            case "checkout.session.async_payment_succeeded":
                if (stripeEvent.Data.Object is Session session)
                {
                    await orders.MarkPaidAsync(session.Id, session.PaymentIntentId, ct);
                    log.LogInformation("Order marked paid for session {SessionId}", session.Id);
                }
                break;

            case "checkout.session.async_payment_failed":
                log.LogWarning("Async payment failed: {EventId}", stripeEvent.Id);
                break;

            default:
                log.LogDebug("Unhandled Stripe event {Type}", stripeEvent.Type);
                break;
        }

        return Ok();
    }
}
