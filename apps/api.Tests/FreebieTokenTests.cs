using FluentAssertions;
using JovieJoy.Api.Services;

namespace JovieJoy.Api.Tests;

public class FreebieTokenTests
{
    [Fact]
    public void Generate_returns_url_safe_string_of_expected_length()
    {
        var token = FreebieTokens.Generate();
        token.Should().NotBeNullOrWhiteSpace();
        token.Length.Should().BeGreaterThanOrEqualTo(40);
        token.Should().MatchRegex("^[A-Za-z0-9_-]+$");
    }

    [Fact]
    public void Generate_returns_unique_tokens()
    {
        var tokens = Enumerable.Range(0, 100).Select(_ => FreebieTokens.Generate()).ToHashSet();
        tokens.Count.Should().Be(100);
    }
}
