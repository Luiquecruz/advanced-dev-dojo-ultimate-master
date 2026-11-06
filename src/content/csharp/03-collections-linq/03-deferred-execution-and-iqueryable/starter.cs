using System.Globalization;

public sealed record Product(string Sku, string Name, decimal Price, int Stock);

public sealed record StockSummary(int Products, int Units, decimal Value);

public static class Catalog
{
    public static IEnumerable<Product> InStock(IEnumerable<Product> products)
    {
        // TODO: return the query itself, without running it here.
        return products.Where(product => product.Stock > 0).ToList();
    }

    public static Product? FirstExpensive(IEnumerable<Product> products, decimal minimumPrice)
    {
        // TODO: return the first product priced at least minimumPrice, reading no further.
        return null;
    }

    public static StockSummary Summarize(IEnumerable<Product> products)
    {
        // TODO: enumerate the source only once.
        return new StockSummary(products.Count(), products.Sum(product => product.Stock), products.Sum(product => product.Price * product.Stock));
    }

    public static IEnumerable<int> ParseQuantities(IEnumerable<string> lines)
    {
        // TODO: a bad line must throw FormatException here, at the call.
        return lines.Select(line => int.Parse(line, CultureInfo.InvariantCulture));
    }
}
