1. Separate the two questions every fact answers: when it was true in the world (valid time) and when the memory believed it (transaction time). Give each its own pair of timestamps and its own half-open interval check.
2. Make the store append-only. Changing belief means expiring a record and adding a new one, so any answer computed for a past transaction time can be recomputed later and comes out the same.
3. Decide what counts as a contradiction with an explicit rule (exclusive predicates) instead of guessing from wording; non-exclusive relations simply accumulate.
4. Handle the order of knowledge, not only the order of events: a fact learned now may be about the past. Close older facts where the new one starts, and close the new fact where newer knowledge already starts, so the believed timeline stays free of overlaps.
5. Treat restatements and same-time statements explicitly: a restatement is a no-op, and a statement with the same start corrects the believed fact.
6. Build the queries on top of the two interval checks: current is "open in both timelines", and `asOf` takes both a valid time and a transaction time, defaulting the latter to now.
