# Decisions and Loops

So far every line of a program ran once, from top to bottom. After this lesson you can make a program choose between paths with `if`, `switch` and the conditional operator, repeat work with `while`, `for` and `foreach`, stop or skip a repetition with `break` and `continue`, and walk through a list of numbers stored in an `int[]` array without stepping past its end.

You need: 00/01 (`bool`, comparisons and `&&`/`||`) and 00/02 (methods, parameters and `return`).

## Choosing a path with `if`

An `if` statement runs a block only when its condition is `true`. `else if` adds more conditions, checked from top to bottom, and `else` catches everything that is left. The first branch whose condition holds runs, and the others are skipped:

```csharp
public static string Band(decimal total)
{
    if (total >= 100m)
    {
        return "free";
    }
    else if (total >= 50m)
    {
        return "reduced";
    }
    else
    {
        return "standard";
    }
}
```

The order matters: with the `>= 50m` check first, a total of 120 would stop at `"reduced"`. Because every branch here ends in `return`, the method can also drop the `else` keywords. Each check that returns early is then called a **guard clause**, a pattern you will see in most C# code.

## Choosing a value with `?:`

The **conditional operator** picks one of two values: `condition ? valueIfTrue : valueIfFalse`. Use it for short choices that produce a value:

```csharp
int items = 1;
string label = items == 1 ? "item" : "items";
Console.WriteLine($"{items} {label}");   // 1 item
```

## The `switch` statement

A `switch` statement compares one value against several constants. Each section ends with `break` (or `return`); C# does not let one section run on into the next, and reports CS8070 or CS0163 when you forget. Several labels can share a section, and `default` handles every other value:

```csharp
int day = 6;
switch (day)
{
    case 6:
    case 7:
        Console.WriteLine("weekend");
        break;
    default:
        Console.WriteLine("weekday");
        break;
}
```

Lesson 02/05 shows the `switch` *expression*, a shorter form that produces a value.

## Updating a variable

Loops change variables on every pass, so C# has short forms: `count++` adds 1, `count--` subtracts 1, and `total += price` means `total = total + price`. The same works with `-=`, `*=` and `/=`.

## Repeating with `while` and `for`

A `while` loop repeats its block as long as its condition is `true`, checking it before every pass. Something inside must eventually make the condition `false`, or the loop never ends:

```csharp
int stock = 10;
int days = 0;
while (stock > 0)
{
    stock -= 3;
    days++;
}
Console.WriteLine(days);   // 4: 10, 7, 4, 1, then -2 stops the loop
```

A `for` loop puts the three parts of a counting loop in one line: the start, the condition and the step.

```csharp
for (int i = 1; i <= 3; i++)
{
    Console.WriteLine($"Round {i}");   // Round 1, Round 2, Round 3
}
```

## Arrays: many values under one name

An **array** holds a fixed number of values of one type. `int[]` is an array of `int`. Each element has an **index**, counted from 0, and `Length` is the number of elements:

```csharp
int[] scores = [72, 95, 88];   // or: int[] scores = { 72, 95, 88 };
Console.WriteLine(scores[0]);      // 72: the first element
Console.WriteLine(scores.Length);  // 3
scores[2] = 90;                    // replace the last element
int[] empty = [];                  // an array with no elements: Length is 0
```

Valid indexes run from `0` to `Length - 1`. Reading `scores[3]` stops the program with an `IndexOutOfRangeException`. Lesson 00/05 covers arrays in depth, together with lists that can grow.

## Walking through an array

`foreach` visits every element in order and needs no index at all. A `for` loop with an index is the tool when you need the position too:

```csharp
// ... scores is the array from the snippet above
int sum = 0;
foreach (int score in scores)
{
    sum += score;
}

for (int i = 0; i < scores.Length; i++)
{
    Console.WriteLine($"#{i + 1}: {scores[i]}");
}
```

The condition is `i < scores.Length`, not `<=`: with `<=` the last pass reads `scores[3]` and throws. Getting a loop's first or last step wrong by one is called an **off-by-one** error.

## `break` and `continue`

`break` leaves the loop at once; `continue` skips the rest of the current pass and moves to the next one:

```csharp
// ... scores as above
foreach (int score in scores)
{
    if (score < 0)
    {
        continue;   // ignore invalid scores
    }
    if (score == 100)
    {
        Console.WriteLine("perfect score found");
        break;      // no need to look further
    }
}
```

## Common mistakes

- **Using `>` where the rule says "from 100 on".** `total > 100m` sends an order of exactly 100 to the wrong band; the bug only shows at the boundary. Translate "at least" to `>=` and test the boundary value itself.
- **Looping with `i <= values.Length`.** The last pass reads one element past the end and throws `IndexOutOfRangeException`. Use `i < values.Length`, or `foreach` when you do not need the index.
- **Dividing by `Length` without checking for an empty array.** With `int` values, `sum / values.Length` throws `DivideByZeroException` for `[]`. Handle the empty case first with an early `return`.

## In practice

- Prefer `foreach` for "do something with each element"; use `for` when the index matters, such as comparing neighbours or printing positions.
- Put the most specific condition first in an `if`/`else if` chain, or use guard clauses that return early, so each rule reads on its own line.
- Keep `?:` for short value choices; when either side needs a statement, write an `if`.
- When a loop misbehaves, press **Run** with a `Console.WriteLine` inside it to print the variables on every pass.

## Check yourself

1. In the `Band` method above, what would a total of 120 return if the `>= 50m` check came first, and why?
2. Why does `for (int i = 0; i <= values.Length; i++)` throw, and what are the two ways to fix it?
3. When is a `while` loop a better fit than a `for` loop?
