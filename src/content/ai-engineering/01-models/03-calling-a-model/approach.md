1. Read the contract as two decisions: how a request is built, and how a response becomes a result the caller cannot misread. Both are shared by the plain and the streaming call, so put each in one helper.
2. Build the request from the input: an optional system message first, the user message last, and `maxTokens` only when the caller asked for a limit (an absent limit and a limit of "undefined" are not the same thing to every provider).
3. Map finish reasons to a small status vocabulary: one value for a finished answer, one for a cut-off answer, one for a declined answer. Keep the raw finish reason too, for logs.
4. Pass `text` and `usage` through untouched. The provider's usage is what you are billed for; a partial text is still useful to the caller.
5. Do not catch errors in this layer: a rate limit or outage must stay an error so a retry layer (lesson 06) can handle it.
6. For streaming, accumulate deltas while forwarding each one to the callback, and read the finish reason and usage from the final event, which is the only place they exist in a stream.
