using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace JovieJoy.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddEmailCampaigns : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "UnsubscribeToken",
                table: "newsletter_subscribers",
                type: "character varying(64)",
                maxLength: 64,
                nullable: false,
                defaultValue: "");

            // Give every existing subscriber their own token before the unique index exists.
            migrationBuilder.Sql(
                "UPDATE newsletter_subscribers SET \"UnsubscribeToken\" = " +
                "replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');");

            migrationBuilder.AddColumn<DateTime>(
                name: "UnsubscribedAt",
                table: "newsletter_subscribers",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "email_campaigns",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Kind = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    ItemId = table.Column<Guid>(type: "uuid", nullable: false),
                    ItemSlug = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    ItemTitle = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    Status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Subject = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Preheader = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    Headline = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Body = table.Column<string>(type: "character varying(5000)", maxLength: 5000, nullable: false),
                    ButtonLabel = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: false),
                    ImageUrl = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    PriceLabel = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: true),
                    EditedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ApprovedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    SentAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_email_campaigns", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "email_campaign_recipients",
                columns: table => new
                {
                    CampaignId = table.Column<Guid>(type: "uuid", nullable: false),
                    Email = table.Column<string>(type: "character varying(320)", maxLength: 320, nullable: false),
                    Status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Attempts = table.Column<int>(type: "integer", nullable: false),
                    LastError = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    SentAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_email_campaign_recipients", x => new { x.CampaignId, x.Email });
                    table.ForeignKey(
                        name: "FK_email_campaign_recipients_email_campaigns_CampaignId",
                        column: x => x.CampaignId,
                        principalTable: "email_campaigns",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_newsletter_subscribers_UnsubscribeToken",
                table: "newsletter_subscribers",
                column: "UnsubscribeToken",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_email_campaign_recipients_CampaignId_Status",
                table: "email_campaign_recipients",
                columns: new[] { "CampaignId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_email_campaigns_Kind_ItemId",
                table: "email_campaigns",
                columns: new[] { "Kind", "ItemId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_email_campaigns_Status",
                table: "email_campaigns",
                column: "Status");

            // Everything already live is old news. Without these rows the first sync
            // would queue a "new product" draft for the entire catalogue. Items that are
            // still unpublished are left out on purpose: publishing one later is new.
            migrationBuilder.Sql("""
                INSERT INTO email_campaigns
                    ("Id", "Kind", "ItemId", "ItemSlug", "ItemTitle", "Status", "Subject", "Preheader",
                     "Headline", "Body", "ButtonLabel", "ImageUrl", "CreatedAt")
                SELECT gen_random_uuid(), 'Product', "Id", left("Slug", 200), left("Title", 300), 'Baseline',
                       left("Title", 200), '', left("Title", 200), '', '', '', now()
                FROM products
                WHERE "PublishedAt" IS NOT NULL AND "PublishedAt" <= now();
                """);
            migrationBuilder.Sql("""
                INSERT INTO email_campaigns
                    ("Id", "Kind", "ItemId", "ItemSlug", "ItemTitle", "Status", "Subject", "Preheader",
                     "Headline", "Body", "ButtonLabel", "ImageUrl", "CreatedAt")
                SELECT gen_random_uuid(), 'Freebie', "Id", left("Slug", 200), left("Title", 300), 'Baseline',
                       left("Title", 200), '', left("Title", 200), '', '', '', now()
                FROM freebies
                WHERE "Published" AND "FilePath" <> '';
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "email_campaign_recipients");

            migrationBuilder.DropTable(
                name: "email_campaigns");

            migrationBuilder.DropIndex(
                name: "IX_newsletter_subscribers_UnsubscribeToken",
                table: "newsletter_subscribers");

            migrationBuilder.DropColumn(
                name: "UnsubscribeToken",
                table: "newsletter_subscribers");

            migrationBuilder.DropColumn(
                name: "UnsubscribedAt",
                table: "newsletter_subscribers");
        }
    }
}
