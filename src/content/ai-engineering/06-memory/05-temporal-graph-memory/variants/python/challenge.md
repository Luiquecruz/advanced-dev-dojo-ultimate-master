Build a bi-temporal fact memory: facts are `subject → predicate → object` edges with a valid time (when the fact was true) and a transaction time (when the memory believed it). Contradictions invalidate facts instead of deleting them, and queries can ask what was true at any time, as known at any time. Time is injected with `now()` (milliseconds).

A fact is a dict:

```python
{"id", "subject", "predicate", "object", "validFrom", "validTo", "recordedAt", "expiredAt"}
```

`"validTo"` and `"expiredAt"` are `None` while open. Ids are unique strings. All intervals are half-open: the start is included, the end is not.

## 1. `is_valid_at(fact, valid_at)` and `is_known_at(fact, known_at)`

`is_valid_at` is `True` when `validFrom ≤ valid_at` and (`validTo` is `None` or `valid_at < validTo`). `is_known_at` is the same check with `recordedAt` and `expiredAt`.

## 2. `create_temporal_memory(now=..., exclusive_predicates=None)`

`now` defaults to the current time in milliseconds; `exclusive_predicates` (default none) lists the predicates a subject can have only one value for at a time (such as `works_at`). Returns a `TemporalMemory`. A fact is **believed** while its `"expiredAt"` is `None`.

**`add(input)`**, with `input` a dict `{"subject", "predicate", "object", "validFrom"}`, reads `now()` once and:

1. **Restated:** if a believed fact has the same subject, predicate and object, a `"validFrom"` at or before the new one, and `"validTo"` `None`, return it and change nothing.
2. **Exclusive predicate:** look at every believed fact with the same subject and predicate:
   - one that starts **before** the new `"validFrom"` and is still valid at it (`"validTo"` `None` or after the new `"validFrom"`) is invalidated: set its `"expiredAt"` to now, and record a copy (new id) with `"validTo"` set to the new `"validFrom"`, `"recordedAt"` now and `"expiredAt"` `None`;
   - one that starts at **the same** `"validFrom"` is a correction: set its `"expiredAt"` to now, with no copy;
   - one that starts **after** the new `"validFrom"` stays untouched, and the new fact's `"validTo"` becomes the earliest such `"validFrom"`.
3. Record the new fact with `"recordedAt"` now, `"expiredAt"` `None`, and `"validTo"` from step 2 (`None` otherwise), and return it.

Predicates that are not exclusive simply accumulate facts. Nothing is ever deleted.

**`current(subject, predicate=None)`** returns the believed facts of the subject (only that predicate, when given) whose `"validTo"` is `None`.

**`as_of(subject, predicate, valid_at, known_at=None)`** returns the facts of that subject and predicate for which `is_valid_at(fact, valid_at)` and `is_known_at(fact, known_at)` are both true; `known_at` defaults to `now()`.

**`all()`** returns every record, believed or expired.

The tests replay random histories and check that no record disappears, that believed facts of an exclusive predicate never overlap in valid time, and that answers about a past transaction time never change afterwards.
