# Working with Text

Most programs read text in and write text out: names, product codes, quantities typed by a person, prices on a receipt. After this lesson you can take a `string` apart character by character, clean it up, search it, split and join it, build long text efficiently, turn text into numbers safely with `TryParse`, and format numbers as text the same way on every machine.

You need: 00/01 (`string`, `char` and interpolated strings), 00/02 (methods and return values) and 00/03 (`if` and `foreach`).

## A string is a sequence of characters

A `string` is an ordered sequence of `char` values. `Length` is the number of characters, and an index from `0` to `Length - 1` reads one of them. `foreach` visits them in order:

```csharp
string word = "Duffle";
Console.WriteLine(word.Length);   // 6
Console.WriteLine(word[0]);       // D
int vowels = 0;
foreach (char letter in word)
{
    if ("aeiou".Contains(char.ToLowerInvariant(letter)))
    {
        vowels++;
    }
}
Console.WriteLine(vowels);        // 2
```

A `char` is written in single quotes (`'D'`) and a `string` in double quotes (`"D"`); they are different types.

## Strings never change

A string is **immutable**: no method changes it. `Trim`, `Replace`, `ToUpperInvariant` and the rest return a *new* string, and you must store that result. Assigning a character, as in `word[0] = 'd'`, does not compile (CS0200).

```csharp
string name = "  Joust Bag ";
name.Trim();                              // the result is thrown away
Console.WriteLine($"[{name}]");           // [  Joust Bag ]
name = name.Trim();
Console.WriteLine($"[{name}]");           // [Joust Bag]
Console.WriteLine(name.ToUpperInvariant());      // JOUST BAG
Console.WriteLine(name.Replace("Bag", "Pack"));  // Joust Pack
Console.WriteLine(name.Substring(0, 5));         // Joust: 5 characters from index 0
```

`ToUpperInvariant` and `ToLowerInvariant` change case by the same rules on every machine, which is what you want for codes and comparisons. `Substring(start, length)` throws `ArgumentOutOfRangeException` when the range goes past the end.

## Searching and comparing

`Contains`, `StartsWith`, `EndsWith` and `Equals` take a `StringComparison` that says how to compare. `Ordinal` compares the exact characters, and `OrdinalIgnoreCase` ignores upper and lower case:

```csharp
string sku = "BAG-042";
Console.WriteLine(sku.StartsWith("bag", StringComparison.OrdinalIgnoreCase)); // True
Console.WriteLine(sku.Contains("bag", StringComparison.Ordinal));             // False
Console.WriteLine(string.Equals(sku, "bag-042", StringComparison.OrdinalIgnoreCase)); // True
Console.WriteLine(string.IsNullOrWhiteSpace("   "));                         // True
```

`string.IsNullOrWhiteSpace` answers "is there any real text here?": it is `true` for `null`, for `""` and for text made only of spaces.

## Splitting and joining

`Split` cuts a string at a separator and returns an array of the pieces. Two separators in a row produce an empty piece, so pass `StringSplitOptions.RemoveEmptyEntries` to drop them. `string.Join` does the opposite: it glues an array together with a separator between the elements.

```csharp
string[] parts = "Big   Blue  Box".Split(' ', StringSplitOptions.RemoveEmptyEntries);
Console.WriteLine(parts.Length);              // 3
Console.WriteLine(string.Join("-", parts));   // Big-Blue-Box
```

## Building long text with `StringBuilder`

Because strings are immutable, `text += piece` in a loop creates a new string on every pass and copies everything built so far. `StringBuilder` (namespace `System.Text`) keeps one growing buffer instead; call `ToString()` once at the end:

```csharp
using System.Text;

var builder = new StringBuilder();
for (int i = 1; i <= 3; i++)
{
    builder.Append("Line ").Append(i).AppendLine();
}
Console.Write(builder.ToString());   // Line 1, Line 2, Line 3 on three lines
```

For a handful of pieces, an interpolated string is simpler and just as good.

## From text to numbers: `TryParse`

Text that a person typed may not be a number at all. `int.Parse("12abc")` stops the program with a `FormatException`. `int.TryParse` never throws: it returns `true` or `false`, and hands back the number through an **`out` parameter**, a second result that the method writes into a variable you name at the call:

```csharp
using System.Globalization;

if (int.TryParse(" 12 ", NumberStyles.Integer, CultureInfo.InvariantCulture, out int quantity))
{
    Console.WriteLine(quantity + 1);   // 13: spaces around the digits are allowed
}
bool ok = int.TryParse("12abc", NumberStyles.Integer, CultureInfo.InvariantCulture, out int bad);
Console.WriteLine($"{ok} {bad}");      // False 0: on failure the out value is 0
```

`TryParse` accepts `"-3"` as a valid number, so a rule like "no negative quantities" is a separate check after it succeeds.

## Cultures: the same number, different text

How a number is written depends on the **culture**: in many countries 19.9 is written `19,90`, with a comma. Parsing and formatting methods use the machine's current culture unless you pass one, so the same code can produce different text on a server in another country. Pass `CultureInfo.InvariantCulture`, a fixed culture with a dot, whenever text is meant for files, programs or tests rather than people. Careful: under the invariant culture a comma is a thousands separator, so `decimal.TryParse("19,90", NumberStyles.Number, CultureInfo.InvariantCulture, out decimal price)` succeeds with `1990`.

## Format strings

A **format string** says how a number becomes text. Pass it to `ToString` or after a colon in an interpolated string:

```csharp
using System.Globalization;

decimal amount = 1234.5m;
Console.WriteLine(amount.ToString("F2", CultureInfo.InvariantCulture));   // 1234.50: 2 decimals
Console.WriteLine(amount.ToString("N2", CultureInfo.InvariantCulture));   // 1,234.50: with thousands
Console.WriteLine(42.ToString("D5"));                                     // 00042: at least 5 digits
Console.WriteLine($"[{7,4}]");                                            // [   7]: width 4
```

`$"{amount:F2}"` formats with the *current* culture, so it may print `1234,50`. For text that must not change, use `amount.ToString("F2", CultureInfo.InvariantCulture)` or `string.Create(CultureInfo.InvariantCulture, $"{amount:F2}")`.

## Common mistakes

- **Calling a string method and ignoring its result.** `name.Trim();` changes nothing, so the spaces stay and a comparison fails later. Write `name = name.Trim();`.
- **Parsing user input with `int.Parse`.** Text such as `"12abc"` or an empty field throws `FormatException` and stops the program. Use `int.TryParse` and handle `false`.
- **Formatting without a culture.** `price.ToString("F2")` prints `19,90` on a machine whose culture writes decimal commas, so a file or a test that expects `19.90` breaks. Pass `CultureInfo.InvariantCulture`.

## In practice

- Clean input at the edge of the program (`Trim`, case, `TryParse`) and work with clean values everywhere else.
- Compare codes, keys and file names with `StringComparison.Ordinal` or `OrdinalIgnoreCase`. Culture-aware comparison is for sorting text that people read.
- Use `InvariantCulture` for anything another program reads (files, URLs, logs, tests) and the user's culture only for text shown to that user.
- Reach for `StringBuilder` when a loop builds text piece by piece; use interpolation for everything else.

## Check yourself

1. Why does `name.Replace(" ", "-");` leave `name` unchanged, and how do you fix it?
2. What does the `out` parameter of `int.TryParse` give you, and what is its value when parsing fails?
3. A program prints prices with `$"{price:F2}"` and works on your machine, but a customer's file shows commas. What changed, and what would you write instead?
