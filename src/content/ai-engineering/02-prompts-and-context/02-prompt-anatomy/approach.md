1. Start from the data boundary: write `delimit` first, because every untrusted piece of the prompt passes through it. Neutralizing the same tag inside the content is what keeps the block closed; other tags are harmless data.
2. Validate the spec before building anything. A prompt without a role, a task or an input is a bug in the caller, and a typed error with the field name points straight at it.
3. Build the system message only from standing parts (role, constraints, output format), in a fixed order, so it stays identical across requests: that stability is what makes it cacheable and reviewable.
4. Turn examples into real conversation turns (user input, assistant output) instead of prose, delimiting their inputs exactly like the real one so the model sees the same pattern.
5. Order the final message as context, task, input: long reference material first, the instruction next, and the data to act on last, inside its delimiter.
6. In `runPrompt`, derive the request from the spec (JSON mode only when asked) and treat every finish reason other than `stop` as an outcome the caller must handle, carrying the partial text in the error.
