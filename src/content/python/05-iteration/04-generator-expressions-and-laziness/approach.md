1. For each starter function, find the point where a complete list exists before the consumer (`[0]`, `sum`, `any`) gets to work. That list is the eager step to remove.
2. Rewrite `first_match` as a single `next()` call over a generator expression, then check the falsy match and the empty input against the default.
3. Pass the same generator to `first_match` three times on paper and write down which items each call consumes; the second call must continue after the first match.
4. Replace the list inside `sum()` and trace the order of reading, validating and adding for three records.
5. Feed `any()` a generator expression and count how many predicate calls the fraud check needs when the third item matches.
6. Run the demo and compare the number of predicate calls printed by the lazy and eager versions.
