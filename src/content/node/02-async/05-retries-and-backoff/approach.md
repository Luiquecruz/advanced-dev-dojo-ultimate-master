1. Classify errors first: transient ones (network, `408`, `429`, `5xx` gateway errors) may succeed later; client errors and bugs never will. Encode that once in `isRetryable`.
2. Keep the delay formula a pure function of the attempt number and an injected `random`, so it is trivial to test and to reason about: exponential growth, a cap, then full jitter.
3. Structure `retry` as a loop over attempts with `return await` inside a `try`, so both success and failure of each attempt are handled in one place.
4. Decide to stop before deciding to wait: the attempt limit and the predicate both end the loop by rethrowing the current error, which is always the most recent one.
5. Wait through the injected `sleep` so production uses real timers and tests use a spy that records the delays instead of waiting.
6. Use **Run** to watch two `503` failures followed by a success; the delays differ on every run because of the jitter.
