Stock is looked up by SKU, so it belongs in a `Dictionary<string, int>`. Pass a comparer to its constructor so `A-1` and `a-1` land on the same key.

---

The indexer `_stock[sku]` throws for a key that is not there. `TryGetValue` gives you the stock and a `bool` in one lookup: use it in `StockOf` and in `TryTake`, and write to the dictionary only when the take succeeds.

---

`Snapshot` must not return the field itself, and `_stock.AsReadOnly()` is only a view of it: both show later changes. Copy it: `new Dictionary<string, int>(_stock, StringComparer.OrdinalIgnoreCase)`. For `Duplicates`, `HashSet<string>.Add` returns `false` when the value is already in the set.
