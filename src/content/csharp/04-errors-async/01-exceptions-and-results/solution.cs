using System.Globalization;

public abstract record ReserveResult
{
    public sealed record Reserved(string Sku, int Quantity, int Remaining) : ReserveResult;
    public sealed record OutOfStock(string Sku, int Requested, int Available) : ReserveResult;
}

public sealed class Inventory
{
    private readonly Dictionary<string, int> _stock;

    public Inventory(Dictionary<string, int> stock) => _stock = stock;

    public int StockOf(string sku) => _stock.TryGetValue(sku, out int quantity) ? quantity : 0;

    public ReserveResult Reserve(string sku, int quantity)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(sku);
        ArgumentOutOfRangeException.ThrowIfNegativeOrZero(quantity);

        int available = StockOf(sku);
        if (available < quantity)
        {
            return new ReserveResult.OutOfStock(sku, quantity, available);
        }

        _stock[sku] = available - quantity;
        return new ReserveResult.Reserved(sku, quantity, available - quantity);
    }
}

public class ImportException : Exception
{
    public ImportException() { }
    public ImportException(string message) : base(message) { }
    public ImportException(string message, Exception inner) : base(message, inner) { }

    public int LineNumber { get; init; }
}

public sealed record StockLine(string Sku, int Quantity);

public sealed record ImportReport(List<StockLine> Lines, List<string> Errors);

public static class StockImport
{
    public static StockLine ParseLine(string line, int lineNumber)
    {
        ArgumentNullException.ThrowIfNull(line);

        string[] parts = line.Split(';');
        if (parts.Length != 2 || string.IsNullOrWhiteSpace(parts[0]))
        {
            throw new ImportException($"Line {lineNumber}: expected \"SKU;quantity\".") { LineNumber = lineNumber };
        }

        int quantity;
        try
        {
            quantity = int.Parse(parts[1], CultureInfo.InvariantCulture);
        }
        catch (Exception ex) when (ex is FormatException or OverflowException)
        {
            throw new ImportException($"Line {lineNumber}: \"{parts[1]}\" is not a whole number.", ex) { LineNumber = lineNumber };
        }

        if (quantity <= 0)
        {
            throw new ImportException($"Line {lineNumber}: the quantity must be positive.") { LineNumber = lineNumber };
        }

        return new StockLine(parts[0].Trim(), quantity);
    }

    public static ImportReport ImportAll(IReadOnlyList<string> lines)
    {
        var report = new ImportReport([], []);
        for (int index = 0; index < lines.Count; index++)
        {
            try
            {
                report.Lines.Add(ParseLine(lines[index], index + 1));
            }
            catch (ImportException ex)
            {
                report.Errors.Add(ex.Message);
            }
        }
        return report;
    }
}
