# Transform Streams and pipeline()

The previous lesson consumed a stream with `for await`. Real work usually chains several steps: read a file, parse it, convert each record, compress, write. Node models each step as a stream and connects them with `pipeline()`.

## Transform streams

A `Transform` is writable on one side and readable on the other. You implement `transform(chunk, encoding, callback)` and call `this.push(...)` for every output piece; `flush(callback)` runs once at the end for anything still buffered:

```ts
import { Transform } from 'node:stream';

const upper = () =>
  new Transform({
    transform(chunk, _encoding, callback) {
      callback(null, String(chunk).toUpperCase());
    },
  });
```

`callback(null, value)` is a shortcut for `this.push(value); callback()`. Calling `callback(error)` fails the stream. A transform may push zero, one or many pieces per input chunk, which is exactly what parsers need: one chunk of text can contain half a line or fifty lines.

## Object mode

By default streams carry bytes and strings. With `objectMode: true` each chunk is any JavaScript value, so you can pass records between steps. Mixed steps declare each side separately:

| Option | Writable side receives | Readable side emits |
| --- | --- | --- |
| default | Buffers / strings | Buffers / strings |
| `objectMode: true` | values | values |
| `readableObjectMode: true` | Buffers / strings | values (text to records) |
| `writableObjectMode: true` | values | Buffers / strings (records to text) |

A CSV-to-NDJSON converter is three transforms: `splitLines` (text in, line strings out), `csvToObjects` (lines in, objects out) and `toNdjson` (objects in, `JSON.stringify(row) + '\n'` out).

## Backpressure

Every stream has a buffer limit (`highWaterMark`: 64 KB for byte streams, 16 objects in object mode). When a consumer is slower than its producer (a disk, a slow client, a rate-limited API), the consumer's buffer fills up, `write()` returns `false`, and a well-behaved producer pauses until `'drain'`. Without that signal a fast file read feeding a slow upload buffers the entire file in memory.

```ts
for (const row of rows) {
  if (!out.write(row)) {
    await once(out, 'drain');
  }
}
out.end();
```

You rarely write that loop by hand: `pipeline` wires backpressure between every pair of streams.

## pipeline() vs pipe()

```ts
import { pipeline } from 'node:stream/promises';
import { createReadStream, createWriteStream } from 'node:fs';

await pipeline(
  createReadStream('users.csv', { encoding: 'utf8' }),
  splitLines(),
  csvToObjects(),
  toNdjson(),
  createWriteStream('users.ndjson'),
);
```

| `a.pipe(b).pipe(c)` (legacy) | `await pipeline(a, b, c)` |
| --- | --- |
| backpressure: yes | backpressure: yes |
| an error in `b` does not destroy `a` or `c`: file handles leak, the program may hang | an error anywhere destroys every stream |
| errors need a handler on each stream | one promise rejects with the first error |
| no completion signal besides events | resolves when the last stream finishes |

`pipeline` also accepts async generator functions as steps (`async function* (source) { for await (const chunk of source) yield ... }`), often the shortest way to write a transform.

## Partial output on failure

When row 9 000 of a file is invalid, the destination already contains 8 999 converted rows. Decide what the consumer should see: usually nothing. Either write to a temporary file and `rename` on success (the atomic write from the file-system lesson), or delete the output in a `catch` and rethrow.

## Web Streams

`fetch` bodies are Web Streams (`ReadableStream`, `TransformStream`, `pipeThrough`). Node supports both families and converts with `Readable.fromWeb()` / `Readable.toWeb()`. Use Web Streams in code shared with browsers and edge runtimes; Node streams have the larger ecosystem (fs, zlib, CSV parsers, database drivers).

## When to choose it

Use transforms + `pipeline` for large or unbounded data flowing through several steps: imports, exports, ETL, log processing, proxying with compression. For small bounded data, a plain function over an array is easier to read and test. For CPU-heavy steps (image resizing, big compressions), streams keep memory flat but still block the event loop: move that work to a worker or a separate service. Prefer well-tested parsers (`csv-parse`, `ndjson`) over hand-written ones in production; write your own only for simple, controlled formats.

## Working with AI

State the data size, the format and what must happen to partial output on failure. Review generated stream code for:

- `.pipe()` chains instead of `pipeline` (errors leak streams and hang requests);
- transforms that never call `callback` in some branch (the stream stalls silently);
- `flush` missing, so the last buffered line or record is lost;
- object streams without `objectMode` (values coerced to strings or errors);
- `write()` loops that ignore `false` and `'drain'`;
- partial output left behind when the pipeline rejects.
