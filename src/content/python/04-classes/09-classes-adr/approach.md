1. Turn the memory facts into a comparison: compute the megabytes for both layouts and keep only the one under the budget.
2. List the validation requirements (15 fields, later assignments) and test each mechanism against both.
3. Check the composition constraints: the spike result, the standard-library rule, mutability of entities, one style for all types. Pick the entity style that survives all of them.
4. Classify value objects separately from entities and choose the immutable, hashable option.
5. Decide how behaviors are shared given that each type needs a different subset, and set `cooperative_super` accordingly.
6. Write the ADR: the numbers and the spike in the context, a `We will` decision naming the mechanisms, rejected alternatives with the fact that ruled each out, and honest negative consequences.
7. Re-read the coherence rules and check every plan value against them, including the number.
