using JovieJoy.Api.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace JovieJoy.Api.Data.Seed;

public static class SeedAbout
{
    public static async Task RunAsync(AppDbContext db)
    {
        if (await db.AboutSections.AnyAsync()) return;

        db.AboutSections.AddRange(
            new AboutSection
            {
                Title = "Little team with a cozy dream",
                Body = new List<string>
                {
                    "Zoe&Book feels intentionally small and friendly: a creative group built around drawing, editing, coloring, and sharing comforting books.",
                    "The shared thread is simple: art can be soft, personal, and healing.",
                },
                Image = "https://cocowyo.com/cdn/shop/files/about-us-1.png?v=1776237984&width=1500",
                Alt = "Zoe&Book team with a cozy dream",
                Background = "#f1eef7",
                SortIndex = 0,
            },
            new AboutSection
            {
                Title = "Life can be uncomfy, we know that",
                Body = new List<string>
                {
                    "The brand story leans into anxious, overwhelming days and answers them with simple pages made for slower moments.",
                    "The books are presented as small reminders that calm can return one colored shape at a time.",
                },
                Image = "https://cocowyo.com/cdn/shop/files/about-us-2.png?v=1776239460&width=1500",
                Alt = "Zoe&Book comfort illustration",
                Background = "#fef4eb",
                SortIndex = 1,
            },
            new AboutSection
            {
                Title = "A corner sparks tender creativity",
                Body = new List<string>
                {
                    "The studio mood is warm and a little lived-in, with sketches, screens, wires, and page ideas all sitting together.",
                    "That imperfect corner is part of the charm: it gives the books their soft, hand-made feeling.",
                },
                Image = "https://cocowyo.com/cdn/shop/files/about-us-3.png?v=1776239458&width=1500",
                Alt = "Zoe&Book creative corner",
                Background = "#f3fbe6",
                SortIndex = 2,
            },
            new AboutSection
            {
                Title = "We're not perfect!",
                Body = new List<string>
                {
                    "The page closes with an open, human tone: the team is still learning, improving, and listening.",
                    "Feedback, ideas, and friendly notes are part of the journey.",
                },
                Image = "https://cocowyo.com/cdn/shop/files/about-us-4.png?v=1776239458&width=1500",
                Alt = "Zoe&Book imperfect team note",
                Background = "#edf4fc",
                SortIndex = 3,
            }
        );
        await db.SaveChangesAsync();
    }
}
