1. List every way the call can end: a timeout, no connection, a 404, another non-2xx status, a 2xx with a broken body, or success. Each gets exactly one `UpstreamError`.
2. Attach a deadline to every outgoing request; keep the signal so you can tell a timeout from a network failure without inspecting error names.
3. Remember that `fetch` only rejects when there is no response, so status checks come after it, before the body is read.
4. Translate upstream statuses into what your client should see: a missing entity stays 404, everything that is the dependency's fault becomes 502 or 504, and upstream error bodies are never forwarded.
5. Start independent calls together with `Promise.all`, so the profile takes as long as the slowest call, not the sum.
6. Keep HTTP concerns at the edge: the server only converts `UpstreamError` to a response and hides anything unexpected behind a logged 500.
