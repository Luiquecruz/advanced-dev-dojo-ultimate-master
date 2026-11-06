using System.Globalization;
using System.IO;

public sealed record OrderLine(string Sku, int Quantity);

// CsvExporter owns its writer: disposing the exporter disposes the writer.
public sealed class CsvExporter : IDisposable, IAsyncDisposable
{
    private readonly TextWriter _writer;

    public CsvExporter(TextWriter writer) => _writer = writer;

    public int RowsWritten { get; private set; }

    public bool IsDisposed { get; private set; }

    public void WriteRow(params string[] cells)
    {
        // TODO: refuse to write after disposal, and reject a cell that contains a comma or a line break.
        _writer.WriteLine(string.Join(",", cells));
        RowsWritten++;
    }

    public void Dispose()
    {
        // TODO: dispose the writer exactly once.
    }

    public ValueTask DisposeAsync()
    {
        // TODO: dispose the writer exactly once, with its DisposeAsync.
        return ValueTask.CompletedTask;
    }
}

public static class ReportWriter
{
    public static Task<int> WriteAsync(TextWriter destination, IEnumerable<OrderLine> lines)
    {
        var exporter = new CsvExporter(destination);
        exporter.WriteRow("sku", "quantity");
        foreach (OrderLine line in lines)
        {
            exporter.WriteRow(line.Sku, line.Quantity.ToString(CultureInfo.InvariantCulture));
        }
        // TODO: the exporter (and with it the destination) must be disposed, even when a row throws.
        return Task.FromResult(exporter.RowsWritten);
    }
}
