1. Press **Run** first: the top-level statements print what the starter returns, so you can see which values are wrong before running the tests.
2. `LineTotal`: multiply `price` by `quantity`. A `decimal` times an `int` is a `decimal`, so nothing needs converting.
3. `WithTax`: the tax is `net * rate`, so the total is `net * (1 + rate)`. Wrap it in `Math.Round(..., 2)`; `19.99m * 1.21m` is `24.1879`, which must become `24.19`.
4. `Describe`: build the text with an interpolated string that puts `quantity`, then ` x `, then `name`.
5. `FullBoxes` and `Leftover`: this is the one place where integer division is what you want. `/` on two `int` values gives the number of full boxes and `%` gives the remainder.
6. `AverageRating`: here integer division is the bug. Cast `totalStars` to `double` before dividing, so `7` becomes `7.0` and the result keeps its `.5`. Run the tests again and check that all five pass.
