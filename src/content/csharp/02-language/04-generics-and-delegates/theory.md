# Generics, Delegates, Lambdas and Events

Generics let one type or method work with many types while the compiler still checks every use. Delegates let you pass behavior around as a value. Together they are behind `List<T>`, LINQ, ASP.NET Core minimal APIs and most of the .NET library. After this lesson you can write a generic type with constraints, use `Func` and `Action` with lambdas, predict what a closure captures, and decide when a C# event is the right tool.

## Coming from PHP/Magento

**PHP has no runtime generics.** A Magento collection holds `DataObject`s, and `@template T` / `@return T[]` in PHPDoc are checked only by PHPStan or Psalm. C# generics are part of the type system and the runtime: a `List<Product>` rejects a `Customer` at compile time, and `typeof(T)` is known at run time. There is no type erasure.

**Closures capture differently.** PHP's `function () use ($limit)` and `fn` arrow functions copy the variable's value when the closure is created, unless you write `use (&$limit)`. A C# lambda captures the **variable itself**. If the variable changes later, the lambda sees the new value. This is the trap of this lesson.

**Events are not `events.xml`.** A Magento event is a global string such as `sales_order_place_after`. Anything can dispatch it, and observers are wired in XML. A C# `event` is a typed member of one object. You subscribe to that particular instance, and handlers run synchronously in the raiser's call stack.

## Generic types and methods

```csharp
public interface IEntity
{
    int Id { get; }
}

public sealed class InMemoryRepository<T> where T : class, IEntity
{
    private readonly Dictionary<int, T> _items = new();

    public void Add(T item) => _items[item.Id] = item;       // IEntity guarantees Id exists
    public T? Find(int id) => _items.GetValueOrDefault(id);  // null when missing
    public int Count => _items.Count;
}

public static class Compare
{
    public static T Max<T>(T a, T b) where T : IComparable<T> => a.CompareTo(b) >= 0 ? a : b;
}

// var products = new InMemoryRepository<Product>();
// var higher = Compare.Max(3, 7);   // T inferred as int
```

Without a constraint, the compiler knows only that `T` is an `object`. Constraints unlock members and say what callers may pass:

| Constraint | Means |
| --- | --- |
| `where T : class` / `struct` | reference type / non-nullable value type |
| `where T : notnull` | any non-nullable type |
| `where T : IEntity` | implements the interface, so `item.Id` compiles |
| `where T : BaseClass` | is or derives from the class |
| `where T : new()` | has a public parameterless constructor (must come last) |

Generic collections also avoid boxing (lesson 01): `List<int>` stores plain `int`s. One subtlety: with `where T : class`, `a == b` compares references even when the actual type overloads `==`. Constrain to `IEquatable<T>` and call `Equals` when you mean value equality.

## Delegates: methods as values

A delegate is a type-safe reference to a method. You rarely declare your own delegate type, because the generic ones cover almost everything:

- `Func<T1, ..., TResult>`: takes arguments, returns a value (the **last** type argument is the result).
- `Action<T1, ...>`: takes arguments, returns nothing.

```csharp
Func<decimal, decimal> addVat = net => net * 1.21m;
Action<string> log = message => Console.WriteLine(message);
Func<string, int> parse = int.Parse;            // a method group works too

decimal Total(IEnumerable<decimal> lines, Func<decimal, decimal> tax) => lines.Sum(tax);

log($"Total: {Total([10m, 20m], addVat)}");      // Total: 36.30 (36,30 in pt-BR culture)
```

Passing a `Func` is the lightweight version of a strategy pattern. You will see it all over the framework: `app.MapGet("/products/{sku}", (string sku) => ...)` passes a lambda as the endpoint handler (06/01).

Lambdas can also be converted to **expression trees** (`Expression<Func<T, bool>>`), which are data describing the code instead of compiled code. That is how EF Core turns `p => p.Price > 10` into SQL (03/03).

## Closures: what a lambda captures

```csharp
var threshold = 10;
Func<int, bool> isLowStock = stock => stock < threshold;
threshold = 3;
Console.WriteLine(isLowStock(5));   // False: the lambda reads threshold when it runs, and it is 3 now
```

The classic bug is a `for` loop, whose single loop variable is shared by every iteration:

```csharp
var actions = new List<Action>();
for (var i = 0; i < 3; i++)
{
    actions.Add(() => Console.Write(i));
}
foreach (var action in actions)
{
    action();                       // prints 333, not 012
}
```

`foreach` creates a fresh variable for each iteration, so the same code with `foreach` over `[0, 1, 2]` prints `012`. With `for`, copy the value into a local inside the loop (`var current = i;`) and capture that. A captured variable also lives as long as the delegate does, so a lambda stored in a long-lived object keeps everything it captured alive. Mark a lambda `static` (`static x => x * 2`) to make the compiler reject any capture.

## Events

An event is a delegate field that outsiders can only subscribe to (`+=`) and unsubscribe from (`-=`). Only the declaring class can raise it. The .NET convention is `EventHandler<TEventArgs>`:

```csharp
var checkout = new Checkout();
checkout.OrderPlaced += (sender, e) => Console.WriteLine($"Send confirmation for {e.OrderNumber}");
checkout.PlaceOrder("000000042");

public sealed class OrderPlacedEventArgs : EventArgs
{
    public required string OrderNumber { get; init; }
}

public sealed class Checkout
{
    public event EventHandler<OrderPlacedEventArgs>? OrderPlaced;

    public void PlaceOrder(string orderNumber)
    {
        // ... save the order
        OrderPlaced?.Invoke(this, new OrderPlacedEventArgs { OrderNumber = orderNumber });
    }
}
```

`?.Invoke` matters: with no subscribers the event field is `null`. Handlers run one after another on the raiser's thread, and an exception in a handler propagates into `PlaceOrder`. The publisher holds a reference to every subscriber, so a long-lived publisher keeps forgotten subscribers in memory until they unsubscribe.

## In practice

- **Generics:** reach for them when the same logic applies to several types and the type matters to the caller (repositories, result wrappers, caches). Do not make a class generic for a single use.
- **`Func`/`Action`:** use them for small pluggable behavior and callbacks. When the behavior has a name, dependencies and tests of its own, an interface injected through DI reads better.
- **Events:** they suit in-process notifications inside one component, such as UI controls or a library raising "progress changed". For application-wide reactions in a backend ("an order was placed, send an email"), C# events are a poor fit: they are synchronous, tied to one instance and lost on a crash. Teams call a service directly, publish a domain event (12/03) or put a message on a broker (module 10).
- Watch for closures over loop variables and over large objects stored in long-lived delegates.

## Check yourself

1. Why does `InMemoryRepository<T>` need `where T : IEntity` before `item.Id` compiles?
2. Rewrite the `for` loop example so that it prints `012`, and explain why `foreach` does not have the problem.
3. A Magento observer listens to `checkout_submit_all_after`. Why is a C# `event` on a `Checkout` object not the equivalent in an ASP.NET Core API, and what would you use?
