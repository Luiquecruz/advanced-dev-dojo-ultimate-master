using Dojo;

public static class CountingAndCartTests
{
    [Test("Words.Count counts each word, ignoring case")]
    public static void CountsWordsIgnoringCase()
    {
        var counts = Words.Count("The cat saw the other cat");

        Assert.Equal(4, counts.Count);
        Assert.Equal(2, counts["the"]);
        Assert.Equal(2, counts["cat"]);
        Assert.Equal(1, counts["saw"]);
        Assert.False(counts.ContainsKey("The"), "keys are lowercase");
    }

    [Test("Words.Count strips punctuation and counts the last word")]
    public static void StripsPunctuationAndCountsLastWord()
    {
        var counts = Words.Count("Stop! Look, listen... and LISTEN");

        Assert.Equal(1, counts["stop"]);
        Assert.Equal(1, counts["look"]);
        Assert.Equal(2, counts["listen"]);
        Assert.Equal(1, counts["and"]);
        Assert.Equal(4, counts.Count);
        Assert.Equal(0, Words.Count(" 42, ... ").Count);
    }

    [Test("Stock.Restock returns the indexes of levels below the minimum, in order")]
    public static void RestockReturnsIndexes()
    {
        Assert.SequenceEqual([1, 3], Stock.Restock([5, 0, 12, 3], 4));
        Assert.SequenceEqual([0, 2], Stock.Restock([1, 9, 2], 3));
        Assert.SequenceEqual([], Stock.Restock([4, 4], 4));
    }

    [Test("Cart.Total adds quantity times price for every line")]
    public static void TotalAddsLines()
    {
        var prices = new Dictionary<string, decimal> { ["MUG"] = 9.50m, ["PEN"] = 1.25m };

        Assert.Equal(24.00m, Cart.Total([("MUG", 2), ("PEN", 4)], prices));
        Assert.Equal(1.25m, Cart.Total([("PEN", 1)], prices));
        Assert.Equal(0m, Cart.Total([], prices));
    }

    // beginner mistake: reading prices[sku] with the indexer throws KeyNotFoundException for a SKU without a price
    [Test("Cart.Total skips a SKU that has no price instead of throwing")]
    public static void TotalSkipsUnknownSku()
    {
        var prices = new Dictionary<string, decimal> { ["MUG"] = 9.50m };

        Assert.Equal(19.00m, Cart.Total([("MUG", 2), ("GHOST", 5)], prices));
        Assert.Equal(0m, Cart.Total([("GHOST", 1)], prices));
    }
}
