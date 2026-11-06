# Classes and Objects

So far your data has lived in separate variables, arrays and dictionaries, and your methods have been `static`. Real programs talk about *things*: an account, a product, an order. After this lesson you can describe such a thing with a class, create objects from it with `new`, give them fields, a constructor and properties, and tell instance members from `static` ones. You will also know what `null` means, why it causes the most common crash in C#, and how an `enum` names a fixed set of choices.

You need: 00/02 (methods and parameters), 00/03 (`if` and `switch`) and 00/05 (lists and tuples).

## A class is a plan, an object is one thing built from it

A **class** describes what every thing of one kind knows (its data) and can do (its methods). An **object** is one thing built from that plan with `new`. Each object has its own copy of the data.

```csharp
var mug = new Product();
mug.Name = "Mug";
mug.Price = 9.50m;

var pen = new Product();
pen.Name = "Pen";              // pen has its own Name; mug's is unchanged

Console.WriteLine(mug.PriceFor(2)); // 19.00

public class Product
{
    public string Name = "";   // a field: data every Product carries
    public decimal Price;

    public decimal PriceFor(int quantity) => Price * quantity; // a method
}
```

In a file, the statements that run come first and the classes they use follow, as above.

A variable whose type is a class does not hold the object itself; it holds a **reference** to it, like an address. 02/01 shows what that means when you assign or pass such a variable.

## Constructors and `this`

A **constructor** is a special method with the name of the class and no return type. It runs once, when `new` creates the object, and its job is to put the object in a valid state from the start.

```csharp
var mug = new Product("Mug", 9.50m);
Product pen = new("Pen", 1.25m); // target-typed new(): the type is on the left

public class Product
{
    private readonly string _name;
    private decimal _price;

    public Product(string name, decimal price)
    {
        _name = name;
        _price = price;
    }
}
```

`private` means only code inside the class can use the member; `public` means any code can. Private fields often start with `_`, a common .NET naming convention. `readonly` lets the constructor set a field and nothing change it afterwards. When a parameter has the same name as a field, `this.name` means "the field of this object", and plain `name` means the parameter.

## Properties

A field exposed with `public` lets any code write anything into it. A **property** looks like a field from outside but lets the class decide who may read and who may write.

```csharp
var cap = new Product("Cap", 12m) { Stock = 3 }; // object initializer
// cap.Price = 0m;  // compile error CS0272: the set accessor is inaccessible

public class Product
{
    public Product(string name, decimal price)
    {
        Name = name;
        Price = price;
    }

    public string Name { get; }                // read-only: set only in the constructor
    public decimal Price { get; private set; } // everyone reads, only this class writes
    public int Stock { get; set; }             // anyone reads and writes
    public bool InStock => Stock > 0;          // computed every time it is read

    public void Discount(decimal percent) => Price -= Price * percent / 100m;
}
```

The **object initializer** `{ Stock = 3 }` sets properties right after the constructor runs; it only works for properties that have a `set` the calling code may use. 02/03 covers properties and access modifiers in more depth.

## Instance and `static` members

Members without `static` are **instance** members: each object has its own `Price`, and you call `cap.Discount(10)` on one object. A `static` member belongs to the class itself, shared by the whole program, and you reach it through the class name, as with `Console.WriteLine` or `Math.Max`. The methods of 00/02 were static, which is why you could call them without `new`.

```csharp
public class Order
{
    private static int s_created;   // one counter for the whole program

    public Order() => s_created++;

    public static int Created => s_created;
    public List<string> Lines { get; } = []; // every order gets its own list
}
```

A `static class`, such as `Math`, cannot be created with `new` at all; it is only a home for static methods.

## `null`: a reference to no object

A variable of a class type can hold `null`: no object at all. Using a member through `null` throws `NullReferenceException`.

```csharp
// ... with the Product class from above
Product? found = null;              // ? says "may be null"; 02/02 explains it

// Console.WriteLine(found.Name);   // throws NullReferenceException

if (found is null)
{
    Console.WriteLine("No such product");
}
else
{
    Console.WriteLine(found.Name);
}
```

A search that finds nothing, an optional value, a field never set: all of them can leave `null` behind. Check before you use it.

## Enums: a fixed set of named choices

An **enum** gives names to a small, fixed set of values. Each name is a number underneath (the first is `0`), but the code reads as words, and the compiler rejects a misspelled name, which a string like `"Shiped"` would let through.

```csharp
Console.WriteLine(Describe(OrderStatus.Paid)); // Being packed

static string Describe(OrderStatus status)
{
    switch (status)
    {
        case OrderStatus.Pending: return "Waiting for payment";
        case OrderStatus.Paid: return "Being packed";
        default: return "On its way";
    }
}

public enum OrderStatus { Pending, Paid, Shipped }
```

## Namespaces and `using`

A **namespace** groups related types under one name, so two libraries can both have a `Product` class. `namespace Shop;` at the top of a file puts every type of the file into `Shop`, and `using Shop;` in another file lets you write `Product` instead of `Shop.Product`. This app adds `using` for `System`, `System.Collections.Generic`, `System.Linq` and `System.Threading.Tasks` to every file, and projects created with `dotnet new` add a similar list (module 01).

## Common mistakes

- **Making a field `static` by accident.** A `static` balance or list is shared by every object, so depositing into one account changes them all. Leave `static` off data that belongs to each object.
- **Using a reference before checking for `null`.** `found.Name` throws `NullReferenceException` when the search found nothing. Test with `is null` first, or make sure the value is always set.
- **Assigning a parameter to itself.** In a constructor with a parameter `name` and a field `name`, the line `name = name;` copies the parameter onto itself and leaves the field empty; the compiler only warns. Write `this.name = name`, or name the field `_name`.

## In practice

- Give a class a constructor that takes what the object cannot live without, so no object exists half built.
- Prefer properties to public fields, and give each property the least access it needs: `{ get; }` or `{ get; private set; }` before `{ get; set; }`.
- Keep `static` for things that truly belong to the whole program: helper methods without data, constants, counters.
- Use an enum whenever a value is one of a short, fixed list known when you write the code.

## Check yourself

1. Two `Product` objects are created with `new`. Why does changing the price of one not change the other, and what would make it change both?
2. What is the difference between `{ get; }`, `{ get; private set; }` and `{ get; set; }`, and who can change the value in each case?
3. Why is an enum safer than a string for an order status?
