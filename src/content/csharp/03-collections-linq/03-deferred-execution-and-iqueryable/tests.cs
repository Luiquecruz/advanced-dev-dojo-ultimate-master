using System.Collections;
using Dojo;

/// <summary>A source that counts how often it is enumerated and how many items it hands out.</summary>
public sealed class CountingSource<T>(params T[] items) : IEnumerable<T>
{
    public int Enumerations { get; private set; }
    public int Read { get; private set; }

    public IEnumerator<T> GetEnumerator()
    {
        Enumerations++;
        foreach (var item in items)
        {
            Read++;
            yield return item;
        }
    }

    IEnumerator IEnumerable.GetEnumerator() => GetEnumerator();
}

public static class CatalogTests
{
    private static CountingSource<Product> Source() => new(
        new Product("A-1", "Mug", 8m, 0),
        new Product("B-2", "Bag", 45m, 3),
        new Product("C-3", "Lamp", 120m, 2),
        new Product("D-4", "Pen", 2.5m, 0),
        new Product("E-5", "Desk", 300m, 1));

    [Test("InStock reads nothing until the result is used, then only what is needed")]
    public static void InStockIsDeferred()
    {
        var source = Source();
        var inStock = Catalog.InStock(source);
        Assert.Equal(0, source.Read, "calling InStock must not read the source");

        Assert.Equal("B-2", inStock.First().Sku);
        Assert.Equal(2, source.Read, "First needs only A-1 and B-2");
        Assert.SequenceEqual(["B-2", "C-3", "E-5"], inStock.Select(product => product.Sku));
    }

    [Test("FirstExpensive stops reading at the first match, and is null when nothing matches")]
    public static void FirstExpensiveStopsEarly()
    {
        var source = Source();
        Assert.Equal("C-3", Catalog.FirstExpensive(source, 100m)?.Sku);
        Assert.Equal(3, source.Read, "the match is the third product");

        Assert.Null(Catalog.FirstExpensive(Source(), 1000m));
    }

    [Test("Summarize counts the products, units and stock value")]
    public static void SummarizeTotals()
    {
        Assert.Equal(new StockSummary(5, 6, 675m), Catalog.Summarize(Source()));
        Assert.Equal(new StockSummary(0, 0, 0m), Catalog.Summarize(new CountingSource<Product>()));
    }

    // beginner mistake: calling Count() and Sum() on the same deferred source reads it once per call
    [Test("Summarize enumerates its source exactly once")]
    public static void SummarizeEnumeratesOnce()
    {
        var source = Source();
        Catalog.Summarize(source);
        Assert.Equal(1, source.Enumerations);
    }

    [Test("ParseQuantities parses every line")]
    public static void ParseQuantitiesParses()
    {
        Assert.SequenceEqual([3, 12, 0], Catalog.ParseQuantities(["3", "12", "0"]));
    }

    [Test("ParseQuantities throws FormatException at the call for a line that is not a number")]
    public static void ParseQuantitiesFailsAtTheCall()
    {
        Assert.Throws<FormatException>(() => { Catalog.ParseQuantities(["3", "twelve"]); });
    }
}
