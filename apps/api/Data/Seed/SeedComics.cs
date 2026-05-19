using JovieJoy.Api.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace JovieJoy.Api.Data.Seed;

public static class SeedComics
{
    public static async Task RunAsync(AppDbContext db)
    {
        if (await db.ComicWorlds.AnyAsync()) return;

        var spookyCutie = new ComicWorld { Title = "Spooky Cutie World", SortIndex = 0 };
        var cozyFriend = new ComicWorld { Title = "Cozy Friend World", SortIndex = 1 };
        var lalaFriends = new ComicWorld { Title = "Lala Friends World", SortIndex = 2 };
        db.ComicWorlds.AddRange(spookyCutie, cozyFriend, lalaFriends);
        await db.SaveChangesAsync();

        db.Comics.AddRange(
            // Spooky Cutie World
            new Comic
            {
                WorldId = spookyCutie.Id,
                Title = "Twisted Potato",
                Description = "Remote work turns into a very involved helper moment.",
                HasDownload = true,
                SortIndex = 0,
                Images = new List<ComicImage>
                {
                    new("https://cocowyo.com/cdn/shop/files/1-twisted-potato-comic-by-coco-wyo_f68abcb9-e113-4243-8e95-076ba1485925.png?v=1754989095&width=800", "Twisted Potato comic page 1"),
                    new("https://cocowyo.com/cdn/shop/files/2-twisted-potato-comic-by-coco-wyo_e67bc9fb-f666-4fbc-9ad9-bb74a8d4a916.png?v=1754989070&width=800", "Twisted Potato comic page 2"),
                    new("https://cocowyo.com/cdn/shop/files/3-twisted-potato-comic-by-coco-wyo.png?v=1754989119&width=800", "Twisted Potato comic page 3"),
                },
            },
            new Comic
            {
                WorldId = spookyCutie.Id,
                Title = "Fried Egg",
                Description = "The first cooking lesson gets sunny and silly.",
                HasDownload = true,
                SortIndex = 1,
                Images = new List<ComicImage>
                {
                    new("https://cocowyo.com/cdn/shop/files/2-twisted-potato-comic-by-coco-wyo.png?v=1754986788&width=800", "Fried Egg comic page 1"),
                    new("https://cocowyo.com/cdn/shop/files/1-twisted-potato-comic-by-coco-wyo.png?v=1754986913&width=800", "Fried Egg comic page 2"),
                },
            },

            // Cozy Friend World
            new Comic
            {
                WorldId = cozyFriend.Id,
                Title = "\"That's my type\" of day",
                Description = "A soft routine for recharging with quiet time.",
                HasDownload = true,
                SortIndex = 0,
                Images = new List<ComicImage>
                {
                    new("https://cocowyo.com/cdn/shop/files/1-thats-my-type-of-day-comic-by-coco-wyo.png?v=1754304573&width=800", "That's my type of day comic page 1"),
                    new("https://cocowyo.com/cdn/shop/files/2-thats-my-type-of-day-comic-by-coco-wyo.png?v=1754304601&width=800", "That's my type of day comic page 2"),
                },
            },
            new Comic
            {
                WorldId = cozyFriend.Id,
                Title = "Aquarium Trip",
                Description = "Duckie visits the aquarium and makes a sweet memory.",
                HasDownload = true,
                SortIndex = 1,
                Images = new List<ComicImage>
                {
                    new("https://cocowyo.com/cdn/shop/files/aquarium-trip-coloring-book-1.png?v=1753155608&width=800", "Aquarium Trip comic page 1"),
                    new("https://cocowyo.com/cdn/shop/files/aquarium-trip-coloring-book-2.png?v=1753155684&width=800", "Aquarium Trip comic page 2"),
                    new("https://cocowyo.com/cdn/shop/files/aquarium-trip-coloring-book-3.png?v=1753155861&width=800", "Aquarium Trip comic page 3"),
                },
            },
            new Comic
            {
                WorldId = cozyFriend.Id,
                Title = "Crocie's Bakery",
                Description = "Crocie starts the bakery dream with a first cake.",
                HasDownload = true,
                SortIndex = 2,
                Images = new List<ComicImage>
                {
                    new("https://cocowyo.com/cdn/shop/files/crocie-bakery-coloring-book-1_c4c25bb7-4d3f-49c1-85ff-8a07649a64bd.png?v=1753157679&width=800", "Crocie's Bakery comic page 1"),
                    new("https://cocowyo.com/cdn/shop/files/crocies_s-bakery-2.png?v=1753157563&width=800", "Crocie's Bakery comic page 2"),
                    new("https://cocowyo.com/cdn/shop/files/crocie-bakery-coco-wyo-3.png?v=1753157593&width=800", "Crocie's Bakery comic page 3"),
                },
            },
            new Comic
            {
                WorldId = cozyFriend.Id,
                Title = "Crocie's Bakery Menu",
                Description = "A sweet menu of tiny bakery picks.",
                HasDownload = false,
                SortIndex = 3,
                Images = new List<ComicImage>
                {
                    new("https://cocowyo.com/cdn/shop/files/crocies-bakery-menu-coco-wyo-5.png?v=1752739261&width=800", "Crocie's Bakery Menu comic page 1"),
                    new("https://cocowyo.com/cdn/shop/files/crocies-bakery-menu-coco-wyo-2.png?v=1752739261&width=800", "Crocie's Bakery Menu comic page 2"),
                    new("https://cocowyo.com/cdn/shop/files/crocies-bakery-menu-coco-wyo-6.png?v=1752739261&width=800", "Crocie's Bakery Menu comic page 3"),
                    new("https://cocowyo.com/cdn/shop/files/crocies-bakery-menu-coco-wyo-7.png?v=1752739261&width=800", "Crocie's Bakery Menu comic page 4"),
                    new("https://cocowyo.com/cdn/shop/files/crocies-bakery-menu-coco-wyo-4.png?v=1752739260&width=800", "Crocie's Bakery Menu comic page 5"),
                    new("https://cocowyo.com/cdn/shop/files/crocies-bakery-menu-coco-wyo-3.png?v=1752739261&width=800", "Crocie's Bakery Menu comic page 6"),
                    new("https://cocowyo.com/cdn/shop/files/crocies-bakery-menu-coco-wyo-1.png?v=1752739261&width=800", "Crocie's Bakery Menu comic page 7"),
                    new("https://cocowyo.com/cdn/shop/files/crocies-bakery-menu-coco-wyo-8.png?v=1752739261&width=800", "Crocie's Bakery Menu comic page 8"),
                },
            },
            new Comic
            {
                WorldId = cozyFriend.Id,
                Title = "Grocery Day",
                Description = "A regular shopping trip becomes a tiny friend-group scene.",
                HasDownload = true,
                SortIndex = 4,
                Images = new List<ComicImage>
                {
                    new("https://cocowyo.com/cdn/shop/files/grocery-bakery-comic-by-coco-wyo.jpg?v=1753504519&width=800", "Grocery Day comic page 1"),
                    new("https://cocowyo.com/cdn/shop/files/2-grocery-day-comic-by-coco-wyo.png?v=1753505466&width=800", "Grocery Day comic page 2"),
                    new("https://cocowyo.com/cdn/shop/files/3-grocery-day-comic-by-coco-wyo.png?v=1753505520&width=800", "Grocery Day comic page 3"),
                },
            },
            new Comic
            {
                WorldId = cozyFriend.Id,
                Title = "Bugatti Challenge",
                Description = "A friendship-powered challenge with big little energy.",
                HasDownload = true,
                SortIndex = 5,
                Images = new List<ComicImage>
                {
                    new("https://cocowyo.com/cdn/shop/files/bugatti-challenge-Coco-Wyo-comic-1.png?v=1753695173&width=800", "Bugatti Challenge comic page 1"),
                    new("https://cocowyo.com/cdn/shop/files/bugatti-challenge-Coco-Wyo-comic-2.png?v=1753695206&width=800", "Bugatti Challenge comic page 2"),
                    new("https://cocowyo.com/cdn/shop/files/bugatti-challenge-Coco-Wyo-comic-3.png?v=1753695244&width=800", "Bugatti Challenge comic page 3"),
                },
            },

            // Lala Friends World
            new Comic
            {
                WorldId = lalaFriends.Id,
                Title = "Big Fish",
                Description = "A calm fishing day finds a tiny twist.",
                HasDownload = true,
                SortIndex = 0,
                Images = new List<ComicImage>
                {
                    new("https://cocowyo.com/cdn/shop/files/1-big-fish-comic-by-coco-wyo_ba04ccd2-a049-4fe8-a0a7-8a9bf9832b85.png?v=1754541116&width=800", "Big Fish comic page 1"),
                    new("https://cocowyo.com/cdn/shop/files/2-big-fish-comic-by-coco-wyo.png?v=1754541167&width=800", "Big Fish comic page 2"),
                    new("https://cocowyo.com/cdn/shop/files/3-big-fish-comic-by-coco-wyo_6df915f0-1b23-42f9-86e3-0cbeac16ed3f.png?v=1754541253&width=800", "Big Fish comic page 3"),
                },
            }
        );
        await db.SaveChangesAsync();
    }
}
