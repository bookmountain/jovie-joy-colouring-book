using System.Net;
using System.Net.Http.Json;
using System.Text;
using JovieJoy.Api.Contracts;
using JovieJoy.Api.Data;
using JovieJoy.Api.Data.Entities;
using JovieJoy.Api.Infrastructure;
using JovieJoy.Api.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Stripe.Checkout;

namespace JovieJoy.Api.Tests;

public sealed class ProductDownloadsTests : IClassFixture<ApiFactory>, IDisposable
{
    private readonly ApiFactory _factory;
    private readonly List<IServiceScope> _scopes = [];

    public ProductDownloadsTests(ApiFactory factory) => _factory = factory;

    [Fact]
    public async Task Public_catalog_never_exposes_paid_file_path_and_static_pdf_is_blocked()
    {
        var slug = $"private-pdf-{Guid.NewGuid():N}";
        var path = $"/uploads/pdfs/{slug}.pdf";
        var absolute = WriteUpload(path);
        await SeedProduct(slug, path, publishedAt: DateTime.UtcNow.AddDays(-1));

        var publicClient = _factory.CreateClient();
        var json = await publicClient.GetStringAsync($"/api/products/{slug}");
        Assert.DoesNotContain("pdfPath", json, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain(path, json, StringComparison.Ordinal);

        var direct = await publicClient.GetAsync(path);
        Assert.Equal(HttpStatusCode.NotFound, direct.StatusCode);
        Assert.True(File.Exists(absolute));

        var admin = await _factory.CreateAdminClientAsync();
        var adminProduct = await admin.GetFromJsonAsync<AdminProductDto>($"/api/admin/products/{slug}");
        Assert.Equal(path, adminProduct!.PdfPath);
    }

    [Fact]
    public async Task Checkout_rejects_draft_and_scheduled_products()
    {
        var draft = $"draft-checkout-{Guid.NewGuid():N}";
        var scheduled = $"scheduled-checkout-{Guid.NewGuid():N}";
        await SeedProduct(draft, null, publishedAt: null);
        await SeedProduct(scheduled, null, publishedAt: DateTime.UtcNow.AddDays(2));

        await using var db = CreateContext();
        var service = CreateOrderService(db, new FakeStripeService(), new FakeEmailSender());

        foreach (var slug in new[] { draft, scheduled })
        {
            var request = new CheckoutRequest("buyer@example.com", null, [new CartLineRequest(slug, 1)], null);
            var error = await Assert.ThrowsAsync<InvalidOperationException>(() => service.CreateAsync(request, null));
            Assert.Contains("Unknown product", error.Message, StringComparison.Ordinal);
        }
    }

    [Fact]
    public async Task Digital_product_without_a_file_is_public_but_not_checkout_eligible()
    {
        var slug = $"missing-pdf-{Guid.NewGuid():N}";
        await SeedProduct(slug, null, publishedAt: DateTime.UtcNow.AddDays(-1));

        // Published digital products stay browsable without a PDF (fulfilment can
        // be an external link, e.g. Etsy) …
        var client = _factory.CreateClient();
        var detailResponse = await client.GetAsync($"/api/products/{slug}");
        Assert.Equal(HttpStatusCode.OK, detailResponse.StatusCode);
        var catalog = await client.GetFromJsonAsync<List<ProductDto>>("/api/products");
        Assert.Contains(catalog!, product => product.Slug == slug);

        // … but our own checkout still refuses to sell a download with no file.
        await using var db = CreateContext();
        var service = CreateOrderService(db, new FakeStripeService(), new FakeEmailSender());
        var request = new CheckoutRequest("buyer@example.com", null, [new CartLineRequest(slug, 1)], null);
        await Assert.ThrowsAsync<InvalidOperationException>(() => service.CreateAsync(request, null));
    }

    [Theory]
    [InlineData(0)]
    [InlineData(101)]
    [InlineData(2147483647)]
    public async Task Checkout_rejects_unsafe_quantities_without_creating_an_order(int quantity)
    {
        var slug = $"quantity-limit-{Guid.NewGuid():N}";
        var path = $"/uploads/pdfs/{slug}.pdf";
        await SeedProduct(slug, path, publishedAt: DateTime.UtcNow.AddDays(-1));
        await using var db = CreateContext();
        var service = CreateOrderService(db, new FakeStripeService(), new FakeEmailSender());

        var request = new CheckoutRequest("buyer@example.com", null, [new CartLineRequest(slug, quantity)], null);
        await Assert.ThrowsAsync<InvalidOperationException>(() => service.CreateAsync(request, null));

        Assert.False(await db.Orders.AnyAsync(order => order.Items.Any(item => item.ProductSlug == slug)));
    }

    [Fact]
    public async Task Paid_digital_order_creates_one_grant_emails_once_and_downloads_snapshot_after_product_delete()
    {
        var slug = $"paid-download-{Guid.NewGuid():N}";
        var path = $"/uploads/pdfs/{slug}.pdf";
        var bytes = Encoding.ASCII.GetBytes("%PDF-1.7\n1 0 obj\n<<>>\nendobj\nstartxref\n0\n%%EOF\n");
        WriteUpload(path, bytes);
        var productId = await SeedProduct(slug, path, publishedAt: DateTime.UtcNow.AddDays(-1));

        await using var db = CreateContext();
        var item = new OrderItem
        {
            ProductId = productId,
            ProductSlug = slug,
            TitleAtPurchase = "Purchased pages",
            UnitPriceCents = 500,
            Quantity = 1,
            DigitalFilePathAtPurchase = path,
        };
        var order = new Order
        {
            Email = "buyer@example.com",
            Name = "Buyer",
            StripeSessionId = $"cs_{Guid.NewGuid():N}",
            Status = OrderStatus.Pending,
            SubtotalCents = 500,
            TotalCents = 500,
            Items = [item],
        };
        db.Orders.Add(order);
        await db.SaveChangesAsync();
        db.ChangeTracker.Clear();

        var email = new FakeEmailSender();
        var service = CreateOrderService(db, new FakeStripeService(), email);
        await service.MarkPaidAsync(order.StripeSessionId!, "pi_one");
        await service.MarkPaidAsync(order.StripeSessionId!, "pi_one");

        db.ChangeTracker.Clear();
        var grant = Assert.Single(await db.ProductDownloadGrants.AsNoTracking()
            .Where(candidate => candidate.OrderId == order.Id)
            .ToListAsync());
        Assert.Single(email.ProductDownloadEmails);
        Assert.Contains(grant.Token, email.ProductDownloadEmails[0].Downloads[0].DownloadUrl, StringComparison.Ordinal);

        var admin = await _factory.CreateAdminClientAsync();
        Assert.Equal(HttpStatusCode.NoContent, (await admin.DeleteAsync($"/api/admin/products/{slug}")).StatusCode);

        var publicClient = _factory.CreateClient();
        var download = await publicClient.GetAsync($"/api/downloads/products/{grant.Token}");
        Assert.Equal(HttpStatusCode.OK, download.StatusCode);
        Assert.Equal(bytes, await download.Content.ReadAsByteArrayAsync());
        Assert.Equal("attachment", download.Content.Headers.ContentDisposition!.DispositionType);
    }

    [Fact]
    public async Task Admin_can_send_downloads_for_a_paid_digital_order()
    {
        var slug = $"admin-resend-{Guid.NewGuid():N}";
        var path = $"/uploads/pdfs/{slug}.pdf";
        var productId = await SeedProduct(slug, path, publishedAt: DateTime.UtcNow.AddDays(-1));
        Guid orderId;
        await using (var db = CreateContext())
        {
            var order = new Order
            {
                Email = "buyer@example.com",
                Name = "Buyer",
                Status = OrderStatus.Paid,
                PaidAt = DateTime.UtcNow,
                SubtotalCents = 500,
                TotalCents = 500,
                Items =
                [
                    new OrderItem
                    {
                        ProductId = productId,
                        ProductSlug = slug,
                        TitleAtPurchase = "Purchased pages",
                        UnitPriceCents = 500,
                        Quantity = 1,
                        DigitalFilePathAtPurchase = path,
                    },
                ],
            };
            db.Orders.Add(order);
            await db.SaveChangesAsync();
            orderId = order.Id;
        }

        var sentBefore = _factory.Emails.ProductDownloadEmails.Count;
        var admin = await _factory.CreateAdminClientAsync();
        var response = await admin.PostAsync($"/api/admin/orders/{orderId}/resend-downloads", null);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<ProductDownloadDeliveryResult>();
        Assert.NotNull(result);
        Assert.Equal(orderId, result.OrderId);
        Assert.Equal(1, result.GrantCount);
        Assert.Equal(1, result.ActiveGrantCount);
        Assert.True(result.RegeneratedExpiredLinks);
        Assert.Equal(sentBefore + 1, _factory.Emails.ProductDownloadEmails.Count);

        await using var verifyDb = CreateContext();
        var savedOrder = await verifyDb.Orders
            .Include(candidate => candidate.DownloadGrants)
            .SingleAsync(candidate => candidate.Id == orderId);
        Assert.NotNull(savedOrder.DownloadEmailSentAt);
        Assert.Single(savedOrder.DownloadGrants);
    }

    [Fact]
    public async Task Fulfillment_releases_the_storage_lease_before_sending_email()
    {
        var slug = $"fulfillment-lease-{Guid.NewGuid():N}";
        var path = $"/uploads/pdfs/{slug}.pdf";
        var productId = await SeedProduct(slug, path, publishedAt: DateTime.UtcNow.AddDays(-1));
        await using var db = CreateContext();
        var item = new OrderItem
        {
            ProductId = productId,
            ProductSlug = slug,
            TitleAtPurchase = slug,
            UnitPriceCents = 500,
            Quantity = 1,
            DigitalFilePathAtPurchase = path,
        };
        var order = new Order
        {
            Email = "buyer@example.com",
            StripeSessionId = $"cs_{Guid.NewGuid():N}",
            Status = OrderStatus.Pending,
            SubtotalCents = 500,
            TotalCents = 500,
            Items = [item],
        };
        db.Orders.Add(order);
        await db.SaveChangesAsync();
        db.ChangeTracker.Clear();

        var email = new LockProbingEmailSender(async ct =>
        {
            using var timeout = CancellationTokenSource.CreateLinkedTokenSource(ct);
            timeout.CancelAfter(TimeSpan.FromSeconds(2));
            await using var lease = await CmsMutationCoordination.AcquireAsync(db, timeout.Token);
        });
        var service = CreateOrderService(db, new FakeStripeService(), email);

        Assert.True(await service.MarkPaidAsync(order.StripeSessionId!, "pi_lease"));
        Assert.True(email.WasCalled);
    }

    [Fact]
    public async Task Checkout_snapshots_the_file_and_fulfills_it_after_product_replacement_and_delete()
    {
        var slug = $"checkout-snapshot-{Guid.NewGuid():N}";
        var originalPath = $"/uploads/pdfs/{slug}-original.pdf";
        var replacementPath = $"/uploads/pdfs/{slug}-replacement.pdf";
        var originalBytes = Encoding.ASCII.GetBytes("%PDF-1.7\noriginal purchased file\n%%EOF\n");
        WriteUpload(originalPath, originalBytes);
        WriteUpload(replacementPath, Encoding.ASCII.GetBytes("%PDF-1.7\nreplacement file\n%%EOF\n"));
        await SeedProduct(slug, originalPath, publishedAt: DateTime.UtcNow.AddDays(-1));

        await using var db = CreateContext();
        var email = new FakeEmailSender();
        var service = CreateOrderService(db, new FakeStripeService(), email);
        var request = new CheckoutRequest("buyer@example.com", "Buyer", [new CartLineRequest(slug, 1)], null);
        var (order, _) = await service.CreateAsync(request, null);

        db.ChangeTracker.Clear();
        var product = await db.Products.SingleAsync(candidate => candidate.Slug == slug);
        product.PdfPath = replacementPath;
        await db.SaveChangesAsync();
        db.ChangeTracker.Clear();

        var admin = await _factory.CreateAdminClientAsync();
        Assert.Equal(HttpStatusCode.NoContent, (await admin.DeleteAsync($"/api/admin/products/{slug}")).StatusCode);
        db.ChangeTracker.Clear();

        await service.MarkPaidAsync(order.StripeSessionId!, "pi_snapshot");

        db.ChangeTracker.Clear();
        var grant = await db.ProductDownloadGrants.AsNoTracking()
            .SingleAsync(candidate => candidate.OrderId == order.Id);
        Assert.Equal(originalPath, grant.FilePath);
        Assert.Null(grant.ProductId);
        Assert.Single(email.ProductDownloadEmails);

        var response = await _factory.CreateClient().GetAsync($"/api/downloads/products/{grant.Token}");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(originalBytes, await response.Content.ReadAsByteArrayAsync());
    }

    [Fact]
    public async Task Paid_amount_mismatch_is_rejected_and_refund_is_terminal_on_replay()
    {
        var slug = $"payment-state-{Guid.NewGuid():N}";
        var path = $"/uploads/pdfs/{slug}.pdf";
        await SeedProduct(slug, path, publishedAt: DateTime.UtcNow.AddDays(-1));
        await using var db = CreateContext();
        var service = CreateOrderService(db, new FakeStripeService(), new FakeEmailSender());
        var (order, _) = await service.CreateAsync(
            new CheckoutRequest("buyer@example.com", null, [new CartLineRequest(slug, 1)], null),
            null);

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            service.MarkPaidAsync(order.StripeSessionId!, "pi_state", order.TotalCents + 1));
        db.ChangeTracker.Clear();
        Assert.Equal(OrderStatus.Pending, (await db.Orders.SingleAsync(row => row.Id == order.Id)).Status);

        Assert.True(await service.MarkPaidAsync(order.StripeSessionId!, "pi_state", order.TotalCents));
        Assert.True(await service.MarkRefundedByPaymentIntentAsync("pi_state"));
        db.ChangeTracker.Clear();
        Assert.Equal(OrderStatus.Refunded, (await db.Orders.SingleAsync(row => row.Id == order.Id)).Status);

        Assert.True(await service.MarkRefundedByPaymentIntentAsync("pi_state"));
        Assert.False(await service.MarkRefundedByPaymentIntentAsync("pi_unknown"));

        Assert.True(await service.MarkPaidAsync(order.StripeSessionId!, "pi_state", order.TotalCents));
        db.ChangeTracker.Clear();
        Assert.Equal(OrderStatus.Refunded, (await db.Orders.SingleAsync(row => row.Id == order.Id)).Status);
    }

    [Fact]
    public async Task Expired_or_unknown_grants_do_not_stream_files()
    {
        var slug = $"expired-download-{Guid.NewGuid():N}";
        var path = $"/uploads/pdfs/{slug}.pdf";
        WriteUpload(path);
        var productId = await SeedProduct(slug, path, publishedAt: DateTime.UtcNow.AddDays(-1));
        string token;
        await using (var db = CreateContext())
        {
            var item = new OrderItem
            {
                ProductId = productId,
                ProductSlug = slug,
                TitleAtPurchase = slug,
                UnitPriceCents = 100,
                Quantity = 1,
            };
            var order = new Order
            {
                Email = "buyer@example.com",
                Status = OrderStatus.Paid,
                SubtotalCents = 100,
                TotalCents = 100,
                Items = [item],
            };
            token = FreebieTokens.Generate();
            order.DownloadGrants.Add(new ProductDownloadGrant
            {
                Order = order,
                OrderItem = item,
                ProductId = productId,
                FilePath = path,
                ProductSlug = slug,
                TitleAtPurchase = slug,
                Token = token,
                ExpiresAt = DateTime.UtcNow.AddMinutes(-1),
            });
            db.Orders.Add(order);
            await db.SaveChangesAsync();
        }

        var client = _factory.CreateClient();
        Assert.Equal(HttpStatusCode.Gone, (await client.GetAsync($"/api/downloads/products/{token}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await client.GetAsync("/api/downloads/products/unknown")).StatusCode);
    }

    private async Task<Guid> SeedProduct(string slug, string? pdfPath, DateTime? publishedAt)
    {
        await using var db = CreateContext();
        var product = new Product
        {
            Slug = slug,
            Title = slug,
            Excerpt = "Digital product",
            Description = ["Description"],
            PriceCents = 500,
            Available = true,
            ProductType = ProductType.Digital,
            Images = [],
            Options = [new ProductOption("Format", ["PDF"])],
            Tags = [],
            PublishedAt = publishedAt,
            PdfPath = pdfPath,
        };
        db.Products.Add(product);
        await db.SaveChangesAsync();
        return product.Id;
    }

    private AppDbContext CreateContext()
    {
        var scope = _factory.Services.CreateScope();
        _scopes.Add(scope);
        return scope.ServiceProvider.GetRequiredService<AppDbContext>();
    }

    public void Dispose()
    {
        foreach (var scope in _scopes) scope.Dispose();
        _scopes.Clear();
    }

    private OrderService CreateOrderService(AppDbContext db, IStripeService stripe, IEmailSender email) =>
        new(
            db,
            stripe,
            email,
            Options.Create(new ProductDownloadsOptions
            {
                DownloadTtlDays = 30,
            }),
            Options.Create(new FreebiesOptions { BaseUrl = "http://localhost" }),
            NullLogger<OrderService>.Instance);

    private string WriteUpload(string relative, byte[]? bytes = null)
    {
        var absolute = Path.Combine(
            _factory.ContentRoot,
            relative.TrimStart('/').Replace('/', Path.DirectorySeparatorChar));
        Directory.CreateDirectory(Path.GetDirectoryName(absolute)!);
        File.WriteAllBytes(absolute, bytes ?? Encoding.ASCII.GetBytes("%PDF-1.7\n%%EOF\n"));
        return absolute;
    }

    private sealed class FakeStripeService : IStripeService
    {
        public Task<Session> CreateCheckoutSessionAsync(Order order, CancellationToken ct = default) =>
            Task.FromResult(new Session
            {
                Id = $"cs_{Guid.NewGuid():N}",
                Url = "https://checkout.stripe.test/session",
            });
    }

    private sealed class LockProbingEmailSender(Func<CancellationToken, Task> probe) : IEmailSender
    {
        public bool WasCalled { get; private set; }

        public Task SendFreebieDownloadAsync(
            string to,
            Freebie freebie,
            string downloadUrl,
            CancellationToken ct) => Task.CompletedTask;

        public async Task SendProductDownloadsAsync(
            string to,
            string? customerName,
            IReadOnlyList<ProductDownloadEmailItem> downloads,
            CancellationToken ct)
        {
            WasCalled = true;
            await probe(ct);
        }
    }
}
