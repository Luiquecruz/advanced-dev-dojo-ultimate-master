1. Write the two `lookupUser` overload signatures above the existing implementation; keep the implementation signature broad.
2. Implement the single-id branch with `find`, which already yields `User | undefined`.
3. Implement the array branch so it preserves the order of the ids and skips unknown ones, e.g. with `flatMap` + `filter`.
4. Check that a `number | number[]` argument is rejected: only overloads are visible to callers.
5. Add the one-argument and three-argument overloads above `makeDate`, leaving its body unchanged.
