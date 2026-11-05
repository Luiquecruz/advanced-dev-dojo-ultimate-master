# Collections: Choosing the Right Container

After this lesson you can pick the collection type a piece of C# code needs: `List<T>` for ordered items, `Dictionary<TKey,TValue>` for lookup by key, `HashSet<T>` for uniqueness, and read-only, immutable or frozen collections when other code must not change your data. You will also know which interface to put in a method signature, and why the answer is rarely `List<T>`.

## Coming from PHP/Magento

In PHP one type does every job. A PHP `array` is an ordered map: it is a list (`$skus[] = 'A'`), a dictionary (`$stock['A'] = 10`) and, with `array_unique` or `isset($seen[$sku])`, a set. It keeps insertion order, and it has value semantics: passing it to a function hands over a copy (copy-on-write under the hood).

C# splits those jobs into separate types, and two habits break:

- **Collections are reference types.** Passing a `List<T>` to a method passes the same object (lesson 02/01). If the method calls `Add`, the caller sees the new item. There is no implicit copy.
- **`Dictionary<TKey,TValue>` does not promise order.** Its documentation says the order of enumeration "is undefined". Code that relies on PHP's insertion order needs `OrderedDictionary<TKey,TValue>` (.NET 9 and later) or an explicit sort.

Missing keys behave differently too. `$stock['missing']` in PHP gives a warning and `null`; `stock["missing"]` in C# throws `KeyNotFoundException`.

Magento's `Collection` classes (`addFieldToFilter`, `setPageSize`) are not collections in this sense. They are lazy query builders, closer to `IQueryable<T>`, which is lesson 03.

## `List<T>`: an ordered, growable array

`List<T>` is backed by an array that is replaced by a bigger one when it fills up. Index access and adding at the end are cheap; `Contains` and `Remove(item)` scan the whole list.

```csharp
List<string> skus = ["SKU-1", "SKU-2"]; // collection expression (C# 12+)
skus.Add("SKU-3");

string first = skus[0];
int count = skus.Count;          // a property, not a method
bool hasTwo = skus.Contains("SKU-2"); // linear scan: fine for small lists
```

Use it as the default container for "some items in order". If you search it by key in a loop, you want a dictionary instead.

## `Dictionary<TKey,TValue>`: lookup by key

A dictionary hashes the key, so the average lookup does not get slower as the dictionary grows, unlike a scan of a list. Keys cannot be `null` and must be unique. Pass a comparer when the key's equality is not the default; for SKUs and email addresses that is usually `StringComparer.OrdinalIgnoreCase`.

```csharp
var stockBySku = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase)
{
    ["SKU-1"] = 10,
    ["SKU-2"] = 0,
};

if (stockBySku.TryGetValue("sku-1", out int stock))
{
    Console.WriteLine(stock); // 10, because the comparer ignores case
}

stockBySku["SKU-3"] = 5;        // indexer set: adds or overwrites
// stockBySku.Add("SKU-3", 7);  // throws ArgumentException: duplicate key
// _ = stockBySku["missing"];   // throws KeyNotFoundException
```

`TryGetValue` is the idiomatic read when the key may be absent: one hash lookup, no exception. `ContainsKey` followed by the indexer does the lookup twice.

## `HashSet<T>`: uniqueness and membership

A set stores each value once and answers "is it in there?" as fast as a dictionary. `Add` returns `false` when the value is already present, which makes duplicate detection a one-liner.

```csharp
string[] incomingSkus = ["A-1", "B-2", "a-1"];
var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

foreach (var sku in incomingSkus)
{
    if (!seen.Add(sku))
    {
        Console.WriteLine($"Duplicate SKU: {sku}"); // prints a-1
    }
}
```

Sets also have `UnionWith`, `IntersectWith` and `ExceptWith` for set algebra, the work that `array_intersect` and `array_diff` do in PHP.

## Read-only views, immutable and frozen collections

Three different promises are often confused:

- **Read-only view** (`IReadOnlyList<T>`, `ReadOnlyCollection<T>`, `ReadOnlySet<T>` in .NET 9+): the holder of the view cannot change the collection, but the owner still can, and the view shows those changes.
- **Immutable** (`System.Collections.Immutable`: `ImmutableArray<T>`, `ImmutableList<T>`, `ImmutableDictionary<TKey,TValue>`): nobody can change it. "Modifying" methods return a new collection.
- **Frozen** (`FrozenDictionary<TKey,TValue>`, `FrozenSet<T>` in `System.Collections.Frozen`, .NET 8+): immutable, expensive to build, and optimized for fast reads. Microsoft's docs describe it as ideal for data "created once, potentially at the startup of an application".

```csharp
using System.Collections.Frozen;
using System.Collections.Immutable;

public sealed record CartLine(string Sku, int Quantity);

public sealed class Cart
{
    private readonly List<CartLine> _lines = [];

    public IReadOnlyList<CartLine> Lines => _lines.AsReadOnly(); // callers cannot Add
    public void Add(CartLine line) => _lines.Add(line);           // the cart still can
}

public static class Reference
{
    public static readonly ImmutableArray<string> Currencies = ["EUR", "USD"];

    public static readonly FrozenDictionary<string, decimal> VatByCountry =
        new Dictionary<string, decimal> { ["DE"] = 0.19m, ["NL"] = 0.21m }
            .ToFrozenDictionary();
}

// ImmutableArray<string> more = Reference.Currencies.Add("BRL"); // a new array; Currencies is unchanged
```

`Cart` exposes a view so no caller can bypass `Add` and its rules. Reference data that never changes after startup goes into frozen or immutable types, so no request can change it by accident.

## Interfaces in signatures

Accept the weakest interface you need and return the most useful honest one:

- Accept `IEnumerable<T>` when you only loop once, `IReadOnlyCollection<T>` when you also need `Count`, `IReadOnlyList<T>` when you need an index.
- Return `IReadOnlyList<T>` or `IReadOnlyDictionary<TKey,TValue>` from a method that builds a result. Callers get `Count` and indexing without the right to mutate.
- Take `List<T>` or `IList<T>` only when the method's job is to modify the caller's collection.

## In practice

- **Defaults:** `List<T>` for sequences, `Dictionary<TKey,TValue>` for lookups, `HashSet<T>` for "seen before?". Arrays (`T[]`) for fixed-size data and APIs that expect them.
- **Search by key with a dictionary, not a list.** Lesson 02 shows how to build one from a query with `ToDictionary` instead of scanning a list inside a loop.
- **Choose the comparer on purpose.** `"ABC"` and `"abc"` are different keys under the default comparer. Pick `StringComparer.Ordinal` or `OrdinalIgnoreCase` explicitly for identifiers.
- **Shared state is not thread-safe.** The generic collections are not synchronized. An ASP.NET Core app is one long-running process (module 05), so a `static Dictionary` written by concurrent requests is a race condition. Use `ConcurrentDictionary<TKey,TValue>`, or build the data once at startup and freeze it.
- **Do not modify a list while looping over it with `foreach`.** The enumerator is invalidated and the next step throws `InvalidOperationException`. Loop backwards with `for`, or call `RemoveAll(predicate)`.
- **Avoid `System.Collections`** (`ArrayList`, `Hashtable`). Microsoft's guidance is to use the generic and concurrent collections instead.

## Status as of 2026-11-05

- `FrozenDictionary<TKey,TValue>` and `FrozenSet<T>` ship in .NET 8 and later (and in the `System.Collections.Immutable` package for older targets).
- `OrderedDictionary<TKey,TValue>` and `ReadOnlySet<T>` were added in .NET 9; .NET 10 added `TryAdd` and `TryGetValue` overloads on `OrderedDictionary<TKey,TValue>` that return the entry's index.
- C# 15 (.NET 11, not GA yet: RC3 shipped on 2026-10-25) adds collection expression arguments such as `[with(StringComparer.OrdinalIgnoreCase), "a"]`. On C# 14 pass the comparer to the constructor, as above.

## Check yourself

1. A method receives a `List<Product>` and calls `Add` on it. What does the caller observe, and how would the same code behave with a PHP array?
2. Why might code that prints a `Dictionary<string, int>` in insertion order work in a test and still be wrong?
3. What is the difference between returning `_lines.AsReadOnly()` and returning `_lines.ToImmutableArray()` from `Cart.Lines`?
4. When would you pay the extra build cost of a `FrozenDictionary<TKey,TValue>`?
