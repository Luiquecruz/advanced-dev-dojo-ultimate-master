# Collections: Choosing the Right Container

After this lesson you can pick the collection type a piece of C# code needs: `List<T>` for ordered items, `Dictionary<TKey,TValue>` for lookup by key, `HashSet<T>` for uniqueness, and read-only, immutable or frozen collections when other code must not change your data. You will also know which interface to put in a method signature, and why the answer is rarely `List<T>`.

You need: 00/05 (arrays, lists and dictionaries), 02/01 (value and reference types) and 02/04 (generics and lambdas).

## One job per type

Each collection type of `System.Collections.Generic` does one job well: a list keeps items in order, a dictionary finds a value by its key, a set remembers which values it has seen. Picking the type is picking the operations that must be cheap.

All of them are classes, so they are reference types (02/01). Passing a `List<T>` to a method passes the same object: if the method calls `Add`, the caller sees the new item. Nothing is copied unless you copy it.

A LINQ query looks like a collection but is not one: it describes work that runs later (lesson 03).

## `List<T>`: an ordered, growable array

`List<T>` is backed by an array that is replaced by a bigger one when it fills up. Index access and adding at the end are cheap; `Contains` and `Remove(item)` scan the whole list.

```csharp
List<string> skus = ["SKU-1", "SKU-2"]; // collection expression (C# 12+)
skus.Add("SKU-3");

string first = skus[0];
int count = skus.Count;               // a property, not a method
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

A dictionary does not promise an order. Its documentation says the order of enumeration "is undefined". When order matters, keep a `List<T>`, sort explicitly, or use `OrderedDictionary<TKey,TValue>` (.NET 9 and later), which keeps insertion order.

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

Sets also have `UnionWith`, `IntersectWith` and `ExceptWith` for set algebra: everything in either set, only what both share, and what the first has that the second lacks.

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

`Cart` exposes a view so no caller can bypass `Add` and its rules. When a caller needs the state as it is now, unaffected by later changes, hand out a copy (`new List<CartLine>(_lines)`, `ToImmutableArray()`) instead of a view. Reference data that never changes after startup goes into frozen or immutable types, so no request can change it by accident.

## Interfaces in signatures

Accept the weakest interface you need and return the most useful honest one:

- Accept `IEnumerable<T>` when you only loop once, `IReadOnlyCollection<T>` when you also need `Count`, `IReadOnlyList<T>` when you need an index.
- Return `IReadOnlyList<T>` or `IReadOnlyDictionary<TKey,TValue>` from a method that builds a result. Callers get `Count` and indexing without the right to mutate.
- Take `List<T>` or `IList<T>` only when the method's job is to modify the caller's collection.

## Common mistakes

- **Reading a missing key with the indexer.** `stock["X-9"]` throws `KeyNotFoundException` when the key is absent. Use `TryGetValue`, or `GetValueOrDefault` when a default such as `0` is the right answer.
- **Relying on a dictionary's order.** Enumeration order is undefined: a small dictionary often looks like insertion order, so a test passes by luck and production output changes. Sort explicitly or use `OrderedDictionary<TKey,TValue>`.
- **Forgetting the comparer.** Under the default comparer `"A-1"` and `"a-1"` are different keys, so duplicates slip through a `HashSet<string>` and stock splits across two entries. Pass `StringComparer.OrdinalIgnoreCase` for identifiers that ignore case.
- **Changing a list inside `foreach`.** The enumerator is invalidated and the next step throws `InvalidOperationException`. Call `RemoveAll(predicate)`, or loop backwards with `for`.

## In practice

- **Defaults:** `List<T>` for sequences, `Dictionary<TKey,TValue>` for lookups, `HashSet<T>` for "seen before?". Arrays (`T[]`) for fixed-size data and APIs that expect them.
- **Search by key with a dictionary, not a list.** Lesson 02 shows how to build one from a query with `ToDictionary` instead of scanning a list inside a loop.
- **Choose the comparer on purpose.** Pick `StringComparer.Ordinal` or `OrdinalIgnoreCase` explicitly for identifiers.
- **Shared state is not thread-safe.** The generic collections are not synchronized. An ASP.NET Core app is one long-running process that serves many requests at once (module 05), so a `static Dictionary` written by concurrent requests is a race condition. Use `ConcurrentDictionary<TKey,TValue>`, or build the data once at startup and freeze it.
- **Avoid `System.Collections`** (`ArrayList`, `Hashtable`). Microsoft's guidance is to use the generic and concurrent collections instead.

## Check yourself

1. A method receives a `List<Product>` and calls `Add` on it. What does the caller observe, and what would the method accept instead if it must not change the caller's list?
2. Why might code that prints a `Dictionary<string, int>` in insertion order work in a test and still be wrong?
3. What is the difference between returning `_lines.AsReadOnly()` and returning `_lines.ToImmutableArray()` from `Cart.Lines`?
4. When would you pay the extra build cost of a `FrozenDictionary<TKey,TValue>`?
