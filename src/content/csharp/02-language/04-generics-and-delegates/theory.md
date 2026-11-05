# Generics, Delegates, Lambdas and Events

Generics let one type or method work with many types while the compiler still checks every use. Delegates let you pass behavior around as a value. Together they are behind `List<T>`, LINQ, ASP.NET Core minimal APIs and most of the .NET library. After this lesson you can write a generic type with constraints, use `Func` and `Action` with lambdas, predict what a closure captures, and decide when a C# event is the right tool.

You need: 00/02 (methods, and `x => x * 2` as a method without a name), 02/01 (copy or share) and 02/03 (interfaces and classes).

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

Generics are real at run time: a `List<Product>` rejects a `Customer` at compile time, and `typeof(T)` names the actual type inside generic code. Without a constraint, the compiler knows only that `T` is an `object`. Constraints unlock members and say what callers may pass:

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

decimal Total(IEnumerable<decimal> lines, Func<decimal, decimal> tax) => lines.Sum(tax); // LINQ's Sum calls tax per line (03/02)

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

An event is a delegate field that outsiders can only subscribe to (`+=`) and unsubscribe from (`-=`). Only the declaring class can raise it, and it belongs to one object: you subscribe to that instance, not to a global name. The .NET convention is `EventHandler<TEventArgs>`:

```csharp
var checkout = new Checkout();
checkout.OrderPlaced += (sender, e) => Console.WriteLine($"Send confirmation for {e.OrderNumber}");
checkout.PlaceOrder("1042");

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

## Common mistakes

- **Capturing a `for` loop variable.** Every lambda shares the one `i`, so all of them see its final value (`333` instead of `012`). Copy it into a local declared inside the loop and capture that.
- **Raising an event with `OrderPlaced.Invoke(...)`.** With no subscriber the field is `null`, and the raise throws `NullReferenceException`. Use `OrderPlaced?.Invoke(...)`.
- **Never unsubscribing from a long-lived publisher.** The publisher keeps every handler, and everything the handler captured, in memory. Unsubscribe with `-=` when the subscriber is done.
- **Using `==` on a `T` constrained to `class`.** It compares references, so two equal values compare as different. Constrain to `IEquatable<T>` and call `Equals`.

## In practice

- **Generics:** reach for them when the same logic applies to several types and the type matters to the caller (repositories, result wrappers, caches). Do not make a class generic for a single use.
- **`Func`/`Action`:** use them for small pluggable behavior and callbacks. When the behavior has a name, dependencies and tests of its own, an interface injected through DI reads better.
- **Events:** they suit in-process notifications inside one component, such as UI controls or a library raising "progress changed". For application-wide reactions in a backend ("an order was placed, send an email"), C# events are a poor fit: they are synchronous, tied to one instance and lost on a crash. Teams call a service directly, publish a domain event (12/03) or put a message on a broker (module 10).

## Check yourself

1. Why does `InMemoryRepository<T>` need `where T : IEntity` before `item.Id` compiles?
2. Rewrite the `for` loop example so that it prints `012`, and explain why `foreach` does not have the problem.
3. An ASP.NET Core API must send a confirmation email after every order. Why is a C# `event` on a `Checkout` object a poor fit, and what would you use?
