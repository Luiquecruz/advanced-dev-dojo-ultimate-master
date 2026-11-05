using Dojo;
using System.IO;

public sealed class TrackingWriter : StringWriter
{
    public TrackingWriter() => NewLine = "\n";

    public int Disposals { get; private set; }

    public int AsyncDisposals { get; private set; }

    protected override void Dispose(bool disposing)
    {
        Disposals++;
        base.Dispose(disposing);
    }

    public override ValueTask DisposeAsync()
    {
        AsyncDisposals++;
        return base.DisposeAsync();
    }
}

public static class DisposalTests
{
    [Test("WriteRow writes comma-separated cells, one row per line")]
    public static void WriteRowWritesCsv()
    {
        var writer = new TrackingWriter();
        using (var exporter = new CsvExporter(writer))
        {
            exporter.WriteRow("MUG", "3");
            exporter.WriteRow("BAG", "1");
            Assert.Equal(2, exporter.RowsWritten);
        }
        Assert.Equal("MUG,3\nBAG,1\n", writer.ToString());
    }

    [Test("Dispose disposes the owned writer once, even when called twice, and WriteRow afterwards throws ObjectDisposedException")]
    public static void DisposeIsIdempotent()
    {
        var writer = new TrackingWriter();
        var exporter = new CsvExporter(writer);
        exporter.Dispose();
        exporter.Dispose();
        Assert.True(exporter.IsDisposed);
        Assert.Equal(1, writer.Disposals);
        Assert.Throws<ObjectDisposedException>(() => exporter.WriteRow("MUG", "1"));
    }

    [Test("await using calls the writer's DisposeAsync once")]
    public static async Task AwaitUsingDisposesAsync()
    {
        var writer = new TrackingWriter();
        await using (var exporter = new CsvExporter(writer))
        {
            exporter.WriteRow("HAT", "2");
        }
        Assert.Equal(1, writer.AsyncDisposals);
        Assert.Equal(1, writer.Disposals);
    }

    [Test("WriteRow rejects a cell with a comma and writes nothing for that row")]
    public static void WriteRowRejectsComma()
    {
        var writer = new TrackingWriter();
        using var exporter = new CsvExporter(writer);
        Assert.Throws<ArgumentException>(() => exporter.WriteRow("MUG,BLUE", "1"));
        Assert.Equal(0, exporter.RowsWritten);
        Assert.Equal("", writer.ToString());
    }

    [Test("ReportWriter.WriteAsync writes a header and every line, then disposes the destination")]
    public static async Task ReportWriterWritesAndDisposes()
    {
        var writer = new TrackingWriter();
        int rows = await ReportWriter.WriteAsync(writer, [new OrderLine("MUG", 3), new OrderLine("BAG", 1)]);
        Assert.Equal(3, rows);
        Assert.Equal("sku,quantity\nMUG,3\nBAG,1\n", writer.ToString());
        Assert.Equal(1, writer.AsyncDisposals);
    }

    // beginner mistake: disposing at the end of the method instead of with await using, so a throwing row leaves the destination open
    [Test("ReportWriter.WriteAsync still disposes the destination when a row throws")]
    public static async Task ReportWriterDisposesOnError()
    {
        var writer = new TrackingWriter();
        await Assert.ThrowsAsync<ArgumentException>(() => ReportWriter.WriteAsync(writer, [new OrderLine("MUG", 3), new OrderLine("BAG,RED", 1)]));
        Assert.Equal(1, writer.AsyncDisposals);
        Assert.Equal(1, writer.Disposals);
    }
}
