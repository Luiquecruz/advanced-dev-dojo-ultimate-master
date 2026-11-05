Finish a small stock-file toolkit in `Program.cs` with the tools of this lesson: spans to parse without copying, a `StringBuilder` to build text, and a pooled buffer that always goes back to its pool. `StockLine` is given; do not change it. The tests check results, not allocations: measuring those is BenchmarkDotNet's job on your machine.

## `LineParser.Parse(ReadOnlySpan<char> line)`

Reads one line of the form `"SKU,quantity"` into a `StockLine`. The starter copies the span into a string and splits it, which allocates an array and a string per part. Rewrite it by slicing the span: find the comma with `IndexOf(',')`, take the parts with ranges, and `Trim()` the spaces around each one. Slicing is the technique this lesson teaches; the tests cannot see it, so they grade only the results.

- The SKU becomes a string (`sku.ToString()`), the quantity is read with `int.Parse(span, CultureInfo.InvariantCulture)`.
- A line without a comma, with an empty SKU or with a quantity that is not a number throws `FormatException`.
- It works on any slice, for example `"xxHAT,5yy".AsSpan(2, 5)`.

## `LineParser.SumQuantities(ReadOnlySpan<char> text)`

`text` holds many lines separated by `'\n'`; a line may end with `'\r'` (Windows line endings). Walk it with `IndexOf('\n')` and slicing, skip blank lines, parse every other line with `Parse` and return the sum of the quantities. An empty text gives 0, and a bad line throws the `FormatException` from `Parse`.

## `Report.Build(IReadOnlyList<StockLine> lines)`

Returns one `"SKU: quantity\n"` line per item, in order, then `"Total: <sum>\n"`. Build it with a `StringBuilder`, not with `+=` in the loop.

## `Checksum.Compute(Stream input, ArrayPool<byte> pool)`

Returns the sum of every byte value in the stream, as a `long`.

- Rent one buffer of `Checksum.BufferSize` bytes from the `pool` argument (not from `ArrayPool<byte>.Shared`), and read the stream into it until `Read` returns 0.
- A rented array can be longer than you asked for and can still hold bytes from its last user. Add up only the bytes that `Read` reported.
- Return the buffer to the pool exactly once, also when reading throws: the exception must still reach the caller.
