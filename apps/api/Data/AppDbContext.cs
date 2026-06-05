using System.Text.Json;
using JovieJoy.Api.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace JovieJoy.Api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> opts) : DbContext(opts)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<Product> Products => Set<Product>();
    public DbSet<Collection> Collections => Set<Collection>();
    public DbSet<ProductCollection> ProductCollections => Set<ProductCollection>();
    public DbSet<Order> Orders => Set<Order>();
    public DbSet<OrderItem> OrderItems => Set<OrderItem>();
    public DbSet<ContentBlock> ContentBlocks => Set<ContentBlock>();
    public DbSet<Wishlist> Wishlists => Set<Wishlist>();
    public DbSet<NotifyMeRequest> NotifyMeRequests => Set<NotifyMeRequest>();
    public DbSet<NewsletterSubscriber> NewsletterSubscribers => Set<NewsletterSubscriber>();
    public DbSet<BlogCategory> BlogCategories => Set<BlogCategory>();
    public DbSet<Article> Articles => Set<Article>();
    public DbSet<ComicWorld> ComicWorlds => Set<ComicWorld>();
    public DbSet<Comic> Comics => Set<Comic>();
    public DbSet<AboutSection> AboutSections => Set<AboutSection>();
    public DbSet<GalleryImage> GalleryImages => Set<GalleryImage>();
    public DbSet<StaticPage> StaticPages => Set<StaticPage>();
    public DbSet<NavLink> NavLinks => Set<NavLink>();
    public DbSet<FooterLink> FooterLinks => Set<FooterLink>();
    public DbSet<SocialLink> SocialLinks => Set<SocialLink>();
    public DbSet<FeaturedOnLink> FeaturedOnLinks => Set<FeaturedOnLink>();
    public DbSet<TrendingTerm> TrendingTerms => Set<TrendingTerm>();
    public DbSet<Faq> Faqs => Set<Faq>();
    public DbSet<Freebie> Freebies => Set<Freebie>();
    public DbSet<FreebieRequest> FreebieRequests => Set<FreebieRequest>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        var jsonStringList = new Microsoft.EntityFrameworkCore.Storage.ValueConversion.ValueConverter<List<string>, string>(
            v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
            v => JsonSerializer.Deserialize<List<string>>(v, (JsonSerializerOptions?)null) ?? new());

        b.Entity<User>(e =>
        {
            e.ToTable("users");
            e.HasKey(x => x.Id);
            e.Property(x => x.Email).HasMaxLength(320).IsRequired();
            e.HasIndex(x => x.Email).IsUnique();
            e.HasIndex(x => x.GoogleId).IsUnique();
            e.Property(x => x.Name).HasMaxLength(200);
            e.Property(x => x.GoogleId).HasMaxLength(100);
            e.Property(x => x.IsAdmin).HasDefaultValue(false);
            e.Property(x => x.PasswordHash).HasMaxLength(500);
        });

        b.Entity<Product>(e =>
        {
            e.ToTable("products");
            e.HasKey(x => x.Id);
            e.Property(x => x.Slug).HasMaxLength(200).IsRequired();
            e.HasIndex(x => x.Slug).IsUnique();
            e.Property(x => x.Title).HasMaxLength(300).IsRequired();
            e.Property(x => x.Excerpt).HasMaxLength(1000).IsRequired();
            e.Property(x => x.ProductType).HasConversion<int>();
            e.Property(x => x.Description).HasColumnType("jsonb").HasConversion(jsonStringList);
            e.Property(x => x.Images).HasColumnType("jsonb").HasConversion(jsonStringList);
            e.Property(x => x.Tags).HasColumnType("jsonb").HasConversion(jsonStringList);
            e.Property(x => x.ReviewImages).HasColumnType("jsonb")
                .HasConversion(v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
                               v => v == null ? null : JsonSerializer.Deserialize<List<string>>(v, (JsonSerializerOptions?)null));
            e.Property(x => x.InspirationImages).HasColumnType("jsonb")
                .HasConversion(v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
                               v => v == null ? null : JsonSerializer.Deserialize<List<string>>(v, (JsonSerializerOptions?)null));
            e.Property(x => x.Options).HasColumnType("jsonb")
                .HasConversion(v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
                               v => JsonSerializer.Deserialize<List<ProductOption>>(v, (JsonSerializerOptions?)null) ?? new());
            e.Property(x => x.SourceLinks).HasColumnType("jsonb")
                .HasConversion(v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
                               v => v == null ? null : JsonSerializer.Deserialize<List<SourceLink>>(v, (JsonSerializerOptions?)null));
            // PublishedAt arrives from the admin form as a bare date (e.g. "2026-06-05"),
            // which deserialises to DateTime Kind=Unspecified. Npgsql rejects that for a
            // `timestamp with time zone` column, so force UTC on write.
            e.Property(x => x.PublishedAt).HasConversion(
                v => v.HasValue ? DateTime.SpecifyKind(v.Value, DateTimeKind.Utc) : v,
                v => v);
        });

        b.Entity<Collection>(e =>
        {
            e.ToTable("collections");
            e.HasKey(x => x.Id);
            e.Property(x => x.Slug).HasMaxLength(200).IsRequired();
            e.HasIndex(x => x.Slug).IsUnique();
            e.Property(x => x.Title).HasMaxLength(300).IsRequired();
            e.Property(x => x.Excerpt).HasMaxLength(1000).IsRequired();
            e.Property(x => x.DefaultSort).HasConversion<int>();
            e.Property(x => x.HomepageSlot).HasConversion<int?>();
            e.Property(x => x.ProductOrder).HasColumnType("jsonb").HasConversion(jsonStringList);
        });

        b.Entity<ProductCollection>(e =>
        {
            e.ToTable("product_collections");
            e.HasKey(x => new { x.ProductId, x.CollectionId });
            e.HasOne(x => x.Product).WithMany(p => p.ProductCollections).HasForeignKey(x => x.ProductId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Collection).WithMany(c => c.ProductCollections).HasForeignKey(x => x.CollectionId).OnDelete(DeleteBehavior.Cascade);
        });

        b.Entity<Order>(e =>
        {
            e.ToTable("orders");
            e.HasKey(x => x.Id);
            e.Property(x => x.Email).HasMaxLength(320).IsRequired();
            e.Property(x => x.Currency).HasMaxLength(3);
            e.Property(x => x.StripeSessionId).HasMaxLength(255);
            e.HasIndex(x => x.StripeSessionId).IsUnique();
            e.Property(x => x.StripePaymentIntentId).HasMaxLength(255);
            e.HasIndex(x => x.Email);
            e.Property(x => x.Status).HasConversion<int>();
            e.HasOne(x => x.User).WithMany(u => u.Orders).HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.SetNull);
        });

        b.Entity<OrderItem>(e =>
        {
            e.ToTable("order_items");
            e.HasKey(x => x.Id);
            e.Property(x => x.ProductSlug).HasMaxLength(200).IsRequired();
            e.Property(x => x.TitleAtPurchase).HasMaxLength(300);
            e.HasOne(x => x.Order).WithMany(o => o.Items).HasForeignKey(x => x.OrderId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Product).WithMany(p => p.OrderItems).HasForeignKey(x => x.ProductId).OnDelete(DeleteBehavior.SetNull);
        });

        b.Entity<ContentBlock>(e =>
        {
            e.ToTable("content_blocks");
            e.HasKey(x => x.Key);
            e.Property(x => x.Key).HasMaxLength(120);
            e.Property(x => x.Type).HasConversion<int>();
            if (Database.IsRelational())
            {
                e.Property(x => x.Data).HasColumnType("jsonb");
            }
            else
            {
                e.Property(x => x.Data).HasConversion(
                    d => d.RootElement.GetRawText(),
                    s => System.Text.Json.JsonDocument.Parse(s, default));
            }
        });

        b.Entity<Wishlist>(e =>
        {
            e.ToTable("wishlists");
            e.HasKey(x => new { x.UserId, x.ProductSlug });
            e.Property(x => x.ProductSlug).HasMaxLength(200);
            e.HasOne(x => x.User).WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
        });

        b.Entity<NotifyMeRequest>(e =>
        {
            e.ToTable("notify_me_requests");
            e.HasKey(x => x.Id);
            e.Property(x => x.Email).HasMaxLength(320).IsRequired();
            e.Property(x => x.ProductSlug).HasMaxLength(200).IsRequired();
        });

        b.Entity<NewsletterSubscriber>(e =>
        {
            e.ToTable("newsletter_subscribers");
            e.HasKey(x => x.Email);
            e.Property(x => x.Email).HasMaxLength(320);
        });

        b.Entity<BlogCategory>(e =>
        {
            e.ToTable("blog_categories");
            e.HasKey(x => x.Slug);
            e.Property(x => x.Slug).HasMaxLength(120);
        });

        b.Entity<Article>(e =>
        {
            e.ToTable("articles");
            e.HasKey(x => x.Slug);
            e.Property(x => x.Slug).HasMaxLength(200);
            e.Property(x => x.BlogSlug).HasMaxLength(120);
            e.Property(x => x.Body).HasColumnType("jsonb").HasConversion(jsonStringList);
            e.HasOne(x => x.Blog).WithMany(b => b.Articles).HasForeignKey(x => x.BlogSlug).OnDelete(DeleteBehavior.Cascade);
        });

        b.Entity<ComicWorld>(e =>
        {
            e.ToTable("comic_worlds");
            e.HasKey(x => x.Id);
        });

        b.Entity<Comic>(e =>
        {
            e.ToTable("comics");
            e.HasKey(x => x.Id);
            e.Property(x => x.Images).HasColumnType("jsonb")
                .HasConversion(v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
                               v => JsonSerializer.Deserialize<List<ComicImage>>(v, (JsonSerializerOptions?)null) ?? new());
            e.HasOne(x => x.World).WithMany(w => w.Comics).HasForeignKey(x => x.WorldId).OnDelete(DeleteBehavior.Cascade);
        });

        b.Entity<AboutSection>(e =>
        {
            e.ToTable("about_sections");
            e.HasKey(x => x.Id);
            e.Property(x => x.Body).HasColumnType("jsonb").HasConversion(jsonStringList);
        });

        b.Entity<GalleryImage>(e =>
        {
            e.ToTable("gallery_images");
            e.HasKey(x => x.Id);
        });

        b.Entity<StaticPage>(e =>
        {
            e.ToTable("static_pages");
            e.HasKey(x => x.Slug);
            e.Property(x => x.Slug).HasMaxLength(120);
            e.Property(x => x.Blocks).HasColumnType("jsonb").HasConversion(jsonStringList);
        });

        b.Entity<NavLink>(e =>
        {
            e.ToTable("nav_links");
            e.HasKey(x => x.Id);
            e.HasOne(x => x.Parent).WithMany(p => p.Children).HasForeignKey(x => x.ParentId).OnDelete(DeleteBehavior.Cascade);
        });

        b.Entity<FooterLink>(e => { e.ToTable("footer_links"); e.HasKey(x => x.Id); });
        b.Entity<SocialLink>(e => { e.ToTable("social_links"); e.HasKey(x => x.Label); e.Property(x => x.Label).HasMaxLength(50); });
        b.Entity<FeaturedOnLink>(e => { e.ToTable("featured_on_links"); e.HasKey(x => x.Slug); e.Property(x => x.Slug).HasMaxLength(80); });
        b.Entity<TrendingTerm>(e => { e.ToTable("trending_terms"); e.HasKey(x => x.Term); e.Property(x => x.Term).HasMaxLength(100); });

        b.Entity<Faq>(e =>
        {
            e.ToTable("faqs");
            e.HasKey(x => x.Slug);
            e.Property(x => x.Slug).HasMaxLength(200);
            e.Property(x => x.Links).HasColumnType("jsonb")
                .HasConversion(v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
                               v => v == null ? null : JsonSerializer.Deserialize<List<FaqLink>>(v, (JsonSerializerOptions?)null));
        });

        b.Entity<Freebie>(e =>
        {
            e.ToTable("freebies");
            e.HasKey(x => x.Id);
            e.Property(x => x.Slug).HasMaxLength(200).IsRequired();
            e.HasIndex(x => x.Slug).IsUnique();
            e.Property(x => x.Title).HasMaxLength(300).IsRequired();
            e.Property(x => x.Excerpt).HasMaxLength(1000).IsRequired();
            e.Property(x => x.Description).HasColumnType("jsonb").HasConversion(jsonStringList);
            e.Property(x => x.CoverImage).HasMaxLength(500);
            e.Property(x => x.FilePath).HasMaxLength(500);
            e.Property(x => x.FileKind).HasMaxLength(8);
        });

        b.Entity<FreebieRequest>(e =>
        {
            e.ToTable("freebie_requests");
            e.HasKey(x => x.Id);
            e.HasOne(x => x.Freebie).WithMany(f => f.Requests).HasForeignKey(x => x.FreebieId).OnDelete(DeleteBehavior.Cascade);
            e.Property(x => x.Email).HasMaxLength(320).IsRequired();
            e.Property(x => x.Token).HasMaxLength(64).IsRequired();
            e.HasIndex(x => x.Token).IsUnique();
            e.HasIndex(x => x.Email);
            e.HasIndex(x => x.FreebieId);
            e.Property(x => x.Ip).HasMaxLength(64);
            e.Property(x => x.UserAgent).HasMaxLength(500);
        });
    }
}
