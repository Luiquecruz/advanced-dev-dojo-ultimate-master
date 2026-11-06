# Records, Enums and Sealed Types

Modern Java models data with three small tools: records for values, enums for a fixed set of named constants, and sealed types for a closed set of alternatives. Combined with pattern matching in `switch` and `instanceof`, they let the compiler check that your code handles every case. This lesson goes deeper into records, then covers enums with fields and methods, sealed hierarchies and exhaustive switches.

You need: Decisions and Loops (`switch`), Methods, Classes and Objects (constructors, encapsulation, records introduction), Exceptions and Your First Test (throwing `IllegalArgumentException`).

## Records with validation

A record's canonical constructor takes every component. A compact constructor has no parameter list: it runs the body, then the compiler assigns the fields. Use it to validate or normalize:

```java
public record Temperature(double degrees) {
    public Temperature {
        if (Double.isNaN(degrees) || degrees < -273.15) {
            throw new IllegalArgumentException("below absolute zero: " + degrees);
        }
    }

    public double fahrenheit() {
        return degrees * 9 / 5 + 32;
    }

    public static Temperature ofFahrenheit(double fahrenheit) {
        return new Temperature((fahrenheit - 32) * 5 / 9);
    }
}
```

`new Temperature(-300)` throws, so no invalid `Temperature` can exist. To normalize, assign to the parameter itself, not to `this.value`:

```java
public record Email(String value) {
    public Email {
        value = value.strip().toLowerCase();
    }
}
```

A record can have extra methods and `static` factory methods, and it can implement interfaces. It cannot extend another class and it cannot declare extra instance fields: the components are the state. Its fields are final, so a record is a good fit for values that never change after creation.

## Enums with fields and methods

An enum is a class with a fixed list of instances. Each constant can carry data, passed to a constructor, and the enum can have methods:

```java
enum Plan {
    FREE(0), PRO(900), TEAM(2900);

    private final int monthlyCents;

    Plan(int monthlyCents) {
        this.monthlyCents = monthlyCents;
    }

    int monthlyCents() {
        return monthlyCents;
    }

    boolean isPaid() {
        return monthlyCents > 0;
    }
}
```

`Plan.values()` returns every constant in declaration order, `Plan.valueOf("PRO")` looks one up by exact name, and `ordinal()` is the position. `valueOf` throws `IllegalArgumentException` for an unknown name, such as `No enum constant Demo.Plan.GOLD`. Avoid storing `ordinal()`: reordering the constants would silently change its meaning, so store the name instead. Compare enum constants with `==`; there is only ever one instance of each.

A `switch` over an enum that covers every constant needs no `default`:

```java
static String label(Plan plan) {
    return switch (plan) {
        case FREE -> "Free";
        case PRO -> "Pro";
        case TEAM -> "Team";
    };
}
```

If you later add `ENTERPRISE`, this switch expression stops compiling until you handle it. That is the point: the compiler finds every place that needs updating.

## Sealed types

The next lesson covers interfaces fully. For now: an interface is a named list of methods a type promises to provide, and `implements` makes a class or record make that promise. Several records can implement the same interface, so code can treat them as one kind of thing.

An enum has one instance per constant, all of the same shape. When alternatives have different data, use a sealed interface with one record per case:

```java
sealed interface Shape permits Circle, Square, Rectangle { }
record Circle(double radius) implements Shape { }
record Square(double side) implements Shape { }
record Rectangle(double width, double height) implements Shape { }
```

`sealed` limits which types may implement the interface, and `permits` names them. Each permitted type must be `final`, `sealed` or `non-sealed`; records are implicitly final. When the permitted types are in the same source file, you may leave `permits` out and the compiler infers them. Code outside the list cannot add a new `Shape`, so the set of cases is closed and known.

## Pattern matching

A type pattern tests a type and binds a variable in one step. In `switch`, a record pattern also pulls the components out:

```java
static double area(Shape shape) {
    return switch (shape) {
        case Circle circle -> Math.PI * circle.radius() * circle.radius();
        case Square square -> square.side() * square.side();
        case Rectangle(double width, double height) -> width * height;
    };
}
```

Because `Shape` is sealed and all three cases appear, the switch is exhaustive and needs no `default`. Adding a fourth record to `permits` makes this method a compile error until it is handled. A `default` branch would hide that error, so leave it out when the type is sealed.

A guard adds a condition with `when`; put the more specific case first:

```java
case Circle circle when circle.radius() > 10 -> "large circle";
case Circle circle -> "circle";
```

The same patterns work with `instanceof`:

```java
Object value = new Circle(5);
if (value instanceof Circle(double radius) && radius > 1) {
    System.out.println("radius " + radius);
}
```

The variable `radius` exists only where the match is known to have succeeded.

## Common mistakes

- Writing `this.value = value` inside a compact constructor. The compiler assigns the fields itself after the body, so assigning them there is a compile error; reassign the parameter instead.
- Adding `default` to a switch over a sealed type or an enum. It compiles, but a new case then falls into the default silently instead of failing at compile time.
- Persisting an enum's `ordinal()`. Reordering or inserting a constant changes every stored value; store `name()`.
- Putting a general case before a specific one, such as `case Circle circle` before `case Circle circle when ...`. The compiler reports the later case as dominated.

## In practice

Use a record for a value, an enum for a fixed vocabulary such as roles or statuses, and a sealed interface of records for results that carry different data, such as success versus failure. Validate in the compact constructor so invalid objects never exist, and let exhaustive switches be the checklist when a case is added.

## Check yourself

1. What is the difference between a compact constructor and a canonical constructor?
2. Why does an exhaustive switch over a sealed type not need `default`, and what does adding one cost you?
3. When would you choose a sealed interface of records over an enum?
