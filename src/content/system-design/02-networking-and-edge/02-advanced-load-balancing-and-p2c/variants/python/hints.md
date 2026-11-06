Write a small `matches(prefix, path)` helper first: `"/"` matches everything, otherwise the path equals the prefix or starts with `prefix + "/"`. Then loop over every route instead of stopping at the first match.
---
In the router loop, keep the best route so far and replace it only when the candidate matches and its prefix is longer. In `pick`, handle `n == 0` (raise) and `n == 1` before calling `random()`.
---
For the second sample, draw from `n - 1` slots and shift past the first: `second = int(self._random() * (n - 1))`, then `if second >= first: second += 1`. Choose `backends[second]` only when its count is strictly lower than the count of `backends[first]`, then add one to the chosen count in the dict.
