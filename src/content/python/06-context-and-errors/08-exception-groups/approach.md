1. Decide what the caller of `validate_all` must learn from one call: every failure, in order, as one exception, or no exception at all.
2. Build the error list with the collector pattern from lesson 04 and choose the condition under which the group is raised.
3. For `handle`, write the `try` with one `except*` clause per handled type, and list what each clause receives: a group, possibly nested, possibly with subclasses.
4. Work out how to count failures in a nested group, and where to put the counts given that `except*` clauses cannot return.
5. Check what leaves `handle` when a member matches no clause, and confirm you wrote nothing to make that happen.
6. For `only`, compare a hand-built filter with `subgroup` on a nested group and on a group with no match.
