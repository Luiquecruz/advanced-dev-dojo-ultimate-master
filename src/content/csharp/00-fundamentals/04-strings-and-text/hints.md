Each tool is a short chain of the methods in the lesson. `Slug.From` needs `Trim`, `ToLowerInvariant`, `Split` and `string.Join`; `Vowels.Count` needs a `foreach` over the characters and a counter, like the vowel snippet in the theory.
---
`Split(' ')` alone leaves empty pieces between two spaces in a row, which `string.Join` turns into `--`. Pass `StringSplitOptions.RemoveEmptyEntries` as the second argument. In `TryRead`, `int.TryParse` already rejects `"12abc"`, `"1.5"` and blanks, but it accepts `"-3"`: add a check for `quantity < 0`, and set `quantity = 0` before returning `false`.
---
`amount.ToString("F2")` gives 2 decimals but uses the current culture, so on a decimal-comma culture it writes `19,90`. Pass the culture explicitly: `amount.ToString("F2", CultureInfo.InvariantCulture)`. `F2` also writes no thousands separator, unlike `N2`.
