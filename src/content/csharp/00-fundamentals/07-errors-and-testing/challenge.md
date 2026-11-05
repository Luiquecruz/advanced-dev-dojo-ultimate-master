A sign-up form for a race sends names and ages as text, and a method somebody else wrote has a bug. This challenge combines most of the module: parsing text, a loop over an array, a dictionary inside a class, string cleaning, a tuple and exceptions. Complete `Ages.Parse`, find and fix the bug in `Ages.CountAdults`, and finish the `SignUpList` class that keeps the sign-ups.

## `Ages.Parse`

`static int Parse(string text)` turns the text of an age into an `int`.

- Surrounding spaces are fine: `" 42 "` returns `42`. Every age from `0` to `150`, both included, is valid.
- Text that is not a whole number (`"abc"`, `"12abc"`, `""`, `"   "`) throws an `ArgumentException`, exactly that type.
- A whole number outside `0` to `150` (`"-1"`, `"151"`) throws an `ArgumentOutOfRangeException`.

`ArgumentOutOfRangeException` is a kind of `ArgumentException`, so the tests check the exact type of the first case: throwing `ArgumentOutOfRangeException` for `"abc"` fails, and so does letting a `FormatException` escape.

## `Ages.CountAdults`

`static int CountAdults(int[] ages)` returns how many ages are `18` or more. It is already written, but it has a bug. Run the tests and read the exception the report shows: its type and message. Then use the program at the top of the file: it calls `CountAdults` inside a `try` and prints the whole exception, stack trace included, when you press **Run**. Fix the bug without rewriting the method.

## `SignUpList`

An instance class: each `new SignUpList(...)` is one event with its own sign-ups, kept in a `Dictionary<string, int>` from a name to an age.

- `SignUpList(string eventName)`: a blank event name (`null`, `""` or only spaces) throws `ArgumentException`. Otherwise `EventName` is the name without surrounding spaces: `new SignUpList("  Summer Run ")` has the `EventName` `"Summer Run"`. A new list has a `Count` of `0`.
- `string EventName { get; }` and `int Count { get; private set; }`: everyone reads them, and only the class sets them.
- `void Add(string name, string ageText)` cleans the name, trimmed and in lowercase, so `" Ana "`, `"ana"` and `"ANA"` are the same person. It stores the age that `Ages.Parse` returns under the clean name and adds one to `Count`. A blank name, or a name already signed up, throws `ArgumentException`; a bad age throws what `Ages.Parse` throws. A refused sign-up changes nothing.
- `(bool Found, int Age) Find(string name)` cleans the name the same way and returns `(true, age)` when that person signed up, or `(false, 0)` when not. It never throws for a missing name.
- `int Adults()` returns how many of the stored ages are `18` or more.
