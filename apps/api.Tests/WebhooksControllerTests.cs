using System.Security.Cryptography;
using System.Text;
using JovieJoy.Api.Contracts;
using JovieJoy.Api.Controllers;
using JovieJoy.Api.Data.Entities;
using JovieJoy.Api.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Stripe;
using Stripe.Checkout;

namespace JovieJoy.Api.Tests;

public class WebhooksControllerTests
{
    private const string WebhookSecret = "whsec_webhook_controller_tests";

    [Fact]
    public async Task CompletedPaidSessionMarksOrderPaidUsingSignedPayload()
    {
        var orderId = Guid.NewGuid();
        var orders = new RecordingOrderService();
        var stripeEvent = CreateEvent(
            "checkout.session.completed",
            CreateSession("cs_paid", "paid", "pi_paid", 1_349, orderId));

        var result = await InvokeAsync(stripeEvent, orders);

        Assert.IsType<OkResult>(result);
        var call = Assert.Single(orders.PaidCalls);
        Assert.Equal("cs_paid", call.StripeSessionId);
        Assert.Equal("pi_paid", call.PaymentIntentId);
        Assert.Equal(1_349, call.AmountTotal);
        Assert.Equal(orderId, call.OrderId);
    }

    [Fact]
    public async Task CompletedUnpaidSessionWaitsForSettlement()
    {
        var orders = new RecordingOrderService();
        var stripeEvent = CreateEvent(
            "checkout.session.completed",
            CreateSession("cs_unpaid", "unpaid", "pi_unpaid", 900, Guid.NewGuid()));

        var result = await InvokeAsync(stripeEvent, orders);

        Assert.IsType<OkResult>(result);
        Assert.Empty(orders.PaidCalls);
        Assert.Empty(orders.FailedSessionIds);
    }

    [Fact]
    public async Task AsyncPaymentSucceededMarksOrderPaid()
    {
        var orderId = Guid.NewGuid();
        var orders = new RecordingOrderService();
        var stripeEvent = CreateEvent(
            "checkout.session.async_payment_succeeded",
            CreateSession("cs_async_paid", "paid", "pi_async_paid", 2_500, orderId));

        var result = await InvokeAsync(stripeEvent, orders);

        Assert.IsType<OkResult>(result);
        var call = Assert.Single(orders.PaidCalls);
        Assert.Equal("cs_async_paid", call.StripeSessionId);
        Assert.Equal("pi_async_paid", call.PaymentIntentId);
        Assert.Equal(2_500, call.AmountTotal);
        Assert.Equal(orderId, call.OrderId);
    }

    [Fact]
    public async Task AsyncPaymentFailedMarksPendingOrderFailed()
    {
        var orders = new RecordingOrderService();
        var stripeEvent = CreateEvent(
            "checkout.session.async_payment_failed",
            CreateSession("cs_async_failed", "unpaid", "pi_async_failed", 750, Guid.NewGuid()));

        var result = await InvokeAsync(stripeEvent, orders);

        Assert.IsType<OkResult>(result);
        Assert.Equal("cs_async_failed", Assert.Single(orders.FailedSessionIds));
        Assert.Empty(orders.PaidCalls);
    }

    [Theory]
    [InlineData("charge.refunded")]
    [InlineData("charge.dispute.created")]
    public async Task RefundAndDisputeEventsUseTheirCorrectStripeObject(string eventType)
    {
        var orders = new RecordingOrderService();
        IHasObject resource = eventType == "charge.refunded"
            ? new Charge { Id = "ch_refunded", Object = "charge", PaymentIntentId = "pi_refunded" }
            : new Dispute { Id = "dp_created", Object = "dispute", PaymentIntentId = "pi_refunded" };
        var stripeEvent = CreateEvent(eventType, resource);

        var result = await InvokeAsync(stripeEvent, orders);

        Assert.IsType<OkResult>(result);
        Assert.Equal("pi_refunded", Assert.Single(orders.RefundedPaymentIntentIds));
    }

    [Theory]
    [InlineData("checkout.session.completed")]
    [InlineData("checkout.session.async_payment_succeeded")]
    public async Task UnmatchedSuccessfulPaymentReturnsRetryableStatus(string eventType)
    {
        var orders = new RecordingOrderService { PaidResult = false };
        var stripeEvent = CreateEvent(
            eventType,
            CreateSession("cs_missing", "paid", "pi_missing", 1_000, Guid.NewGuid()));

        var result = await InvokeAsync(stripeEvent, orders);

        var status = Assert.IsType<StatusCodeResult>(result);
        Assert.Equal(StatusCodes.Status503ServiceUnavailable, status.StatusCode);
        Assert.Single(orders.PaidCalls);
    }

    [Theory]
    [InlineData("charge.refunded")]
    [InlineData("charge.dispute.created")]
    public async Task UnmatchedRefundOrDisputeReturnsRetryableStatus(string eventType)
    {
        var orders = new RecordingOrderService { RefundResult = false };
        IHasObject resource = eventType == "charge.refunded"
            ? new Charge { Id = "ch_missing", Object = "charge", PaymentIntentId = "pi_missing" }
            : new Dispute { Id = "dp_missing", Object = "dispute", PaymentIntentId = "pi_missing" };
        var stripeEvent = CreateEvent(eventType, resource);

        var result = await InvokeAsync(stripeEvent, orders);

        var status = Assert.IsType<StatusCodeResult>(result);
        Assert.Equal(StatusCodes.Status503ServiceUnavailable, status.StatusCode);
        Assert.Equal("pi_missing", Assert.Single(orders.RefundedPaymentIntentIds));
    }

    [Fact]
    public async Task InvalidSignatureIsRejectedWithoutChangingOrderState()
    {
        var orders = new RecordingOrderService();
        var stripeEvent = CreateEvent(
            "checkout.session.completed",
            CreateSession("cs_bad_signature", "paid", "pi_bad_signature", 500, Guid.NewGuid()));

        var result = await InvokeAsync(stripeEvent, orders, "t=1,v1=invalid");

        Assert.IsType<BadRequestResult>(result);
        Assert.Empty(orders.PaidCalls);
        Assert.Empty(orders.FailedSessionIds);
        Assert.Empty(orders.RefundedPaymentIntentIds);
    }

    private static Event CreateEvent(string type, IHasObject resource) => new()
    {
        Id = $"evt_{Guid.NewGuid():N}",
        Object = "event",
        ApiVersion = StripeConfiguration.ApiVersion,
        Created = DateTime.UtcNow,
        Data = new EventData { Object = resource },
        Livemode = false,
        PendingWebhooks = 1,
        Type = type,
    };

    private static Session CreateSession(
        string id,
        string paymentStatus,
        string paymentIntentId,
        long amountTotal,
        Guid orderId) => new()
    {
        Id = id,
        Object = "checkout.session",
        AmountTotal = amountTotal,
        Metadata = new Dictionary<string, string> { ["order_id"] = orderId.ToString() },
        PaymentIntentId = paymentIntentId,
        PaymentStatus = paymentStatus,
    };

    private static async Task<IActionResult> InvokeAsync(
        Event stripeEvent,
        RecordingOrderService orders,
        string? signature = null)
    {
        var payload = stripeEvent.ToJson();
        var context = new DefaultHttpContext();
        context.Request.Body = new MemoryStream(Encoding.UTF8.GetBytes(payload));
        context.Request.Headers["Stripe-Signature"] = signature ?? Sign(payload);

        var controller = new WebhooksController(
            orders,
            new ConfigurationBuilder()
                .AddInMemoryCollection(new Dictionary<string, string?>
                {
                    ["Stripe:WebhookSecret"] = WebhookSecret,
                })
                .Build(),
            NullLogger<WebhooksController>.Instance)
        {
            ControllerContext = new ControllerContext { HttpContext = context },
        };

        return await controller.Stripe(CancellationToken.None);
    }

    private static string Sign(string payload)
    {
        var timestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
        var message = Encoding.UTF8.GetBytes($"{timestamp}.{payload}");
        var signature = HMACSHA256.HashData(Encoding.UTF8.GetBytes(WebhookSecret), message);
        return $"t={timestamp},v1={Convert.ToHexString(signature).ToLowerInvariant()}";
    }

    private sealed class RecordingOrderService : IOrderService
    {
        public bool PaidResult { get; init; } = true;
        public bool RefundResult { get; init; } = true;
        public List<PaidCall> PaidCalls { get; } = [];
        public List<string> FailedSessionIds { get; } = [];
        public List<string> RefundedPaymentIntentIds { get; } = [];

        public Task<(Order order, Session session)> CreateAsync(
            CheckoutRequest req,
            Guid? userId,
            CancellationToken ct = default) =>
            throw new NotSupportedException();

        public Task<bool> MarkPaidAsync(
            string stripeSessionId,
            string? paymentIntentId,
            long? amountTotal = null,
            Guid? orderId = null,
            CancellationToken ct = default)
        {
            PaidCalls.Add(new PaidCall(stripeSessionId, paymentIntentId, amountTotal, orderId));
            return Task.FromResult(PaidResult);
        }

        public Task MarkPaymentFailedAsync(string stripeSessionId, CancellationToken ct = default)
        {
            FailedSessionIds.Add(stripeSessionId);
            return Task.CompletedTask;
        }

        public Task<bool> MarkRefundedByPaymentIntentAsync(
            string paymentIntentId,
            CancellationToken ct = default)
        {
            RefundedPaymentIntentIds.Add(paymentIntentId);
            return Task.FromResult(RefundResult);
        }

        public Task<ProductDownloadDeliveryResult?> ResendProductDownloadsAsync(
            Guid orderId,
            CancellationToken ct = default) =>
            throw new NotSupportedException();

        public Task<Order?> GetByStripeSessionAsync(
            string stripeSessionId,
            CancellationToken ct = default) =>
            throw new NotSupportedException();
    }

    private sealed record PaidCall(
        string StripeSessionId,
        string? PaymentIntentId,
        long? AmountTotal,
        Guid? OrderId);
}
