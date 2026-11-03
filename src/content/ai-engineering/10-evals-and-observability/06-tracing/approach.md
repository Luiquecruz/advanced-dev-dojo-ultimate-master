1. Model the span first: identity (trace, span, parent), timing, status and attributes. Propagate the trace id from the parent so every operation of a request lands in one tree.
2. Record a span only when it ends, exactly once, so the trace holds finished operations even when an error interrupts the flow.
3. Wrap model and tool calls instead of changing them: the wrappers keep the same interface, add a span around each call and rethrow failures after marking them.
4. Use the standard GenAI attribute names, separating request facts (provider, requested model, limits) from response facts (actual model, finish reasons, token usage).
5. Treat content as opt-in: prompts, outputs, tool arguments and results are only attached when the tracer was configured to capture them.
6. Compute cost from token attributes and a price table at summary time, per trace, and list models without a price instead of guessing.
