A sign-up form sends ages as text, a report divides totals, and a method somebody else wrote has a bug. Complete `Ages.Parse` and `Safe.Divide`, then find and fix the bug in `Ages.CountAdults`.

## `Ages.Parse`

`static int Parse(string text)` turns the text of an age into an `int`.

- Surrounding spaces are fine: `" 42 "` returns `42`. Every age from `0` to `150`, both included, is valid.
- Text that is not a whole number (`"abc"`, `"12abc"`, `""`, `"   "`) throws an `ArgumentException`, exactly that type.
- A whole number outside `0` to `150` (`"-1"`, `"151"`) throws an `ArgumentOutOfRangeException`.

`ArgumentOutOfRangeException` is a kind of `ArgumentException`, so the tests check the exact type of the first case: throwing `ArgumentOutOfRangeException` for `"abc"` fails, and so does letting a `FormatException` escape.

## `Safe.Divide`

`static (bool Ok, int Result) Divide(int a, int b)` returns `(true, a / b)` (integer division, so `Divide(7, 2)` is `(true, 3)`), and `(false, 0)` when `b` is `0`. It never throws.

## `Ages.CountAdults`

`static int CountAdults(int[] ages)` returns how many ages are `18` or more. It is already written, but it has a bug. Run the tests and read the exception the report shows. Then use the program at the top of the file: it calls `CountAdults` inside a `try` and prints the whole exception, stack trace included, when you press **Run**. Fix the bug without rewriting the method.
