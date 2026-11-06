using Dojo;

public static class ExceptionsAndResultsTests
{
    private static Inventory NewInventory() => new(new Dictionary<string, int> { ["MUG"] = 5, ["BAG"] = 1 });

    [Test("Reserve takes the stock and returns Reserved with what is left")]
    public static void ReserveTakesStock()
    {
        var inventory = NewInventory();
        ReserveResult result = inventory.Reserve("MUG", 3);
        Assert.Equal<ReserveResult>(new ReserveResult.Reserved("MUG", 3, 2), result);
        Assert.Equal(2, inventory.StockOf("MUG"));
    }

    // beginner mistake: throwing an exception for a routine outcome such as not enough stock
    [Test("Reserve returns OutOfStock instead of throwing, keeps the stock, and reports 0 available for an unknown SKU")]
    public static void ReserveReturnsOutOfStock()
    {
        var inventory = NewInventory();
        ReserveResult result = inventory.Reserve("BAG", 2);
        Assert.Equal<ReserveResult>(new ReserveResult.OutOfStock("BAG", 2, 1), result);
        Assert.Equal(1, inventory.StockOf("BAG"));
        Assert.Equal<ReserveResult>(new ReserveResult.OutOfStock("HAT", 1, 0), inventory.Reserve("HAT", 1));
    }

    [Test("Reserve throws for caller bugs: ArgumentOutOfRangeException for quantity 0 or -1, ArgumentException for a blank SKU")]
    public static void ReserveThrowsForCallerBugs()
    {
        var inventory = NewInventory();
        Assert.Throws<ArgumentOutOfRangeException>(() => inventory.Reserve("MUG", 0));
        Assert.Throws<ArgumentOutOfRangeException>(() => inventory.Reserve("MUG", -1));
        var blank = Assert.Throws<ArgumentException>(() => inventory.Reserve("  ", 1));
        Assert.Equal(typeof(ArgumentException), blank.GetType());
        Assert.Equal(5, inventory.StockOf("MUG"));
    }

    [Test("ParseLine reads a SKU and a quantity, and rejects a line without exactly one ';', with a blank SKU or with a quantity of 0")]
    public static void ParseLineReadsAndRejectsShape()
    {
        Assert.Equal(new StockLine("MUG", 12), StockImport.ParseLine("MUG;12", 1));
        var shape = Assert.Throws<ImportException>(() => StockImport.ParseLine("MUG-12", 7));
        Assert.Equal(7, shape.LineNumber);
        Assert.Null(shape.InnerException);
        var blank = Assert.Throws<ImportException>(() => StockImport.ParseLine(";5", 3));
        Assert.Equal(3, blank.LineNumber);
        var zero = Assert.Throws<ImportException>(() => StockImport.ParseLine("MUG;0", 8));
        Assert.True(zero.Message.StartsWith("Line 8:", StringComparison.Ordinal), $"the message should start with \"Line 8:\", got \"{zero.Message}\"");
    }

    [Test("ParseLine wraps a quantity that is not a number or too large for an int in ImportException, with the FormatException or OverflowException as its cause")]
    public static void ParseLineWrapsParseErrors()
    {
        var format = Assert.Throws<ImportException>(() => StockImport.ParseLine("MUG;twelve", 4));
        Assert.Equal(4, format.LineNumber);
        Assert.Contains("Line 4", format.Message);
        Assert.True(format.InnerException is FormatException, "InnerException should be the FormatException from int.Parse");
        var overflow = Assert.Throws<ImportException>(() => StockImport.ParseLine("MUG;99999999999", 2));
        Assert.True(overflow.InnerException is OverflowException, "InnerException should be the OverflowException from int.Parse");
    }

    [Test("ImportAll records each bad line and imports the rest, but catches only ImportException: a null line escapes as ArgumentNullException")]
    public static void ImportAllKeepsGoingAndLetsBugsEscape()
    {
        ImportReport report = StockImport.ImportAll(["MUG;2", "BAG;x", "HAT;1", "broken"]);
        Assert.SequenceEqual([new StockLine("MUG", 2), new StockLine("HAT", 1)], report.Lines);
        Assert.Equal(2, report.Errors.Count);
        Assert.Contains("Line 2", report.Errors[0]);
        Assert.Contains("Line 4", report.Errors[1]);
        Assert.Throws<ArgumentNullException>(() => StockImport.ImportAll(["MUG;2", null!]));
    }
}
