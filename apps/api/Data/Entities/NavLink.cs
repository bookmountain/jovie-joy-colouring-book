namespace JovieJoy.Api.Data.Entities;

public class NavLink
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid? ParentId { get; set; }
    public NavLink? Parent { get; set; }
    public string Label { get; set; } = null!;
    public string Href { get; set; } = null!;
    public int SortIndex { get; set; }

    public ICollection<NavLink> Children { get; set; } = new List<NavLink>();
}
