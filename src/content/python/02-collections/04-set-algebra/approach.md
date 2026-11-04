1. Turn the user's roles into a list of permission sets, letting a missing role raise `KeyError`.
2. Compute `granted` as the union and `common` as the intersection, guarding the empty case.
3. Derive `missing` and `unused` with set difference.
4. For `dedupe_keep_order`, pick the structure that is both unique and ordered.
5. For `unique_ids`, union the iterables into one set, working for generators too.
