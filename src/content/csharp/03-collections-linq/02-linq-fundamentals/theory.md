# LINQ Fundamentals: Filter, Project, Group, Join

After this lesson you can write the everyday LINQ queries of backend code in method syntax: filter with `Where`, shape results with `Select`, sort, group and aggregate, join two sequences (including the .NET 10 `LeftJoin`), and pick the right element operator (`First`, `FirstOrDefault`, `Single`) so that an empty or ambiguous result fails the way you intend.

## Coming from PHP/Magento

You already do this work with `array_filter`, `array_map`, `usort`, `array_column` and nested `foreach` loops, or with Magento collections (`addFieldToFilter`, `setOrder`, `join`). LINQ is one API for both kinds of source: the same `Where`/`Select`/`GroupBy` methods run over an in-memory `List<T>` and, through EF Core, become SQL (module 07). The C# compiler checks every lambda against the element type, so a typo in a property name is a build error, not a `null` at runtime.

The trap is reading LINQ as a series of eager array functions. `array_filter` returns a new array immediately; `Where` returns a query that has not run yet. This lesson uses `ToList()` at the end of each query to keep things eager; lesson 03 explains what happens without it.

The examples use these records:

```csharp
public sealed record Product(string Sku, string Name, string Category, decimal Price, int Stock);
public sealed record OrderLine(string OrderId, string Sku, int Quantity);
public sealed record CategorySummary(string Category, int Products, decimal StockValue);
```

## Filter, project, sort

Each operator takes a lambda (lesson 02/04) and returns a new sequence; the source is never modified.

```csharp
var available = products
    .Where(p => p.Stock > 0)
    .OrderBy(p => p.Category)
    .ThenByDescending(p => p.Price)
    .Select(p => new { p.Sku, p.Name, p.Price })
    .ToList();
```

`Select` projects each element into a new shape. Here it is an anonymous type, which is handy inside one method; return a record when the shape leaves the method. `OrderBy` followed by `ThenBy` is a multi-key sort. A second `OrderBy` does not refine the first: it becomes the new primary key. In memory, `OrderBy` is a stable sort, so ties happen to keep the earlier order; EF Core drops the earlier ordering from the SQL. Write `ThenBy` so the tie-break is explicit.

The same query in query syntax reads like SQL:

```csharp
var available = (from p in products
                 where p.Stock > 0
                 orderby p.Category, p.Price descending
                 select new { p.Sku, p.Name, p.Price }).ToList();
```

The compiler turns query syntax into the method calls, so there is no semantic or performance difference. Most codebases use method syntax, because operators such as `Count`, `Distinct` or `Take` have no query keyword anyway.

## Aggregate and test

Operators that return a single value run immediately:

```csharp
int units = products.Sum(p => p.Stock);
decimal stockValue = products.Sum(p => p.Price * p.Stock);
bool anyOutOfStock = products.Any(p => p.Stock == 0);   // stops at the first match
bool allPriced = products.All(p => p.Price > 0);
decimal maxPrice = products.Max(p => p.Price);          // throws on an empty sequence
```

`Sum` of an empty sequence is `0`, but `Average`, `Min` and `Max` over non-nullable numbers throw `InvalidOperationException` when the sequence is empty. Guard with `Any()` or project to a nullable type (`Max(p => (decimal?)p.Price)` returns `null` for no elements). Use `Any()` rather than `Count() > 0` to ask "is there at least one?".

## Pick one element

| Operator | Zero matches | More than one match |
| --- | --- | --- |
| `First` | throws | returns the first |
| `FirstOrDefault` | returns `default` (`null`, `0`) | returns the first |
| `Single` | throws | throws |
| `SingleOrDefault` | returns `default` | throws |

```csharp
Product? product = products.FirstOrDefault(p => p.Sku == sku);
if (product is null)
{
    // unknown SKU: report it instead of crashing
}
```

Choose by what the data guarantees. A SKU should be unique, so `SingleOrDefault` documents that and fails loudly if the data breaks the rule. `FirstOrDefault` on a value type is a trap: for `decimal` the "not found" result is `0`, which is indistinguishable from a real price of zero.

## Group and count

`GroupBy` returns a sequence of `IGrouping<TKey,TElement>`: each group has a `Key` and is itself a sequence you can aggregate.

```csharp
List<CategorySummary> byCategory = products
    .GroupBy(p => p.Category)
    .Select(g => new CategorySummary(g.Key, g.Count(), g.Sum(p => p.Price * p.Stock)))
    .OrderByDescending(s => s.StockValue)
    .ToList();

// .NET 9+: count per key without building the groups
Dictionary<string, int> countByCategory = products
    .CountBy(p => p.Category)
    .ToDictionary(pair => pair.Key, pair => pair.Value);
```

This is the `GROUP BY category` with `COUNT(*)` and `SUM(...)` you would write in SQL, or the `$totals[$row['category']] += ...` loop you would write in PHP.

## Build lookups

When you need repeated access by key, materialize the sequence into a dictionary or a lookup once:

```csharp
Dictionary<string, Product> bySku = products.ToDictionary(p => p.Sku, StringComparer.OrdinalIgnoreCase);
ILookup<string, Product> productsByCategory = products.ToLookup(p => p.Category);

IEnumerable<Product> shoes = productsByCategory["shoes"]; // empty sequence if the key is missing
```

`ToDictionary` throws `ArgumentException` if two elements produce the same key, which is a useful check on data that should be unique. `ToLookup` allows many elements per key, and a missing key gives an empty sequence instead of an exception.

## Join two sequences

`Join` is an inner join: order lines whose SKU has no product disappear. `LeftJoin`, new in .NET 10, keeps every element of the first sequence and passes `null` when there is no match.

```csharp
var priced = orderLines.Join(products,
    line => line.Sku,
    product => product.Sku,
    (line, product) => new { line.OrderId, product.Name, Total = line.Quantity * product.Price });

var withUnknown = orderLines.LeftJoin(products,
    line => line.Sku,
    product => product.Sku,
    (line, product) => new { line.OrderId, line.Sku, Name = product?.Name ?? "(unknown SKU)" });
```

Before .NET 10 a left join needed `GroupJoin` plus `SelectMany` and `DefaultIfEmpty`; you will still see that pattern in older code. `RightJoin` also exists. For in-memory data, a dictionary lookup (`bySku.TryGetValue(line.Sku, out var product)`) is often clearer than a join.

## In practice

- **Method syntax, one operator per line**, ending in `ToList()`, `ToArray()` or `ToDictionary()` when you need a stored result.
- **Project early.** Select only the fields the caller needs. With EF Core this decides which columns are read (module 07/04).
- **Avoid lookups inside loops.** `products.First(p => p.Sku == line.Sku)` inside `foreach (var line in lines)` scans the product list once per line. Build `bySku` once, or join.
- **Mind the empty case.** Decide whether "no element" is an error (`Single`, `First`, `Max`) or an expected outcome (`SingleOrDefault`, `FirstOrDefault`, nullable projection), and write it that way.
- **Keep lambdas pure.** A `Select` that writes to the database or a log runs each time the query runs, which lesson 03 shows can be more than once.

## Status as of 2026-11-05

- `CountBy` and `AggregateBy` were added in .NET 9; `LeftJoin` and `RightJoin` in .NET 10, on both `Enumerable` and `Queryable`. They are not available when targeting .NET 8 or earlier.

## Check yourself

1. Rewrite a PHP loop that sums `price * qty` per category into a LINQ query. Which operators did you use, and what does each return?
2. A colleague wrote `products.Where(p => p.Sku == sku).First()`. What happens when the SKU is unknown, and what would you write instead?
3. When does an inner `Join` silently lose data, and how does `LeftJoin` change the result?
4. Why does `ToDictionary` throwing on a duplicate key help you more than it hurts?
