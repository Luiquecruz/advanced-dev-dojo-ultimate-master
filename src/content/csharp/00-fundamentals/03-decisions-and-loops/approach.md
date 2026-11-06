1. Read each rule in `challenge.md` and underline its boundary words: "or more", "strictly smaller", "with its fraction", "empty". Each one decides an operator or a special case.
2. `Band`: test the strongest rule first. An urgent order returns `"express"` before the total is even looked at; then `>= 100m` returns `"free"`; everything else is `"standard"`. Early `return`s keep each rule on its own lines.
3. `SumOfEvens` and `CountBelow`: the same loop shape. Start a counter or a sum at `0`, visit every element with `foreach`, and update it inside an `if` with the right condition.
4. `Clamp`: two guard clauses (below `min`, above `max`) and a final `return value;`.
5. `Average`: guard against the empty array first. With `int` division a `Length` of `0` throws `DivideByZeroException`, and with the `double` division you need here it gives `NaN`; neither is the `0` the challenge asks for. Then sum with a loop and divide as `double` so the fraction survives.
6. Run the tests, and when one fails, add a `Console.WriteLine` to the top-level statements with that test's input and press **Run** to see what your method returns.
