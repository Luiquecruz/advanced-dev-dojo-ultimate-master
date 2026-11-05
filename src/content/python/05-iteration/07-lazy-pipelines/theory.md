A **lazy pipeline** is a chain of generator stages, each one reading from the stage before. Nothing runs when the chain is built. The consumer at the end pulls one item, and that pull travels back through every stage to the source, so one item at a time flows through the whole chain.

```py
def read(lines):
    for line in lines:
        print("read", line)
        yield line

def numbers(lines):
    for line in lines:
        yield int(line)

def evens(values):
    for value in values:
        if value % 2 == 0:
            yield value

stages = evens(numbers(read(["1", "2", "3", "4"])))   # nothing printed: no stage has started
print(next(stages))                                   # read 1, read 2, then 2
```

The first result came out after two reads, not four. That is **backpressure by pulling**: a stage only works when the next one asks, so no buffer grows between stages and memory stays bounded by one item, or one chunk.

Write each stage as a list comprehension instead and the shape inverts: every stage finishes before the next one starts, memory holds the whole input once per stage, and the first result appears only after the last line has been read.

## How it works

- **The stage that opens a resource closes it**, in `try`/`finally` around its `yield`s. Then exhaustion, an exception and `close()` all release it.
- `close()` on the outer generator reaches the inner ones: `yield from` closes its sub-generator, and generators held only by a closed frame are finalized in CPython as soon as their last reference disappears. A plain object such as a file, a connection or this lesson's `Source` has no frame: only code that calls its `close()` releases it.
- **Errors surface late.** A malformed line raises when the pipeline reaches it, long after the call that built the chain. Put the offending input in the exception message; the traceback no longer points at the caller's line.
- **Chunking at the end of the chain** (`itertools.batched`) gives the sink bulk batches while every earlier stage stays item by item. A chunk is yielded as soon as it is full, so the first chunk of 2 errors reads only up to the second error.
- `contextlib.closing(pipeline(source))` (module 06) calls `close()` at the end of a `with` block, for consumers that may stop early.
- Running a pipeline twice reads the source twice. When results are needed again, materialize them once at the sink.

## Common mistakes

**Closing the source after the loop instead of in `finally`.** Code placed after `yield from` runs only when the input is exhausted. When the consumer calls `close()`, Python raises `GeneratorExit` at the paused `yield`, the stage stops there, and the line after the loop never runs; the same happens when a stage raises. Put the cleanup in `finally`, which runs on all three exits:

```py
# wrong: an early close() or an error skips source.close()
def pipeline(source):
    yield from chunked(only_errors(parse(source)), 100)
    source.close()

# right: finally runs on exhaustion, on an error and on close()
def pipeline(source):
    try:
        yield from chunked(only_errors(parse(source)), 100)
    finally:
        source.close()
```

**Expecting `break` to close the pipeline.** Leaving a `for` loop early only stops pulling. The generator stays paused at its `yield`, its `finally` has not run, and the source it opened is still open until someone calls `close()` or the object is garbage collected. Close what you stop reading:

```py
# wrong: the pipeline is paused and the source is still open
for chunk in pipeline(source):
    send(chunk)
    break

# right: close() raises GeneratorExit at the paused yield, so finally runs
chunks = pipeline(source)
for chunk in chunks:
    send(chunk)
    break
chunks.close()
```

## When to choose it

This is the decision behind the module: lists or generators, and where to materialize.

- **Generators end to end** when the data is large or unbounded, when consumers may stop early, or when the first results should come out before the last input is read. Under a memory limit there is no alternative: 30 million parsed rows at about 200 bytes each are roughly 6 GB as a list, while a 10,000-row chunk is about 2 MB.
- **Materialize at the sink** (`list(...)` of a small final result) when it is needed twice, sorted, counted or indexed. Do not materialize between stages: a list in the middle holds the whole input again and delays the first result.
- **Chunk with `batched`** when the sink is cheaper in bulk (database inserts, API calls), with a chunk size that fits the memory budget.
- **Always own cleanup**: `try`/`finally` in the stage holding the resource, and `close()` or `contextlib.closing` wherever a consumer can stop early.
- For I/O that should overlap rather than run one pull at a time, use async generators (module 10).
