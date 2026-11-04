Build a small MCP server that follows the **2026-07-28** revision of the specification: stateless JSON-RPC 2.0, with the protocol version on every request, tools and resources. The transport is in memory: `await server.handle(message)` receives one serialized JSON-RPC message (the same framing as one line on stdio) and returns the serialized response, or `None` when there is nothing to answer.

`create_mcp_server(name, version, tools, resources, instructions=None)` returns an `McpServer` (already started for you); you write its `handle` method and whatever helpers you need.

- A **tool** is a dict `{"name", "description", "input", "handler"}`: `"input"` is an `Object` schema from `schema.py` (already written; the stand-in for Zod or Pydantic, see below); `handler(arguments)` receives the parsed arguments dict and returns a string or another value, and may raise. It may be a plain function or a coroutine function.
- A **resource** is a dict `{"uri", "name", "mimeType", "description" (optional), "read"}`: `read()` returns its text.

`schema.py` gives you `input.safe_parse(value)` (a `ParseResult` with `success`, `data` with defaults applied, and `issues`, each with a `path` list and a `message`) and `to_json_schema(input)` (the JSON Schema as a dict, starting with a `"$schema"` key).

Already written in `main.py`: the constants `PROTOCOL_VERSION` (`"2026-07-28"`), the three `_meta` keys, `CACHE`, `ErrorCode` (`PARSE_ERROR`, `INVALID_REQUEST`, `METHOD_NOT_FOUND`, `INVALID_PARAMS`, `INTERNAL_ERROR`, `UNSUPPORTED_PROTOCOL_VERSION`), `ProtocolError(code, message, data=None)`, `to_json(value)` (compact JSON, like `JSON.stringify`, so the messages are byte for byte those of the Node.js variant) and `failure(request_id, code, message, data=None)`, which serializes an error response.

## 1. The JSON-RPC envelope

Check in this order:

1. Text that is not JSON → error `-32700`, `"id": null`.
2. Not an object, `"jsonrpc"` not `"2.0"` or `"method"` not a string → error `-32600` (`"id"` echoed when it is a string or a number, otherwise `null`).
3. No `"id"` key: a **notification**. Return `None`, whatever the method.
4. `initialize` (the legacy handshake from 2025-11-25 and earlier) → error `-32601` whose message contains `"2026-07-28"`.
5. `params["_meta"]` must contain `io.modelcontextprotocol/protocolVersion` (a string) and `io.modelcontextprotocol/clientCapabilities` (an object), otherwise error `-32602`. A version other than `"2026-07-28"` → error `-32022` with `"data": {"supported": ["2026-07-28"], "requested": ...}`.
6. Unknown method → error `-32601`.

Every error response echoes the request `"id"`. Every **result** contains `"resultType": "complete"` and `"_meta": {"io.modelcontextprotocol/serverInfo": {"name": ..., "version": ...}}`. The results of `server/discover`, `tools/list`, `resources/list` and `resources/read` also carry `"ttlMs"` (a number) and `"cacheScope"` (`"public"` or `"private"`).

## 2. Methods

| Method | Result |
| --- | --- |
| `server/discover` | `"supportedVersions": ["2026-07-28"]`, `"capabilities": {"tools": {}, "resources": {}}`, and `"instructions"` when given |
| `tools/list` | `"tools"`: `{"name", "description", "inputSchema"}` per tool, in registration order; `"inputSchema"` is `to_json_schema(tool["input"])` (the `"$schema"` key may be dropped) |
| `tools/call` | see below |
| `resources/list` | `"resources"`: `{"uri", "name", "mimeType"}` per resource (plus `"description"` when given), never the `read` function |
| `resources/read` | `"contents": [{"uri", "mimeType", "text"}]` for `params["uri"]` |

## 3. `tools/call`: protocol errors vs tool errors

- **Protocol errors** (JSON-RPC error `-32602`): `params["name"]` is not a string, no tool has that name (the message contains the name), or `params["arguments"]` is present but not an object. A missing `"arguments"` means `{}`.
- **Tool execution errors** (a normal result with `"isError": true` and a text content block): the arguments fail the schema (the text names each invalid field, and the handler does not run), or the handler raises (the text contains the exception message).
- **Success:** `"content": [{"type": "text", "text": text}]` and `"isError": false`. A string result is the text. Any other value is serialized with `to_json` into the text and also returned as `"structuredContent"`.

## 4. Resources

An unknown URI is error `-32602` with `"data": {"uri": ...}`. Never answer with an empty `"contents"` list.
