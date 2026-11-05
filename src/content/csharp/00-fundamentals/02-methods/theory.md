# Methods: Naming a Piece of Work

A method gives a name to a piece of work, so you write it once and use it everywhere. After this lesson you can declare methods with parameters and a return type, call them and use their results, write short methods with `=>`, give several methods the same name with different parameters, use optional and named arguments, and read `x => x * 2` as a method without a name.

You need: 00/01 (variables, types, operators and the Receipt challenge, where you filled in method bodies).

## Declaring a method

A method declaration has a return type, a name, a list of parameters in parentheses and a body in braces:

```csharp
public static class Pricing
{
    public static decimal LineTotal(decimal price, int quantity)
    {
        decimal total = price * quantity;
        return total;
    }
}
```

Read it from left to right. `public` lets code outside the class call the method. `static` means you call it on the class itself, `Pricing.LineTotal(...)`; lesson 00/06 shows methods that belong to objects instead. `decimal` is the **return type**, the type of the result. `LineTotal` is the name, in PascalCase and usually a verb or a noun phrase. `decimal price, int quantity` are the **parameters**, each a type and a name. A class groups related methods; for now it is only their container.

## Calling a method and returning a result

To **call** a method, write its name and pass one **argument** for each parameter, in order. The call is an expression, so its result can go wherever a value can:

```csharp
// ... with the Pricing class above in the same project
decimal mugs = Pricing.LineTotal(4.50m, 3);             // 13.50
decimal order = mugs + Pricing.LineTotal(19.99m, 1);    // 33.49
Console.WriteLine(Pricing.LineTotal(2m, 5));             // 10
```

`return` ends the method immediately and hands back its value. A method with a return type must return a value on every path, or the compiler reports CS0161 ("not all code paths return a value"). A method that only *does* something, such as printing, declares `void` as its return type and returns nothing:

```csharp
static void PrintLine(string text)
{
    Console.WriteLine($"> {text}");
}
```

A call to a `void` method is a statement on its own: `var x = PrintLine("hi");` fails with CS0815, because there is no value to store.

## Short methods with `=>`

When the body is a single expression, write it after `=>` instead of braces and `return`. Both forms mean the same thing:

```csharp
// ... inside public static class Pricing
public static decimal LineTotal(decimal price, int quantity) => price * quantity;
public static bool IsFree(decimal total) => total == 0m;
```

## Scope: where a name exists

A variable declared inside a method exists only inside that method's braces; that region is its **scope**. Parameters are local too. Two methods can each have a variable called `total` without clashing, and one method cannot read another's variables: data goes in through parameters and comes out through the return value. For the number and `bool` types of these lessons, a parameter is a copy of the argument, so assigning to it does not change the caller's variable.

## Overloads: one name, different parameters

Several methods can share a name if their parameter lists differ in number or types. These are **overloads**, and the compiler picks one from the arguments you pass:

```csharp
public static class Geometry
{
    public static double Area(double width, double height) => width * height;
    public static double Area(double side) => Area(side, side);   // reuses the other overload
}
```

`Geometry.Area(3, 4)` calls the first and `Geometry.Area(5)` the second. The return type alone cannot tell two methods apart: two `Area(double)` methods fail with CS0111 even if one returns `int`.

## Optional and named arguments

A parameter with a default value is **optional**: callers may leave it out. Optional parameters come after the required ones (CS1737 otherwise), and the default must be a constant such as `0.21m`. A **named argument** writes the parameter's name before the value, so it can be passed in any order and reads clearly at the call site:

```csharp
decimal a = WithTax(100m);                     // 121.00: rate takes its default
decimal b = WithTax(100m, 0.06m);              // 106.00
decimal c = WithTax(rate: 0.06m, net: 50m);    // 53.00: named, in any order

static decimal WithTax(decimal net, decimal rate = 0.21m) => Math.Round(net * (1 + rate), 2);
```

## Local functions

A method can declare a small helper method inside its body, called a **local function**. Only the enclosing method can call it:

```csharp
// ... inside a class
public static decimal Invoice(decimal first, decimal second)
{
    return Round2(first) + Round2(second);

    static decimal Round2(decimal value) => Math.Round(value, 2);
}
```

In top-level statements, a method written without a class (like `PrintLine` above) is a local function of the program.

## A method without a name

You can also write a method as a value, with no name, and store it in a variable:

```csharp
Func<int, int> twice = x => x * 2;   // takes an int x, returns x * 2
Console.WriteLine(twice(5));          // 10
```

`x => x * 2` is a **lambda expression**: the parameter on the left of `=>`, the result on the right. `Func<int, int>` reads as "a method that takes an `int` and returns an `int`". You will meet lambdas everywhere from module 02 on, where lesson 02/04 explains them fully.

## Common mistakes

- **Calling a method and dropping its result.** `Math.Round(total, 2);` on its own line compiles, but the rounded value is thrown away and `total` keeps all its digits. Store or return it: `total = Math.Round(total, 2);`.
- **Printing instead of returning.** A method that ends with `Console.WriteLine(total)` shows the value on the screen, but the caller and the tests get nothing. Return the value and let the caller decide whether to print it.
- **Expecting a method to change the caller's variable.** Assigning to a parameter (`quantity = 0;`) changes the method's own copy only. Return the new value and assign it at the call site.

## In practice

- Keep a method to one job that its name states, such as `LineTotal` or `IsLeapYear`. When a method needs a comment to explain its steps, split the steps into methods with names.
- Prefer returning a value over printing inside the method: a method that returns can be tested, reused and printed later.
- Use optional parameters for values that are almost always the same, and named arguments when a call has several numbers whose meaning is not obvious, such as `WithTax(net: 50m, rate: 0.06m)`.
- Use `=>` for one-expression methods and braces when the body needs several statements.

## Check yourself

1. What is the difference between a parameter and an argument? Point to each in `Pricing.LineTotal(4.50m, 3)`.
2. Why can `Area(double side)` and `Area(double width, double height)` live side by side, but not two `Area(double)` methods with different return types?
3. A method computes a total and prints it, and a test of it fails. What would you change, and why?
