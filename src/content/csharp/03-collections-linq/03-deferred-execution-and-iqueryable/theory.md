# Deferred Execution and IQueryable

After this lesson you can predict when a LINQ query actually runs, write and read iterator methods with `yield return`, spot code that runs the same query twice, decide where to call `ToList()`, and tell whether a query executes in memory (`IEnumerable<T>`) or is translated to SQL (`IQueryable<T>`). That last distinction decides whether EF Core sends `WHERE stock > 0` to the database or downloads the whole table.

You need: 03/02 (LINQ operators), 02/04 (lambdas and expression trees) and 00/07 (exceptions).

## A query is a recipe, not a result

Operators that return a sequence (`Where`, `Select`, `OrderBy`, `GroupBy`, `Join`...) use deferred execution: they store what to do and run when the sequence is enumerated.

```csharp
List<int> stock = [5, 0, 12];
IEnumerable<int> available = stock.Where(s => s > 0); // nothing runs yet

stock.Add(7);
Console.WriteLine(available.Count()); // 3: the query runs now and sees the 7
```

Operators that return a single value (`Count`, `Sum`, `Any`, `First`, `Max`) and the conversion operators (`ToList`, `ToArray`, `ToDictionary`, `ToLookup`) run immediately. Among the deferred ones, `Where` and `Select` are streaming (they process one element at a time), while `OrderBy` and `GroupBy` are non-streaming: they must read the whole source before they return the first element.

## Iterators: `yield return`

You can write your own deferred sequence. A method that returns `IEnumerable<T>` and contains `yield return` is an iterator: calling it runs none of its body. Each time the consumer asks for the next element, the body runs until the next `yield return`, hands that value over and pauses there.

```csharp
IEnumerable<int> Countdown(int from)
{
    if (from < 0) throw new ArgumentOutOfRangeException(nameof(from));
    for (int i = from; i > 0; i--)
    {
        Console.WriteLine($"producing {i}");
        yield return i;
    }
}

var numbers = Countdown(3);           // prints nothing: the body has not started
Console.WriteLine(numbers.First());   // "producing 3", then 3: it stopped after one element
foreach (var n in numbers) { }        // starts again from 3, printing all three
var bad = Countdown(-1);              // no exception yet
```

Three consequences: an iterator produces only what the consumer asks for, every new `foreach` starts it again from the top, and even the argument check before the first `yield` waits for the first element. `Countdown(-1)` throws only when someone loops over `bad`, perhaps far from the call. To check at the call, validate in a plain method and return a local iterator function:

```csharp
IEnumerable<int> Countdown(int from)
{
    ArgumentOutOfRangeException.ThrowIfNegative(from); // runs at the call
    return Produce(from);

    static IEnumerable<int> Produce(int from)
    {
        for (int i = from; i > 0; i--) yield return i;
    }
}
```

## Multiple enumeration

Because each enumeration runs the recipe again, the cost and the side effects repeat:

```csharp
IEnumerable<Product> ReadProducts(string path)
{
    foreach (var line in File.ReadLines(path).Skip(1))
    {
        yield return ParseLine(line);
    }
}

Product ParseLine(string line) => // ... your own parsing: one CSV line to one Product

IEnumerable<Product> products = ReadProducts("products.csv");

if (products.Any())                       // opens the file, reads up to the first data line
{
    Console.WriteLine(products.Count());  // reads the whole file again
    foreach (var p in products) { }       // and a third time
}
```

The fix is to materialize once when you will use the result more than once: `List<Product> products = ReadProducts("products.csv").ToList();`. The .NET analyzer rule CA1851, "Possible multiple enumerations of `IEnumerable` collection", detects this pattern; it is not enabled by default in .NET 10, so turn it on in `.editorconfig`. For a single pass over a large file, though, streaming keeps memory flat.

## `IEnumerable<T>` versus `IQueryable<T>`

Both interfaces have the same operator names, but the compiler treats the lambdas differently. For `IEnumerable<T>` it compiles `p => p.Stock > 0` to a delegate: code that runs in your process. For `IQueryable<T>` it builds an expression tree: a data structure that describes the lambda, which a provider such as EF Core translates into SQL.

```csharp
// db is an EF Core DbContext, the object that talks to the database (module 07).
// db.Products is a DbSet<Product>, which implements IQueryable<Product>.
IQueryable<Product> query = db.Products
    .Where(p => p.Stock > 0)
    .OrderBy(p => p.Price);

List<Product> page = await query.Skip(20).Take(10).ToListAsync();
// one SQL statement with WHERE, ORDER BY and paging; ten rows cross the wire
```

`await` is lesson 04/02; read it as "wait for the result without blocking". The static type of the variable decides which `Where` is called. Assign the same `DbSet` to an `IEnumerable<T>` and every later operator runs in memory:

```csharp
IEnumerable<Product> all = db.Products;              // static type is IEnumerable<Product>
var page = all.Where(p => p.Stock > 0).Take(10).ToList();
// Enumerable.Where: EF Core sends a SELECT with no WHERE or LIMIT; rows stream
// into C#, which filters them, so in the worst case the whole table crosses the wire
```

It compiles, it returns the right rows, and it is slow in production once the table grows.

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

## Common mistakes

- **Enumerating a deferred sequence twice.** `Any()` followed by `foreach` reads the file, calls the API or queries the database twice, and a side effect in a lambda runs twice. Call `ToList()` once and reuse the list.
- **Returning a query over a source you dispose.** A method that creates a `DbContext`, disposes it on return (`using var db = ...`, lesson 04/03) and returns `db.Orders.Where(...)` fails in the caller's `foreach` with `ObjectDisposedException`. Materialize inside the method: `return await query.ToListAsync();`.
- **Storing a `DbSet` in an `IEnumerable<T>`.** Every later `Where` runs in memory after the whole table was read. Keep the type `IQueryable<T>` until the query is complete.
- **Validating inside an iterator.** The check runs at the first element, not at the call. Validate in a plain method that returns the iterator, or materialize.

## In practice

- **Compose as `IQueryable<T>`, materialize once at the edge.** Build filters, sorting and paging on the query, then call `ToListAsync()`, `FirstOrDefaultAsync()` or `CountAsync()` once. The EF Core details (tracking, projections, N+1) are in module 07.
- **Watch the declared type of repository methods.** Return a materialized `IReadOnlyList<T>`, or return `IQueryable<T>` deliberately and accept that callers can then shape the SQL. In ASP.NET Core the DI container owns the `DbContext` per request (module 05).
- **Stream when you enumerate once** over large data. Async streaming with `IAsyncEnumerable<T>` and `await foreach` is in module 04.

## Check yourself

1. Which of `Where`, `OrderBy`, `Count` and `ToList` run immediately, and which are deferred? Of the deferred ones, which must read the whole source first?
2. A method returns `IEnumerable<Order>` built with `yield return` from an HTTP API. The caller calls `Any()` and then `foreach`. How many HTTP calls happen, and how would you change it?
3. Why does `IEnumerable<Product> all = db.Products;` change the SQL that later operators produce?
4. What is the difference between an untranslatable method in `Where` and the same method in the final `Select` under EF Core?
