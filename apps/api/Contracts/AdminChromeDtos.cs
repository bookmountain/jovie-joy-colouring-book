namespace JovieJoy.Api.Contracts;

public record CreateStaticPageRequest(
    string Slug, string Title, string Intro, List<string> Blocks);

public record UpdateStaticPageRequest(
    string Title, string Intro, List<string> Blocks);

public record CreateFooterLinkRequest(
    string GroupKey, string GroupTitle, string Label, string Href, int SortIndex);

public record UpdateFooterLinkRequest(
    string GroupKey, string GroupTitle, string Label, string Href, int SortIndex);

public record CreateSocialLinkRequest(string Label, string Href, int SortIndex);
public record UpdateSocialLinkRequest(string Href, int SortIndex);

public record CreateTrendingTermRequest(string Term, int SortIndex);
public record UpdateTrendingTermRequest(int SortIndex);
