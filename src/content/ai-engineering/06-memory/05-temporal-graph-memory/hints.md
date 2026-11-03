Write the two interval checks first; `asOf` is then a filter that uses both. `current` filters on `expiredAt === null && validTo === null`. Keep every record in one array and never remove anything from it: "invalidate" means setting `expiredAt`.
---
In `add`, compute `sameRelation` once: the believed facts with the same subject and predicate. The restated case is a `find` on it (same object, `validFrom <=` the new one, `validTo === null`); return early when it matches.
---
For an exclusive predicate, the new `validTo` is the minimum `validFrom` among `sameRelation` facts that start strictly after the new fact (or `null` when there are none). Then loop over `sameRelation`: equal `validFrom` means set `expiredAt`; an earlier start that is still valid at the new `validFrom` means set `expiredAt` **and** push a copy with a fresh id, `validTo: input.validFrom`, `recordedAt: now` and `expiredAt: null`. Finally push the new fact.
