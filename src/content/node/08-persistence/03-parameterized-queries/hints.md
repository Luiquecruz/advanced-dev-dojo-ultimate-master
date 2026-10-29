`strings` has always one more element than `values`. Start from `strings[0]` and, for each following part, append `$<index>` and the part: `strings.reduce((text, part, index) => ...)` without an initial value gives you exactly those indexes.
---
For `buildSelect`, keep a local `values` array and a helper `` const placeholder = (value) => `$${values.push(value)}` ``. `push` returns the new length, which is the placeholder number.
---
Build the conditions with `Object.entries(where).map(...)`: check the key with `assertIdentifier`, return `IS NULL` for `null`, `= ANY(${placeholder(value)})` for arrays and `= ${placeholder(value)}` otherwise, then `join(' AND ')`. The sort direction is a whitelist check: `direction !== 'ASC' && direction !== 'DESC'` throws.
