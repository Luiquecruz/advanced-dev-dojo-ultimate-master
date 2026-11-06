# Exceptions and Your First Test

When something goes wrong at run time, Java does not return an error code; it throws an exception that travels up the call stack until some code catches it. This lesson covers `try`, `catch` and `finally`, `try`-with-resources, checked versus unchecked exceptions, throwing your own, and a first JUnit test with the command that runs it.

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

## Your first JUnit test

A unit test is a small method that calls your code and states the expected result. With JUnit Jupiter, a method marked `@Test` is run by the test engine, and `assertEquals(expected, actual)` fails the test when the values differ:

```java
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import org.junit.jupiter.api.Test;

class CalculatorTest {
    @Test
    void clampKeepsValueInsideRange() {
        assertEquals(100, Calculator.clamp(150, 0, 100));
    }

    @Test
    void parsingTextThatIsNotANumberFails() {
        assertThrows(NumberFormatException.class, () -> Integer.parseInt("12x"));
    }
}
```

`() -> Integer.parseInt("12x")` is a lambda: a short piece of code written as parameters, an arrow and an expression, which `assertThrows` runs itself so that it can catch the exception. The file lives under `src/test/java` in a Maven or Gradle project, and one command runs every test: `mvn test` or `./gradlew test`. Running it needs a project with a build file, which module 03 sets up; for now, read the test and predict what it checks. The build tool compiles the main and test code, starts JUnit and prints which tests passed or failed. What the tool does internally is the subject of module 03.

## Common mistakes

- Writing `catch (Exception exception) { }` with an empty body. The failure disappears and the program continues in a broken state; at least log it or let it propagate.
- Closing a resource by hand and skipping the close when an exception occurs. Use try-with-resources.
- Declaring `throws Exception` on every method just to silence the compiler. It hides what can actually fail and pushes the problem onto every caller.
- Writing a test that asserts nothing. A test with no assertion passes even when the code is wrong.

## In practice

Handle an exception where you can do something useful about it, and let it propagate otherwise. Messages should name the values involved. Tests should be small, named after the behavior and cover the normal case and the failure case.

## Check yourself

1. In what order do `try`, `catch` and `finally` run when the `try` block throws a matching exception?
2. Why does the compiler force you to handle `IOException` but not `IllegalArgumentException`?
3. What does `assertThrows` check that `assertEquals` cannot?
