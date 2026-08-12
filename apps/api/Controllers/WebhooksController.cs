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
                if (stripeEvent.Data.Object is Session completedSession &&
                    completedSession.PaymentStatus != "paid")
                {
                    log.LogInformation(
                        "Checkout session {SessionId} completed with payment status {PaymentStatus}; awaiting settlement",
                        completedSession.Id,
                        completedSession.PaymentStatus);
                    break;
                }
                goto case "checkout.session.async_payment_succeeded";

            case "checkout.session.async_payment_succeeded":
                if (stripeEvent.Data.Object is Session session)
                {
                    var orderId = session.Metadata is not null &&
                                  session.Metadata.TryGetValue("order_id", out var rawOrderId) &&
                                  Guid.TryParse(rawOrderId, out var parsedOrderId)
                        ? parsedOrderId
                        : (Guid?)null;
                    var handled = await orders.MarkPaidAsync(
                        session.Id,
                        session.PaymentIntentId,
                        session.AmountTotal,
                        orderId,
                        ct);
                    if (!handled)
                    {
                        log.LogError("Paid Stripe session {SessionId} could not be matched to an order", session.Id);
                        return StatusCode(StatusCodes.Status503ServiceUnavailable);
                    }
                    log.LogInformation("Order marked paid for session {SessionId}", session.Id);
                }
                break;

            case "checkout.session.async_payment_failed":
                if (stripeEvent.Data.Object is Session failedSession)
                    await orders.MarkPaymentFailedAsync(failedSession.Id, ct);
                log.LogWarning("Async payment failed: {EventId}", stripeEvent.Id);
                break;

            case "charge.refunded":
                if (stripeEvent.Data.Object is Charge charge && !string.IsNullOrWhiteSpace(charge.PaymentIntentId))
                {
                    if (!await orders.MarkRefundedByPaymentIntentAsync(charge.PaymentIntentId, ct))
                        return StatusCode(StatusCodes.Status503ServiceUnavailable);
                }
                break;

            case "charge.dispute.created":
                if (stripeEvent.Data.Object is Dispute dispute && !string.IsNullOrWhiteSpace(dispute.PaymentIntentId))
                {
                    if (!await orders.MarkRefundedByPaymentIntentAsync(dispute.PaymentIntentId, ct))
                        return StatusCode(StatusCodes.Status503ServiceUnavailable);
                }
                break;

            default:
                log.LogDebug("Unhandled Stripe event {Type}", stripeEvent.Type);
                break;
        }

        return Ok();
    }
}
