Start with `delimit`: build a case-insensitive global regular expression from the tag name that matches `<`, optional spaces, an optional `/`, optional spaces, the tag, optional spaces and `>`. Capture the slash so the replacement can write `[tag]` or `[/tag]`.
---
For the system message, collect sections in an array (`[role]`, then the constraints section, then the format section, each only when present) and `join('\n\n')`. The constraints section is `'Constraints:\n'` plus the constraints mapped to `- ${constraint}` and joined with `'\n'`.
---
The examples are a `flatMap` returning two messages per example. The final user message is `[contextBlock, task, inputBlock]` with the missing context filtered out, joined with `'\n\n'`. In `runPrompt`, build the request object, set `responseFormat` only for JSON, and compare `response.finishReason` with `'stop'` before returning.
