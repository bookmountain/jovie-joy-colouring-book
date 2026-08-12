using JovieJoy.Api.Contracts;
using JovieJoy.Api.Data;
using JovieJoy.Api.Data.Entities;
using JovieJoy.Api.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Stripe.Checkout;

namespace JovieJoy.Api.Services;

public interface IOrderService
{
    Task<(Order order, Session session)> CreateAsync(CheckoutRequest req, Guid? userId, CancellationToken ct = default);
    Task<bool> MarkPaidAsync(
        string stripeSessionId,
        string? paymentIntentId,
        long? amountTotal = null,
        Guid? orderId = null,
        CancellationToken ct = default);
    Task MarkPaymentFailedAsync(string stripeSessionId, CancellationToken ct = default);
    Task<bool> MarkRefundedByPaymentIntentAsync(string paymentIntentId, CancellationToken ct = default);
    Task<ProductDownloadDeliveryResult?> ResendProductDownloadsAsync(
        Guid orderId,
        CancellationToken ct = default);
    Task<Order?> GetByStripeSessionAsync(string stripeSessionId, CancellationToken ct = default);
}

public sealed record ProductDownloadDeliveryResult(
    Guid OrderId,
    DateTime DownloadEmailSentAt,
    int GrantCount,
    int ActiveGrantCount,
    int ExpiredGrantCount,
    bool RegeneratedExpiredLinks);

public sealed class ProductDownloadDeliveryException(string message, Exception innerException)
    : Exception(message, innerException);

public class OrderService(
    AppDbContext db,
    IStripeService stripe,
    IEmailSender email,
    IOptions<ProductDownloadsOptions> downloadOptions,
    IOptions<FreebiesOptions> publicApiOptions,
    ILogger<OrderService> logger) : IOrderService
{
    public const int MaxCartLines = 50;
    public const int MaxQuantityPerLine = 100;

    public async Task<(Order, Session)> CreateAsync(CheckoutRequest req, Guid? userId, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(req.Email) ||
            req.Email.Length > 320 ||
            !System.Net.Mail.MailAddress.TryCreate(req.Email.Trim(), out _))
            throw new InvalidOperationException("A valid email is required");
        if (req.Name?.Length > 200)
            throw new InvalidOperationException("Name must be 200 characters or fewer");
        if (req.PromoCode?.Length > 100)
            throw new InvalidOperationException("Promo code must be 100 characters or fewer");
        if (req.Items is null || req.Items.Count == 0)
            throw new InvalidOperationException("Cart is empty");
        if (req.Items.Count > MaxCartLines)
            throw new InvalidOperationException($"A cart can contain at most {MaxCartLines} product lines");

        // Coordinate the catalog read and persisted file snapshot with admin
        // replacement/deletion and orphan cleanup. The lease is released before
        // the external Stripe call so slow network I/O cannot block CMS writes.
        await using var mutationLease = await CmsMutationCoordination.AcquireAsync(db, ct);

        if (req.Items.Any(item => string.IsNullOrWhiteSpace(item.ProductSlug) || item.ProductSlug.Length > 200))
            throw new InvalidOperationException("Every cart line needs a valid product slug");
        if (req.Items.GroupBy(item => item.ProductSlug, StringComparer.Ordinal).Any(group => group.Count() > 1))
            throw new InvalidOperationException("Duplicate product lines are not allowed");

        var slugs = req.Items.Select(i => i.ProductSlug).Distinct().ToList();
        var now = DateTime.UtcNow;
        var products = await db.Products
            .Where(p => slugs.Contains(p.Slug) &&
                        p.Available &&
                        p.PublishedAt != null &&
                        p.PublishedAt <= now &&
                        (p.ProductType != ProductType.Digital ||
                         !string.IsNullOrEmpty(p.PdfPath)))
            .ToListAsync(ct);
        var bySlug = products.ToDictionary(p => p.Slug);

        var lineItems = new List<OrderItem>();
        long subtotal = 0;
        foreach (var line in req.Items)
        {
            if (!bySlug.TryGetValue(line.ProductSlug, out var p))
                throw new InvalidOperationException($"Unknown product: {line.ProductSlug}");
            if (p.PriceCents <= 0)
                throw new InvalidOperationException($"Product is not eligible for paid checkout: {line.ProductSlug}");
            if (line.Quantity is <= 0 or > MaxQuantityPerLine)
                throw new InvalidOperationException($"Quantity must be between 1 and {MaxQuantityPerLine}");

            lineItems.Add(new OrderItem
            {
                ProductId = p.Id,
                ProductSlug = p.Slug,
                TitleAtPurchase = p.Title,
                UnitPriceCents = p.PriceCents,
                Quantity = line.Quantity,
                DigitalFilePathAtPurchase = p.ProductType == ProductType.Digital ? p.PdfPath : null,
            });
            subtotal = checked(subtotal + (long)p.PriceCents * line.Quantity);
        }

        if (subtotal > int.MaxValue)
            throw new InvalidOperationException("Cart total is too large");

        int discount = 0;
        if (string.Equals(req.PromoCode, "FIRST10", StringComparison.OrdinalIgnoreCase))
            discount = (int)Math.Round(subtotal * 0.10m, MidpointRounding.AwayFromZero);
        var subtotalCents = (int)subtotal;

        var order = new Order
        {
            Email = req.Email.Trim(),
            Name = string.IsNullOrWhiteSpace(req.Name) ? null : req.Name.Trim(),
            UserId = userId,
            SubtotalCents = subtotalCents,
            DiscountCents = discount,
            TotalCents = subtotalCents - discount,
            Currency = "usd",
            Status = OrderStatus.Pending,
            PromoCode = req.PromoCode,
            Items = lineItems,
        };
        db.Orders.Add(order);
        await db.SaveChangesAsync(ct);

        await mutationLease.DisposeAsync();

        var session = await stripe.CreateCheckoutSessionAsync(order, ct);
        order.StripeSessionId = session.Id;
        await db.SaveChangesAsync(ct);

        return (order, session);
    }

    public async Task<Order?> GetByStripeSessionAsync(string stripeSessionId, CancellationToken ct = default)
    {
        return await db.Orders
            .Include(o => o.Items)
            .FirstOrDefaultAsync(o => o.StripeSessionId == stripeSessionId, ct);
    }

    public async Task<bool> MarkPaidAsync(
        string stripeSessionId,
        string? paymentIntentId,
        long? amountTotal = null,
        Guid? orderId = null,
        CancellationToken ct = default)
    {
        // Keep the order snapshot live from lookup through grant persistence.
        // This shares the admin/orphan-sweep lease, closing the window where a
        // replaced product file could be swept just as Stripe activates it.
        await using var fulfillmentLease = await CmsMutationCoordination.AcquireAsync(db, ct);

        var order = await db.Orders
            .Include(o => o.Items).ThenInclude(i => i.Product)
            .Include(o => o.DownloadGrants)
            .FirstOrDefaultAsync(
                o => o.StripeSessionId == stripeSessionId ||
                     (orderId.HasValue && o.Id == orderId.Value), ct);
        if (order is null) return false;
        if (order.Status == OrderStatus.Refunded)
        {
            logger.LogWarning(
                "Ignoring paid replay for terminal order {OrderId} in status {OrderStatus}",
                order.Id,
                order.Status);
            return true;
        }
        if (order.Status == OrderStatus.Failed)
        {
            logger.LogInformation("Promoting asynchronously completed order {OrderId} from Failed to Paid", order.Id);
        }
        order.StripeSessionId ??= stripeSessionId;
        if (amountTotal.HasValue && amountTotal.Value != order.TotalCents)
            throw new InvalidOperationException(
                $"Stripe amount {amountTotal.Value} does not match order {order.Id} total {order.TotalCents}.");
        var now = DateTime.UtcNow;
        if (order.Status != OrderStatus.Paid)
        {
            order.Status = OrderStatus.Paid;
            order.PaidAt = now;
            order.StripePaymentIntentId = paymentIntentId;
        }

        var ttlDays = Math.Clamp(downloadOptions.Value.DownloadTtlDays, 1, 365);
        var expiresAt = now.AddDays(ttlDays);
        var existingItemIds = order.DownloadGrants.Select(grant => grant.OrderItemId).ToHashSet();
        var newGrants = order.Items
            .Where(item => !string.IsNullOrWhiteSpace(item.DigitalFilePathAtPurchase) &&
                           !existingItemIds.Contains(item.Id))
            .Select(item => new ProductDownloadGrant
            {
                Order = order,
                OrderId = order.Id,
                OrderItem = item,
                OrderItemId = item.Id,
                Product = item.Product,
                ProductId = item.ProductId,
                FilePath = item.DigitalFilePathAtPurchase!,
                ProductSlug = item.ProductSlug,
                TitleAtPurchase = item.TitleAtPurchase,
                Token = FreebieTokens.Generate(),
                ExpiresAt = expiresAt,
            })
            .ToList();
        if (newGrants.Count > 0)
            db.ProductDownloadGrants.AddRange(newGrants);

        await db.SaveChangesAsync(ct);

        var grantsToDeliver = order.DownloadGrants
            .Concat(newGrants)
            .DistinctBy(grant => grant.Id)
            .ToList();
        if (grantsToDeliver.Count == 0 || order.DownloadEmailSentAt.HasValue) return true;

        // Freebies:BaseUrl is the existing public API origin used by protected
        // freebie links; paid product links share that same external API origin.
        var baseUrl = publicApiOptions.Value.BaseUrl.TrimEnd('/');
        var downloads = grantsToDeliver.Select(grant => new ProductDownloadEmailItem(
            grant.TitleAtPurchase,
            $"{baseUrl}/api/downloads/products/{grant.Token}",
            grant.ExpiresAt)).ToList();

        // Entitlements are durable now; never hold the catalog/storage lease
        // across the external email provider request.
        await fulfillmentLease.DisposeAsync();
        try
        {
            // Payment state and grants are committed first. A transient email failure
            // can safely trigger a Stripe retry because entitlement creation is idempotent.
            await email.SendProductDownloadsAsync(order.Email, order.Name, downloads, ct);
            order.DownloadEmailSentAt = DateTime.UtcNow;
            await db.SaveChangesAsync(ct);
        }
        catch (Exception ex)
        {
            logger.LogError(
                ex,
                "Paid order {OrderId} has download grants, but its fulfillment email failed",
                order.Id);
            // Stripe retries failed webhooks. Grants are idempotent, and the next
            // delivery attempt reuses their tokens until DownloadEmailSentAt commits.
            throw;
        }

        return true;
    }

    public async Task MarkPaymentFailedAsync(string stripeSessionId, CancellationToken ct = default)
    {
        var order = await db.Orders.FirstOrDefaultAsync(candidate => candidate.StripeSessionId == stripeSessionId, ct);
        if (order is null || order.Status != OrderStatus.Pending) return;
        order.Status = OrderStatus.Failed;
        await db.SaveChangesAsync(ct);
    }

    public async Task<bool> MarkRefundedByPaymentIntentAsync(string paymentIntentId, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(paymentIntentId)) return false;
        var orders = await db.Orders
            .Where(candidate => candidate.StripePaymentIntentId == paymentIntentId)
            .ToListAsync(ct);
        if (orders.Count == 0) return false;
        var paidOrders = orders.Where(order => order.Status == OrderStatus.Paid).ToList();
        foreach (var order in paidOrders) order.Status = OrderStatus.Refunded;
        if (paidOrders.Count > 0) await db.SaveChangesAsync(ct);
        return true;
    }

    public async Task<ProductDownloadDeliveryResult?> ResendProductDownloadsAsync(
        Guid orderId,
        CancellationToken ct = default)
    {
        await using var fulfillmentLease = await CmsMutationCoordination.AcquireAsync(db, ct);

        var order = await db.Orders
            .Include(candidate => candidate.Items).ThenInclude(item => item.Product)
            .Include(candidate => candidate.DownloadGrants)
            .FirstOrDefaultAsync(candidate => candidate.Id == orderId, ct);
        if (order is null) return null;
        if (order.Status != OrderStatus.Paid)
            throw new InvalidOperationException("Download links can only be sent for a paid order.");

        var digitalItems = order.Items
            .Where(item => !string.IsNullOrWhiteSpace(item.DigitalFilePathAtPurchase))
            .ToList();
        if (digitalItems.Count == 0)
            throw new InvalidOperationException("This order has no digital products to deliver.");

        var now = DateTime.UtcNow;
        var ttlDays = Math.Clamp(downloadOptions.Value.DownloadTtlDays, 1, 365);
        var expiresAt = now.AddDays(ttlDays);
        var grantsByItemId = order.DownloadGrants.ToDictionary(grant => grant.OrderItemId);
        var deliveryGrants = new List<ProductDownloadGrant>(digitalItems.Count);
        var regeneratedExpiredLinks = false;

        foreach (var item in digitalItems)
        {
            if (!grantsByItemId.TryGetValue(item.Id, out var grant))
            {
                grant = new ProductDownloadGrant
                {
                    Order = order,
                    OrderId = order.Id,
                    OrderItem = item,
                    OrderItemId = item.Id,
                    Product = item.Product,
                    ProductId = item.ProductId,
                    FilePath = item.DigitalFilePathAtPurchase!,
                    ProductSlug = item.ProductSlug,
                    TitleAtPurchase = item.TitleAtPurchase,
                    Token = FreebieTokens.Generate(),
                    ExpiresAt = expiresAt,
                    CreatedAt = now,
                };
                db.ProductDownloadGrants.Add(grant);
                grantsByItemId[item.Id] = grant;
                regeneratedExpiredLinks = true;
            }
            else if (grant.ExpiresAt <= now)
            {
                // Rotate only expired capabilities. Active links remain stable on
                // repeated admin requests, so retries cannot create extra grants.
                grant.Token = FreebieTokens.Generate();
                grant.ExpiresAt = expiresAt;
                grant.CreatedAt = now;
                regeneratedExpiredLinks = true;
            }

            deliveryGrants.Add(grant);
        }

        if (regeneratedExpiredLinks)
        {
            // The timestamp describes delivery of the currently active tokens.
            // Persisting null first makes a failed email visibly retryable.
            order.DownloadEmailSentAt = null;
        }
        await db.SaveChangesAsync(ct);

        var baseUrl = publicApiOptions.Value.BaseUrl.TrimEnd('/');
        var downloads = deliveryGrants.Select(grant => new ProductDownloadEmailItem(
            grant.TitleAtPurchase,
            $"{baseUrl}/api/downloads/products/{grant.Token}",
            grant.ExpiresAt)).ToList();

        // Keep the protected file snapshots coordinated while tokens are being
        // persisted, but never hold the storage lock across the email provider.
        await fulfillmentLease.DisposeAsync();
        try
        {
            await email.SendProductDownloadsAsync(order.Email, order.Name, downloads, ct);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Admin resend failed for paid order {OrderId}", order.Id);
            throw new ProductDownloadDeliveryException(
                "The download email could not be sent. The order remains retryable.",
                ex);
        }

        order.DownloadEmailSentAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        var activeGrantCount = deliveryGrants.Count(grant => grant.ExpiresAt > order.DownloadEmailSentAt.Value);

        return new ProductDownloadDeliveryResult(
            order.Id,
            order.DownloadEmailSentAt.Value,
            deliveryGrants.Count,
            activeGrantCount,
            deliveryGrants.Count - activeGrantCount,
            regeneratedExpiredLinks);
    }
}
