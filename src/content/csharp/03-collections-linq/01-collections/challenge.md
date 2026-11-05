A small warehouse keeps stock per SKU. Write the two types below, choosing for each job the collection from this lesson that makes it cheap and correct. SKUs ignore case everywhere: `A-1` and `a-1` are the same SKU.

## `Inventory`

- `void Receive(string sku, int quantity)` adds `quantity` to the stock of `sku`. Receiving `A-1` and then `a-1` adds to one entry.
- `int StockOf(string sku)` returns the current stock, and `0` for a SKU the inventory has never received. It never throws for an unknown SKU.
- `bool TryTake(string sku, int quantity)` removes `quantity` and returns `true` when there is enough stock. Otherwise it returns `false` and changes nothing: stock never goes negative, and an unknown SKU is not added to the inventory.
- `IReadOnlyDictionary<string, int> Snapshot()` returns the stock per SKU **as it is now**. Later calls to `Receive` or `TryTake` must not change a snapshot that was already returned.

## `Skus`

- `static IReadOnlyList<string> Duplicates(IEnumerable<string> skus)` returns every SKU that has already appeared earlier in the input, ignoring case, in the order the repeats occur, spelled as in the repeat. For `["A-1", "B-2", "a-1", "B-2", "C-3"]` it returns `["a-1", "B-2"]`.

Run the tests: each one names the behavior it checks.
