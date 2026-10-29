1. Accept that chunking does not make the job faster; it bounds how long the thread is held at once, so other callbacks get a turn between chunks.
2. Slice the work by index ranges rather than creating sub-arrays, and keep results in one array so order is preserved.
3. Yield between chunks, not after the last one: a final yield only adds latency. Make the yield injectable so tests (and callers) can count or replace it, and default to `setImmediate` because it lets pending I/O and timers run, unlike a resolved promise.
4. Measure lag as "actual tick time minus expected tick time". Resetting `expected` from the actual time keeps one long block from being counted again on every later tick.
5. `unref()` the monitor's interval: observability must never be the reason a process cannot exit.
6. Put load shedding in front of the handler as a wrapper: decide from the current lag before doing any work, and answer quickly with `503` and `Retry-After` so clients back off.
