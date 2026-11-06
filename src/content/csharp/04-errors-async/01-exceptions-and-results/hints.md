In `Reserve`, call `ArgumentException.ThrowIfNullOrWhiteSpace(sku)` and `ArgumentOutOfRangeException.ThrowIfNegativeOrZero(quantity)` first. Then read `StockOf(sku)`, return `OutOfStock` if it is smaller than `quantity`, and only after that write the new level to `_stock[sku]`.
---
The custom exception constructors chain to `Exception`: `public ImportException(string message, Exception inner) : base(message, inner) { }`. Set the line number with an object initializer: `throw new ImportException($"Line {lineNumber}: ...", ex) { LineNumber = lineNumber };`.
---
Put only the `int.Parse` call inside `try`, and catch both parse failures in one clause with a filter: `catch (Exception ex) when (ex is FormatException or OverflowException)`. In `ImportAll`, catch `ImportException` and nothing else, so an `ArgumentNullException` keeps travelling up.
