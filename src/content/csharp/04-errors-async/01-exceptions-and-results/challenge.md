Finish a small stock service in `Program.cs`. Some failures are routine and come back as values; others are bugs or bad data and are thrown.

## `Inventory.Reserve(sku, quantity)`

`Inventory` wraps a `Dictionary<string, int>` of stock levels; `StockOf(sku)` returns the level, or 0 for an unknown SKU. `Reserve` returns a `ReserveResult`:

- **Caller bugs are thrown**, before anything changes: a blank SKU (`null`, empty or whitespace) throws `ArgumentException` (exactly that type for a blank string), and a quantity of 0 or less throws `ArgumentOutOfRangeException`. Use the throw helpers.
- **Not enough stock is routine**, so it is returned, not thrown: `new ReserveResult.OutOfStock(sku, quantity, available)`, and the stock is left unchanged. An unknown SKU has 0 available.
- Otherwise the quantity is taken from the stock and the method returns `new ReserveResult.Reserved(sku, quantity, remaining)`.

## `ImportException`

A custom exception with the three usual constructors (none, a message, a message plus the inner exception) and an `init` property `LineNumber`.

## `StockImport.ParseLine(line, lineNumber)`

Parses a line of the warehouse file, `"SKU;quantity"`, into a `StockLine(Sku, Quantity)`. The file is produced by another system, so a bad line is rare and is thrown:

- `null` is a caller bug: throw `ArgumentNullException`.
- A line that does not split into exactly two parts on `';'`, or whose SKU is blank, throws `ImportException` with no inner exception.
- The quantity is read with `int.Parse(text, CultureInfo.InvariantCulture)`. When `int.Parse` throws `FormatException` (not a number) or `OverflowException` (too large for an `int`), throw an `ImportException` whose `InnerException` is that original exception.
- A quantity of 0 or less throws `ImportException`.

Every `ImportException` has `LineNumber` set and a `Message` that starts with `Line <number>:`.

## `StockImport.ImportAll(lines)`

Parses every line, numbered from 1. A line that throws `ImportException` adds its `Message` to `Errors` and the import goes on; good lines go to `Lines`, in order. Any other exception is a bug and must escape: a `null` line ends the import with `ArgumentNullException`.
