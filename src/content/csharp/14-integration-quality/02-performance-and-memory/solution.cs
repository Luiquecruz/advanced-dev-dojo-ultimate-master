using System.Buffers;
using System.Globalization;
using System.IO;
using System.Text;

public readonly record struct StockLine(string Sku, int Quantity);

public static class LineParser
{
    public static StockLine Parse(ReadOnlySpan<char> line)
    {
        int comma = line.IndexOf(',');
        if (comma < 0)
        {
            throw new FormatException($"Expected \"SKU,quantity\", got \"{line}\".");
        }

        ReadOnlySpan<char> sku = line[..comma].Trim();
        ReadOnlySpan<char> quantity = line[(comma + 1)..].Trim();
        if (sku.IsEmpty)
        {
            throw new FormatException("The SKU is empty.");
        }
        return new StockLine(sku.ToString(), int.Parse(quantity, CultureInfo.InvariantCulture));
    }

    public static int SumQuantities(ReadOnlySpan<char> text)
    {
        int total = 0;
        while (!text.IsEmpty)
        {
            int end = text.IndexOf('\n');
            ReadOnlySpan<char> line = end < 0 ? text : text[..end];
            text = end < 0 ? ReadOnlySpan<char>.Empty : text[(end + 1)..];

            if (!line.Trim().IsEmpty)
            {
                total += Parse(line).Quantity;
            }
        }
        return total;
    }
}

public static class Report
{
    public static string Build(IReadOnlyList<StockLine> lines)
    {
        var report = new StringBuilder();
        int total = 0;
        foreach (StockLine line in lines)
        {
            report.Append(line.Sku).Append(": ").Append(line.Quantity).Append('\n');
            total += line.Quantity;
        }
        report.Append("Total: ").Append(total).Append('\n');
        return report.ToString();
    }
}

public static class Checksum
{
    public const int BufferSize = 4096;

    public static long Compute(Stream input, ArrayPool<byte> pool)
    {
        byte[] buffer = pool.Rent(BufferSize);
        try
        {
            long sum = 0;
            int read;
            while ((read = input.Read(buffer, 0, BufferSize)) > 0)
            {
                foreach (byte value in buffer.AsSpan(0, read))
                {
                    sum += value;
                }
            }
            return sum;
        }
        finally
        {
            pool.Return(buffer);
        }
    }
}
