using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace JovieJoy.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddNavigationVisibility : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "Enabled",
                table: "nav_links",
                type: "boolean",
                nullable: false,
                defaultValue: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Enabled",
                table: "nav_links");
        }
    }
}
