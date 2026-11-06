Finish three small pieces in `Program.cs`: a generic repository, a counter that raises an event, and a list of callbacks built in a loop. Do not use LINQ here (it arrives in module 03): plain loops are enough.

## `Repository<T> where T : class, IHasId`

The constraint promises that every `T` has an `int Id`, so the repository can work with items, suppliers or anything else that implements `IHasId`.

- `Add(T item)` replaces the stored item that has the same `Id`, or adds the item at the end.
- `Find(int id)` returns the item with that `Id`, or `null`.
- `Filter(Func<T, bool> predicate)` returns a new `List<T>` with the items for which `predicate` returns `true`, in the order they were added.

## `StockCounter(int initialStock, int threshold)`

`Remove(int quantity)` lowers `Stock`. When a removal takes the stock from the threshold or above to **below** it, raise `LowStock` with the counter as the sender and a `LowStockEventArgs` holding the new stock. Further removals while the stock is already below the threshold do not raise it again. With no subscriber, `Remove` must not throw.

## `Callbacks.Numbered(int count)`

Return `count` callbacks of type `Func<int>`, built in a `for` loop, where callback number `n` returns `n`: `Numbered(3)` gives callbacks returning 0, 1 and 2.
