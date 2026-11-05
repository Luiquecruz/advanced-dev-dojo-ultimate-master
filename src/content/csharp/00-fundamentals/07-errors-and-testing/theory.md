# When Things Go Wrong: Errors and Tests

Every program goes wrong while it is being written, and some go wrong while they run. After this lesson you can tell a compile error from an exception, read an exception's type, message and stack trace to find the line that failed, throw an exception when a method gets input it cannot work with, and catch one with `try`, `catch` and `finally`. You will also be able to read the tests of this app as what they are, small programs that check your code, and debug a failing one with **Run**.

You need: 00/01 (compile errors, Run and tests), 00/02 (methods), 00/04 (`int.TryParse`), 00/05 (arrays and dictionaries) and 00/06 (classes and `null`).

## Two kinds of error

A **compile error** means the compiler could not turn your text into a program, so nothing runs at all. Each one has a code and points at a file, line and column:

```text
Program.cs(3,13): error CS0029: Cannot implicitly convert type 'string' to 'int'
Program.cs(5,1): error CS0103: The name 'totl' does not exist in the current context
```

An **exception** happens while the program runs: the code compiled, but a line asked for something impossible, such as index 5 of a 3-item array, a missing dictionary key, or a member of `null`. The runtime stops that line and creates an exception object that describes the problem. If no code handles it, the program ends.

## Reading an exception

An exception has a **type**, which names the kind of problem, a **message** for people, and a **stack trace**: the chain of method calls that were running when it happened. A program started with the .NET SDK on your computer prints all three when an exception is not handled:

```text
Unhandled exception. System.IndexOutOfRangeException: Index was outside the bounds of the array.
   at Scores.Total(Int32[] scores) in /home/ana/shop/Program.cs:line 9
   at Program.<Main>$(String[] args) in /home/ana/shop/Program.cs:line 1
```

Read it from the top. The first line says what went wrong. The first `at` line is where it happened, here inside `Scores.Total`, and each line below is the caller of the one above it: `Total` was called from the top-level statements (`<Main>$`). Start at the first line that names your own code.

In this app the test report shows the type and the message of an exception. To see the stack trace, catch the exception in the program at the top of the file and print `ex.ToString()`, as the section on catching below shows.

## Throwing an exception

Your own methods throw when they get input they cannot work with. `throw` creates the exception and stops the method at once; nothing after it runs.

```csharp
using System.Globalization;

public static class Prices
{
    public static decimal Parse(string text)
    {
        if (!decimal.TryParse(text, NumberStyles.Number, CultureInfo.InvariantCulture, out decimal price))
        {
            throw new ArgumentException($"'{text}' is not a price.", nameof(text));
        }

        if (price < 0m)
        {
            throw new ArgumentOutOfRangeException(nameof(text), price, "A price cannot be negative.");
        }

        return price;
    }
}
```

Choose the type that describes the problem: `ArgumentException` for a bad argument, `ArgumentNullException` for a `null` one, `ArgumentOutOfRangeException` for a value outside the allowed range, `InvalidOperationException` when the object is not in a state that allows the call. `nameof(text)` produces the text `"text"`, and stays correct if you rename the parameter.

Exception types form a family: an `ArgumentOutOfRangeException` *is also* an `ArgumentException`, a more specific kind of it (02/03 explains this inheritance). Code that handles `ArgumentException` therefore handles both.

## Catching: `try`, `catch` and `finally`

`try` runs a block; if an exception of the type named by a `catch` happens inside it, that `catch` block runs instead of the program ending. A `finally` block runs in every case, whether the `try` finished, threw or returned.

```csharp
// ... with the Prices class from above
try
{
    decimal price = Prices.Parse("-3");
    Console.WriteLine(price);
}
catch (ArgumentOutOfRangeException ex)
{
    Console.WriteLine($"Out of range: {ex.Message}");
}
catch (ArgumentException ex)
{
    Console.WriteLine(ex.ToString()); // type, message and stack trace
}
finally
{
    Console.WriteLine("Parsing done.");
}
```

The first `catch` whose type matches wins, so the specific type comes before the general one; the other order is compile error CS0160. Catch only what you can handle, here by telling the user. A `catch (Exception)` that hides every problem turns a clear crash into a wrong result that nobody notices. 04/01 covers catching in depth.

## Guard clauses

A **guard clause** checks the input at the top of a method and leaves early, by returning or throwing, before any work is done. The rest of the method can then trust its input. When bad input is expected, such as text typed by a user, prefer the `Try` methods of 00/04 to catching an exception: `int.TryParse` returns `false`, while `int.Parse("12abc")` throws `FormatException`.

.NET also has one-line guards: `ArgumentNullException.ThrowIfNull(customer);` and `ArgumentOutOfRangeException.ThrowIfNegative(quantity);`.

## What a test is

A **test** is a small method that calls your code with chosen input and checks the result. Most tests have three parts, called **arrange, act, assert**: set up the input, call the code, compare what came back with what should come back. The `tests.cs` file of every challenge in this app is written this way:

```csharp
using Dojo;

public static class PricesTests
{
    [Test("Parse rejects a negative price")]
    public static void ParseRejectsNegative()
    {
        string input = "-3";                       // arrange
        var ex = Assert.Throws<ArgumentOutOfRangeException>(
            () => Prices.Parse(input));            // act
        Assert.Equal("text", ex.ParamName);        // assert
    }
}
```

The text in `[Test("...")]` is the requirement in plain words, and it is what the test panel shows. `Assert.Equal(expected, actual)` fails the test with both values when they differ; `Assert.Throws<T>` fails it unless the code throws a `T`. The `() => ...` is a method without a name that the test can call later (00/02); 09/01 shows the same ideas with a test framework used in real projects.

## Debugging with Run

When a test fails and the reason is not obvious, reproduce it. Call the method with the test's input in the program at the top of the file, print what comes back with `Console.WriteLine`, and press **Run**. Print intermediate values inside the method too, change one thing at a time, and run the tests again.

## Common mistakes

- **Catching `Exception` to make an error go away.** The program keeps running with a wrong or missing value, and the real cause disappears. Catch the specific type you can handle, and let the others surface.
- **Putting a general `catch` before a specific one.** `catch (ArgumentException)` above `catch (ArgumentOutOfRangeException)` is compile error CS0160, because the second could never run. Order them from specific to general.
- **Parsing user text with `int.Parse`.** Bad input throws `FormatException` from deep inside the parsing code. Use `int.TryParse` and decide in your own guard clause what bad input means.

## In practice

- Validate arguments at the top of public methods and throw the most specific `Argument*Exception`, with the parameter name.
- Handle exceptions where you can do something useful, such as showing a message or trying again, and nowhere else.
- When an exception surprises you, read its type, message and first stack-trace line before changing any code.
- Write a test for every bug you fix, so the same bug cannot come back unnoticed.

## Check yourself

1. Your code compiles, but the tests report `KeyNotFoundException`. Is that a compile error or an exception, and where do you look first?
2. Why does `catch (ArgumentException)` also catch an `ArgumentOutOfRangeException`, and what does that mean for the order of your `catch` blocks?
3. Name the arrange, act and assert parts of one test in this lesson's challenge.
