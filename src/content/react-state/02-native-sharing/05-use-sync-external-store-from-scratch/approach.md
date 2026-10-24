1. Understand the contract: React compares `getSnapshot()` results with `Object.is`, so the hook must return a stable reference whenever the selected data is equivalent.
2. Implement `shallowEqual` as a one-level comparison; it works because immutable updates keep unchanged items' references.
3. Add a ref-based cache keyed on both the store snapshot and the selector function. Same keys → cached result; changed keys → recompute.
4. After recomputing, consult `isEqual` against the previous selection and keep the old reference when they match. That single step removes both the infinite loop and the unrelated re-renders.
5. Provide `getServerSnapshot` using the store's initial state so server rendering and hydration agree.
