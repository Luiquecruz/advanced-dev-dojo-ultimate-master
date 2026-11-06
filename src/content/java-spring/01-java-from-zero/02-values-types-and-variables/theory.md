# Values, Types and Variables

Java checks types before a program runs: every variable has a type that never changes, and the compiler rejects code that mixes types carelessly. This lesson covers the primitive types, `String`, `var`, literals, casting, overflow, `final`, text blocks and the difference between a primitive and a reference.

You need: Your First Java Program (compile and run a class with `main`).

## Primitives and String

Java has eight primitive types. The ones you will use daily:

| Type | Holds | Example |
| --- | --- | --- |
| `int` | whole numbers, about plus or minus 2.1 billion | `42` |
| `long` | larger whole numbers | `9_000_000_000L` |
| `double` | decimal numbers | `3.14` |
| `boolean` | `true` or `false` | `true` |
| `char` | one UTF-16 code unit | `'A'` |

The others are `byte`, `short` and `float`. `String` is not a primitive but a class, and it has literal syntax: `"text"`. Underscores in number literals are allowed for readability, and a `long` literal that does not fit in an `int` needs the `L` suffix.

```java
int count = 3;
double price = 4.5;
boolean ready = count > 2;
String name = "Ada";
```

## var and final

`var` lets the compiler infer the type of a local variable from its initializer. The type is still fixed; it is just not written out:

```java
var total = 10;        // int
var label = "items";   // String
```

`var` works only for local variables with an initializer, not for fields or parameters. `final` makes a variable assignable exactly once, which documents intent and prevents accidental changes:

```java
final int maximum = 100;
// maximum = 200; would not compile
```

## Casting and overflow

Java widens automatically (an `int` fits into a `long` or `double`) but narrowing needs an explicit cast, which can lose information:

```java
double average = 3.9;
int whole = (int) average;      // 3: the fraction is dropped, not rounded
int half = 7 / 2;               // 3: both operands are int, so integer division
double exact = 7 / 2.0;         // 3.5
```

Integers have a fixed size and silently wrap around when a result does not fit:

```java
int largest = Integer.MAX_VALUE;
int wrapped = largest + 1;      // -2147483648, no error
long safe = Math.addExact(1L, 2L);
```

`Math.addExact` and its siblings throw an `ArithmeticException` instead of wrapping. Money should never be stored in `double`, because binary fractions cannot represent values such as 0.1 exactly.

## Text blocks

A text block starts and ends with three double quotes and keeps line breaks, which suits JSON or SQL:

```java
String json = """
        {"name": "Ada", "level": 3}
        """;
```

The common leading indentation is removed automatically.

## Primitive versus reference

A primitive variable holds the value itself. A reference variable holds a pointer to an object, and `null` means it points to nothing. Copying a primitive copies the value; copying a reference makes two names for the same object. This is why `==` compares primitives by value but compares objects by identity, and why calling a method on a `null` reference fails with a `NullPointerException`.

## Common mistakes

- Dividing two `int` values and expecting decimals. `7 / 2` is `3`; make at least one operand a `double` such as `7 / 2.0`.
- Assuming overflow throws an error. `Integer.MAX_VALUE + 1` becomes a negative number silently; use `long` or the `Math.*Exact` methods when sizes can grow.
- Using `double` for money, which produces results such as `0.30000000000000004`.
- Casting a `double` to `int` and expecting rounding; the cast truncates toward zero.

## In practice

Pick `int` for counts and indexes, `long` for identifiers and timestamps, `double` for measurements, and a dedicated decimal type for currency. Prefer `final` for anything that should not change and `var` only when the right-hand side makes the type obvious.

## Check yourself

1. What is the value of `5 / 2`, and how do you obtain `2.5`?
2. Why does `var x;` without an initializer not compile?
3. What is the difference between copying an `int` and copying a reference to an object?
