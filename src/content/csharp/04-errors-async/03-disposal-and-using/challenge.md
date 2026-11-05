Finish a CSV export in `Program.cs` that always cleans up after itself.

## `CsvExporter`

`new CsvExporter(writer)` takes **ownership** of a `TextWriter`: disposing the exporter disposes the writer. It implements both `IDisposable` and `IAsyncDisposable`.

- `WriteRow(params string[] cells)` writes the cells joined with `,` and ends the row with `WriteLine`, then adds 1 to `RowsWritten`. `params string[] cells` lets callers pass any number of strings (`WriteRow("A-1", "3")`); inside the method `cells` is a `string[]`.
- A cell that contains a comma or a line break (`'\n'`) is refused with `ArgumentException`; nothing of that row is written and `RowsWritten` does not change.
- After the exporter is disposed, `WriteRow` throws `ObjectDisposedException`.
- `Dispose()` disposes the writer and sets `IsDisposed`. It is **idempotent**: a second call does nothing, so the writer is disposed exactly once.
- `DisposeAsync()` does the same with the writer's `DisposeAsync()`, also exactly once, and also counts as disposal for `Dispose()` (and the other way round).

## `ReportWriter.WriteAsync(destination, lines)`

Writes a header row `sku,quantity`, then one row per `OrderLine(Sku, Quantity)` (the quantity formatted with `CultureInfo.InvariantCulture`), and returns the number of rows written, header included.

It wraps `destination` in a `CsvExporter`, and the exporter, and with it `destination`, is disposed with `DisposeAsync` **in every case**: when all rows are written, and also when a row throws. The exception still reaches the caller.
