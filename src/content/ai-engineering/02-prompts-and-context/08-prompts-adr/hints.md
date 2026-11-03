Start with the numbers that decide the plan. For attempts, list each option with its validity and its latency (`attempts × 1 100 ms`): only one value meets both 99.5% and 3 000 ms. For examples, only one strategy in the pilot table reaches 90%, and the briefing gives its count range and token budget.
---
For the layout, sort the parts into "the same for every claim" and "varies per claim". With selected examples, only two parts are stable; they go first, the cache breakpoint is the second of them, and the claim goes last.
---
Context: `inputBudgetTokens + outputReserveTokens <= 32 000`, a reserve of at least 700 and an attachment cap at the size where accuracy held. Backfill: compute `1 200 000 × (3 000 × 2 + 300 × 8) / 1 000 000` and compare with $6 000; if it does not fit at full price, the batch discount decides.
---
Write the ADR from the plan: the context restates volume, latency, schema, validity and accuracy targets, attachment sizes and the backfill budget; each alternative ("parse free text", "three attempts", "fixed examples", "send the whole report", "interactive backfill") cites the number that rules it out.
