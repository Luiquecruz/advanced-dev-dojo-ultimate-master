1. Write down the access pattern in one sentence: what is looked up, by which key, how often, against how many items.
2. Compute `lookups_per_second` and the cost of a scanning lookup at that rate, and compare it with the comparison budget.
3. Choose the container that turns that lookup into a hash lookup and returns a value, and the protocol callers will use on it.
4. Pick the key type by testing it against the briefing's collisions: same event id in two tenants, a tenant id that looks exactly like an event id.
5. Compute `bytes_per_payload_budget`, compare it with the payload size and a second copy, and decide where the replay order comes from; then choose ordering and de-duplication to match.
6. Choose where the case-insensitivity of header names lives: one mapping class or one normalizing entry point.
7. Write the ADR: the context with the numbers and the header bug, a `We will` decision naming the key type, rejected alternatives with their reason, and honest consequences.
8. Re-read the coherence rules and check every plan value against them, including the numbers.
