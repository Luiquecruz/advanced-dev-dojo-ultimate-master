1. Read the table as a graph: each status is a node, each event an arrow. Encode it literally as a nested `transitions` object so the rules are data, not scattered `if`s.
2. Write each transition as a pure function that spreads the previous state and changes only `status` plus the payload it owns.
3. In `checkoutReducer`, separate the two kinds of invalid input: unknown types are programmer errors (throw), known-but-not-allowed events are user noise (return the same object so React skips the render).
4. Keep the network call out of the reducer. The handler dispatches an event before the `await` and another one after it, so the reducer always reflects the real phase.
5. The double-submit protection comes for free: `orderPlaced` has no arrow from `submitting`.
