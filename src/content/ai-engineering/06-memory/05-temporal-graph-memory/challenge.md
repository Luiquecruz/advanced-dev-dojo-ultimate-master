Build a bi-temporal fact memory: facts are `subject → predicate → object` edges with a valid time (when the fact was true) and a transaction time (when the memory believed it). Contradictions invalidate facts instead of deleting them, and queries can ask what was true at any time, as known at any time. Time is injected with `now()` (milliseconds).

A fact is:

```ts
{ id, subject, predicate, object, validFrom, validTo, recordedAt, expiredAt }
```

`validTo` and `expiredAt` are `null` while open. Ids are unique strings. All intervals are half-open: the start is included, the end is not.

## 1. `isValidAt(fact, validAt)` and `isKnownAt(fact, knownAt)`

`isValidAt` is `true` when `validFrom ≤ validAt` and (`validTo` is `null` or `validAt < validTo`). `isKnownAt` is the same check with `recordedAt` and `expiredAt`.

## 2. `createTemporalMemory({ now, exclusivePredicates })`

`now` defaults to `Date.now`; `exclusivePredicates` (default `[]`) lists the predicates a subject can have only one value for at a time (such as `works_at`). A fact is **believed** while its `expiredAt` is `null`.

**`add({ subject, predicate, object, validFrom })`** reads `now()` once and:

1. **Restated:** if a believed fact has the same subject, predicate and object, a `validFrom` at or before the new one, and `validTo` `null`, return it and change nothing.
2. **Exclusive predicate:** look at every believed fact with the same subject and predicate:
   - one that starts **before** the new `validFrom` and is still valid at it (`validTo` `null` or after the new `validFrom`) is invalidated: set its `expiredAt` to now, and record a copy (new id) with `validTo` set to the new `validFrom`, `recordedAt` now and `expiredAt` `null`;
   - one that starts at **the same** `validFrom` is a correction: set its `expiredAt` to now, with no copy;
   - one that starts **after** the new `validFrom` stays untouched, and the new fact's `validTo` becomes the earliest such `validFrom`.
3. Record the new fact with `recordedAt` now, `expiredAt` `null`, and `validTo` from step 2 (`null` otherwise), and return it.

Predicates that are not exclusive simply accumulate facts. Nothing is ever deleted.

**`current(subject, predicate?)`** returns the believed facts of the subject (only that predicate, when given) whose `validTo` is `null`.

**`asOf(subject, predicate, validAt, knownAt = now())`** returns the facts of that subject and predicate for which `isValidAt(fact, validAt)` and `isKnownAt(fact, knownAt)` are both true.

**`all()`** returns every record, believed or expired.

The tests replay random histories and check that no record disappears, that believed facts of an exclusive predicate never overlap in valid time, and that answers about a past transaction time never change afterwards.
