Start with `delimit`: build a case-insensitive pattern with `re.compile(..., re.IGNORECASE)` from the tag name (`re.escape(tag)`) that matches `<`, optional spaces, an optional `/`, optional spaces, the tag, optional spaces and `>`. Capture the slash so a replacement function passed to `pattern.sub` can write `[tag]` or `[/tag]`.
---
For the system message, collect sections in a list (`[role]`, then the constraints section, then the format section, each only when present) and `"\n\n".join(sections)`. The constraints section is `"Constraints:\n"` plus `"\n".join(f"- {constraint}" for constraint in constraints)`.
---
The examples add two messages each. The final user message joins `[context_block, task, input_block]` with `"\n\n"`, leaving the context block out when there is no context. In `run_prompt`, build the request dict, set `"responseFormat"` only for JSON, and compare `response["finishReason"]` with `"stop"` before returning.
