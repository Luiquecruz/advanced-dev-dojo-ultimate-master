1. Repository: the constraint `where T : class, IHasId` is what lets you write `item.Id` and return `null` from `Find`. Write `Find` as a loop that returns the first match, then `null`.
2. Write `Add` with an index loop: overwrite the slot whose `Id` matches and return, or append after the loop.
3. Write `Filter` with a new `List<T>`, a loop over the stored items and one call to `predicate(item)` per item. The tests call it with two different item types and with a lambda stored in a `Func<Item, bool>` variable.
4. `StockCounter.Remove`: keep the "was at or above" check in a local, subtract, and raise the event only on the crossing. Use `?.Invoke` so a counter without subscribers keeps working.
5. `Callbacks.Numbered`: run the tests on the starter first. Every callback returns 3, because they all captured the one loop variable. Copy the index into a local declared inside the loop and capture the local instead.
