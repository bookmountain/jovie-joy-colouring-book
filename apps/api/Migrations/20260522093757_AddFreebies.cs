using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace JovieJoy.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddFreebies : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "freebies",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Slug = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Title = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    Excerpt = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    Description = table.Column<string>(type: "jsonb", nullable: false),
                    CoverImage = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    FilePath = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    FileKind = table.Column<string>(type: "character varying(8)", maxLength: 8, nullable: false),
                    FileSizeBytes = table.Column<long>(type: "bigint", nullable: false),
                    SortIndex = table.Column<int>(type: "integer", nullable: false),
                    Published = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_freebies", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "freebie_requests",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    FreebieId = table.Column<Guid>(type: "uuid", nullable: false),
                    Email = table.Column<string>(type: "character varying(320)", maxLength: 320, nullable: false),
                    Token = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    ExpiresAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    OptedIntoNewsletter = table.Column<bool>(type: "boolean", nullable: false),
                    DownloadCount = table.Column<int>(type: "integer", nullable: false),
                    FirstDownloadedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    LastDownloadedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    Ip = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    UserAgent = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_freebie_requests", x => x.Id);
                    table.ForeignKey(
                        name: "FK_freebie_requests_freebies_FreebieId",
                        column: x => x.FreebieId,
                        principalTable: "freebies",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_freebie_requests_Email",
                table: "freebie_requests",
                column: "Email");

            migrationBuilder.CreateIndex(
                name: "IX_freebie_requests_FreebieId",
                table: "freebie_requests",
                column: "FreebieId");

            migrationBuilder.CreateIndex(
                name: "IX_freebie_requests_Token",
                table: "freebie_requests",
                column: "Token",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_freebies_Slug",
                table: "freebies",
                column: "Slug",
                unique: true);

            // Backfill: move rows from products (ProductType = 3 = Freebie) into the new freebies table,
            // then remove those products, their product_collections rows, and the now-empty 'freebies' collection.
            // Freebies are no longer products; they live in their own table.
            // See docs/superpowers/specs/2026-05-22-freebie-redesign-design.md for background.
            migrationBuilder.Sql(@"
INSERT INTO freebies (
    ""Id"", ""Slug"", ""Title"", ""Excerpt"", ""Description"", ""CoverImage"",
    ""FilePath"", ""FileKind"", ""FileSizeBytes"", ""SortIndex"", ""Published"",
    ""CreatedAt"", ""UpdatedAt"")
SELECT
    ""Id"", ""Slug"", ""Title"", ""Excerpt"", ""Description"",
    COALESCE(""Images""->>0, ''),
    COALESCE(""PdfPath"", ''),
    'pdf', 0, 0, true,
    ""CreatedAt"", ""UpdatedAt""
FROM products
WHERE ""ProductType"" = 3;
");

            migrationBuilder.Sql(@"
DELETE FROM product_collections
 WHERE ""ProductId"" IN (SELECT ""Id"" FROM products WHERE ""ProductType"" = 3);
DELETE FROM products WHERE ""ProductType"" = 3;
DELETE FROM collections WHERE ""Slug"" = 'freebies';
");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "freebie_requests");

            migrationBuilder.DropTable(
                name: "freebies");
        }
    }
}
