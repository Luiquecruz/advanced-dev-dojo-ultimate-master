# Building an MCP Server

An MCP server is a JSON-RPC 2.0 endpoint that answers a handful of methods. No framework is needed to understand it. This lesson builds one by hand so that, when you use an official SDK, you know what it does for you and can debug the messages it sends.

## The messages

Every message is a JSON object with `"jsonrpc": "2.0"`:

- a **request** has an `id` (a string or a number, never `null`), a `method` and optional `params`, and expects exactly one response with the same `id`;
- a **response** has either a `result` or an `error: { code, message, data? }`;
- a **notification** has a `method` and no `id`, and the receiver must **not** answer it.

The standard JSON-RPC error codes cover failures at the envelope level:

| Code | Meaning | Example |
| --- | --- | --- |
| `-32700` | Parse error | the text is not JSON (`id` is `null`, since it cannot be read) |
| `-32600` | Invalid request | `jsonrpc` is not `"2.0"`, `method` is missing |
| `-32601` | Method not found | `prompts/list` on a server without prompts |
| `-32602` | Invalid params | unknown tool, unknown resource URI, missing required `_meta` |
| `-32603` | Internal error | a bug in the server |

MCP reserves `-32020` to `-32099` for its own codes, such as `-32022` (unsupported protocol version).

## Stateless since 2026-07-28

Earlier revisions (up to `2025-11-25`) opened a session with an `initialize` request, negotiated a version and capabilities once, and confirmed with a `notifications/initialized` notification. The **2026-07-28** revision removed that handshake. Every request now carries what the server needs in `params._meta`:

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "search_articles",
    "arguments": { "query": "refund" },
    "_meta": {
      "io.modelcontextprotocol/protocolVersion": "2026-07-28",
      "io.modelcontextprotocol/clientCapabilities": {},
      "io.modelcontextprotocol/clientInfo": { "name": "my-agent", "version": "1.0.0" }
    }
  }
}
```

A request without the version or the capabilities is malformed (`-32602`). A version the server does not speak gets `-32022` with `data: { supported, requested }`, and the client retries with a supported one. Results report `resultType: "complete"` and identify the server in `_meta`. Because each request stands alone, a server can sit behind a load balancer without sticky sessions; state that must span calls (a cart, a browser tab) travels as an explicit handle in tool arguments.

`server/discover`, which servers must implement, returns the supported versions, capabilities, identity and optional `instructions` in one call. Clients may call it first, or just send requests and handle a version error.

## Tools: two kinds of errors

`tools/list` returns each tool's `name`, `description` and `inputSchema` (JSON Schema). `tools/call` runs one. The spec separates two kinds of failure, and getting this right is what makes a server pleasant for models:

- **Protocol errors** are JSON-RPC errors: an unknown tool, a malformed request. The model can rarely fix them.
- **Tool execution errors** are normal results with `isError: true` and a text explanation: invalid argument values, a failing API, a business rule. Clients should show them to the model so it can correct itself.

```json
{ "resultType": "complete", "content": [{ "type": "text", "text": "Invalid arguments for create_ticket:\n- subject: Too small" }], "isError": true }
```

Successful results put text (or images, audio, resource links) in `content`. A tool may also return machine-readable `structuredContent`, ideally validated by an `outputSchema`, and should repeat it as JSON text for older clients.

## Resources

Resources are read-only context identified by a URI (`file:///…`, `helpdesk://policies/refunds`). `resources/list` lists them, `resources/read` returns `contents` with `text` or base64 `blob`. An unknown URI is `-32602` with the URI in `data` (older revisions used `-32002`, which clients should still accept). Unlike tools, the **application** decides which resources enter the context, often through a picker in the UI.

## Transports and SDKs

The protocol does not depend on the transport. Over **stdio**, the client launches the server as a subprocess and exchanges newline-delimited JSON-RPC on stdin/stdout (logs go to stderr). Over **Streamable HTTP**, each request is an HTTP POST to one endpoint and the reply is JSON or a request-scoped event stream; that is where OAuth-based authorization applies. The in-memory transport of this challenge is a function call carrying one message, which is how SDKs test servers too.

In production, use an official SDK: it handles validation, version compatibility (including dual-era servers that still answer `initialize`), pagination, cancellation and transports. Write by hand only what the SDK cannot know: good tool definitions and error messages.

> **Status as of October 2026:** the current MCP revision is `2026-07-28` (stateless requests, `server/discover`, cacheable list results with `ttlMs` and `cacheScope`, roots, sampling and logging deprecated). Many deployed servers and clients still speak `2025-11-25` with the `initialize` handshake, so check what your SDK version supports and whether it serves both eras.

## When to choose it

Build an MCP server when a set of tools or data should be usable from several hosts (IDE agents, chat apps, your own agents) without rewriting the integration in each one, or when another team owns the system behind the tools. Keep plain function calling for tools used by one application only, in the same process, where a protocol hop adds latency and an operational surface for nothing. Write the server with an SDK; hand-rolled JSON-RPC is for learning and debugging.
