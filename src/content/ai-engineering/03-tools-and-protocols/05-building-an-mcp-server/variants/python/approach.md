1. Separate the layers: the transport delivers one string, JSON-RPC defines the envelope and error codes, MCP defines the methods. Validate them in that order so each failure gets the code of the layer it broke.
2. Remember that notifications never get a response, even when their method is unknown; only requests do.
3. Validate the per-request metadata before any method runs. Stateless servers learn the protocol version and client capabilities from every request, never from an earlier one.
4. Centralize error handling: protocol errors are raised with their code and data and converted in one `except`; unexpected exceptions become an internal error instead of crashing the transport.
5. In `tools/call`, decide who can fix each failure. A missing or unknown tool is a protocol error; bad argument values and failing handlers are tool execution errors with `"isError": true`, written so a model can correct itself.
6. Derive `inputSchema` from the same schema that validates arguments, list tools in a stable order, and add the common result fields (`resultType`, server identity, cache hints) in one place.
