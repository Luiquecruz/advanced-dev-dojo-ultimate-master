# Streams

`readFile` loads a whole file into memory. That is fine for a 2 KB config and a disaster for a 4 GB log or a thousand concurrent 20 MB uploads. A **stream** processes data in chunks as it arrives, so memory stays flat no matter how large the input is. You have used streams in the browser already: `response.body` is a Web `ReadableStream`.

## The four kinds

| Kind | Role | Examples |
| --- | --- | --- |
| `Readable` | produces data | `fs.createReadStream`, an HTTP request body (`req`), `process.stdin` |
| `Writable` | consumes data | `fs.createWriteStream`, an HTTP response (`res`), `process.stdout` |
| `Duplex` | both, independent sides | a TCP socket |
| `Transform` | writable in, transformed readable out | gzip, CSV parser (next lesson) |

All of them are `EventEmitter`s: they emit `'data'`, `'end'`, `'finish'`, `'error'`, `'close'`.

## Reading with async iteration

The modern way to consume a readable is `for await`. It pulls one chunk at a time, pauses the source while your loop body runs, and turns stream errors into exceptions:

```ts
import { createReadStream } from 'node:fs';

async function countBytes(path: string) {
  let total = 0;
  for await (const chunk of createReadStream(path)) {
    total += chunk.length;
  }
  return total;
}
```

Chunks are `Buffer`s of up to `highWaterMark` bytes (64 KB for files) unless you pass `encoding: 'utf8'`, in which case they are strings decoded safely across chunk boundaries. If the file does not exist, the loop throws `ENOENT`, so a normal `try/catch` handles it.

## Chunks are not lines

A chunk boundary can fall anywhere: in the middle of a line, a JSON value or a character. Line-oriented processing keeps the unfinished tail and prepends it to the next chunk:

```ts
let rest = '';
for await (const chunk of stream) {
  const parts = (rest + chunk).split('\n');
  rest = parts.pop()!;
  for (const line of parts) handle(line);
}
if (rest) handle(rest);
```

Wrapping that loop in an `async function*` turns any stream into an async iterable of lines that callers consume with `for await`, the same shape as a paginated API iterator. Node also ships `readline.createInterface({ input })`, which does exactly this for files and sockets.

## Writing

```ts
import { createWriteStream } from 'node:fs';

const out = createWriteStream('report.csv');
out.write('id,total\n');
out.write('1,30\n');
out.end();
```

`write()` returns `false` when the stream's internal buffer is full: the consumer (a disk, a slow client) is slower than you. Keep writing anyway and memory grows without limit. Respecting that signal is **backpressure**, and the next lesson's `pipeline()` handles it for you.

## Legacy vs modern

| Legacy | Modern |
| --- | --- |
| `stream.on('data', ...)` + `on('end')` + `on('error')` | `for await (const chunk of stream)` |
| `a.pipe(b)` (does not forward errors or clean up) | `await pipeline(a, b)` from `node:stream/promises` |
| `new stream.Readable({ read() {} })` + `push` | `Readable.from(iterable)` |
| Node streams everywhere | Web Streams (`ReadableStream`) for `fetch` bodies; convert with `Readable.fromWeb` / `Readable.toWeb` |

`'data'` listeners switch the stream into flowing mode and drop backpressure unless you pause manually; `for await` is simpler and safer.

## Memory, concretely

Reading a 500 MB file with `readFile` needs 500 MB of RAM per concurrent request. Streaming it with a 64 KB buffer needs 64 KB. On a container with 512 MB of memory the first version crashes on the second request; the second serves hundreds. The same applies to request bodies (stream uploads to storage instead of buffering them) and to responses (stream large exports instead of building one giant string).

## When to choose it

Stream when the size of the data is unbounded or large compared with your memory: files, uploads, exports, logs, proxying responses. Use `readFile` / `await req.json()` when the data is small and bounded (configs, JSON bodies with a size limit): simpler code and easier error handling. For record-by-record processing of huge files, combine streams with async iteration; for heavy CPU work per record, a stream alone does not help, see the scaling module.

## Working with AI

Tell the assistant the expected size of the data ("up to 2 GB", "unbounded") so it does not default to `readFile` or `JSON.parse` of a whole body. Review generated code for:

- `readFile` / `arrayBuffer()` / string concatenation on data with no size limit;
- `'data'` handlers without an `'error'` handler (an unhandled stream error crashes the process);
- splitting chunks on `\n` without carrying the remainder to the next chunk;
- `.pipe()` chains with no error handling (prefer `pipeline`);
- `write()` in a loop that ignores its return value.
