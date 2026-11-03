Build a small MCP server that follows the **2026-07-28** revision of the specification: stateless JSON-RPC 2.0, with the protocol version on every request, tools and resources. The transport is in memory: `server.handle(message)` receives one serialized JSON-RPC message (the same framing as one line on stdio) and resolves to the serialized response, or `undefined` when there is nothing to answer.

`createMcpServer({ name, version, instructions?, tools, resources })` returns `{ handle }`.

- A **tool** is `{ name, description, input, handler }`: `input` is a Zod object schema; `handler(args)` receives the parsed arguments and returns a string or another value, and may throw.
- A **resource** is `{ uri, name, mimeType, description?, read() }`: `read()` returns its text.

The constants `PROTOCOL_VERSION` (`'2026-07-28'`), the three `_meta` keys and `ErrorCode` are already exported, along with `failure(id, code, message, data?)`, which serializes an error response.

## 1. The JSON-RPC envelope

Check in this order:

1. Text that is not JSON → error `-32700`, `id: null`.
2. Not an object, `jsonrpc` not `'2.0'` or `method` not a string → error `-32600` (`id` echoed when it is a string or a number, otherwise `null`).
3. No `id` property: a **notification**. Return `undefined`, whatever the method.
4. `initialize` (the legacy handshake from 2025-11-25 and earlier) → error `-32601` whose message contains `'2026-07-28'`.
5. `params._meta` must contain `io.modelcontextprotocol/protocolVersion` (a string) and `io.modelcontextprotocol/clientCapabilities` (an object), otherwise error `-32602`. A version other than `'2026-07-28'` → error `-32022` with `data: { supported: ['2026-07-28'], requested }`.
6. Unknown method → error `-32601`.

Every error response echoes the request `id`. Every **result** contains `resultType: 'complete'` and `_meta: { 'io.modelcontextprotocol/serverInfo': { name, version } }`. The results of `server/discover`, `tools/list`, `resources/list` and `resources/read` also carry `ttlMs` (a number) and `cacheScope` (`'public'` or `'private'`).

## 2. Methods

| Method | Result |
| --- | --- |
| `server/discover` | `supportedVersions: ['2026-07-28']`, `capabilities: { tools: {}, resources: {} }`, and `instructions` when given |
| `tools/list` | `tools`: `{ name, description, inputSchema }` per tool, in registration order; `inputSchema` is `z.toJSONSchema(input, { io: 'input' })` (the `$schema` key may be dropped) |
| `tools/call` | see below |
| `resources/list` | `resources`: `{ uri, name, mimeType }` per resource (plus `description` when given), never the `read` function |
| `resources/read` | `contents: [{ uri, mimeType, text }]` for `params.uri` |

## 3. `tools/call`: protocol errors vs tool errors

- **Protocol errors** (JSON-RPC error `-32602`): `params.name` is not a string, no tool has that name (the message contains the name), or `params.arguments` is present but not an object. A missing `arguments` means `{}`.
- **Tool execution errors** (a normal result with `isError: true` and a text content block): the arguments fail the Zod schema (the text names each invalid field, and the handler does not run), or the handler throws (the text contains the error message).
- **Success:** `content: [{ type: 'text', text }]` and `isError: false`. A string result is the text. Any other value is `JSON.stringify`-ed into the text and also returned as `structuredContent`.

## 4. Resources

An unknown URI is error `-32602` with `data: { uri }`. Never answer with an empty `contents` array.
