Write a small `Matches(prefix, path)` helper first: `"/"` matches everything, otherwise the path equals the prefix or starts with `prefix + "/"` (`path.StartsWith(prefix + "/", StringComparison.Ordinal)`). Then loop over every route instead of stopping at the first match.
---
In the router loop, keep the best route so far and replace it only when the candidate matches and its prefix is longer. In `Pick`, handle `n == 0` (throw) and `n == 1` before calling `_random()`.
---
For the second sample, draw from `n - 1` slots and shift past the first: `var second = (int)Math.Floor(_random() * (n - 1)); if (second >= first) second += 1;`. Choose `_backends[second]` only when its count is strictly lower than the count of `_backends[first]`, then add one to the chosen count in `_inFlight`. In `Release`, `_inFlight.TryGetValue(name, out var count)` tells a backend that has a count from an unknown name; lower the count only when it is above `0`.
