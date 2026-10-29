# Buffers and Encodings

In the browser you rarely touch raw bytes: `fetch().json()` and the DOM hand you strings. On the server, almost everything arrives as bytes: request bodies, files, sockets, hashes, tokens. Node represents bytes with `Buffer`, a subclass of `Uint8Array` with encoding helpers.

## Characters are not bytes

A JavaScript string is a sequence of UTF-16 code units. On the wire and on disk, text is almost always **UTF-8**, where one character takes 1 to 4 bytes:

```ts
'hello'.length;               // 5
Buffer.byteLength('hello');   // 5
'héllo'.length;               // 5
Buffer.byteLength('héllo');   // 6   é is 2 bytes in UTF-8
'👋'.length;                  // 2   two UTF-16 code units
Buffer.byteLength('👋');      // 4
```

This matters whenever a limit is expressed in bytes: `Content-Length`, a database column of `VARCHAR(255) BYTES`, a 1 MB body limit, an SMS segment. `text.length` is the wrong measure for all of them.

## Creating and converting

```ts
const fromText = Buffer.from('café', 'utf8');
const fromBase64 = Buffer.from('Y2Fmw6k=', 'base64');
const fromHex = Buffer.from('636166c3a9', 'hex');
const zeroed = Buffer.alloc(16);

fromText.toString('utf8');    // 'café'
fromText.toString('base64');  // 'Y2Fmw6k='
fromText.toString('hex');     // '636166c3a9'
fromText.length;              // 5 bytes
```

| Encoding | Use it for | Size vs bytes |
| --- | --- | --- |
| `utf8` | text (the default) | 1 to 4 bytes per character |
| `base64` | binary inside text formats: JSON, headers, data URLs, Basic auth | about 4/3 |
| `base64url` | same, but URL and JWT safe (`-` `_`, no `=` padding) | about 4/3 |
| `hex` | hashes, ids, debugging | 2 characters per byte |
| `latin1` / `ascii` | legacy protocols only | 1 byte per character, lossy |

Base64 is an **encoding, not encryption**: anyone can decode it. Basic auth credentials and JWT payloads are readable by whoever sees them, which is why they require HTTPS.

## Chunks: never decode half a character

Streams and request bodies arrive in chunks, and a chunk boundary can fall in the middle of a multi-byte character. Decoding each chunk on its own turns the halves into the replacement character `�`:

```ts
const euro = Buffer.from('€');                 // e2 82 ac
const chunks = [euro.subarray(0, 2), euro.subarray(2)];

chunks.map((chunk) => chunk.toString()).join('');   // '��' broken
Buffer.concat(chunks).toString('utf8');            // '€'  correct
```

Collect the chunks and decode once with `Buffer.concat`, or let the stream decode for you (`stream.setEncoding('utf8')`, `createReadStream(path, { encoding: 'utf8' })`), which keeps incomplete bytes until the rest arrives. This bug passes every test written with ASCII and fails in production for the first customer named "José".

## Cutting text by bytes

To fit text in a byte budget, cut on character boundaries, not on bytes. Iterating a string with `for...of` yields whole code points (so emoji stay intact), and `Buffer.byteLength` measures each one:

```ts
for (const char of 'añ👋') {
  console.log(char, Buffer.byteLength(char));   // a 1, ñ 2, 👋 4
}
```

## Legacy vs modern

`new Buffer(...)` is deprecated (it could expose uninitialized memory): use `Buffer.from`, `Buffer.alloc` or `Buffer.allocUnsafe` when you will overwrite every byte. Many web-standard APIs (`fetch`, `crypto.subtle`, `TextEncoder`) use plain `Uint8Array`; a `Buffer` is one, so you can pass it directly, and `Buffer.from(uint8Array)` wraps the other way. For code shared with browsers, prefer `TextEncoder` / `TextDecoder` and `Uint8Array`.

## When to choose it

Use `Buffer` for binary data and for any byte-exact work (limits, hashing, protocols, base64). Keep strings for business logic: convert at the edges (decode once when data comes in, encode once when it goes out). Choose `Uint8Array` + `TextEncoder` when the code must also run in browsers or edge runtimes. Never store base64 when you can store bytes: it costs a third more space.

## Working with AI

Tell the assistant the unit of every limit ("max 1 MB of UTF-8 bytes", "max 160 characters") and the encoding of every input. Review generated code for:

- `str.length` used where bytes matter (`Content-Length`, body limits, column sizes);
- `chunk.toString()` inside a `'data'` handler or loop instead of `Buffer.concat` or `setEncoding`;
- base64 treated as a security measure;
- `new Buffer()` or `Buffer.allocUnsafe` whose bytes are not all overwritten;
- splitting `user:password` on every `:` instead of the first one.
