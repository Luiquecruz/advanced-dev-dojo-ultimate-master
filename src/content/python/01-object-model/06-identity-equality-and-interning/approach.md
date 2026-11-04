1. Decide what each comparison means: absence of a key is identity with a sentinel; money equality is by value.
2. `lookup`: test membership first, then branch on `default is MISSING` for the raise-or-return decision.
3. `Money.__eq__`: guard on type, return `NotImplemented` for foreign types, compare the two fields.
4. `Money.__hash__`: hash the same two fields that `__eq__` compares.
5. `same_amount`: compare `.amount` values with `==`.
6. Re-read the source for `== None` and `is` with literals before running the tests.
