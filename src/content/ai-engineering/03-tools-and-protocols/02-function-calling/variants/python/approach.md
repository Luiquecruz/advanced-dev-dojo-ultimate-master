1. Treat tool arguments as untrusted input: model output that happens to look like JSON. Parsing is a function that returns a result dict, so callers branch on `"ok"` instead of catching exceptions.
2. Decide where each failure belongs. An unknown tool, broken arguments or a failing tool are problems the model can correct, so they become tool messages with an `"error"` field; nothing in `execute_tool_call` may raise.
3. Write the error text for the model: name the tool, list the alternatives, say what to do next. That text is the only signal the model gets.
4. Keep the transcript in the provider's expected shape: the assistant turn with its `"toolCalls"`, then one tool message per call with the matching `"toolCallId"`, in the same order.
5. Offer definitions, not implementations. The model needs names, descriptions and schemas; your `execute` functions stay in your process.
6. Bound the loop by counting model calls and fail loudly with a typed exception when the limit is reached, so the caller can decide what happens next.
