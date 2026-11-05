# Your First Program: Values and Variables

This module is for people who have never written a program. By the end of this lesson you can write a short C# program that stores values in variables, calculates with them, compares them and prints the result. You will also be able to read a compile error and tell the **Run** button from **Run tests** in this app. If you already program, you can skip module 00: if you can solve the challenge of its last lesson (00/07, errors and tests) without help, start at module 01.

You need: no earlier lesson. This is the first one.

## Programs and the compiler

A program is a list of instructions for the computer, written as text. C# text (the *source code*) lives in files ending in `.cs`. A tool called the **compiler** checks it and translates it into a form the .NET runtime can execute; only a program the compiler accepts can run.

When the compiler finds something it cannot understand, it stops with a **compile error**. Every error has a code that starts with `CS`, the position where it found the problem and a message:

```csharp
Console.WriteLine("Hello")   // Program.cs(1,27): error CS1002: ; expected
```

Every statement ends with a semicolon. Fix the first error first: one mistake often causes several messages.

## Top-level statements and the console

The simplest C# program is a file of statements that run from top to bottom. These are called **top-level statements**:

```csharp
// Program.cs
Console.WriteLine("Hello, world!");   // prints one line
Console.WriteLine(2 + 3);             // prints 5
/* A comment like this one
   can span several lines. */
```

`Console.WriteLine` prints its value and moves to a new line. Text after `//` up to the end of the line is a **comment**: the compiler ignores it, and people read it. Top-level statements must come before any type declaration (such as the `class` in this lesson's challenge) in the file, or the compiler reports CS8803.

## Variables and types

A **variable** is a named place that holds a value. Each variable has a **type** that decides which values it can hold and what you can do with them:

```csharp
int quantity = 3;                  // whole numbers, about ±2.1 billion
long viewsThisYear = 4_800_000_000; // whole numbers, much larger range
double distanceKm = 12.5;          // numbers with a fraction, for measurements
decimal price = 19.99m;            // exact decimal numbers, for money: note the m
bool inStock = true;               // true or false
char grade = 'A';                  // one character, in single quotes
string name = "Mug";               // text, in double quotes
var total = price * quantity;      // the compiler infers decimal from the right side
quantity = 4;                      // a variable can change its value, never its type
```

`var` does not mean "any type": the compiler picks the type from the value on the right, and that type is fixed. `quantity = "four";` fails with CS0029 (cannot convert `string` to `int`), and reading a variable before giving it a value fails with CS0165. The `_` in `4_800_000_000` only helps reading.

`double` stores numbers in binary, so most decimal fractions are approximations: `0.1 + 0.2` prints `0.30000000000000004`. `decimal` stores decimal digits exactly, so `0.1m + 0.2m` is `0.3`. A number with a point is a `double` unless it ends in `m`, so `decimal price = 19.99;` fails with CS0664. An `int` that goes past its maximum (2,147,483,647) silently wraps around to a negative number; use `long` for counts that can grow that large.

## Arithmetic

C# follows the usual order of operations: `*`, `/` and `%` before `+` and `-`, left to right, with parentheses to change it.

```csharp
Console.WriteLine(2 + 3 * 4);       // 14
Console.WriteLine((2 + 3) * 4);     // 20
Console.WriteLine(7 / 2);           // 3: int divided by int drops the fraction
Console.WriteLine(7 % 2);           // 1: % gives the remainder
Console.WriteLine(7 / 2.0);         // 3.5: one double makes it a double division
Console.WriteLine((double)7 / 2);   // 3.5: (double) converts 7 before dividing
Console.WriteLine(-7 / 2);          // -3: the fraction is dropped toward zero
```

**Integer division** is the rule beginners trip over most: when both sides are whole-number types, the result is a whole number. To keep the fraction, convert one side with a *cast* such as `(double)` before dividing. `Math.Round(24.1879m, 2)` rounds to 2 decimal places (`24.19`). When the value sits exactly halfway, `Math.Round` rounds to the even digit by default (`Math.Round(2.345m, 2)` is `2.34`); pass `MidpointRounding.AwayFromZero` as a third argument to get `2.35`.

## Comparing and combining

Comparisons produce a `bool`: `==` (equal), `!=` (not equal), `<`, `>`, `<=` and `>=`. A single `=` assigns; `==` compares. The logical operators combine `bool` values: `&&` (and) is `true` only when both sides are, `||` (or) when at least one is, and `!` (not) flips a value.

```csharp
int age = 20;
bool adult = age >= 18;               // true
bool teen = age >= 13 && age <= 19;   // false: && needs both sides to be true
bool weekend = false;
bool holiday = true;
bool dayOff = weekend || holiday;     // true: || needs one side to be true
Console.WriteLine(!dayOff);           // False
```

`&&` and `||` stop as soon as the answer is known: in `a && b`, `b` is skipped when `a` is `false`.

## Text with values in it

A string that starts with `$` is an **interpolated string**: each `{expression}` inside it is evaluated and inserted as text.

```csharp
string product = "Mug";
int count = 3;
decimal unitPrice = 4.50m;
Console.WriteLine($"{count} x {product} = {unitPrice * count}");   // 3 x Mug = 13.50
```

## Run and tests in this app

A challenge's `Program.cs` holds two kinds of code. The top-level statements at the top are your program: **Run** compiles it and prints its output in the console panel. Below them are the methods the challenge asks for. **Run tests** compiles the file together with the lesson's tests, which call those methods directly and ignore the top-level statements. A compile error anywhere in the file stops every test from running, and the report shows its file, line, column, code and message. **Run** appears only on screens at least 900 pixels wide; on a phone or a narrow window you have **Run tests** only, and the test report is where you read what your code did.

## Common mistakes

- **Dividing two whole numbers and expecting a fraction.** `7 / 2` is `3`, so an average of 7 stars over 2 votes comes out as 3. Convert one side first: `(double)totalStars / votes`.
- **Writing money as `double` or forgetting the `m`.** `double` sums like `0.1 + 0.2` print `0.30000000000000004`, and `decimal price = 19.99;` does not compile (CS0664). Use `decimal` with the `m` suffix: `19.99m`.
- **Mixing text and numbers with `+`.** `"Total: " + 1 + 2` prints `Total: 12`, because the text is joined with `1`, then with `2`, from left to right. Write `$"Total: {1 + 2}"` or add parentheses.

## In practice

- Pick the type from the meaning of the value: `int` for counts, `long` for counts that can pass two billion, `decimal` for money, `double` for measurements, `bool` for yes or no.
- Use `var` when the right side makes the type obvious. Name variables in camelCase with whole words (`unitPrice`).
- Use **Run** with `Console.WriteLine` to see what code does, then **Run tests** to check it.

## Check yourself

1. Why does `Console.WriteLine(10 / 4 * 2.0);` print `4` and not `5`?
2. When would you choose `decimal` over `double`, and what does the `m` suffix change?
3. A missing semicolon sits on line 1 of the top-level statements. What happens to the tests, and where do you look first?
