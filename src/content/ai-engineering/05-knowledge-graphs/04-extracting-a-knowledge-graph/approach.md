1. Write the pure functions first (normalization, parsing, validation, merging): they hold most of the logic and can be tested without a model.
2. Put the ontology into the prompt so the model uses your vocabulary, and ask for JSON. The prompt reduces errors; the validator still decides what enters the graph.
3. Separate failures by kind. A reply that does not parse is worth one more call with the bad reply and a correction in the history; a refusal is not, because the same request gets the same answer. Both end as a typed error after a bounded number of calls.
4. Validate item by item and keep the good ones. Each rejection carries a reason naming the problem, which turns bad extractions into a log you can count and act on.
5. Resolve entities with a normalized key, all known aliases and the type as a guard, so spelling variants merge and same-named things of different types stay apart.
6. Merge with provenance: every entity and relation remembers which documents asserted it, duplicates add a source instead of a copy, and the pipeline records failed documents instead of stopping.
