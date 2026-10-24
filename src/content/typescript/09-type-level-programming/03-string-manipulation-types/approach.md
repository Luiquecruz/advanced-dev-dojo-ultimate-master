1. Write `TrimStart` as a recursive match on a leading `Whitespace` member, returning `S` once no whitespace is left.
2. Write `ReplaceAll` with an early `From extends ''` guard, then match the first occurrence, emit the replacement and recurse on the remaining text only.
3. Write `Split` by matching the first separator, putting the head into a tuple and spreading the recursive split of the rest; the base case wraps `S` in a one-element tuple.
4. Write `KebabToCamel` by matching the first dash and capitalizing the recursively converted remainder.
5. Write `StringLength` as a tail-recursive loop with a tuple accumulator and read its `length` at the end.
6. Implement `kebabToCamel` with a regex replacement and assert the result to `KebabToCamel<S>`.
