using System.Globalization;

public sealed record Product(string Sku, string Name, decimal Price, int Stock);

public sealed record StockSummary(int Products, int Units, decimal Value);

public static class Catalog
{
    public static IEnumerable<Product> InStock(IEnumerable<Product> products) =>
        products.Where(product => product.Stock > 0);

    public static Product? FirstExpensive(IEnumerable<Product> products, decimal minimumPrice) =>
        products.FirstOrDefault(product => product.Price >= minimumPrice);

    public static StockSummary Summarize(IEnumerable<Product> products)
    {
        List<Product> all = products.ToList();
        return new StockSummary(all.Count, all.Sum(product => product.Stock), all.Sum(product => product.Price * product.Stock));
    }

    public static IEnumerable<int> ParseQuantities(IEnumerable<string> lines) =>
        lines.Select(line => int.Parse(line, CultureInfo.InvariantCulture)).ToList();
}
