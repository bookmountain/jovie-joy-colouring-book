using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace JovieJoy.Api.Migrations
{
    /// <inheritdoc />
    public partial class RemovePhysicalFaqRetailerLinks : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                "UPDATE faqs SET \"Links\" = NULL WHERE \"Slug\" = 'where-buy-physical';");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                "UPDATE faqs SET \"Links\" = " +
                "'[{\"Label\":\"Amazon\",\"Href\":\"https://www.amazon.com/\"}," +
                "{\"Label\":\"Penguin Random House\",\"Href\":\"https://www.penguinrandomhouse.com/\"}]'::jsonb " +
                "WHERE \"Slug\" = 'where-buy-physical' AND \"Links\" IS NULL;");
        }
    }
}
