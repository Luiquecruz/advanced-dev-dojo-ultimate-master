The catalog code below reads products from sources that are expensive to read: a file, an API, a database. The tests hand your methods a source that **counts** how often it is enumerated and how many products it hands out, so they can see when a query runs and how much it reads. The record is given:

```csharp
public sealed record Product(string Sku, string Name, decimal Price, int Stock);
```

Complete the static class `Catalog`:

- `IEnumerable<Product> InStock(IEnumerable<Product> products)` returns the products with `Stock > 0` as a **deferred** query: calling it reads nothing, and a caller that needs only the first in-stock product (`InStock(source).First()`) reads only up to that product.
- `Product? FirstExpensive(IEnumerable<Product> products, decimal minimumPrice)` returns the first product whose `Price` is at least `minimumPrice`, or `null` when there is none. It stops reading at the match.
- `StockSummary Summarize(IEnumerable<Product> products)` returns the number of products, the total units (`Stock`) and the total stock value (`Price * Stock`) as `new StockSummary(Products, Units, Value)`. It must **enumerate its source exactly once**. For no products it returns `StockSummary(0, 0, 0m)`.
- `IEnumerable<int> ParseQuantities(IEnumerable<string> lines)` parses each line as an `int` with `CultureInfo.InvariantCulture`. A line that is not a number throws `FormatException` **when `ParseQuantities` is called**, not later when someone loops over the result.

`StockSummary` is given too: `public sealed record StockSummary(int Products, int Units, decimal Value);`.
