1. Read the route table as an ordered list of cases: each row becomes one `case`, and the order of the rows is the order of the cases.
2. Separate what a pattern can check (method words, path shape, the `int` type of the id, a fixed role) from what needs a condition (a role from a set of allowed roles). The first goes in the pattern, the second in a guard.
3. Merge rows that share a block with or-patterns, and add `as` wherever the result has to say which alternative matched.
4. Replace every comparison with a named constant by a dotted value pattern, and check that no bare name in a pattern is meant as a comparison.
5. Place the `forbidden` case after the allowed writes and before the final wildcard, and trace a guest `DELETE`: its guard or value pattern fails, matching continues, and the `forbidden` case answers.
6. Try the edge cases by hand: a string id, an extra segment, `v3`, a path given as a string, and a role value that is not in `Role`.
