# Classes, Records, Structs and Interfaces

C# gives you four ways to declare a type: `class`, `record`, `struct` and `interface`. Choosing well decides how your objects are compared, copied, extended and replaced in tests. After this lesson you can write properties instead of getter and setter methods, pick the right access modifier, and choose between a class, a record, a struct and an interface for a given job.

You need: 00/06 (classes, constructors and properties), 02/01 (copy or share) and 02/02 (`?` on reference types).

## Properties

A property looks like a field to the caller and runs code like a method:

```csharp
public class Product
{
    public required string Sku { get; init; }   // must be set in the initializer, then fixed
    public string Name { get; set; } = "";
    public decimal Price
    {
        get;
        set => field = value >= 0 ? value : throw new ArgumentOutOfRangeException(nameof(value));
    }
    public bool IsFree => Price == 0m;           // computed on every read, no storage
}

var bag = new Product { Sku = "BAG-01", Name = "Travel Bag", Price = 34m };
// bag.Sku = "X";  // error: init-only after construction
```

- `{ get; set; }` is an auto-property: the compiler creates the hidden backing field.
- `init` allows assignment only during construction, in an object initializer or a constructor.
- `required` forces every object initializer to set the member. It replaces long constructors for data types.
- In C# 14, the `field` keyword refers to the compiler's backing field, so you can add validation to one accessor without declaring `_price` yourself.

## Access modifiers

| Modifier | Visible to |
| --- | --- |
| `public` | everyone |
| `private` | the containing type (the default for members) |
| `protected` | the containing type and derived types |
| `internal` | the same assembly, which is one project (the default for top-level types) |
| `protected internal` | the same assembly, or derived types anywhere |
| `private protected` | derived types in the same assembly |

`internal` is useful in a solution with several projects: an infrastructure project can keep its helpers `internal` and expose only the interfaces the API project needs.

## Classes and inheritance

A class has reference semantics and identity: two `Customer` objects with the same data are still two customers. Inheritance is single. `abstract` members must be implemented, `virtual` members may be overridden, and `sealed` forbids further derivation. A method without `virtual` (or `abstract`) **cannot** be overridden:

```csharp
public abstract class ShippingMethod
{
    public abstract decimal Cost(decimal weightKg);
    public virtual string Label => GetType().Name;
}

public sealed class FlatRate : ShippingMethod
{
    private readonly decimal _amount;

    public FlatRate(decimal amount) => _amount = amount;

    public override decimal Cost(decimal weightKg) => _amount;
    public override string Label => "Flat rate";
}
```

Many teams mark classes `sealed` by default and open them only on purpose. To swap behavior, code depends on an interface (below) rather than on a subclass.

## Records: data with value equality

A `record` (short for `record class`) is a reference type whose compiler-generated members treat it as data. Two records are equal when they have the same type and the same values. The compiler also writes a readable `ToString` and supports nondestructive copies with `with`:

```csharp
var a = new ProductDto("BAG-01", "Travel Bag", 34m);
var b = new ProductDto("BAG-01", "Travel Bag", 34m);
Console.WriteLine(a == b);              // True: value equality
var onSale = a with { Price = 29m };    // a new record; a is unchanged
Console.WriteLine(onSale);              // ProductDto { Sku = BAG-01, Name = Travel Bag, Price = 29 }

public record ProductDto(string Sku, string Name, decimal Price);
```

The positional form `record ProductDto(...)` generates public `init` properties, a constructor and `Deconstruct`. Immutability is **shallow**: `with` copies a list's reference, not the list.

Use records for DTOs, API requests and responses, messages, events and value objects, but not for EF Core entities.

## Structs and record structs

A `struct` is a value type and is copied on assignment (lesson 01). `record struct` adds the record conveniences, and `readonly record struct` makes it immutable. Use one for small single values such as a `Coordinates(double Latitude, double Longitude)` pair or a wrapped `Guid` id, not for entities.

## Interfaces: contracts and seams

An interface declares what a type can do, with no instance state. A class can implement many interfaces:

```csharp
public interface IProductRepository
{
    Product? FindBySku(string sku);
    void Save(Product product);
}

public sealed class SqlProductRepository : IProductRepository
{
    public Product? FindBySku(string sku) => null;   // ... real query in module 07
    public void Save(Product product) { /* ... */ }
}
```

Services in ASP.NET Core depend on interfaces such as `IProductRepository` and receive the implementation from the dependency injection container (05/02). That is how you swap implementations and fake them in tests. An interface can also carry a **default implementation** of a member. That member is callable only through the interface type, and it cannot store state. It exists mainly to evolve a published interface without breaking its implementers.

## Attributes

Square brackets before a declaration attach an **attribute**: metadata that the compiler, a framework or a tool reads. An attribute does nothing by itself; something has to look for it.

```csharp
using System.ComponentModel.DataAnnotations;

public sealed class SignupRequest
{
    [Required, EmailAddress]      // checked by request validation (06/02)
    public string? Email { get; init; }

    [Range(1, 10)]                // a validator rejects 0 or 11
    public int Seats { get; init; }

    [Obsolete("Use Email.")]      // the compiler warns wherever Mail is used
    public string? Mail { get; init; }
}
```

You will meet many more, such as `[Test]` in this app's tests and `[JsonPropertyName]` for JSON.

## Common mistakes

- **Writing `override` on a method that is not `virtual`.** The build fails with CS0506; hiding it with `new` compiles, but callers holding the base type still run the base method. Depend on an interface and wrap the implementation instead.
- **Comparing two class instances with `==` to compare data.** Equal fields still give `false`, because `==` asks "same object?". Use a record, or compare the fields you mean.
- **Expecting `with` to deep-copy.** A record holding a `List<T>` shares that list with its copy, so `copy.Tags.Add(...)` changes the original too. Use an immutable or read-only collection.
- **Making an EF Core entity a record.** EF Core relies on reference equality to keep one instance per entity, which value equality and `with` copies undermine; Microsoft calls records inappropriate as entity types. Keep entities as classes.

## In practice

| You are modeling | Choose |
| --- | --- |
| a service, an entity with identity, anything with behavior and mutable state | `class` (often `sealed`) |
| data passed around: DTO, request, response, message, value object | `record` |
| a tiny immutable value such as coordinates or a wrapped id | `readonly record struct` |
| a capability or a dependency other code should not bind to concretely | `interface` |

Add an interface when there is a second implementation, a test seam or a boundary between projects, not for every class "just in case". Write properties, not `GetSku()`/`SetSku()` methods, and prefer composition (inject a collaborator) over deep inheritance trees.

## Check yourself

1. You want to add logging around `ProductRepository.Save`, a non-virtual method. Why does a subclass not work, and what do you do instead?
2. When are two `record` instances equal, and when are two `class` instances equal?
3. Why is `init` combined with `required` often better than a constructor with eight parameters for a DTO?
4. Why should an EF Core entity not be a record?
