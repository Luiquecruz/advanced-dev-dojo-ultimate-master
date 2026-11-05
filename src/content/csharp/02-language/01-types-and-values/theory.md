# Types and Values: Copy or Share?

Every C# type is either a value type or a reference type, and that one fact decides what an assignment, a method call or a collection read does to your data. After this lesson you can predict whether a line of code copies data or shares it, for structs, classes, arrays, lists and strings. You will also know what boxing is and why a mutable struct inside a `List<T>` causes trouble.

You need: module 00, in particular 00/05 (arrays, `List<T>`, dictionaries) and 00/06 (classes, fields and properties).

## Value types and reference types

A variable of a value type *contains* the instance. A variable of a reference type contains a *reference* to an instance on the managed heap.

| Value types | Reference types |
| --- | --- |
| `int`, `long`, `decimal`, `double`, `bool`, `char` | `class`, `record` (record class) |
| `struct`, `record struct`, `enum` | `interface`, `delegate` |
| `DateTime`, `Guid`, tuples such as `(int, string)` | arrays, `List<T>`, `string`, `object` |

```csharp
var a = new Money { Amount = 10m, Currency = "EUR" };
var b = a;               // copies the whole value
b.Amount = 99m;
Console.WriteLine(a.Amount);       // 10

var cart1 = new Cart();
var cart2 = cart1;       // copies the reference only
cart2.Skus.Add("BAG-01");
Console.WriteLine(cart1.Skus.Count); // 1

public struct Money
{
    public decimal Amount;
    public string Currency;
}

public class Cart
{
    public List<string> Skus { get; } = [];   // [] is an empty collection expression (00/05)
}
```

Think in terms of copy versus share, not stack versus heap. Where the runtime stores a value is an implementation detail. A struct field inside a class lives on the heap with its object.

## Passing arguments

C# passes every argument **by value** by default. For a struct, the method gets a copy of the value. For a class, the method gets a copy of the *reference*, so it can change the object but cannot make the caller's variable point somewhere else. Arrays and `List<T>` are classes: a method that receives your list shares it with you.

```csharp
static void AddFreeGift(List<string> skus) => skus.Add("GIFT-01");  // the caller sees the new item
static void Replace(List<string> skus) => skus = ["OTHER"];         // the caller still has its old list
```

The `ref`, `out` and `in` modifiers pass the variable itself. You will mostly meet `out` in the `TryParse` pattern, which returns success and writes the result:

```csharp
if (int.TryParse("42", out int quantity))
{
    Console.WriteLine(quantity + 1); // 43
}
```

## Strings: a reference type that acts like a value

`string` is a class, but it is **immutable**: `Trim`, `Replace` and `+` return a new string and never change the original. Its `==` compares content, so two different string objects holding `"SKU-1"` are equal, while `object.ReferenceEquals` tells them apart. Because each concatenation allocates a new string, build long strings in a loop with `StringBuilder` or `string.Join`.

## Mutable structs in collections

Reading a struct from a `List<T>` or a dictionary gives you a copy. The compiler refuses to modify that temporary copy:

```csharp
List<Money> prices = [new Money { Amount = 5m, Currency = "EUR" }];
// prices[0].Amount = 6m;   // error CS1612: the indexer returns a copy
var first = prices[0];
first.Amount = 6m;           // changes the local copy only
prices[0] = first;           // write the copy back
```

The fix is to make structs immutable, so that "change" always means "create a new value". A `readonly record struct` does that, and `with` copies it with one property changed (both in lesson 03):

```csharp
public readonly record struct Price(decimal Amount, string Currency);

var price = new Price(5m, "EUR");
var discounted = price with { Amount = 4.5m };  // new value, price is untouched
```

## Boxing

Value types can be treated as `object` or as an interface they implement. The conversion is called **boxing**: the runtime allocates an object on the heap and copies the value into it. Unboxing is an explicit cast that checks the type and copies the value back out.

```csharp
int stock = 5;
object boxed = stock;      // allocates a box holding a copy of 5
stock = 7;
Console.WriteLine(boxed);  // 5: the box has its own copy
int back = (int)boxed;     // unboxing needs the exact type
// long wrong = (long)boxed; // compiles, throws InvalidCastException at run time
```

Boxing costs an allocation, and the unboxing cast has a smaller cost of its own. In a hot loop that adds garbage-collector pressure. Generic collections such as `List<int>` and `Dictionary<string, int>` store values without boxing. The old non-generic `ArrayList` and `Hashtable` boxed every `int` you stored; you still meet them in legacy .NET Framework code.

## Common mistakes

- **Expecting a method to get its own copy of a list.** The method's `Add`, `Clear` or `Sort` changes the caller's list too, and the caller sees data it never wrote. Copy first (`new List<string>(skus)`) when the method must not touch the original.
- **Changing a struct you read from a list or a `foreach`.** You change a copy, so the update is silently lost (or the compiler stops you with CS1612). Write the changed copy back by index, or make the struct `readonly`.
- **Comparing two class instances with `==` to compare data.** Two objects with equal fields give `false`, because `==` asks "same object?". Use a record (lesson 03) or compare the fields you mean.
- **Unboxing to the wrong type.** `(long)boxed` on a boxed `int` throws `InvalidCastException`. Unbox to the exact type first: `(long)(int)boxed`.

## In practice

- **Default to `class`.** Microsoft's design guidelines say to avoid a struct unless the type represents a single value, is small (under 16 bytes), is immutable, and is rarely boxed. Coordinates such as two `double` values and wrapped identifiers fit. A `Money` with a `decimal` (16 bytes on its own) and a currency `string` is already past the size guideline, so a team that makes it a struct accepts that trade-off knowingly. Entities, services and DTOs do not.
- **If you write a struct, make it `readonly`** (`readonly struct` or `readonly record struct`). Mutable structs produce lost updates that look like compiler bugs.
- **Do not hand out your internal lists.** A method that returns a `List<T>` field lets callers change your state. Return a copy, or the list as `IReadOnlyList<T>`, an interface that offers reading and indexing but no `Add` or `Remove`. Collection choices come in 03/01.
- **Watch every list that crosses a method boundary.** Decide whether the callee may change it, and say so with the parameter type.

## Check yourself

1. A method calls `Sort()` on its `List<int>` parameter. What does the caller's list look like afterwards, and how would you sort without touching it?
2. Why does `prices[0].Amount = 6m` fail to compile for a `List<Money>` of structs, but work when `Money` is a class?
3. Where does boxing happen when you pass an `int` to a method whose parameter is `object`, and how do generics avoid it?
