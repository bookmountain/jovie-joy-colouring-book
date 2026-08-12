using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace JovieJoy.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddProductDownloadGrants : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "DownloadEmailSentAt",
                table: "orders",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DigitalFilePathAtPurchase",
                table: "order_items",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            // Best-effort rollout protection for pending sessions and historical
            // paid orders created before this migration. The live product path is
            // the only legacy source available and enables later fulfilment/retry.
            migrationBuilder.Sql(
                """
                UPDATE "order_items" AS oi
                SET "DigitalFilePathAtPurchase" = p."PdfPath"
                FROM "orders" AS o, "products" AS p
                WHERE oi."OrderId" = o."Id"
                  AND oi."ProductId" = p."Id"
                  AND o."Status" IN (0, 1)
                  AND p."ProductType" = 1
                  AND p."PdfPath" IS NOT NULL
                  AND p."PdfPath" <> '';
                """);

            migrationBuilder.CreateTable(
                name: "product_download_grants",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    OrderId = table.Column<Guid>(type: "uuid", nullable: false),
                    OrderItemId = table.Column<Guid>(type: "uuid", nullable: false),
                    ProductId = table.Column<Guid>(type: "uuid", nullable: true),
                    FilePath = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    ProductSlug = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    TitleAtPurchase = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    Token = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    ExpiresAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    DownloadCount = table.Column<int>(type: "integer", nullable: false),
                    FirstDownloadedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    LastDownloadedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_product_download_grants", x => x.Id);
                    table.ForeignKey(
                        name: "FK_product_download_grants_order_items_OrderItemId",
                        column: x => x.OrderItemId,
                        principalTable: "order_items",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_product_download_grants_orders_OrderId",
                        column: x => x.OrderId,
                        principalTable: "orders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_product_download_grants_products_ProductId",
                        column: x => x.ProductId,
                        principalTable: "products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateIndex(
                name: "IX_orders_StripePaymentIntentId",
                table: "orders",
                column: "StripePaymentIntentId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_product_download_grants_OrderId_OrderItemId",
                table: "product_download_grants",
                columns: new[] { "OrderId", "OrderItemId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_product_download_grants_OrderItemId",
                table: "product_download_grants",
                column: "OrderItemId");

            migrationBuilder.CreateIndex(
                name: "IX_product_download_grants_ProductId",
                table: "product_download_grants",
                column: "ProductId");

            migrationBuilder.CreateIndex(
                name: "IX_product_download_grants_Token",
                table: "product_download_grants",
                column: "Token",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "product_download_grants");

            migrationBuilder.DropIndex(
                name: "IX_orders_StripePaymentIntentId",
                table: "orders");

            migrationBuilder.DropColumn(
                name: "DownloadEmailSentAt",
                table: "orders");

            migrationBuilder.DropColumn(
                name: "DigitalFilePathAtPurchase",
                table: "order_items");
        }
    }
}
