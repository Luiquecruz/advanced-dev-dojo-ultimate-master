using System.Globalization;
using System.IO;

public sealed record OrderLine(string Sku, int Quantity);

public sealed class CsvExporter : IDisposable, IAsyncDisposable
{
    private readonly TextWriter _writer;

    public CsvExporter(TextWriter writer) => _writer = writer;

    public int RowsWritten { get; private set; }

    public bool IsDisposed { get; private set; }

    public void WriteRow(params string[] cells)
    {
        ObjectDisposedException.ThrowIf(IsDisposed, this);
        foreach (string cell in cells)
        {
            if (cell.Contains(',') || cell.Contains('\n'))
            {
                throw new ArgumentException($"The cell \"{cell}\" contains a comma or a line break.", nameof(cells));
            }
        }
        _writer.WriteLine(string.Join(",", cells));
        RowsWritten++;
    }

    public void Dispose()
    {
        if (IsDisposed)
        {
            return;
        }
        IsDisposed = true;
        _writer.Dispose();
    }

    public async ValueTask DisposeAsync()
    {
        if (IsDisposed)
        {
            return;
        }
        IsDisposed = true;
        await _writer.DisposeAsync();
    }
}

public static class ReportWriter
{
    public static async Task<int> WriteAsync(TextWriter destination, IEnumerable<OrderLine> lines)
    {
        await using var exporter = new CsvExporter(destination);
        exporter.WriteRow("sku", "quantity");
        foreach (OrderLine line in lines)
        {
            exporter.WriteRow(line.Sku, line.Quantity.ToString(CultureInfo.InvariantCulture));
        }
        return exporter.RowsWritten;
    }
}
