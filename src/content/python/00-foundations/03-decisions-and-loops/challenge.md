The shipping desk of a small shop needs five helpers. Amounts are whole **cents**. Complete the functions in `main.py`; each one already has its name and parameters (lesson 04 explains how functions are defined).

## Functions

- `shipping_cost(total_cents)`: returns the shipping price in cents for an order total:

  | Order total | Shipping |
  | --- | --- |
  | below 20.00 (`total_cents < 2000`) | `595` |
  | 20.00 up to 49.99 | `395` |
  | 50.00 up to 99.99 | `195` |
  | 100.00 or more | `0` |

- `fizzbuzz(n)`: returns a list of texts for the numbers 1 to `n`, `n` included: `"FizzBuzz"` for multiples of both 3 and 5, `"Fizz"` for other multiples of 3, `"Buzz"` for other multiples of 5, and the number as text otherwise. `fizzbuzz(5)` returns `["1", "2", "Fizz", "4", "Buzz"]`.
- `first_index(items, target)`: returns the position of the first item equal to `target`, counting from 0, or `None` when `target` is not in `items`. Write the loop yourself: do not call the list method `.index(...)`.
- `running_max(numbers)`: returns a list where each entry is the largest number seen so far. `running_max([3, 1, 4, 1, 5])` returns `[3, 3, 4, 4, 5]`; an empty list gives `[]`.
- `pair_up(names, scores)`: returns a list of texts `"<name>: <score>"`, pairing the lists position by position and stopping at the end of the shorter one.

## Rules

- Keep the function names and parameters.
- No imports are needed.
