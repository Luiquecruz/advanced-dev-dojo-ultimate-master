Start with `createMcpClient`: keep a `nextId` counter in the closure, merge `_meta` into the params, `JSON.parse` the reply and either return `result` or throw `new McpError(error.code, error.message, error.data)`. Everything else talks to servers through it.
---
In `buildToolIndex`, wrap each server in its own `try`/`catch` and page with `do { const page = await client.request('tools/list', cursor === undefined ? {} : { cursor }); ...; cursor = page.nextCursor; } while (cursor !== undefined)`. Keep a `Map` from qualified name to tool and one from server id to client: `call` splits nothing, it just looks the name up.
---
Precompute one embedding per tool. `search` maps tools to `{ tool, position, score }`, sorts by `right.score - left.score || left.position - right.position` and slices. `definitionsFor` loops over the requested names with a running `used` total and adds a definition only when `used + definitionTokens(definition) <= budgetTokens`.
---
In `answerWithTools`, keep a `loaded` array of definitions. For a `search_tools` call, compute the budget left (`budgetTokens` minus the tokens of `loaded`), filter out names already loaded, and push what `definitionsFor` returns. For any other call, check that its name is in `loaded` before calling `index.call`.
