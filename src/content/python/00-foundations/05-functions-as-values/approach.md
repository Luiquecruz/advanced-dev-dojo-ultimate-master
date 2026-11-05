1. Read the annotations of each function in the starter: they say what goes in and what comes out (a list, a function, text, a number).
2. `sort_by_length`: let the built-in `sorted` do the work and tell it how to compare words by passing a function as `key`.
3. Check that the input list is unchanged: `sorted` builds a new list, while a method that sorts in place would change the caller's list.
4. `make_multiplier`: the inner function receives the number; the outer parameter `factor` is still visible inside it.
5. `total`: `*amounts` arrives as a tuple, possibly empty; add it up, convert cents to the currency unit and format two decimals.
6. `depth`: write the base case first (not a list), then the recursive case that asks the same question of every item and keeps the deepest answer.
