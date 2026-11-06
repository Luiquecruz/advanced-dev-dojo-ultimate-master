# Strings and Arrays

Text and fixed-size sequences of values appear in nearly every program. This lesson covers why a `String` never changes, the methods you will use most, `StringBuilder` for building text, comparing with `equals`, arrays and their fixed size, the `Arrays` helpers and `String.format`.

You need: Values, Types and Variables (primitive versus reference), Decisions and Loops (enhanced `for`), Methods (return values and pass-by-value).

## String is immutable

A `String` object can never be modified. Methods that seem to change it return a new `String`:

```java
String title = "  java basics ";
String cleaned = title.strip().toUpperCase();   // "JAVA BASICS"
System.out.println(title);                      // unchanged: "  java basics "
```

Calling `title.toUpperCase()` and ignoring the result does nothing useful. Commonly used methods are `length()`, `charAt(index)`, `substring(start, end)`, `indexOf(text)`, `contains(text)`, `startsWith(text)`, `replace(old, new)`, `split(regex)`, `isBlank()` and `strip()`.

## Comparing with equals

`==` on references asks whether both names point to the same object. `equals` asks whether the text is the same:

```java
String first = new String("ok");
String second = "ok";
System.out.println(first == second);        // false
System.out.println(first.equals(second));   // true
```

Always compare text with `equals`, and put the known value first (`"ok".equals(input)`) when `input` might be `null`.

## StringBuilder

Because every concatenation creates a new `String`, building text in a loop is wasteful. `StringBuilder` keeps a growing buffer:

```java
StringBuilder builder = new StringBuilder();
for (int number = 1; number <= 3; number++) {
    builder.append(number).append(',');
}
builder.setLength(builder.length() - 1);
String result = builder.toString();   // "1,2,3"
```

For a handful of concatenations, the `+` operator is fine and clearer.

## Arrays

An array holds a fixed number of elements of one type. Its size is set at creation and never changes; elements start at 0, `false` or `null`:

```java
int[] scores = new int[3];
scores[0] = 90;
int[] primes = {2, 3, 5, 7};
System.out.println(primes.length);   // 4
```

Reading `primes[4]` throws `ArrayIndexOutOfBoundsException`. To grow, you create a bigger array and copy.

## The Arrays helpers

`java.util.Arrays` provides the operations you would otherwise write by hand. A class outside `java.lang` needs an `import` line at the top of the file, which makes it available by its short name:

```java
import java.util.Arrays;

int[] numbers = {5, 2, 9};
Arrays.sort(numbers);
System.out.println(Arrays.toString(numbers));          // [2, 5, 9]
int[] bigger = Arrays.copyOf(numbers, 5);              // [2, 5, 9, 0, 0]
System.out.println(Arrays.equals(numbers, new int[] {2, 5, 9}));   // true
Arrays.fill(bigger, 1);
```

Printing an array directly shows an unreadable identity such as `[I@1b6d3586`; use `Arrays.toString`. Likewise `numbers.equals(other)` compares identity, so use `Arrays.equals`.

## String.format

`String.format` fills placeholders: `%s` for text, `%d` for whole numbers, `%.2f` for a decimal with two digits and `%n` for a line break.

```java
String line = String.format("%s scored %d (%.1f%%)", "Ada", 45, 91.256);
// "Ada scored 45 (91.3%)"
```

Formatting uses the default locale of the machine, so the decimal separator can be a comma on some systems.

## Common mistakes

- Comparing strings with `==`. It may appear to work for literals and then fail for text read from a file or the keyboard; use `equals`.
- Calling `text.toUpperCase()` and ignoring the result. Strings are immutable, so assign the returned value.
- Printing an array with `System.out.println(array)` instead of `Arrays.toString(array)`.
- Expecting an array to grow. Its length is fixed; copy it into a larger one with `Arrays.copyOf`.

## In practice

Use `equals` for text, `StringBuilder` for loops, and `Arrays` for sorting and printing. When the size is not known in advance, a growable collection fits better than an array; later modules introduce those.

## Check yourself

1. Why does `name.toUpperCase();` on its own line leave `name` unchanged?
2. What does `Arrays.copyOf(numbers, 5)` do when `numbers` has three elements?
3. When is `"yes".equals(answer)` safer than `answer.equals("yes")`?
