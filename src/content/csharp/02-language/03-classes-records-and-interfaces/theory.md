# Classes, Records, Structs and Interfaces

C# gives you four ways to declare a type: `class`, `record`, `struct` and `interface`. Choosing well decides how your objects are compared, copied, extended and replaced in tests. After this lesson you can write properties instead of getter and setter methods, pick the right access modifier, and choose between a class, a record, a struct and an interface for a given job.

## Coming from PHP/Magento

Much transfers: classes, abstract classes, single inheritance, interfaces, `readonly` properties. Magento's `Api/Data/ProductInterface` with `getSku()`/`setSku()` pairs becomes a C# interface or class with a `Sku` **property**.

Three differences cause real bugs:

- **Methods are not overridable by default.** In PHP any non-`final` public method can be overridden, and Magento's interceptors (plugins) depend on that: generated subclasses wrap any public, non-final, non-static method. In C#, a method must be marked `virtual` before a subclass can `override` it. The way to replace behavior is an interface plus dependency injection (05/02), not a subclass.
- **Defaults are private.** A member without a modifier is `private`. A top-level type without one is `internal`, visible only inside its own project (assembly). PHP has no `internal`.
- **No traits.** Shared behavior comes from a base class, composition, extension members (lesson 05) or default interface members.

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

var bag = new Product { Sku = "24-MB01", Name = "Joust Duffle Bag", Price = 34m };
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

A class has reference semantics and identity: two `Customer` objects with the same data are still two customers. Inheritance is single. `abstract` members must be implemented, `virtual` members may be overridden, and `sealed` forbids further derivation:

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

Many teams mark classes `sealed` by default and open them only on purpose. That is the opposite of the Magento habit of leaving everything extensible.

## Records: data with value equality

A `record` (short for `record class`) is a reference type whose compiler-generated members treat it as data. Two records are equal when they have the same type and the same values. The compiler also writes a readable `ToString` and supports nondestructive copies with `with`:

```csharp
var a = new ProductDto("24-MB01", "Joust Duffle Bag", 34m);
var b = new ProductDto("24-MB01", "Joust Duffle Bag", 34m);
Console.WriteLine(a == b);              // True: value equality
var onSale = a with { Price = 29m };    // a new record; a is unchanged
Console.WriteLine(onSale);              // ProductDto { Sku = 24-MB01, Name = Joust Duffle Bag, Price = 29 }

public record ProductDto(string Sku, string Name, decimal Price);
```

The positional form `record ProductDto(...)` generates public `init` properties, a constructor and `Deconstruct`. Immutability is **shallow**: a record holding a `List<T>` still lets anyone change the list, and `with` copies the reference, not the list.

Use records for DTOs, API requests and responses, messages, events and value objects. Do not use them as EF Core entities. Microsoft's record documentation says records are not appropriate as entity types, because EF Core relies on reference equality to track one instance per entity.

## Structs and record structs

A `struct` is a value type and is copied on assignment (lesson 01). `record struct` adds the record conveniences, and `readonly record struct` makes it immutable. Use one for small single values such as a `Coordinates(double Latitude, double Longitude)` pair or a wrapped `Guid` id, not for entities. A `Money(decimal Amount, string Currency)` is about 24 bytes on 64-bit, past the 16-byte guideline from lesson 01; teams that still make it a `readonly record struct` accept the larger copies knowingly.

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

Services in ASP.NET Core depend on interfaces such as `IProductRepository` and receive the implementation from the DI container. That is how you swap implementations and fake them in tests, where Magento would use a `di.xml` preference. An interface can also carry a **default implementation** of a member. That member is callable only through the interface type, and it cannot store state. It exists mainly to evolve a published interface without breaking its implementers.

## In practice

| You are modeling | Choose |
| --- | --- |
| a service, an entity with identity, anything with behavior and mutable state | `class` (often `sealed`) |
| data passed around: DTO, request, response, message, value object | `record` |
| a tiny immutable value such as coordinates or a wrapped id | `readonly record struct` |
| a capability or a dependency other code should not bind to concretely | `interface` |

Usual mistakes:

- Creating an interface for every class "just in case". Add one when there is a second implementation, a test seam or a boundary between projects.
- Writing `GetSku()`/`SetSku()` methods. Use properties.
- Relying on `==` between two class instances to compare data. It compares identity. Use a record, or compare the fields you mean.
- Building deep inheritance trees to share code. Prefer composition: inject a collaborator.

## Check yourself

1. A Magento plugin wraps `ProductRepository::save()`. Why can't you do the same in C# by subclassing a class with a non-virtual `Save`, and what do you do instead?
2. When are two `record` instances equal, and when are two `class` instances equal?
3. Why is `init` combined with `required` often better than a constructor with eight parameters for a DTO?
4. Why should an EF Core entity not be a record?
