# Methods

A method names a piece of work so that you can reuse it, test it and read it. This lesson covers parameters and return values, overloading, how Java passes arguments (always by value, including references), scope, varargs and what a small, well-written method looks like.

You need: Your First Java Program, Values, Types and Variables, Decisions and Loops (conditions and loops inside methods).

## Parameters and return values

A method declaration states its return type, its name and typed parameters. `return` ends the method and hands a value back; a `void` method returns nothing.

```java
public class Calculator {
    static int clamp(int value, int minimum, int maximum) {
        if (value < minimum) {
            return minimum;
        }
        if (value > maximum) {
            return maximum;
        }
        return value;
    }

    public static void main(String[] args) {
        System.out.println(clamp(150, 0, 100));
    }
}
```

The compiler rejects a method that can reach its end without returning a value. Guard clauses with early `return`, as above, keep the main path flat.

## Overloading

Several methods may share a name if their parameter lists differ in number or type. The compiler picks the match from the argument types at compile time:

```java
static int total(int first, int second) {
    return first + second;
}

static double total(double first, double second) {
    return first + second;
}
```

Changing only the return type is not overloading and does not compile.

## Pass-by-value

Java always copies the argument into the parameter. For a primitive, the copy is the value, so the caller's variable never changes. For a reference, the copy is the pointer: the method can change the object it points to, but reassigning the parameter does not affect the caller. The example uses an array, which lesson 5 covers; for now you only need to know that an array is an object that any name pointing to it can change, and that `new` creates an object (lesson 6 explains it).

```java
static void reset(int number, int[] scores) {
    number = 0;                     // changes only the local copy
    scores[0] = 99;                 // changes the shared object
    scores = new int[] {1, 2, 3};   // rebinds only the local copy
}
```

After calling `reset(count, marks)`, `count` is unchanged and the caller's array holds 99 in its first position but is still the original array.

## Scope

A variable exists from its declaration to the closing brace of its block. A loop variable disappears after the loop, and a parameter lives for the whole method. Two variables in the same scope cannot share a name, and declaring variables close to where they are used keeps methods readable.

## Varargs

The last parameter may accept any number of arguments with `...`. Inside the method it is an array:

```java
static int sum(int... numbers) {
    int total = 0;
    for (int number : numbers) {
        total += number;
    }
    return total;
}
```

Calls such as `sum()`, `sum(5)` and `sum(1, 2, 3)` are all valid.

## A small method written well

A good method does one thing, has a name that starts with a verb, takes only what it needs and has no hidden effects:

```java
static boolean isLeapYear(int year) {
    return (year % 4 == 0 && year % 100 != 0) || year % 400 == 0;
}
```

It is short, testable without any setup and its name states what it answers.

## Common mistakes

- Believing that Java passes objects by reference. The pointer is copied; reassigning the parameter inside the method never changes the caller's variable.
- Writing a method that both prints and computes. Return the value and let the caller decide how to show it, so the method can be tested.
- Forgetting a `return` on one branch, which the compiler reports as a missing return statement.
- Declaring a loop variable and using it after the loop; it is out of scope there.

## In practice

Methods with few parameters, one purpose and a descriptive verb name are the unit that tests and reviews work with. If a method needs a comment to explain what it does, split it or rename it. Prefer returning results over mutating arguments.

## Check yourself

1. After `reset(count, marks)` above, which of the two arguments changed and why?
2. Why does overloading by return type alone fail?
3. What type does a varargs parameter have inside the method?
