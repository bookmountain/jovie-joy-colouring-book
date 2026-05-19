using JovieJoy.Api.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace JovieJoy.Api.Data.Seed;

public static class SeedProducts
{
    public static async Task RunAsync(AppDbContext db)
    {
        if (await db.Products.AnyAsync()) return;

        var defaultOptions = new List<ProductOption> { new("Format", new List<string> { "Default Title" }) };

        db.Products.AddRange(
            // 1
            new Product
            {
                Slug = "cozy-christmas-coloring-book",
                Title = "Cozy Christmas Coloring Book",
                Excerpt = "Wrap yourself in the magic of Christmas with coloring pens and a cozy blanket in this Penguin Random House collaboration.",
                Description = new List<string>
                {
                    "A seasonal coloring book built around warm holiday moments, cozy scenes, and simple pages designed for relaxing color sessions.",
                    "Includes hand-drawn pages, single-sided artwork, and crisp illustrations for calm creative time.",
                },
                PriceCents = 899,
                CompareAtPriceCents = null,
                Available = true,
                ProductType = ProductType.Physical,
                Images = new List<string>
                {
                    "https://cocowyo.com/cdn/shop/files/1-cozy-christmas-coloring-book_04b4e1c3-4640-4fb9-ba1e-3ecfa5f1ad00.png?v=1775733386",
                    "https://cocowyo.com/cdn/shop/files/1-cozy-christmas-coloring-book.jpg?v=1775733386",
                    "https://cocowyo.com/cdn/shop/files/10-cozy-christmas-coloring-book.jpg?v=1775733386",
                    "https://cocowyo.com/cdn/shop/files/2-cozy-christmas-coloring-book.jpg?v=1775733386",
                    "https://cocowyo.com/cdn/shop/files/3-cozy-christmas-coloring-book.jpg?v=1775733386",
                    "https://cocowyo.com/cdn/shop/files/4-cozy-christmas-coloring-book.jpg?v=1775733386",
                    "https://cocowyo.com/cdn/shop/files/5-cozy-christmas-coloring-book.jpg?v=1775733386",
                    "https://cocowyo.com/cdn/shop/files/6-cozy-christmas-coloring-book.jpg?v=1775733386",
                    "https://cocowyo.com/cdn/shop/files/7-cozy-christmas-coloring-book.jpg?v=1775733386",
                    "https://cocowyo.com/cdn/shop/files/8-cozy-christmas-coloring-book.jpg?v=1775733386",
                    "https://cocowyo.com/cdn/shop/files/9-cozy-christmas-coloring-book.jpg?v=1775733386",
                },
                Options = defaultOptions,
                SourceLinks = new List<SourceLink>
                {
                    new("Penguin Random House", "https://www.penguinrandomhouse.com/", "https://cdn.shopify.com/s/files/1/0602/0133/6893/files/Buy-on-Penguin-US_f3259fc7-e7b8-4860-b4bd-c508194bea62.png?v=1774429898", "Buy on Penguin US"),
                    new("Penguin UK", "https://www.penguin.co.uk/", "https://cdn.shopify.com/s/files/1/0602/0133/6893/files/Buy-on-Penguin-UK_da64018e-ddfc-4703-84a2-4bd7fbf61c23.png?v=1774429898", "Buy on Penguin UK"),
                    new("Penguin Australia", "https://www.penguin.com.au/", "https://cdn.shopify.com/s/files/1/0602/0133/6893/files/Buy-on-Penguin-AU_b7c31dfa-374d-48fc-a40f-f882d8d0adb5.png?v=1774429897", "Buy on Penguin AU"),
                    new("Latvian edition", "https://www.zvaigzne.lv/", "https://cdn.shopify.com/s/files/1/0602/0133/6893/files/Buy-on-Penguin-Latvian.png?v=1774429897", "Buy Latvian edition"),
                    new("Vietnamese edition", "https://dinhtibooks.com.vn/", "https://cdn.shopify.com/s/files/1/0602/0133/6893/files/Buy-on-Penguin-Vietnamese.png?v=1774429897", "Buy Vietnamese edition"),
                    new("Polish edition", "https://www.znak.com.pl/", "https://cdn.shopify.com/s/files/1/0602/0133/6893/files/Buy-on-Penguin-Poland.png?v=1774862808", "Buy Polish edition"),
                },
                ReviewImages = new List<string>
                {
                    "https://cocowyo.com/cdn/shop/files/1-cozy-christmas-coloring-book.png?v=1751517594&width=800",
                    "https://cocowyo.com/cdn/shop/files/2-cozy-christmas-coloring-book.png?v=1751517594&width=800",
                    "https://cocowyo.com/cdn/shop/files/3-cozy-christmas-coloring-book.png?v=1751517594&width=800",
                    "https://cocowyo.com/cdn/shop/files/4-cozy-christmas-coloring-book.png?v=1751517594&width=800",
                    "https://cocowyo.com/cdn/shop/files/5-cozy-christmas-coloring-book.png?v=1751517595&width=800",
                },
                InspirationImages = new List<string>
                {
                    "https://cocowyo.com/cdn/shop/files/1-cozy-christmas-coloring-book.png?v=1751517594&width=800",
                    "https://cocowyo.com/cdn/shop/files/2-cozy-christmas-coloring-book.png?v=1751517594&width=800",
                    "https://cocowyo.com/cdn/shop/files/3-cozy-christmas-coloring-book.png?v=1751517594&width=800",
                    "https://cocowyo.com/cdn/shop/files/4-cozy-christmas-coloring-book.png?v=1751517594&width=800",
                },
                Tags = new List<string> { "christmas", "cozy", "holiday", "penguin" },
                PublishedAt = DateTime.Parse("2026-03-01"),
            },
            // 2
            new Product
            {
                Slug = "comfy-corner-coloring-book",
                Title = "Comfy Corner Coloring Book",
                Excerpt = "Quiet spaces of calm, creativity, and comfort, with peaceful scenes made for unwinding at home.",
                Description = new List<string>
                {
                    "Comfy Corner follows small, lived-in rooms and gentle creative spaces where the page feels warm without feeling busy.",
                    "This learning clone keeps the product text brief so the fixture can be replaced with original copy later.",
                },
                PriceCents = 999,
                CompareAtPriceCents = null,
                Available = false,
                ProductType = ProductType.Physical,
                Images = new List<string>
                {
                    "https://cdn.shopify.com/s/files/1/0602/0133/6893/files/1-comfy-days-coloring-book.png?v=1775731278",
                    "https://cdn.shopify.com/s/files/1/0602/0133/6893/files/2-Comfy-Corner-coloring-book.png?v=1775731278",
                    "https://cdn.shopify.com/s/files/1/0602/0133/6893/files/3-Comfy-Corner-coloring-book.png?v=1775731278",
                },
                Options = defaultOptions,
                SourceLinks = new List<SourceLink>
                {
                    new("Penguin Random House", "https://www.penguinrandomhouse.com/", null, null),
                },
                ReviewImages = null,
                InspirationImages = null,
                Tags = new List<string> { "comfy", "corner", "calm", "penguin" },
                PublishedAt = DateTime.Parse("2026-03-27"),
            },
            // 3
            new Product
            {
                Slug = "little-cuddles-coloring-book-spiral-bound-and-sticker-set",
                Title = "Little Cuddles Coloring Book (Spiral-bound) & Sticker Set",
                Excerpt = "Cute animal friends and cozy daily moments in a spiral-bound book with a sticker set.",
                Description = new List<string>
                {
                    "Sized like a compact cozy coloring book, Little Cuddles centers gentle daily activities and simple illustrations.",
                    "The spiral-bound and sticker-set presentation is represented here as a local storefront option.",
                },
                PriceCents = 1099,
                CompareAtPriceCents = 1299,
                Available = true,
                ProductType = ProductType.Physical,
                Images = new List<string>
                {
                    "https://cdn.shopify.com/s/files/1/0602/0133/6893/files/little-cuddles-spiral-and-sticky-set.png?v=1772695880",
                },
                Options = defaultOptions,
                SourceLinks = null,
                ReviewImages = null,
                InspirationImages = null,
                Tags = new List<string> { "little cuddles", "spiral", "sticker", "animal" },
                PublishedAt = DateTime.Parse("2026-02-12"),
            },
            // 4
            new Product
            {
                Slug = "cozy-friends-vinyl-sticker-pack-100pcs",
                Title = "Cozy Friends Vinyl Sticker Pack (100 pieces)",
                Excerpt = "A 100-piece vinyl sticker pack with cozy character designs and a semi-matte finish.",
                Description = new List<string>
                {
                    "A cheerful pack of waterproof stickers for decorating notebooks, devices, and small everyday objects.",
                    "The clone treats this as a sticker product with sale pricing and wishlist/cart support.",
                },
                PriceCents = 999,
                CompareAtPriceCents = 1599,
                Available = true,
                ProductType = ProductType.Sticker,
                Images = new List<string>
                {
                    "https://cdn.shopify.com/s/files/1/0602/0133/6893/files/1-cozy-friends-vinyl-sticker-packs-new.png?v=1777944846",
                },
                Options = defaultOptions,
                SourceLinks = null,
                ReviewImages = null,
                InspirationImages = null,
                Tags = new List<string> { "sticker", "cozy friends", "vinyl", "sale" },
                PublishedAt = DateTime.Parse("2026-05-01"),
            },
            // 5
            new Product
            {
                Slug = "cute-things-vinyl-sticker-pack-100pcs",
                Title = "Cute Things Vinyl Sticker Pack (100 pieces)",
                Excerpt = "A playful vinyl sticker pack with tiny cute things for decorating favorite items.",
                Description = new List<string>
                {
                    "This sale item mirrors the public sticker pack card shape: image, short teaser, compare-at price, and wishlist action.",
                },
                PriceCents = 999,
                CompareAtPriceCents = 1599,
                Available = true,
                ProductType = ProductType.Sticker,
                Images = new List<string>
                {
                    "https://cdn.shopify.com/s/files/1/0602/0133/6893/files/1-cute-things-vinyl-sticker-packs-new.png?v=1777944906",
                },
                Options = defaultOptions,
                SourceLinks = null,
                ReviewImages = null,
                InspirationImages = null,
                Tags = new List<string> { "sticker", "cute things", "vinyl", "sale" },
                PublishedAt = DateTime.Parse("2026-05-01"),
            },
            // 6
            new Product
            {
                Slug = "cozy-friends-coloring-book",
                Title = "Cozy Friends Coloring Book",
                Excerpt = "Familiar everyday activities with super cute animal characters and hidden little stories.",
                Description = new List<string>
                {
                    "Cozy Friends is one of the recognizable Zoe&Book-style titles, with gentle daily scenes and animal characters.",
                },
                PriceCents = 999,
                CompareAtPriceCents = null,
                Available = true,
                ProductType = ProductType.Physical,
                Images = new List<string>
                {
                    "https://cdn.shopify.com/s/files/1/0602/0133/6893/files/1-cozy-friends-coloring-book_1e6f3fa6-a8d0-41b9-92f8-975d68ae5adf.png?v=1775734470",
                },
                Options = defaultOptions,
                SourceLinks = null,
                ReviewImages = null,
                InspirationImages = null,
                Tags = new List<string> { "cozy friends", "animal", "cute", "bestseller" },
                PublishedAt = DateTime.Parse("2024-09-01"),
            },
            // 7
            new Product
            {
                Slug = "girl-moments-coloring-book",
                Title = "Girl Moments Coloring Book",
                Excerpt = "Warm familiar daily activities and cozy scenes made for calm coloring sessions.",
                Description = new List<string>
                {
                    "Girl Moments focuses on soft everyday scenes, gentle self-care rhythms, and a quiet mood.",
                },
                PriceCents = 999,
                CompareAtPriceCents = null,
                Available = true,
                ProductType = ProductType.Physical,
                Images = new List<string>
                {
                    "https://cdn.shopify.com/s/files/1/0602/0133/6893/files/1-girl-moments-coloring-book_7c63e197-0a4f-45e0-a292-6ccc40f8303f.png?v=1775733493",
                },
                Options = defaultOptions,
                SourceLinks = null,
                ReviewImages = null,
                InspirationImages = null,
                Tags = new List<string> { "girl moments", "daily", "classic", "bestseller" },
                PublishedAt = DateTime.Parse("2024-08-01"),
            },
            // 8
            new Product
            {
                Slug = "girl-moments-coloring-book-vol-2",
                Title = "Girl Moments Coloring Book Vol 2",
                Excerpt = "A gentle celebration of everyday life, journaling, slow living, and small personal rituals.",
                Description = new List<string>
                {
                    "The second Girl Moments volume keeps the same cozy tone while adding new everyday scenes.",
                },
                PriceCents = 999,
                CompareAtPriceCents = null,
                Available = true,
                ProductType = ProductType.Physical,
                Images = new List<string>
                {
                    "https://cdn.shopify.com/s/files/1/0602/0133/6893/files/1-girl-moments-coloring-book-vol-2.png?v=1775731706",
                },
                Options = defaultOptions,
                SourceLinks = null,
                ReviewImages = null,
                InspirationImages = null,
                Tags = new List<string> { "girl moments", "vol 2", "classic", "cozy" },
                PublishedAt = DateTime.Parse("2025-02-01"),
            },
            // 9
            new Product
            {
                Slug = "ocean-scene-coloring-book",
                Title = "Ocean Scene Coloring Book",
                Excerpt = "Bold and easy ocean scenes with fish, coral, and calm underwater details.",
                Description = new List<string>
                {
                    "A nature-themed title with larger simple illustrations, useful for the store's classic collection rows.",
                },
                PriceCents = 999,
                CompareAtPriceCents = null,
                Available = true,
                ProductType = ProductType.Physical,
                Images = new List<string>
                {
                    "https://cdn.shopify.com/s/files/1/0602/0133/6893/files/1-ocean-scene-coloring-book.png?v=1775731194",
                },
                Options = defaultOptions,
                SourceLinks = null,
                ReviewImages = null,
                InspirationImages = null,
                Tags = new List<string> { "ocean", "scene", "classic", "bold easy" },
                PublishedAt = DateTime.Parse("2024-03-01"),
            },
            // 10
            new Product
            {
                Slug = "little-corner-coloring-book",
                Title = "Little Corner Coloring Book",
                Excerpt = "Cozy rooms, tiny decorated spaces, dreamy bedrooms, kitchens, and warm corners.",
                Description = new List<string>
                {
                    "Little Corner anchors the room-and-interior side of the Zoe&Book catalog.",
                },
                PriceCents = 999,
                CompareAtPriceCents = null,
                Available = true,
                ProductType = ProductType.Physical,
                Images = new List<string>
                {
                    "https://cdn.shopify.com/s/files/1/0602/0133/6893/files/1-little-corner-coloring-book_291097bb-8c81-4611-aa8e-c9489d12a966.png?v=1775734428",
                },
                Options = defaultOptions,
                SourceLinks = null,
                ReviewImages = null,
                InspirationImages = null,
                Tags = new List<string> { "little corner", "room", "interior", "bestseller" },
                PublishedAt = DateTime.Parse("2024-06-01"),
            },
            // 11
            new Product
            {
                Slug = "cozy-days-coloring-book",
                Title = "Cozy Days Coloring Book",
                Excerpt = "A cute cozy day with beach moments, movie nights, and gentle daily scenes.",
                Description = new List<string>
                {
                    "Cozy Days supports the homepage trending terms and the cute collection taxonomy.",
                },
                PriceCents = 999,
                CompareAtPriceCents = null,
                Available = true,
                ProductType = ProductType.Physical,
                Images = new List<string>
                {
                    "https://cdn.shopify.com/s/files/1/0602/0133/6893/files/1-cozy-days-coloring-book_634ce46b-290b-4d6c-8b71-862b0c268929.png?v=1775731500",
                },
                Options = defaultOptions,
                SourceLinks = null,
                ReviewImages = null,
                InspirationImages = null,
                Tags = new List<string> { "cozy days", "cute", "daily", "beach" },
                PublishedAt = DateTime.Parse("2024-10-01"),
            },
            // 12
            new Product
            {
                Slug = "cozy-cuties-coloring-book",
                Title = "Cozy Cuties Coloring Book",
                Excerpt = "Baby animals, sunny skies, and sweet simple scenes for warm-day coloring.",
                Description = new List<string>
                {
                    "This collab title represents the public Penguin-linked collection rows.",
                },
                PriceCents = 899,
                CompareAtPriceCents = null,
                Available = true,
                ProductType = ProductType.Physical,
                Images = new List<string>
                {
                    "https://cdn.shopify.com/s/files/1/0602/0133/6893/files/1-cozy-cuties-coloring-book.png?v=1775733336",
                },
                Options = defaultOptions,
                SourceLinks = null,
                ReviewImages = null,
                InspirationImages = null,
                Tags = new List<string> { "cozy cuties", "cute", "collab", "spring" },
                PublishedAt = DateTime.Parse("2025-09-01"),
            },
            // 13
            new Product
            {
                Slug = "cozy-corner-coloring-book",
                Title = "Cozy Corner Coloring Book",
                Excerpt = "A follow-up to Little Corner with reading nooks, bakeries, kitchens, and homey details.",
                Description = new List<string>
                {
                    "Cozy Corner keeps the small-space collection theme and gives product pages another collab-like route.",
                },
                PriceCents = 899,
                CompareAtPriceCents = null,
                Available = true,
                ProductType = ProductType.Physical,
                Images = new List<string>
                {
                    "https://cdn.shopify.com/s/files/1/0602/0133/6893/files/1-cozy-corner-coloring-book.png?v=1775731962",
                },
                Options = defaultOptions,
                SourceLinks = null,
                ReviewImages = null,
                InspirationImages = null,
                Tags = new List<string> { "cozy corner", "little corner", "collab", "rooms" },
                PublishedAt = DateTime.Parse("2025-08-01"),
            },
            // 14
            new Product
            {
                Slug = "spooky-cutie-coloring-book",
                Title = "Spooky Cutie Coloring Book",
                Excerpt = "A peculiar cozy world where cute meets spooky in mystical little scenes.",
                Description = new List<string>
                {
                    "Spooky Cutie appears in search trends and seasonal browsing, so it is included as a full product route.",
                },
                PriceCents = 999,
                CompareAtPriceCents = null,
                Available = true,
                ProductType = ProductType.Physical,
                Images = new List<string>
                {
                    "https://cdn.shopify.com/s/files/1/0602/0133/6893/files/1-spooky-cutie-coloring-book_0e2baac1-9f03-4599-803a-dc39922ca693.png?v=1775733933",
                },
                Options = defaultOptions,
                SourceLinks = null,
                ReviewImages = null,
                InspirationImages = null,
                Tags = new List<string> { "spooky cuties", "spooky", "seasonal", "halloween" },
                PublishedAt = DateTime.Parse("2024-10-15"),
            },
            // 15
            new Product
            {
                Slug = "spooky-cutie-coloring-book-vol-2",
                Title = "Spooky Cutie Coloring Book Vol 2",
                Excerpt = "Eerie meets adorable in another cozy-odd volume of spooky character pages.",
                Description = new List<string>
                {
                    "Volume two supports the seasonal and trending search experience.",
                },
                PriceCents = 999,
                CompareAtPriceCents = null,
                Available = true,
                ProductType = ProductType.Physical,
                Images = new List<string>
                {
                    "https://cdn.shopify.com/s/files/1/0602/0133/6893/files/1-spooky-cuties-coloring-book_07664ba9-b776-4682-9d0e-f79c4a91d583.png?v=1775731609",
                },
                Options = defaultOptions,
                SourceLinks = null,
                ReviewImages = null,
                InspirationImages = null,
                Tags = new List<string> { "spooky cuties", "vol 2", "seasonal", "halloween" },
                PublishedAt = DateTime.Parse("2025-10-01"),
            },
            // 16
            new Product
            {
                Slug = "comfy-days-coloring-book-spiral-bound-and-sticker-set",
                Title = "Comfy Days Coloring Book (Spiral-bound) & Sticker Set",
                Excerpt = "A spiral-bound Comfy Days edition with warm everyday scenes and a sticker set.",
                Description = new List<string>
                {
                    "This product gives the spiral-bound collection another sale-card example.",
                },
                PriceCents = 1099,
                CompareAtPriceCents = 1299,
                Available = true,
                ProductType = ProductType.Physical,
                Images = new List<string>
                {
                    "https://cdn.shopify.com/s/files/1/0602/0133/6893/files/comfy-days-spiral-and-sticker-set.png?v=1772695816",
                },
                Options = defaultOptions,
                SourceLinks = null,
                ReviewImages = null,
                InspirationImages = null,
                Tags = new List<string> { "comfy days", "spiral", "sticker", "sale" },
                PublishedAt = DateTime.Parse("2026-02-01"),
            },
            // 17
            new Product
            {
                Slug = "girl-moments-coloring-book-vol-2-spiral-bound-and-sticky-set",
                Title = "Girl Moments Vol. 2 Coloring Book (Spiral-bound) & Sticker Set",
                Excerpt = "A spiral-bound Girl Moments Vol. 2 edition with stickers and mindful everyday scenes.",
                Description = new List<string>
                {
                    "This mirrors the visible long product-card title behavior on collection pages.",
                },
                PriceCents = 1099,
                CompareAtPriceCents = 1299,
                Available = true,
                ProductType = ProductType.Physical,
                Images = new List<string>
                {
                    "https://cdn.shopify.com/s/files/1/0602/0133/6893/files/1-girl-moments-vol2-coloring-book-sticker-set.png?v=1774595823",
                },
                Options = defaultOptions,
                SourceLinks = null,
                ReviewImages = null,
                InspirationImages = null,
                Tags = new List<string> { "girl moments", "spiral", "sticker", "sale" },
                PublishedAt = DateTime.Parse("2026-02-10"),
            },
            // 18
            new Product
            {
                Slug = "combo-1-little-cuddles",
                Title = "Combo 1: Little Cuddles",
                Excerpt = "A digital Little Cuddles set with tiny adventures, sweet moments, and printable pages.",
                Description = new List<string>
                {
                    "Digital products simulate Etsy-style instant downloads in the local clone.",
                },
                PriceCents = 299,
                CompareAtPriceCents = null,
                Available = true,
                ProductType = ProductType.Digital,
                Images = new List<string>
                {
                    "https://cdn.shopify.com/s/files/1/0602/0133/6893/files/1-Little-cuddles-digital-book-combo1.png?v=1778516575",
                },
                Options = defaultOptions,
                SourceLinks = new List<SourceLink>
                {
                    new("Etsy", "https://www.etsy.com/", null, null),
                },
                ReviewImages = null,
                InspirationImages = null,
                Tags = new List<string> { "digital", "little cuddles", "combo" },
                PublishedAt = DateTime.Parse("2025-04-09"),
            },
            // 19
            new Product
            {
                Slug = "combo-2-little-cuddles",
                Title = "Combo 2: Little Cuddles",
                Excerpt = "A cozy digital set with harvest, bath, school, and quiet daily coloring scenes.",
                Description = new List<string>
                {
                    "A representative digital product for the Digital homepage row.",
                },
                PriceCents = 299,
                CompareAtPriceCents = null,
                Available = true,
                ProductType = ProductType.Digital,
                Images = new List<string>
                {
                    "https://cdn.shopify.com/s/files/1/0602/0133/6893/files/1-Little-cuddles-digital-book-combo2.png?v=1778517151",
                },
                Options = defaultOptions,
                SourceLinks = new List<SourceLink>
                {
                    new("Etsy", "https://www.etsy.com/", null, null),
                },
                ReviewImages = null,
                InspirationImages = null,
                Tags = new List<string> { "digital", "little cuddles", "combo" },
                PublishedAt = DateTime.Parse("2025-04-09"),
            },
            // 20
            new Product
            {
                Slug = "combo-3-little-cuddles",
                Title = "Combo 3: Little Cuddles",
                Excerpt = "A digital Little Cuddles set with space, beach, exhibition, and home scenes.",
                Description = new List<string>
                {
                    "Digital fixture used to reproduce the compact Digital section on the homepage.",
                },
                PriceCents = 299,
                CompareAtPriceCents = null,
                Available = true,
                ProductType = ProductType.Digital,
                Images = new List<string>
                {
                    "https://cdn.shopify.com/s/files/1/0602/0133/6893/files/1-Little-cuddles-digital-book-combo3.png?v=1778517540",
                },
                Options = defaultOptions,
                SourceLinks = new List<SourceLink>
                {
                    new("Etsy", "https://www.etsy.com/", null, null),
                },
                ReviewImages = null,
                InspirationImages = null,
                Tags = new List<string> { "digital", "little cuddles", "combo" },
                PublishedAt = DateTime.Parse("2025-04-09"),
            },
            // 21
            new Product
            {
                Slug = "combo-4-little-cuddles",
                Title = "Combo 4: Little Cuddles",
                Excerpt = "A digital Little Cuddles set with music, baking, tidying, and warm spaces.",
                Description = new List<string>
                {
                    "Digital fixture with the same card shape as the public digital products.",
                },
                PriceCents = 299,
                CompareAtPriceCents = null,
                Available = true,
                ProductType = ProductType.Digital,
                Images = new List<string>
                {
                    "https://cdn.shopify.com/s/files/1/0602/0133/6893/files/1-Little-cuddles-digital-book-combo4.png?v=1778517689",
                },
                Options = defaultOptions,
                SourceLinks = new List<SourceLink>
                {
                    new("Etsy", "https://www.etsy.com/", null, null),
                },
                ReviewImages = null,
                InspirationImages = null,
                Tags = new List<string> { "digital", "little cuddles", "combo" },
                PublishedAt = DateTime.Parse("2025-04-09"),
            },
            // 22
            new Product
            {
                Slug = "cozy-friends-coloring-pages",
                Title = "Cozy Friends Coloring Pages",
                Excerpt = "A small digital set from Cozy Friends with printable coloring pages.",
                Description = new List<string>
                {
                    "A low-price digital product for search, filters, and price sorting.",
                },
                PriceCents = 149,
                CompareAtPriceCents = null,
                Available = true,
                ProductType = ProductType.Digital,
                Images = new List<string>
                {
                    "https://cdn.shopify.com/s/files/1/0602/0133/6893/files/1-Cozy-Friends-digital-coloring-book.png?v=1778666159",
                },
                Options = defaultOptions,
                SourceLinks = new List<SourceLink>
                {
                    new("Etsy", "https://www.etsy.com/", null, null),
                },
                ReviewImages = null,
                InspirationImages = null,
                Tags = new List<string> { "digital", "cozy friends", "printable" },
                PublishedAt = DateTime.Parse("2025-04-10"),
            },
            // 23
            new Product
            {
                Slug = "spooky-cutie-coloring-pages",
                Title = "Spooky Cutie Coloring Pages",
                Excerpt = "A small printable digital set where cute meets spooky and cozy.",
                Description = new List<string>
                {
                    "A seasonal digital item for search and the Digital collection.",
                },
                PriceCents = 149,
                CompareAtPriceCents = null,
                Available = true,
                ProductType = ProductType.Digital,
                Images = new List<string>
                {
                    "https://cdn.shopify.com/s/files/1/0602/0133/6893/files/1-Spooky-cutie-digital-book.png?v=1778518360",
                },
                Options = defaultOptions,
                SourceLinks = new List<SourceLink>
                {
                    new("Etsy", "https://www.etsy.com/", null, null),
                },
                ReviewImages = null,
                InspirationImages = null,
                Tags = new List<string> { "digital", "spooky cuties", "seasonal" },
                PublishedAt = DateTime.Parse("2025-04-10"),
            },
            // 24
            new Product
            {
                Slug = "comfy-patterns-coloring-book",
                Title = "Comfy Patterns Coloring Book",
                Excerpt = "Large, bold, easy-to-follow pattern designs made for a relaxed coloring process.",
                Description = new List<string>
                {
                    "Comfy Patterns gives the Patterns collection a dedicated physical book route.",
                },
                PriceCents = 999,
                CompareAtPriceCents = null,
                Available = true,
                ProductType = ProductType.Physical,
                Images = new List<string>
                {
                    "https://cdn.shopify.com/s/files/1/0602/0133/6893/files/1-comfy-patterns-coloring-book_14.png?v=1775734214",
                },
                Options = defaultOptions,
                SourceLinks = null,
                ReviewImages = null,
                InspirationImages = null,
                Tags = new List<string> { "patterns", "bold easy", "comfy" },
                PublishedAt = DateTime.Parse("2024-05-01"),
            },
            // 25
            new Product
            {
                Slug = "cute-groovy-coloring-book",
                Title = "Cute & Groovy Coloring Book",
                Excerpt = "Bold, easy coloring pages with cute and vintage groovy things.",
                Description = new List<string>
                {
                    "Cute & Groovy appears in the patterns and bold/easy side of the catalog.",
                },
                PriceCents = 999,
                CompareAtPriceCents = null,
                Available = true,
                ProductType = ProductType.Physical,
                Images = new List<string>
                {
                    "https://cdn.shopify.com/s/files/1/0602/0133/6893/files/1-cute-and-groovy-coloring-book.png?v=1775734345",
                },
                Options = defaultOptions,
                SourceLinks = null,
                ReviewImages = null,
                InspirationImages = null,
                Tags = new List<string> { "groovy", "patterns", "bold easy" },
                PublishedAt = DateTime.Parse("2024-05-15"),
            },
            // 26
            new Product
            {
                Slug = "food-drink-sweets-coloring-book",
                Title = "Food Drink & Sweets Coloring Book",
                Excerpt = "Bold pages with foods, snacks, drinks, and sweet treats.",
                Description = new List<string>
                {
                    "A classic bold/easy product with a food theme.",
                },
                PriceCents = 999,
                CompareAtPriceCents = null,
                Available = true,
                ProductType = ProductType.Physical,
                Images = new List<string>
                {
                    "https://cdn.shopify.com/s/files/1/0602/0133/6893/files/1-food-drink-and-sweet-coloring-book.png?v=1775734179",
                },
                Options = defaultOptions,
                SourceLinks = null,
                ReviewImages = null,
                InspirationImages = null,
                Tags = new List<string> { "food", "drink", "sweets", "bold easy" },
                PublishedAt = DateTime.Parse("2024-02-01"),
            },
            // 27
            new Product
            {
                Slug = "mini-coloring-book",
                Title = "Mini Coloring Book",
                Excerpt = "A free mini coloring book used in the public freebies area.",
                Description = new List<string>
                {
                    "The freebie route needs at least one zero-price product-like card.",
                },
                PriceCents = 0,
                CompareAtPriceCents = null,
                Available = true,
                ProductType = ProductType.Freebie,
                Images = new List<string>
                {
                    "https://cdn.shopify.com/s/files/1/0602/0133/6893/files/1-Mini-coloring-book-Front.png?v=1778068163",
                },
                Options = defaultOptions,
                SourceLinks = null,
                ReviewImages = null,
                InspirationImages = null,
                Tags = new List<string> { "freebie", "mini", "digital" },
                PublishedAt = DateTime.Parse("2026-04-01"),
            }
        );
        await db.SaveChangesAsync();
    }
}
