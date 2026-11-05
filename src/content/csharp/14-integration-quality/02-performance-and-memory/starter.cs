using System.Buffers;
using System.Globalization;
using System.IO;
using System.Text;

public readonly record struct StockLine(string Sku, int Quantity);

public static class LineParser
{
    public static StockLine Parse(ReadOnlySpan<char> line)
    {
        // TODO: slice the span at the comma instead of copying it into a string and splitting it.
        string[] parts = line.ToString().Split(',');
        return new StockLine(parts[0], int.Parse(parts[1], CultureInfo.InvariantCulture));
    }

    public static int SumQuantities(ReadOnlySpan<char> text)
    {
        // TODO: walk the text line by line with IndexOf('\n'), skip blank lines and add up the quantities.
        throw new NotImplementedException();
    }
}

public static class Report
{
    public static string Build(IReadOnlyList<StockLine> lines)
    {
        // TODO: build "SKU: quantity" lines and a final "Total: n" line with a StringBuilder.
        throw new NotImplementedException();
    }
}

public static class Checksum
{
    public const int BufferSize = 4096;

    public static long Compute(Stream input, ArrayPool<byte> pool)
    {
        // TODO: rent one buffer of BufferSize from the pool, add up every byte read from the stream,
        // and return the buffer to the pool in a finally block.
        throw new NotImplementedException();
    }
}
