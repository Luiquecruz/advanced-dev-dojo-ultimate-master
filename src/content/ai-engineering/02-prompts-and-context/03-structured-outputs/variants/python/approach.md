1. Separate the three layers: syntax (is it JSON?), shape (does it match the schema?) and outcome (did the model finish, refuse or get cut off?). Each layer fails differently and deserves a different reaction.
2. Make local repair conservative: only transformations that cannot change meaning (strip surrounding prose, trailing commas, quote style). A truncated object stays a failure, because closing it would invent data.
3. Use one schema for both jobs: the JSON Schema the provider receives is the same dict your validator checks, so the description the model sees and the check your code runs never drift apart.
4. Check the finish reason before parsing. A refusal ends the loop immediately; truncation is a failed attempt; only a normal stop is parsed and validated.
5. Re-ask with evidence: append the model's own bad reply and a message that quotes the located validation error, on a copy of the conversation so the caller's messages stay untouched.
6. Bound the loop by calls, not by hope, and fail with a typed error carrying the reason, the number of attempts and the last problem, so callers and dashboards can tell refusals from broken prompts.
