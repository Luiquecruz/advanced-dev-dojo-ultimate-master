# Decisions and Loops

Programs become useful when they choose between paths and repeat work. This lesson covers `if`, `switch` as a statement and as an expression, the three loop forms, `break` and `continue`, and the boolean logic that drives all of them, including short-circuiting.

You need: Your First Java Program, Values, Types and Variables (booleans and `int` arithmetic).

## if and boolean logic

A condition must be a `boolean`; Java never treats a number or a string as true or false.

```java
int score = 72;
if (score >= 90) {
    System.out.println("A");
} else if (score >= 70) {
    System.out.println("B");
} else {
    System.out.println("C");
}
```

Combine conditions with `&&` (and), `||` (or) and `!` (not). The first two short-circuit: the right side runs only when the left side has not already decided the result. That makes null-safe checks possible:

```java
String text = null;
if (text != null && text.length() > 3) {
    System.out.println("long text");
}
```

If the `&&` were `&`, both sides would always be evaluated and `text.length()` would throw a `NullPointerException`.

## switch statements and expressions

A switch picks a branch by value. The arrow form needs no `break` and does not fall through:

```java
String day = "SAT";
switch (day) {
    case "SAT", "SUN" -> System.out.println("weekend");
    default -> System.out.println("weekday");
}
```

A switch can also be an expression that produces a value, which the compiler checks for completeness:

```java
int hours = switch (day) {
    case "SAT", "SUN" -> 0;
    case "FRI" -> 6;
    default -> {
        int regular = 8;
        yield regular;
    }
};
```

Each arm either gives a value directly or uses a block with `yield`. A switch expression must cover every possible input, so it needs a `default` unless the compiler can see every possible value, as with an enum whose constants are all listed.

## Loops

Use `for` when you know the count, enhanced `for` to visit every element, and `while` when the stopping condition decides. The enhanced `for` below visits an array, which lesson 5 introduces; for now read `values` as a list of three numbers:

```java
for (int index = 0; index < 3; index++) {
    System.out.println("round " + index);
}

int[] values = {4, 8, 15};
int sum = 0;
for (int value : values) {
    sum += value;
}

int remaining = 10;
while (remaining > 0) {
    remaining -= 3;
}
```

`break` leaves the nearest loop immediately. `continue` skips to the next iteration:

```java
for (int number = 1; number <= 10; number++) {
    if (number % 2 == 0) {
        continue;
    }
    if (number > 7) {
        break;
    }
    System.out.println(number);
}
```

This prints 1, 3, 5 and 7. The `%` operator gives the remainder, so `number % 2 == 0` tests for even numbers.

## Common mistakes

- Writing a loop whose variable never moves toward the stopping condition, such as forgetting `remaining -= 3`. The program then runs forever.
- Using `=` instead of `==` in a condition. Assignment to a `boolean` compiles, so `if (ready = false)` assigns and then tests the new value.
- Using `<=` where `<` is meant. `for (int index = 0; index <= 3; index++)` runs four times, not three, because the bound itself is included.
- Ending an `if` line with a semicolon, as in `if (x > 1);`, which makes the body empty and runs the following block every time.

## In practice

Prefer the arrow switch over chained `if` statements when you are mapping one value to many outcomes, and prefer enhanced `for` over index arithmetic when you do not need the index. Keep conditions readable: extract a complicated test into a well-named `boolean` variable.

## Check yourself

1. Why is `a != null && a.isEmpty()` safe when `a` is `null`?
2. What happens if a switch expression has no `default` and the value matches no case?
3. When would you choose `while` over `for`?
