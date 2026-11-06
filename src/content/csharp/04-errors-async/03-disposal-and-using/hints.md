Check the state first in `WriteRow`: `ObjectDisposedException.ThrowIf(IsDisposed, this);`. Then validate every cell before writing anything, with `cell.Contains(',') || cell.Contains('\n')`, so a refused row leaves no partial output behind.
---
Make both dispose methods start with `if (IsDisposed) return;` and set `IsDisposed = true` before releasing the writer: `_writer.Dispose();` in one, `await _writer.DisposeAsync();` in the other (mark that one `async ValueTask`).
---
In `ReportWriter.WriteAsync`, make the method `async Task<int>` and declare the exporter with `await using var exporter = new CsvExporter(destination);`. The compiler then awaits `DisposeAsync()` when the method leaves, whether it returns or throws.
