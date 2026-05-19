namespace JovieJoy.Api.Data.Entities;

public class ProductCollection
{
    public Guid ProductId { get; set; }
    public Product Product { get; set; } = null!;
    public Guid CollectionId { get; set; }
    public Collection Collection { get; set; } = null!;
}
