1. Replace `items: state.items, coupon: state.coupon` with `...toRefs(state)` in the returned object.
2. Build `itemCount` with the getter form of `toRef`, so it is reactive and read-only.
3. Keep `summary` and `add` as they are: they already read and write through the reactive `state`.
4. In `useLength`, return `computed(() => toValue(source).length)`.
