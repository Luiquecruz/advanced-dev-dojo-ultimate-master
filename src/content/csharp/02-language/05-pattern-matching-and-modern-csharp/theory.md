# Pattern Matching and Modern C#

Code written for .NET 10 looks different from older tutorials: `switch` expressions instead of `if` chains, list patterns, primary constructors on services, `[..]` collection literals and, since C# 14, extension properties. After this lesson you can read and write that style, and you know where each feature bites.

## Coming from PHP/Magento

- **`match` versus `switch` expressions.** PHP 8's `match` compares values with `===` and throws `UnhandledMatchError` when no arm fits. A C# `switch` expression matches **patterns**: types, property values, ranges and list shapes. The compiler warns when the arms do not cover every input, and at run time an unmatched value throws `SwitchExpressionException`.
- **Constructor promotion versus primary constructors.** PHP's `public function __construct(private ProductRepository $repository)` declares a property. A C# primary constructor on a class declares **parameters**, not properties, and they are not read-only. Only a `record` turns them into public properties.
- **Spread.** PHP's `[...$a, ...$b]` becomes `[.. a, .. b]`.
- **Extension members are not plugins.** A Magento `around` or `after` plugin changes what an existing method does. An extension member only *adds* members. When the type already has a member with the same signature, the type's own member always wins, and the extension is never called.

## Switch expressions and patterns

```csharp
static decimal ShippingCost(Order order) => order switch
{
    { Status: OrderStatus.Cancelled } => 0m,
    { Total: >= 100m } => 0m,                       // free shipping
    { Country: "NL" or "BE" } => 4.95m,
    { Total: > 50m and < 100m } => 6.95m,
    _ => 9.95m,                                     // discard: everything else
};

public enum OrderStatus { Pending, Paid, Shipped, Cancelled }
public record Order(OrderStatus Status, decimal Total, string Country);
```

Arms are tried top to bottom, and the first match wins. The compiler rejects an arm that an earlier arm already covers. The building blocks combine freely:

| Pattern | Example |
| --- | --- |
| type / declaration | `string sku =>`, `Order order =>` |
| constant | `null`, `"NL"`, `OrderStatus.Paid` |
| relational | `>= 100m`, `< 0` |
| logical | `"NL" or "BE"`, `> 50m and < 100m`, `not null` |
| property | `{ Status: OrderStatus.Paid, Total: > 0 }`, nested `{ Address.Country: "NL" }` |
| positional | `(0, 0)` on a record or tuple, using `Deconstruct` |
| discard / `var` | `_`, `var x` |

A `when` clause adds a condition that a pattern cannot express:

```csharp
static string Describe(object? payload) => payload switch
{
    null => "empty",
    int quantity when quantity < 0 => "invalid quantity",
    int quantity => $"{quantity} items",
    string sku => $"SKU {sku}",
    Order { Status: OrderStatus.Paid } order => $"paid order of {order.Total}",
    _ => "unknown",
};
```

Patterns also work in `if` with `is`: `if (input is not null)`, or `if (result is { Errors.Count: > 0 })`. Prefer `is null` over `== null`, because `is null` never calls an overloaded `==` operator.

## List patterns

List patterns match arrays and lists by shape. `..` (a slice) matches zero or more elements and can capture them:

```csharp
static string Command(string[] args) => args switch
{
    [] => "usage: import <file> [--dry-run]",
    [var file] => $"importing {file}",
    [var file, "--dry-run"] => $"checking {file} without saving",
    [_, .. var rest] => $"unknown options: {string.Join(' ', rest)}",
};
```

They make CSV and command-line parsing readable: `line.Split(',') is [var sku, var name, var price]` checks the column count and names the columns in one step. List patterns are checked for exhaustiveness too (CS8509 names an uncovered shape such as `[_, _]`); `Command` needs no `_`, because `[]` and `[_, .. var rest]` cover every array.

## Primary constructors

Since C# 12, a class can declare constructor parameters in its header. This is the usual way to receive dependencies in ASP.NET Core services:

```csharp
public sealed class OrderService(IOrderRepository repository, ILogger<OrderService> logger)
{
    public void Cancel(int orderId)
    {
        logger.LogInformation("Cancelling order {OrderId}", orderId);
        repository.Cancel(orderId);    // ... IOrderRepository is your interface
    }
}
```

The parameters are in scope in the whole class body. The compiler stores a parameter in a hidden private field only when a member uses it. They are **parameters**, so a method can reassign `repository` by mistake. When that matters, copy it into a field: `private readonly IOrderRepository _repository = repository;`. Any other constructor you write must call the primary one with `: this(...)`. On a `record`, the same syntax generates public properties instead (lesson 03).

## Collection expressions

A collection expression `[...]` creates whatever collection the target type asks for: arrays, `List<T>`, `Span<T>`, `ImmutableArray<T>` and interfaces such as `IReadOnlyList<T>`:

```csharp
int[] ids = [1, 2, 3];
List<string> skus = ["24-MB01", "24-MB04"];
IReadOnlyList<string> featured = [.. skus, "24-WB02"];  // spread, then one more element
string[] none = [];                                    // the compiler may reuse an empty array
```

A collection expression always builds the whole collection immediately, even when the target is `IEnumerable<T>`. That differs from the deferred LINQ queries in 03/03. It cannot be a compile-time constant, so it cannot be a default parameter value.

## Extension members (C# 14)

Extension methods have existed for years: LINQ's `Where` and `Select` are extension methods on `IEnumerable<T>`. C# 14 adds `extension` blocks inside a top-level, non-generic static class. A block can declare extension **properties** and **static** extensions as well as methods:

```csharp
public static class ProductExtensions
{
    extension(Product product)                  // instance extensions: product.IsInStock
    {
        public bool IsInStock => product.Stock > 0;
        public string Label() => $"{product.Sku} {product.Name}";
    }

    extension(Product)                          // static extensions: Product.Placeholder
    {
        public static Product Placeholder => new() { Sku = "N/A", Name = "Unknown" };
    }
}
// ... Product has Sku, Name and Stock properties
```

The rules are those of the old `this` syntax, and both forms compile to the same IL, so converting is not a breaking change. An extension cannot read private members. It is in scope only where its namespace is (a `using`, a global using, or the same namespace). It never overrides a member the type already has.

C# 14 also brought the `field` keyword (lesson 03) and null-conditional assignment `a?.B = x` (lesson 02).

## In practice

- Use `switch` expressions for mapping and classification (status to label, input to price rule). A 30-arm switch is as hard to review as a 30-branch `if`.
- End a `switch` expression with `_ =>` (or handle every enum value and add a throwing `_` arm) so that new input shows up as a clear error, not a `SwitchExpressionException` in production.
- Use primary constructors for DI in services. Copy a parameter into a `readonly` field when it must never be reassigned.
- Use extension members for small helpers on types you do not own, or for layer-specific helpers on DTOs. Do not use them to fake behavior changes. Behavior changes belong in the type, or in a decorator registered through DI.

## Status as of 2026-11-05

- C# 14 is the latest C# release and is supported on .NET 10 (LTS, released 2025-11-11). Microsoft states that using a language version newer than the one tied to your target framework is unsupported.
- C# 15 ships with .NET 11, which is in preview. Its documented features include union types, `closed` class hierarchies with exhaustive `switch` without a discard arm, collection expression arguments (`[with(capacity: 100), ..items]`) and extension indexers. Treat them as coming, not as the baseline.

## Check yourself

1. Why does the order of arms matter in a `switch` expression, and what does the compiler do with an arm that can never match?
2. What is the difference between `class OrderService(IOrderRepository repository)` and `record OrderDto(string Number)` in what the compiler generates?
3. A teammate writes an extension `Contains(this string text, string value)` that ignores case. Why does `"ABC".Contains("abc")` still return `false`, and what should they name it instead?
