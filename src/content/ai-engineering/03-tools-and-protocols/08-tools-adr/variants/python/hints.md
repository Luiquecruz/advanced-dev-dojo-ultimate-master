Start with `INTEGRATIONS`. For each system, read the "Used by" and "Notes" columns: more than one application means MCP; an external agent whose work takes days and may ask for input means A2A; the rest can stay as in-process function calling (or MCP if you have a reason).
---
Do the arithmetic before choosing the loading strategy: 64 tools × 350 tokens against a 6 000-token budget. Then pick a few tools used in almost every conversation as `"alwaysLoaded"` and check that their count × 350 fits your `"budgetTokens"`. For the round limit, divide the 8 s reply budget by 1.2 s per round and round down.
---
In the catalog, mark lookups `"readOnly": True`; anything that moves money or starts a claim is `"readOnly": False` and `"requiresApproval": True`. Keep every `"maxOutputTokens"` at or below 1 500, and write each `"errorContract"` as how the failure reaches the model (an `isError` result or an `error` text with a next step).
---
Write the ADR last, from the plan: the context restates the forces with their numbers, the decision is one "We will..." sentence, and each rejected alternative ("send all 64 tools", "wrap the carrier agent as a synchronous tool", "let Relay refund on its own") cites the constraint that ruled it out.
