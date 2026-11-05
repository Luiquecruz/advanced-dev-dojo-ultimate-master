A small shop prints a receipt line for every item it sells. Finish the five methods of `Receipt` in `Program.cs` so that each one returns the right value. Each method is a named piece of work: it receives the values written in its parentheses (its *parameters*) and gives back one result with `return`. Lesson 00/02 explains methods properly; here you only write the expression after `return`.

The top-level statements at the top of the file print a few results when you press **Run**. Change them as you like: the tests ignore them and call the methods directly.

## `LineTotal(decimal price, int quantity)`

The price of one item times the quantity. `LineTotal(4.50m, 3)` is `13.50`, and a quantity of `0` gives `0`.

## `WithTax(decimal net, decimal rate)`

The net amount plus tax, rounded to 2 decimal places with `Math.Round(value, 2)`. `rate` is a fraction: `0.21m` means 21%. `WithTax(100m, 0.21m)` is `121.00` and `WithTax(19.99m, 0.21m)` is `24.19`.

## `Describe(string name, int quantity)`

The receipt text: the quantity, a space, `x`, a space and the name. `Describe("Mug", 3)` is `"3 x Mug"`.

## `FullBoxes(int items, int perBox)` and `Leftover(int items, int perBox)`

Items ship in boxes of `perBox`. `FullBoxes` is how many boxes can be filled completely, `Leftover` how many items remain outside a full box. With 7 items and 2 per box: 3 full boxes and 1 left over. `perBox` is always at least 1.

## `AverageRating(int totalStars, int votes)`

The average number of stars per vote, **with** its fraction: 7 stars from 2 votes is `3.5`, not `3`. `votes` is always at least 1.
