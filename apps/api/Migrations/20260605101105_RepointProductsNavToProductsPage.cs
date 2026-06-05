using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace JovieJoy.Api.Migrations
{
    /// <inheritdoc />
    public partial class RepointProductsNavToProductsPage : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Repoint the "Products" nav (top-level + "Go to Products" dropdown
            // item) from the Collections index to the new /products listing page.
            // Scoped to rows still pointing at /collections so any admin-edited
            // links are left untouched. Other "Go to ..." items target
            // /collections/<slug> and won't match.
            migrationBuilder.Sql(
                "UPDATE nav_links SET \"Href\" = '/products' " +
                "WHERE \"Href\" = '/collections' AND \"Label\" IN ('Products', 'Go to Products');");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                "UPDATE nav_links SET \"Href\" = '/collections' " +
                "WHERE \"Href\" = '/products' AND \"Label\" IN ('Products', 'Go to Products');");
        }
    }
}
