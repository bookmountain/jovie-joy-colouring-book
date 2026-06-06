using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace JovieJoy.Api.Migrations
{
    /// <inheritdoc />
    public partial class FixSeededFreebieCover : Migration
    {
        private const string OldCover = "/uploads/freebies/covers/mini-cover.png";
        private const string NewCover = "https://cdn.shopify.com/s/files/1/0602/0133/6893/files/1-little-cuddles-coloring-book.png?v=1775731802";

        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // The seeded "Mini Coloring Book" freebie shipped with a cover path that
            // never existed on disk and 404'd on the storefront. Repoint it to a CDN
            // cover (same convention as the product/gallery seeds). Scoped to the
            // broken path so admin-edited covers are left untouched.
            migrationBuilder.Sql(
                $"UPDATE freebies SET \"CoverImage\" = '{NewCover}' WHERE \"CoverImage\" = '{OldCover}';");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                $"UPDATE freebies SET \"CoverImage\" = '{OldCover}' WHERE \"CoverImage\" = '{NewCover}';");
        }
    }
}
