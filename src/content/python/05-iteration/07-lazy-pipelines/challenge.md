The module's closing challenge. An alerting job reads a service log, keeps the `ERROR` lines and sends them to a pager API in chunks. The log can be huge, the pager often stops the job after the first chunk, and the log handle must be released however the job ends. The starter was ported from array chains: every stage builds a list, and nothing closes the source.

Build in `main.py`:

## Stages

All three are **generators** (the tests check `inspect.isgenerator`) that pull one item at a time from their input.

- `parse(lines)`: each line has the form `"LEVEL message"`, possibly ending with `"\n"` (removed). Yield `{"level": LEVEL, "message": message}`. `LEVEL` must be one of `LEVELS` (`DEBUG`, `INFO`, `WARNING`, `ERROR`) and the message must not be empty; otherwise raise `ValueError` whose message **contains the offending line**. Blank lines are skipped. A malformed line raises only when it is reached.
- `only_errors(records)`: yield the records whose `"level"` is `"ERROR"`.
- `chunked(items, size)`: yield lists of up to `size` items, each as soon as it is full, then a shorter last list. `chunked(range(5), 2)` gives `[0, 1]`, `[2, 3]`, `[4]`.

## `class Source(lines)`

A one-shot iterator over `lines`: `iter(source) is source`, `next()` returns the next line and adds one to `source.reads` (starts at `0`). `source.closed` is `False` until `close()` is called; calling `close()` twice is harmless. Most of it is written; `close()` is not.

## `pipeline(source, size=100)`

A **generator** yielding the chunks of `chunked(only_errors(parse(source)), size)`; `size` defaults to `100`.

- Calling `pipeline` reads nothing. Getting a chunk reads only the lines needed to fill it: with the tests' log, the first chunk of 2 errors reads exactly 4 lines.
- The source is closed when the pipeline ends, in every case: exhausted, closed early with `.close()`, or stopped by a `ValueError` from `parse` (which still reaches the consumer). Use `try`/`finally`.
