Write the client side of MCP for an agent that sees many servers: discover their tools, give them unique names, find the right ones for a task, load only those into the model's context under a token budget, and route each call back to the server that owns it.

`servers.ts` (already written) provides MCP 2026-07-28 servers that run in memory: `createCompanyServers()` returns `[{ id: 'crm', server }, { id: 'billing', server }, { id: 'docs', server }]` (ten tools; each server has its own `search`), and `createBrokenServer()` fails every request. A server has `handle(message)`, which takes one serialized JSON-RPC message and resolves to the serialized response. `tools/list` is **paginated**: a result may contain `nextCursor`, which you send back as `params.cursor` to get the next page.

## 1. `createMcpClient(server, clientInfo?)`

Returns `{ request(method, params?) }`. Each request is `{ jsonrpc: '2.0', id, method, params }` with a unique `id` per client and `params._meta` holding:

- `io.modelcontextprotocol/protocolVersion`: `'2026-07-28'`
- `io.modelcontextprotocol/clientCapabilities`: `{}`
- `io.modelcontextprotocol/clientInfo`: `clientInfo` (default `{ name: 'dojo-agent', version: '1.0.0' }`)

Resolve to the response's `result`. For an error response, throw an `McpError` (exported) with the error's `code`, `message` and `data`.

## 2. `buildToolIndex(connections)`

`connections` is a list of `{ id, server }`. For each server, call `tools/list` until there is no `nextCursor`, and index every tool as `{ qualifiedName, serverId, toolName, description, inputSchema }`, where `qualifiedName` is `` `${serverId}__${toolName}` ``. Keep the order of servers and tools. When a server fails, record `{ serverId, message }` in `failures` and index the others. The returned index has:

- **`tools`** and **`failures`**.
- **`search(query, limit)`**: the `limit` tools most similar to `query`, best first. Score with `cosineSimilarity(embed(query), embed(text))` from `@dojo/ai`, where `text` is the tool name followed by its description; keep the original order on ties.
- **`definitionsFor(qualifiedNames, budgetTokens)`**: tool definitions `{ name: qualifiedName, description, parameters: inputSchema }` in the requested order. Unknown names are skipped. A definition costs `definitionTokens(definition)` (exported: `countTokens(JSON.stringify(definition))`); add each one only if the total stays within `budgetTokens`, otherwise skip it and try the next.
- **`call(qualifiedName, args)`**: send `tools/call` to the owning server with the **original** tool name and resolve to `{ text, isError }`, where `text` joins the text content blocks. An unknown name or a failed request resolves to `isError: true` with a message that contains the requested name. Never throw.

## 3. `answerWithTools(model, index, question, { budgetTokens = 1500, searchLimit = 3, maxRounds = 6 })`

A tool loop that loads tools on demand. Start with `[{ role: 'user', content: question }]`.

1. Call `model.generate({ messages, tools })`, where `tools` is `SEARCH_TOOLS` (exported; the model calls it with `{ query }`) followed by the definitions loaded so far.
2. No tool calls: resolve to `{ text, loadedTools, rounds }` (the loaded qualified names and the number of model calls).
3. Otherwise append the assistant message with its `toolCalls`, then one tool message per call (`toolCallId`):
   - `search_tools`: search with `searchLimit`, drop names already loaded, load what `definitionsFor` accepts within the budget **left** by the loaded definitions, and reply with `{"loaded": [...names]}`;
   - a loaded tool: reply with the `text` of `index.call`, or `{"error": text}` when `isError`;
   - anything else (a tool that is not loaded, or arguments that are not a JSON object): reply with `{"error": "..."}`; for a tool that is not loaded, the message mentions `search_tools`.
4. At most `maxRounds` model calls; when the last allowed call still requests tools, throw a `ToolLoopLimitError` (exported).

The loaded definitions must never exceed `budgetTokens` in any request, and no tool may be offered twice.
