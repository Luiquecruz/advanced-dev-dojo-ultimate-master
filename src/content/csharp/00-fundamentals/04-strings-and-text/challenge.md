Finish four small text tools in `Program.cs`: `Slug`, `Quantity`, `Money` and `Vowels`. The starter already has `using System.Globalization;` for `CultureInfo` and `NumberStyles`. Remember that string methods return a new string: store or return what they give you.

## `Slug.From(string text)`

Turn a product name into the lower-case, hyphen-separated text used in web addresses. Remove the spaces at both ends, make every letter lower case with `ToLowerInvariant`, and join the words with single hyphens; words are separated by one or more spaces. `Slug.From("  Joust Duffle Bag ")` is `"joust-duffle-bag"`, `Slug.From("Big   Blue  Box")` is `"big-blue-box"` and an empty text gives `""`.

## `Quantity.TryRead(string text, out int quantity)`

Read a quantity typed by a person. Return `true` and set `quantity` when the text is a whole number of `0` or more; spaces around the digits are fine, so `" 12 "` gives `12`. Return `false` and set `quantity` to `0` for anything else: `"12abc"`, `"1.5"`, `"-3"`, `""` and `"   "`. Parse with `int.TryParse(text, NumberStyles.Integer, CultureInfo.InvariantCulture, out ...)`; it never throws, but it does accept negative numbers.

## `Money.Format(decimal amount)`

The amount as text with exactly 2 decimals, a dot as the decimal separator and no thousands separator: `19.9m` is `"19.90"`, `5m` is `"5.00"` and `1234.5m` is `"1234.50"`. The result must be the same on every machine, whatever its culture: one test runs on a culture that writes decimal commas.

## `Vowels.Count(string word)`

How many of the letters a, e, i, o and u the word contains, in upper or lower case. `"Duffle"` has 2, `"AEIOU"` has 5 and `"rhythm"` has 0. Visit the characters with `foreach`.
