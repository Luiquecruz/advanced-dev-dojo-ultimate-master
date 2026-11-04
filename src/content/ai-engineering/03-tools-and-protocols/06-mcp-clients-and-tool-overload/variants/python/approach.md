1. Put all protocol details in one small client: request ids, the per-request `_meta` and the conversion of error responses into typed exceptions. The index and the loop never touch JSON-RPC.
2. Discover defensively: follow every page, isolate each server's failure, and keep a stable order so the same configuration always produces the same tool list.
3. Make names unique at the boundary. Qualify each tool with the server id you configured and keep a lookup by qualified name, so routing is a dict access and the server always receives its own tool name.
4. Treat tool definitions as context with a cost. Count their tokens and load greedily within a budget, skipping what does not fit instead of exceeding the window.
5. Let the model ask for tools: one always-available search tool, results loaded for the next turn, and nothing callable that was not offered.
6. Bound the loop and keep every failure inside tool messages, as in the function calling lesson.
