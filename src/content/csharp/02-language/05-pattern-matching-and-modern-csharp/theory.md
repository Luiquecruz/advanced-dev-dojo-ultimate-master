# Pattern Matching and Modern C#

Code written for .NET 10 looks different from older tutorials: `switch` expressions instead of `if` chains, list patterns, primary constructors on services, `[..]` collection literals and, since C# 14, extension properties. After this lesson you can read and write that style, and you know where each feature bites.

You need: 02/03 (records, classes and interfaces) and 02/04 (lambdas and `Func`).

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
// ILogger<T> is the logging interface of .NET (05/04)
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
List<string> skus = ["BAG-01", "BAG-02"];
IReadOnlyList<string> featured = [.. skus, "BOTTLE-01"];  // spread, then one more element
string[] none = [];                                    // the compiler may reuse an empty array
```

A collection expression always builds the whole collection immediately, even when the target is `IEnumerable<T>`. That differs from the deferred LINQ queries in 03/03. It cannot be a compile-time constant, so it cannot be a default parameter value.

## Extension members (C# 14)

Extension methods have existed for years: LINQ's `Where` and `Select` are extension methods on `IEnumerable<T>`. The classic form is a static method whose first parameter is marked `this`, called as if it were an instance method:

```csharp
public static class ProductChecks
{
    public static bool IsInStock(this Product product) => product.Stock > 0;  // call: bag.IsInStock()
}
```

C# 14 adds `extension` blocks inside a top-level, non-generic static class. A block can declare extension **properties** and **static** extensions as well as methods:

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

## Common mistakes

- **Putting a general arm before a specific one.** The first match wins, so with `{ Total: >= 100m }` above `{ Status: OrderStatus.Cancelled }`, a cancelled order over 100 never reaches its own arm. Order arms from specific to general.
- **Leaving out the final `_` arm.** An unexpected value, such as `(OrderStatus)7`, throws `SwitchExpressionException` in production; the compiler only warned. End with `_ =>` that returns a default or throws a clear exception.
- **Treating primary constructor parameters as read-only.** A method can reassign `repository`, and every later call uses the new value. Copy it into a `private readonly` field when that matters.
- **Naming an extension like an existing member.** The type's own `Contains` always wins, so the extension never runs. Give it its own name, such as `ContainsIgnoreCase`.

## In practice

- Use `switch` expressions for mapping and classification (status to label, input to price rule). A 30-arm switch is as hard to review as a 30-branch `if`.
- Use primary constructors for DI in services. Copy a parameter into a `readonly` field when it must never be reassigned.
- Use extension members for small helpers on types you do not own, or for layer-specific helpers on DTOs. Do not use them to fake behavior changes. Behavior changes belong in the type, or in a decorator registered through DI.

## Check yourself

1. Why does the order of arms matter in a `switch` expression, and what does the compiler do with an arm that can never match?
2. What is the difference between `class OrderService(IOrderRepository repository)` and `record OrderDto(string Number)` in what the compiler generates?
3. A teammate writes an extension `Contains(this string text, string value)` that ignores case. Why does `"ABC".Contains("abc")` still return `false`, and what should they name it instead?
