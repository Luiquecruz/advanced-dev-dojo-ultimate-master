1. Model `compose` as recursion over indexes: `dispatch(i)` runs one middleware and hands it a `next` that is simply `dispatch(i + 1)`. The onion order follows automatically from `await`.
2. Treat the optional final `next` as one more step after the array, and an index with no function as the end of the chain.
3. Make `dispatch` `async` so synchronous throws and rejections travel the same path, and guard against a second `next()` by remembering the last index reached.
4. Write each middleware as one concern: the error handler only wraps `next`, timing only measures around it, the API key check either short-circuits or passes through.
5. Inject the clock (`now`) so timing is deterministic in tests instead of depending on real delays.
6. In `createListener`, build the context with safe defaults (404), run the pipeline, and write the response exactly once at the end, with a last-resort 500 for pipelines that have no error handler.
