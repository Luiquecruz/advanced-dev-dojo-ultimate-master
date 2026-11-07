# Exceptions and Your First Test

When something goes wrong at run time, Java does not return an error code; it throws an exception that travels up the call stack until some code catches it. This lesson covers `try`, `catch` and `finally`, `try`-with-resources, checked versus unchecked exceptions, throwing your own, and a first self-check written with `assert` and run with the `-ea` flag.

You need: Decisions and Loops, Methods (call stack and return values), Classes and Objects (constructors and encapsulation).

## try, catch and finally

Code that may fail goes in a `try` block. A matching `catch` handles the failure, and `finally` runs in every case, whether or not an exception happened:

```java
try {
    int number = Integer.parseInt("12x");
    System.out.println(number);
} catch (NumberFormatException exception) {
    System.out.println("Not a number: " + exception.getMessage());
} finally {
    System.out.println("done");
}
```

If no `catch` matches, the exception continues to the caller, and if nothing catches it the program ends with a stack trace. Catch the most specific type you can handle, and never leave a `catch` block empty: a swallowed exception hides the real cause.

## try-with-resources

A resource such as a file reader must be closed. Declare it in parentheses after `try` and Java closes it automatically, even when an exception is thrown:

```java
import java.io.BufferedReader;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

static String firstLine(Path path) throws IOException {
    try (BufferedReader reader = Files.newBufferedReader(path)) {
        return reader.readLine();
    }
}
```

The type must implement `AutoCloseable`. The compiler generates the `finally` that closes the resource.

## Checked and unchecked

Exceptions that extend `Exception` but not `RuntimeException` are checked: the compiler forces you to either catch them or declare them with `throws`. `IOException` is the common example, because files can legitimately be missing. Subclasses of `RuntimeException` are unchecked: `NullPointerException`, `IllegalArgumentException` and `ArithmeticException` signal bugs or violated rules, and the compiler does not force handling.

## Throwing your own

Use `throw` with a clear message when a caller breaks a rule. Choose an existing type when one fits, or define a small class when callers need to react to the case specifically:

```java
public class InsufficientFundsException extends RuntimeException {
    public InsufficientFundsException(String message) {
        super(message);
    }
}

static void withdraw(int balance, int amount) {
    if (amount > balance) {
        throw new InsufficientFundsException("balance " + balance + " is below " + amount);
    }
}
```

`extends RuntimeException` makes the new class a kind of `RuntimeException`, so it inherits everything that class can do. `super(message)` passes the message to the parent class's constructor, which stores it for `getMessage()`.

## Your first self-check

A test is code that calls your code and states the expected result. You can write one before you know any test framework, using only Java. The `assert` statement fails with an `AssertionError` when its condition is false, and the JVM evaluates it only when you start the program with the `-ea` flag (enable assertions):

```java
public class CalculatorCheck {
    public static void main(String[] args) {
        assert Calculator.clamp(150, 0, 100) == 100 : "clamp should cap at the maximum";
        assert Calculator.clamp(-5, 0, 100) == 0 : "clamp should raise to the minimum";

        try {
            Integer.parseInt("12x");
            throw new AssertionError("expected a NumberFormatException");
        } catch (NumberFormatException expected) {
            System.out.println("failure case behaves as expected");
        }
        System.out.println("all checks passed");
    }
}

class Calculator {
    static int clamp(int value, int minimum, int maximum) {
        return Math.max(minimum, Math.min(maximum, value));
    }
}
```

Save everything in one file named `CalculatorCheck.java` and run it with `java -ea CalculatorCheck.java`. In source-file mode the launcher compiles the whole file in memory and runs the first class, so `Calculator` needs no separate compile step. The text after the colon is the message of the failure. The `try` block checks the failure case: it reaches the line that throws `AssertionError` only when the call did not throw the exception it should have, and the `catch` names the expected type (a `catch` also accepts that type's subclasses, so naming it narrowly keeps the check strict). Keep each check small, name it after the behavior, and cover both the normal case and the failure case.

This works but does not scale. You have to write the runner, count the results and stop at the first failure. Test frameworks such as JUnit solve that: they find the test methods, run them all, report each result and plug into the build. They need a build tool to download them, which is why the module on build and tests introduces Maven first and JUnit right after.

## Common mistakes

- Writing `catch (Exception exception) { }` with an empty body. The failure disappears and the program continues in a broken state; at least log it or let it propagate.
- Closing a resource by hand and skipping the close when an exception occurs. Use try-with-resources.
- Declaring `throws Exception` on every method just to silence the compiler. It hides what can actually fail and pushes the problem onto every caller.
- Writing a check that asserts nothing. A check with no assertion passes even when the code is wrong, and running without `-ea` silently skips every `assert` statement.

## In practice

Handle an exception where you can do something useful about it, and let it propagate otherwise. Messages should name the values involved. Checks and tests should be small, named after the behavior and cover the normal case and the failure case.

## Check yourself

1. In what order do `try`, `catch` and `finally` run when the `try` block throws a matching exception?
2. Why does the compiler force you to handle `IOException` but not `IllegalArgumentException`?
3. Why does the failure check throw an `AssertionError` after the call, and why does the `catch` name `NumberFormatException`?
