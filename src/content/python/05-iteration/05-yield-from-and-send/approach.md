1. List what a generator can receive besides `next()`: a value through `send()`, an exception through `throw()`, and `GeneratorExit` through `close()`. Each of the four tools exercises one of them, or the return value.
2. For `flatten`, write the leaf rule first and check it against `"ab"`, `b"cd"`, `""` and `7`; only then add the recursive case with `yield from`.
3. For `running_average`, trace one `next()` and three `send()` calls on paper: which `yield` each call stops at and what the generator has received so far.
4. For `collect`, remember where a generator's return value lives (`StopIteration.value`) and which consumers throw it away.
5. For `tracked`, list the three ways the generator can end and check that one `finally` covers all of them, including an exception coming out of the iterable.
6. Run the demo: it feeds latencies, closes a stream early and prints the log.
