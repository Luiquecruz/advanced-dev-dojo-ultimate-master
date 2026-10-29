1. Treat a log line as data: build one plain object per call and serialize it once, so every line is valid JSON with predictable keys.
2. Make the minimum level a comparison of positions in an ordered list; the level check runs first so skipped calls cost almost nothing.
3. Apply redaction and error serialization per key while copying bindings and fields, so secrets never reach `write` and errors keep their message and stack.
4. Implement `child` by recursion on `createLogger` with merged bindings: context accumulates without the caller repeating it.
5. In the HTTP wrapper, establish the request context before anything else can log: the start time, the request id (reused or generated), the response header and the child logger.
6. Log the access line on `finish`, when the final status is known, and strip the query string so tokens in URLs never reach the logs.
7. Catch handler failures in the wrapper, log them with the request id and answer 500 only if the response has not started.
8. For percentiles, sort a copy (never the caller's array) and apply the nearest-rank formula with a lower bound of rank 1.
