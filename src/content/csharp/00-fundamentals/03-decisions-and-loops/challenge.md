Finish `Shipping` and `Numbers` in `Program.cs`. Use the statements of this lesson: `if`, loops over arrays and early `return`. The methods only read the arrays they receive; none of them changes an element.

## `Shipping.Band(decimal total, bool urgent)`

Return the shipping band of an order as text:

- `"express"` when the order is `urgent`, whatever its total;
- otherwise `"free"` when the total is **100 or more**;
- otherwise `"standard"`.

An order of exactly `100m` ships free, and `99.99m` ships standard.

## `Numbers.SumOfEvens(int[] values)`

The sum of the even numbers in the array (a number is even when dividing it by 2 leaves no remainder). Negative even numbers count too. An empty array gives `0`. `[1, 2, 3, 4]` gives `6`.

## `Numbers.CountBelow(int[] values, int limit)`

How many values are strictly smaller than `limit`. `CountBelow([5, 1, 9, 3], 5)` is `2`: the 5 itself does not count.

## `Numbers.Clamp(int value, int min, int max)`

`value` kept inside the range from `min` to `max`: `min` when it is smaller, `max` when it is larger, and `value` itself otherwise. `min` is never greater than `max`.

## `Numbers.Average(int[] values)`

The average of the values as a `double`, with its fraction: `[1, 2]` gives `1.5`. An empty array has no average; return `0` for it instead of dividing by zero.
