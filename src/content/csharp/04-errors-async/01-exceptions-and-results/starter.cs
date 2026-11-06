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
        // TODO: throw for caller bugs (blank SKU, quantity of 0 or less) with the throw helpers.
        // TODO: return OutOfStock when there is not enough stock, otherwise take the stock and return Reserved.
        throw new NotImplementedException();
    }
}

public class ImportException : Exception
{
    // TODO: add the constructors that take a message, and a message plus the inner exception.

    public int LineNumber { get; init; }
}

public sealed record StockLine(string Sku, int Quantity);

public sealed record ImportReport(List<StockLine> Lines, List<string> Errors);

public static class StockImport
{
    public static StockLine ParseLine(string line, int lineNumber)
    {
        // TODO: split "SKU;quantity", parse the quantity with int.Parse and CultureInfo.InvariantCulture,
        // and turn every bad line into an ImportException that carries the line number (and the cause, if any).
        throw new NotImplementedException();
    }

    public static ImportReport ImportAll(IReadOnlyList<string> lines)
    {
        // TODO: parse every line (numbered from 1); record the message of each bad line in Errors and keep going.
        throw new NotImplementedException();
    }
}
