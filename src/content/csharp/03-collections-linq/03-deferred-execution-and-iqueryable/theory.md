# Deferred Execution and IQueryable

After this lesson you can predict when a LINQ query actually runs, spot code that runs the same query twice, decide where to call `ToList()`, and tell whether a query executes in memory (`IEnumerable<T>`) or is translated to SQL (`IQueryable<T>`). That last distinction decides whether EF Core sends `WHERE stock > 0` to the database or downloads the whole table.

## Coming from PHP/Magento

Magento collections already work this way, so you know the idea under another name. `$collection->addFieldToFilter('status', 1)->setPageSize(20)` builds SQL and runs nothing; the query runs on `load()`, `foreach` or `getItems()`. You also know the trap: `count($collection)` loads every row and counts them in PHP, while `getSize()` sends a `COUNT` query. In .NET, `IQueryable<T>` is the query builder and `IEnumerable<T>` is the in-memory loop, and the difference is just as expensive.

The PHP generator (`yield`) is the closest thing to an in-memory C# iterator, with one difference that bites. A PHP generator runs once: trying to `foreach` it again after it has advanced throws an exception. A C# `IEnumerable<T>` is a recipe: every `foreach` starts it again from the beginning, silently. Reading a file or calling an API inside an iterator therefore happens once per enumeration.

## A query is a recipe, not a result

Operators that return a sequence (`Where`, `Select`, `OrderBy`, `GroupBy`, `Join`...) use deferred execution: they store what to do and run when the sequence is enumerated.

```csharp
List<int> stock = [5, 0, 12];
IEnumerable<int> available = stock.Where(s => s > 0); // nothing runs yet

stock.Add(7);
Console.WriteLine(available.Count()); // 3: the query runs now and sees the 7
```

Operators that return a single value (`Count`, `Sum`, `Any`, `First`, `Max`) and the conversion operators (`ToList`, `ToArray`, `ToDictionary`, `ToLookup`) run immediately. Among the deferred ones, `Where` and `Select` are streaming (they process one element at a time), while `OrderBy` and `GroupBy` are non-streaming: they must read the whole source before they return the first element.

## Multiple enumeration

Because each enumeration runs the recipe again, the cost and the side effects repeat:

```csharp
IEnumerable<Product> ReadProducts(string path)
{
    foreach (var line in File.ReadLines(path).Skip(1))
    {
        Console.WriteLine("parsing a line");
        yield return ParseLine(line);
    }
}

Product ParseLine(string line) { /* ... */ }

IEnumerable<Product> products = ReadProducts("products.csv");

if (products.Any())                        // opens the file, reads up to the first data line
{
    Console.WriteLine(products.Count());   // reads the whole file again
    foreach (var p in products) { /* ... */ } // and a third time
}
```

The fix is to materialize once when you will use the result more than once: `List<Product> products = ReadProducts("products.csv").ToList();`. The .NET analyzer rule CA1851, "Possible multiple enumerations of `IEnumerable` collection", detects this pattern; it is not enabled by default in .NET 10, so turn it on in `.editorconfig`. Do not reach for `ToList()` everywhere, though: for a single pass over a large file, streaming keeps memory flat.

## Errors happen late

A deferred query throws when it runs, not where it is written. A method that builds a query over something it disposes hands the caller a time bomb:

```csharp
IEnumerable<Product> GetActive(string connectionString)
{
    using var db = new CatalogDbContext(connectionString); // an EF Core DbContext (module 07); disposed when the method returns
    return db.Products.Where(p => p.IsActive);          // not executed yet
}

foreach (var p in GetActive(cs)) { } // ObjectDisposedException: the context is gone
```

Return `await query.ToListAsync()` from such a method (`await` is explained in lesson 04/02; read it as "wait for the result without blocking"), or let the caller own the context (in ASP.NET Core the DI container does, per request; module 05).

## `IEnumerable<T>` versus `IQueryable<T>`

Both interfaces have the same operator names, but the compiler treats the lambdas differently. For `IEnumerable<T>` it compiles `p => p.Stock > 0` to a delegate: code that runs in your process. For `IQueryable<T>` it builds an expression tree: a data structure that describes the lambda, which a provider such as EF Core translates into SQL.

```csharp
// db.Products is a DbSet<Product>, which implements IQueryable<Product>
IQueryable<Product> query = db.Products
    .Where(p => p.Stock > 0)
    .OrderBy(p => p.Price);

List<Product> page = await query.Skip(20).Take(10).ToListAsync();
// one SQL statement with WHERE, ORDER BY and paging; ten rows cross the wire
```

The static type of the variable decides which `Where` is called. Assign the same `DbSet` to an `IEnumerable<T>` and every later operator runs in memory:

```csharp
IEnumerable<Product> all = db.Products;              // static type is IEnumerable<Product>
var page = all.Where(p => p.Stock > 0).Take(10).ToList();
// Enumerable.Where: EF Core sends a SELECT with no WHERE or LIMIT; rows stream
// into C#, which filters them, so in the worst case the whole table crosses the wire
```

This is the .NET version of `count($collection)` versus `getSize()`. It compiles, it returns the right rows, and it is slow in production once the table grows.

## What cannot be translated

EF Core can only translate expressions it understands. A call to your own method inside `Where` cannot become SQL, and since EF Core 3.0 that throws an exception at runtime instead of silently filtering in memory. In the final `Select`, EF Core evaluates untranslatable parts on the client after fetching the needed columns.

```csharp
var bad = await db.Products
    .Where(p => Normalize(p.Name).Contains("shoe")) // throws: cannot be translated
    .ToListAsync();

var explicitClient = db.Products
    .Where(p => p.Category == "shoes")              // runs in SQL
    .AsEnumerable()                                 // from here on: LINQ to Objects
    .Where(p => Normalize(p.Name).Contains("shoe"));
```

`AsEnumerable()` streams the rows and switches to in-memory operators; `ToList()` buffers them. Both are explicit decisions to pull data into the process, so filter as much as possible in the database first.

## In practice

- **Compose as `IQueryable<T>`, materialize once at the edge.** Build filters, sorting and paging on the query, then call `ToListAsync()`, `FirstOrDefaultAsync()` or `CountAsync()` once. The EF Core details (tracking, projections, N+1) are in module 07.
- **Watch the declared type.** A repository method that returns `IEnumerable<Product>` from a `DbSet` makes every caller's `Where` run in memory. Return a materialized `IReadOnlyList<T>`, or return `IQueryable<T>` deliberately and accept that callers can then shape the SQL.
- **Materialize when you will enumerate twice**, when the source is expensive (file, network, database), or before the source is disposed.
- **Stream when you enumerate once** over large data. Async streaming with `IAsyncEnumerable<T>` and `await foreach` is in module 04.
- **Keep side effects out of lambdas.** A `Select` that logs or writes runs once per enumeration, and never if nobody enumerates.

## Check yourself

1. Which of `Where`, `OrderBy`, `Count` and `ToList` run immediately, and which are deferred? Of the deferred ones, which must read the whole source first?
2. A method returns `IEnumerable<Order>` built with `yield return` from an HTTP API. The caller calls `Any()` and then `foreach`. How many HTTP calls happen, and how would you change it?
3. Why does `IEnumerable<Product> all = db.Products;` change the SQL that later operators produce?
4. What is the difference between an untranslatable method in `Where` and the same method in the final `Select` under EF Core?
