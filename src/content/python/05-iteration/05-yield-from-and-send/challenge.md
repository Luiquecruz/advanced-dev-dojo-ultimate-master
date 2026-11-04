A telemetry worker flattens nested sensor batches, keeps a running mean of latencies, reads the summary a job generator returns, and must release its connection however a stream ends. Implement four generator tools in `main.py`.

## `flatten(nested)`

A generator yielding the leaves of `nested` in order, at any depth.

- Descend into every iterable: lists, tuples, ranges, generators, empty containers (which add nothing). Use `yield from` for the recursion.
- `str` and `bytes` are **leaves**: `"ab"` is yielded whole, never as characters. Anything that is not iterable is a leaf.
- Nesting can be 100 levels deep.

## `running_average()`

A generator driven with `send()`.

- The first `next()` primes it and yields `None`.
- Each `send(value)` yields the mean of **every** value sent so far, as a number: `10`, then `20`, then `0` give `10`, `15`, `10`.
- Each call to `running_average()` starts a new, independent average.

## `collect(generator)`

Run `generator` to the end and return a tuple `(items, return_value)`: the list of every yielded item and the value of its `return` statement (`None` when it has none). A generator that delegates with `yield from` returns its own value, not its sub-generator's.

## `tracked(iterable, log)`

A generator that yields every item of `iterable` and appends `"closed"` to the list `log` **exactly once** when it ends, in every case:

- the consumer exhausts it;
- the consumer calls `close()` early (calling `close()` a second time adds nothing);
- `iterable` raises an exception, which must still reach the consumer.

Nothing is logged while the generator is merely paused.
