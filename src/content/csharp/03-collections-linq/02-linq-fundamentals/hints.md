Each method is one chain of LINQ operators that ends in a stored result. Read the requirement as a pipeline: keep some orders (`Where`), put them in order (`OrderByDescending`), shape each one (`Select`), store it (`ToList`).

---

For the tie-break, the second key goes in `ThenBy(order => order.Id, StringComparer.Ordinal)`: a second `OrderBy` would throw away the ranking by total. `GroupBy(order => order.Customer)` gives groups with a `Key`, and `ToDictionary(group => group.Key, group => group.Sum(...))` turns them into the result. `CountBy` (.NET 9+) counts per key directly.

---

`Max` throws `InvalidOperationException` when the sequence is empty. Select the totals first and add `DefaultIfEmpty()` before `Max()`: an empty sequence then holds one `0m`.
