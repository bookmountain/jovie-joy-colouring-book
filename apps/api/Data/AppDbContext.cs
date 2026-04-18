using JovieJoy.Api.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace JovieJoy.Api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> opts) : DbContext(opts)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<Product> Products => Set<Product>();
    public DbSet<Order> Orders => Set<Order>();
    public DbSet<OrderItem> OrderItems => Set<OrderItem>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        b.Entity<User>(e =>
        {
            e.ToTable("users");
            e.HasKey(x => x.Id);
            e.Property(x => x.Email).HasMaxLength(320).IsRequired();
            e.HasIndex(x => x.Email).IsUnique();
            e.HasIndex(x => x.GoogleId).IsUnique();
            e.Property(x => x.Name).HasMaxLength(200);
            e.Property(x => x.GoogleId).HasMaxLength(100);
        });

        b.Entity<Product>(e =>
        {
            e.ToTable("products");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasMaxLength(32);
            e.Property(x => x.Title).HasMaxLength(200).IsRequired();
            e.Property(x => x.AgeRange).HasMaxLength(20);
            e.Property(x => x.Theme).HasMaxLength(50);
            e.Property(x => x.Difficulty).HasMaxLength(20);
            e.Property(x => x.Color).HasMaxLength(16);
            e.Property(x => x.Accent).HasMaxLength(16);
            e.Property(x => x.Badge).HasMaxLength(32);
            e.Property(x => x.Description).HasMaxLength(1000).IsRequired();
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

            e.HasOne(x => x.User)
                .WithMany(u => u.Orders)
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        b.Entity<OrderItem>(e =>
        {
            e.ToTable("order_items");
            e.HasKey(x => x.Id);
            e.Property(x => x.TitleAtPurchase).HasMaxLength(200);
            e.HasOne(x => x.Order)
                .WithMany(o => o.Items)
                .HasForeignKey(x => x.OrderId)
                .OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Product)
                .WithMany(p => p.OrderItems)
                .HasForeignKey(x => x.ProductId)
                .OnDelete(DeleteBehavior.Restrict);
        });
    }
}
