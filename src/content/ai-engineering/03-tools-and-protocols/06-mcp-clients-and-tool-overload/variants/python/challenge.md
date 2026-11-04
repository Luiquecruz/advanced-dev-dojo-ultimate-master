Write the client side of MCP for an agent that sees many servers: discover their tools, give them unique names, find the right ones for a task, load only those into the model's context under a token budget, and route each call back to the server that owns it.

`servers.py` (already written) provides MCP 2026-07-28 servers that run in memory: `create_company_servers()` returns `[{"id": "crm", "server": ...}, {"id": "billing", "server": ...}, {"id": "docs", "server": ...}]` (ten tools; each server has its own `search`), and `create_broken_server()` fails every request. A server has `await server.handle(message)`, which takes one serialized JSON-RPC message and returns the serialized response. `tools/list` is **paginated**: a result may contain `"nextCursor"`, which you send back as `params["cursor"]` to get the next page.

Already written in `main.py`: `PROTOCOL_VERSION`, `SEPARATOR` (`"__"`), `SEARCH_TOOLS`, `McpError(code, message, data=None)`, `ToolLoopLimitError(rounds)`, `to_json(value)` (compact JSON, like `JSON.stringify`, so the messages are those of the Node.js variant) and `definition_tokens(definition)` (`count_tokens(to_json(definition))`). Data keys keep the JSON names (camelCase); functions and attributes use Python names (snake_case).

## 1. `create_mcp_client(server, client_info=None)`

Returns an `McpClient` with `await request(method, params=None)`. Each request is `{"jsonrpc": "2.0", "id": ..., "method": ..., "params": ...}` with a unique `"id"` per client and `params["_meta"]` holding:

- `io.modelcontextprotocol/protocolVersion`: `"2026-07-28"`
- `io.modelcontextprotocol/clientCapabilities`: `{}`
- `io.modelcontextprotocol/clientInfo`: `client_info` (default `{"name": "dojo-agent", "version": "1.0.0"}`)

Return the response's `"result"`. For an error response, raise an `McpError` with the error's `code`, `message` and `data`.

## 2. `await build_tool_index(connections)`

`connections` is a list of `{"id": ..., "server": ...}` dicts. For each server, call `tools/list` until there is no `"nextCursor"`, and index every tool as `{"qualifiedName", "serverId", "toolName", "description", "inputSchema"}`, where `"qualifiedName"` is `f"{server_id}__{tool_name}"`. Keep the order of servers and tools. When a server fails, record `{"serverId": ..., "message": ...}` in `failures` and index the others. Return a `ToolIndex` with:

- **`tools`** and **`failures`** attributes.
- **`search(query, limit)`**: the `limit` tools most similar to `query`, best first. Score with `cosine_similarity(embed(query), embed(text))` from `dojo_ai`, where `text` is the tool name followed by its description; keep the original order on ties.
- **`definitions_for(qualified_names, budget_tokens)`**: tool definitions `{"name": qualifiedName, "description": ..., "parameters": inputSchema}` in the requested order. Unknown names are skipped. A definition costs `definition_tokens(definition)`; add each one only if the total stays within `budget_tokens`, otherwise skip it and try the next. `budget_tokens` may be `math.inf`.
- **`await call(qualified_name, arguments)`**: send `tools/call` to the owning server with the **original** tool name and return `{"text": ..., "isError": ...}`, where `"text"` joins the text content blocks. An unknown name or a failed request returns `"isError": True` with a message that contains the requested name. Never raise.

## 3. `await answer_with_tools(model, index, question, budget_tokens=1500, search_limit=3, max_rounds=6)`

A tool loop that loads tools on demand. Start with `[{"role": "user", "content": question}]`.

1. Call `await model.generate({"messages": messages, "tools": tools})`, where `tools` is `SEARCH_TOOLS` (the model calls it with `{"query": ...}`) followed by the definitions loaded so far.
2. No tool calls: return `{"text": ..., "loadedTools": [...], "rounds": ...}` (the loaded qualified names and the number of model calls).
3. Otherwise append the assistant message with its `"toolCalls"`, then one tool message per call (`"toolCallId"`):
   - `search_tools`: search with `search_limit`, drop names already loaded, load what `definitions_for` accepts within the budget **left** by the loaded definitions, and reply with `{"loaded": [...names]}`;
   - a loaded tool: reply with the `"text"` of `index.call`, or `{"error": text}` when `"isError"`;
   - anything else (a tool that is not loaded, or arguments that are not a JSON object): reply with `{"error": "..."}`; for a tool that is not loaded, the message mentions `search_tools`.
4. At most `max_rounds` model calls; when the last allowed call still requests tools, raise a `ToolLoopLimitError`.

The loaded definitions must never exceed `budget_tokens` in any request, and no tool may be offered twice.
