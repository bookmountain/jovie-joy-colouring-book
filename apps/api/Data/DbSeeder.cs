using Microsoft.EntityFrameworkCore;

namespace JovieJoy.Api.Data;

public static class DbSeeder
{
    public static Task SeedAsync(AppDbContext db, IConfiguration config) => Task.CompletedTask;
    // Full implementation in Task 21 (after all Seed/* files exist)
}
