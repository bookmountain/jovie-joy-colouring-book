using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace JovieJoy.Api.Migrations
{
    /// <inheritdoc />
    public partial class RemoveEtsyContent : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Update existing site_content rows so production gets the new copy
            // even when the seeder skips them (seeder is insert-if-missing only).
            migrationBuilder.Sql(@"
                UPDATE site_content
                SET ""Value"" = 'Lower prices, bigger smiles',
                    ""UpdatedAt"" = NOW() AT TIME ZONE 'UTC'
                WHERE ""Key"" = 'home.announcement'
                  AND ""Value"" = 'Leaving Etsy · Lower prices, bigger smiles';
            ");

            migrationBuilder.Sql(@"
                UPDATE site_content
                SET ""Value"" = 'Jovie Joy started in 2023 when Mel and Ross couldn''t find colouring pages they actually liked for their daughter Jovie (hi, namesake!). So they drew their own. Then their friends asked for copies. Then the friends'' friends did. So they opened a little shop and here we are.',
                    ""UpdatedAt"" = NOW() AT TIME ZONE 'UTC'
                WHERE ""Key"" = 'about.intro'
                  AND ""Value"" LIKE '%Eventually they put them on Etsy.%';
            ");

            migrationBuilder.Sql(@"
                UPDATE site_content
                SET ""Value"" = 'How long until I get my download?',
                    ""UpdatedAt"" = NOW() AT TIME ZONE 'UTC'
                WHERE ""Key"" = 'faq.4.q'
                  AND ""Value"" = 'Why did you leave Etsy?';

                UPDATE site_content
                SET ""Value"" = 'The link arrives in your inbox seconds after checkout. You can also download straight from the confirmation page, or grab it again any time from your account.',
                    ""UpdatedAt"" = NOW() AT TIME ZONE 'UTC'
                WHERE ""Key"" = 'faq.4.a'
                  AND ""Value"" LIKE 'Short answer: we wanted to talk to you directly%';
            ");

            migrationBuilder.Sql(@"
                DELETE FROM site_content
                WHERE ""Key"" IN ('about.etsy.para1', 'about.etsy.para2');
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Down is intentionally a no-op. The Etsy-era copy is not worth restoring.
        }
    }
}
