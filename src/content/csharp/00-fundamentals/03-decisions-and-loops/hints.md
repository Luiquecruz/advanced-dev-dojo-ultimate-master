`Band` reads best as guard clauses: check `urgent` first and return, then check the total and return, and let the last line return `"standard"`. For the array methods, start a variable at `0` before the loop and update it inside a `foreach`.
---
"100 or more" is `total >= 100m`; with `>` an order of exactly 100 falls through to `"standard"`. "Even" is `value % 2 == 0`, which also holds for negative even numbers. "Strictly below" is `value < limit`, so a value equal to the limit is not counted.
---
In `Average`, return `0` first when `values.Length == 0`. Then add up the values and divide with `(double)sum / values.Length`: without the cast, `3 / 2` gives `1` instead of `1.5`.
