# Nullable Reference Types

`NullReferenceException` is one of the most familiar crashes in .NET code, and nullable reference types are how the compiler helps you avoid it. After this lesson you can turn the feature on, read the warnings it produces, and fix each one with the right tool: a better type, a guard, a default, an attribute or, rarely, the null-forgiving operator. You will also know where the compiler's promises stop.

You need: 00/06 (`null` and `NullReferenceException`), 00/05 (`Dictionary` and `TryGetValue`) and 02/01 (value and reference types).

## Two kinds of "nullable"

```csharp
int? discount = null;                 // Nullable<int>: a real runtime type
Console.WriteLine(discount.HasValue); // False
int applied = discount ?? 0;          // 0

string? middleName = null;            // annotation only: still System.String
string firstName = "Ada";             // the compiler assumes this is never null
```

`int?` is shorthand for `Nullable<int>`, a struct with `HasValue` and `Value` that exists at run time. `string?` adds no wrapper: both `string` and `string?` are `System.String`. It only tells the compiler your intent, and nothing checks it when the program runs. A value type cannot hold `null` unless you write `?`. A reference type always *could* hold `null` at run time, and the annotation says whether it *should*.

Three operators handle a possible `null` without an `if`:

```csharp
string? nickname = null;
int? length = nickname?.Length;      // ?. gives null instead of throwing NullReferenceException
string shown = nickname ?? "guest";  // ?? takes the right side when the left side is null
nickname ??= "Ada";                  // ??= assigns only when the variable is null
```

## Turning it on

Projects created from .NET 6 or later templates already contain:

```xml
<PropertyGroup>
  <Nullable>enable</Nullable>
</PropertyGroup>
```

An optional line many teams add turns every nullability warning into a build error, so the warnings cannot pile up:

```xml
<PropertyGroup>
  <WarningsAsErrors>nullable</WarningsAsErrors>
</PropertyGroup>
```

In an older codebase you migrate gradually. `<Nullable>` also accepts `disable` (the old behavior), `warnings` and `annotations`, and `#nullable enable` / `#nullable disable` / `#nullable restore` change the context for a region of one file. The end state Microsoft recommends is `enable` for the whole project with no `#nullable` directives left.

## Reading the warnings

The compiler tracks a **null-state** for every expression: *not-null* or *maybe-null*. Assignments and null checks change it, and the analysis follows `if`, early `return`, loops and patterns such as `is not null`:

```csharp
// ... inside a class; Customer has a non-nullable string Email
public string Describe(Customer? customer)
{
    // customer.Email here: warning CS8602, dereference of a possibly null reference

    if (customer is null)
    {
        return "guest";
    }

    return customer.Email;   // not-null after the check: no warning
}
```

The warnings you will see every day:

| Code | Meaning | Usual fix |
| --- | --- | --- |
| CS8602 | dereference of a possibly null reference | check for null first, or use `?.` |
| CS8600 | converting a possible null value to a non-nullable type | make the target `T?`, or supply a default with `??` |
| CS8604 | possible null reference argument | check before the call, or change the parameter to `T?` |
| CS8618 | non-nullable member not set when the constructor exits | set it in the constructor, add `required`, or make it `T?` |

## Fixing warnings with the right tool

First decide whether `null` is a legitimate value. If a customer may have no middle name, declare `string?` and handle the absence. If a product must have a SKU, make the type say so and enforce it at construction:

```csharp
// required, init and interface: lesson 03. PriceService(...) is a primary constructor (lesson 05):
// repository is a parameter that every member of the class can use.
public sealed class Product
{
    public required string Sku { get; init; }      // callers must set it: fixes CS8618
    public string? Description { get; set; }       // genuinely optional
}

public sealed class PriceService(IPriceRepository repository)
{
    private Dictionary<string, decimal>? _cache;

    public decimal PriceOf(Product product)
    {
        ArgumentNullException.ThrowIfNull(product);  // a runtime guard at the public boundary
        _cache ??= repository.LoadAll();             // assign only when null
        return _cache.TryGetValue(product.Sku, out var price) ? price : 0m;
    }
}

public interface IPriceRepository
{
    Dictionary<string, decimal> LoadAll();
}
```

C# 14 adds **null-conditional assignment**: `order?.ShippingAddress = address;` assigns only when `order` is not null, and does not evaluate the right side otherwise.

**Attributes** describe contracts that `?` cannot express. `Dictionary<TKey, TValue>.TryGetValue` declares its `out` value with `[MaybeNullWhen(false)]`, which is why the value is treated as not-null inside `if (cache.TryGetValue(key, out var product))`. Your own `TryXxx` methods can use `[NotNullWhen(true)]` from `System.Diagnostics.CodeAnalysis` the same way. All .NET runtime APIs are annotated since .NET 5.

The **null-forgiving operator** `!` tells the compiler "trust me, this is not null". It changes nothing at run time. Every `!` is a place where the compiler stops protecting you, so keep it for the rare cases you can prove, such as values your test setup always creates. `public string Name { get; set; } = null!;` is a common way to silence CS8618. It moves the crash to run time. Prefer `required` or a constructor.

## Where the guarantee ends

The analysis has gaps that matter in a backend:

- **Deserialization.** By default, `System.Text.Json` happily writes `null` into a non-nullable `string` property. Since .NET 9, `JsonSerializerOptions.RespectNullableAnnotations = true` throws `JsonException` for an explicit `null`, but a *missing* property still leaves the default value. Use `required` or `[JsonRequired]` for fields that must be present. Request validation comes in 06/02.
- **`default` structs and new arrays.** `new string[3]` holds three nulls, and `default(SomeStruct)` leaves reference fields null, with no warning.
- **Code you call.** A library compiled without the feature is "oblivious": the compiler cannot tell whether its `string` may be null.

## Common mistakes

- **Silencing CS8618 with `= null!`.** The warning disappears, the property still starts as `null`, and the first `product.Name.Length` throws `NullReferenceException`. Use `required`, a constructor parameter, or `string?` when the value is optional.
- **Adding `!` until the warnings stop.** Each `!` turns a compile-time warning into a possible runtime crash. Check for `null` (`is null`, `?.`, `??`) and keep `!` for cases you can prove.
- **Trusting a non-nullable property filled from JSON.** The serializer writes `null` into it without complaint, and the crash appears far from the request. Validate input at the boundary and mark must-have fields `required`.
- **Returning `null` for "no items".** Every caller's `foreach` throws `NullReferenceException`. Return an empty collection.

## In practice

- Keep `<Nullable>enable</Nullable>`. Consider `<WarningsAsErrors>nullable</WarningsAsErrors>` in new projects.
- Validate at the boundaries (HTTP input, messages, configuration, database reads), then let non-nullable types carry the guarantee inward. `ArgumentNullException.ThrowIfNull` in public methods costs one line.
- Treat a warning as a question about your design, not noise to silence.

## Check yourself

1. Why can a non-nullable `string` parameter still receive `null` at run time, and what one-line guard protects a public method?
2. What is the difference between `int?` and `string?` at run time?
3. A DTO property `public string Email { get; set; }` raises CS8618. Give two fixes, and say when `string?` is the honest one.
