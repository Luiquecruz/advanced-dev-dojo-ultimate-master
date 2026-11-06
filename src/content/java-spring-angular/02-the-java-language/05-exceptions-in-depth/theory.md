# Exceptions in Depth

The first exceptions lesson showed how to catch and throw. Designing exceptions well is a separate skill: what hierarchy your code exposes, whether a failure should be checked, how to keep the original cause when you translate an error, what happens when closing a resource also fails, and the ways `finally` can hide a problem. This lesson covers those decisions.

You need: Exceptions and Your First Test (`try`, `catch`, `finally`, checked and unchecked, throwing your own), Interfaces and Generics (`extends`, `AutoCloseable` as an interface).

## A small exception hierarchy

Give a module one base exception and a few specific subclasses. Callers can catch the base type for general handling or a subclass for one case. Data a caller needs goes in a field:

```java
class CatalogException extends RuntimeException {
    CatalogException(String message) {
        super(message);
    }

    CatalogException(String message, Throwable cause) {
        super(message, cause);
    }
}

class BookNotFoundException extends CatalogException {
    private final String isbn;

    BookNotFoundException(String isbn) {
        super("no book with isbn " + isbn);
        this.isbn = isbn;
    }

    String isbn() {
        return isbn;
    }
}
```

When several `catch` blocks follow one `try`, list the most specific type first; a parent type before its child is a compile error because the child could never be reached. Alternatives that are unrelated can share a block with `|`, as in `catch (IllegalArgumentException | IllegalStateException exception)`.

## Checked or unchecked

Use a checked exception when the caller can reasonably recover and the failure is part of the method's contract, such as a missing file. Use an unchecked exception for programming errors and violated preconditions, such as a null argument or an invalid state. Checked exceptions appear in every signature up the call chain, so they suit boundaries (input and output, remote calls) rather than deep business logic. Many frameworks use unchecked exceptions throughout; whichever you choose, be consistent inside a module and document what a method can throw.

## Chaining with causes

When you translate a low-level failure into your own type, pass the original as the cause so the stack trace keeps both:

```java
static int parseStock(String text) throws StorageException {
    try {
        return Integer.parseInt(text);
    } catch (NumberFormatException exception) {
        throw new StorageException("corrupt stock value: " + text, exception);
    }
}
```

`StorageException` here is a checked exception that extends `Exception` with the same two constructors. A caller reads the original with `getCause()`, which returns the `NumberFormatException`. Dropping the cause throws away the line number and message that explain the real problem.

## try-with-resources and suppressed exceptions

A resource declared in `try (...)` is closed automatically, in reverse order of declaration. If the body throws and `close()` also throws, the body's exception is the one you receive. The one from `close()` is attached to it as a suppressed exception:

```java
try (Connection connection = new Connection("db")) {
    connection.work();            // throws IllegalStateException("work failed on db")
} catch (IllegalStateException exception) {
    System.out.println(exception.getMessage());                  // work failed on db
    System.out.println(exception.getSuppressed()[0].getMessage()); // close failed on db
}
```

Here `Connection` implements `AutoCloseable`, declares `close()` without a `throws` clause, and both `work` and `close` throw unchecked `IllegalStateException`s (a `close()` that declares `throws Exception` would force the caller to catch it). With a hand-written `finally` block that calls `close()`, the failure of `close()` would replace the original exception and the first error would be lost. Prefer try-with-resources for everything that must be closed.

## Do not swallow exceptions

An empty `catch` block, or one that only prints and carries on, turns a failure into a mystery. Either handle the exception (retry, use a default you can justify, report to the user), rethrow it, or wrap it with a cause. If you log it and also rethrow, you get the same error logged at several layers; decide where it is logged, usually at the outermost boundary.

## finally pitfalls

A `return` or `throw` inside `finally` overrides what the `try` block was doing:

```java
static int swallowed() {
    try {
        throw new IllegalStateException("lost");
    } finally {
        return 1;            // the exception disappears; the method returns 1
    }
}
```

A `throw` in `finally` replaces the original exception, which is not recorded as suppressed. Keep `finally` for cleanup that cannot fail, or use try-with-resources instead.

## Common mistakes

- Catching an exception and throwing a new one without passing the original as the cause, so the real stack trace is lost.
- Catching `Exception` or `Throwable` broadly and carrying on. This hides bugs such as a `ClassCastException`; catch the types you can actually handle.
- Writing `return` or `throw` in a `finally` block, which silently discards the exception in flight.
- Closing resources by hand in `finally`. If `close()` throws, it replaces the original error.

## In practice

Define one base exception per module, put the information callers need in fields, and keep messages specific: include the identifier and the value. Wrap at module boundaries and always pass the cause. Handle or log each error once, near the entry point of the program.

## Check yourself

1. Why must `catch (BookNotFoundException ...)` come before `catch (CatalogException ...)`?
2. What is a suppressed exception, and when does one appear?
3. Why can `return` inside `finally` hide a failure?
